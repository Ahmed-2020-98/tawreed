import type { PageMeta } from '@tawreed/contracts';
import { type QueryParams, toQueryString } from './query';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static is(e: unknown, code?: string): e is ApiError {
    return e instanceof ApiError && (!code || e.code === code);
  }

  /** Field path → localized message for 422 validation errors (`details.fields`). */
  get fieldErrors(): Record<string, string> {
    const fields = (this.details as { fields?: Array<{ path: string; message: string }> } | undefined)?.fields ?? [];
    return Object.fromEntries(fields.map((f) => [f.path, f.message]));
  }
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Next.js fetch cache hints (ignored elsewhere). */
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

export interface ApiClientOptions {
  /** e.g. http://localhost:8030/api/v1 (server) or /api/proxy (browser via BFF). */
  baseUrl: string;
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  locale?: string | (() => string | undefined);
  headers?: Record<string, string>;
  fetch?: typeof fetch;
  /** Called once on 401; return true to retry the request (e.g. after a token refresh). */
  onUnauthorized?: () => Promise<boolean>;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetch ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, '');

  async function raw<T>(method: string, path: string, o: RequestOptions = {}, retried = false): Promise<{ data: T; meta?: PageMeta }> {
    const token = await opts.getToken?.();
    const locale = typeof opts.locale === 'function' ? opts.locale() : opts.locale;
    const isForm = typeof FormData !== 'undefined' && o.body instanceof FormData;
    const res = await doFetch(`${base}${path}${toQueryString(o.query)}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(o.body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
        ...(locale ? { 'accept-language': locale } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
        ...o.headers,
      },
      body: o.body === undefined ? undefined : isForm ? (o.body as FormData) : JSON.stringify(o.body),
      signal: o.signal,
      cache: o.cache,
      ...(o.next ? { next: o.next } : {}),
    });

    if (res.status === 401 && !retried && opts.onUnauthorized && (await opts.onUnauthorized())) return raw<T>(method, path, o, true);
    if (res.status === 204) return { data: undefined as T };
    const text = await res.text();
    let json: { data?: T; meta?: PageMeta; error?: ApiErrorBody } = {};
    try {
      json = text ? (JSON.parse(text) as typeof json) : {};
    } catch {
      throw new ApiError(res.status, 'BAD_RESPONSE', text.slice(0, 200) || res.statusText);
    }
    if (!res.ok || json.error) {
      const e: ApiErrorBody = json.error ?? { code: `HTTP_${res.status}`, message: res.statusText };
      throw new ApiError(res.status, e.code, e.message, e.details, e.requestId);
    }
    return { data: json.data as T, meta: json.meta };
  }

  return {
    raw,
    get: async <T>(path: string, o?: RequestOptions) => (await raw<T>('GET', path, o)).data,
    page: async <T>(path: string, o?: RequestOptions): Promise<Page<T>> => {
      const r = await raw<T[]>('GET', path, o);
      return { data: r.data, meta: r.meta as PageMeta };
    },
    post: async <T>(path: string, body?: unknown, o?: RequestOptions) => (await raw<T>('POST', path, { ...o, body: body ?? {} })).data,
    put: async <T>(path: string, body?: unknown, o?: RequestOptions) => (await raw<T>('PUT', path, { ...o, body: body ?? {} })).data,
    patch: async <T>(path: string, body?: unknown, o?: RequestOptions) => (await raw<T>('PATCH', path, { ...o, body: body ?? {} })).data,
    delete: async <T>(path: string, o?: RequestOptions) => (await raw<T>('DELETE', path, o)).data,
  };
}
