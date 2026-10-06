import type { AuthResult } from '@tawreed/contracts';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { apiBase, type BffConfig, cookieNames } from './config';
import { refreshSession } from './refresh';
import { clearedCookies, type CookieWrite, sessionCookies } from './tokens';

const HOP_HEADERS = ['host', 'connection', 'content-length', 'cookie', 'authorization', 'accept-encoding'];
const PASS_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'cache-control', 'x-request-id', 'location'];

function apply(res: NextResponse, writes: CookieWrite[]) {
  for (const c of writes) res.cookies.set(c.name, c.value, c.options);
  return res;
}

async function forward(config: BffConfig, req: NextRequest, path: string, body: ArrayBuffer | undefined, token?: string): Promise<Response> {
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP_HEADERS.includes(k)) headers.set(k, v);
  });
  if (token) headers.set('authorization', `Bearer ${token}`);
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) headers.set('x-forwarded-for', fwd);
  return fetch(`${apiBase(config)}/${path}${new URL(req.url).search}`, { method: req.method, headers, body, cache: 'no-store', redirect: 'manual' });
}

function toNext(res: Response, body: ArrayBuffer | null): NextResponse {
  const out = new NextResponse(body, { status: res.status });
  for (const h of PASS_RESPONSE_HEADERS) {
    const v = res.headers.get(h);
    if (v) out.headers.set(h, v);
  }
  return out;
}

/** Route handlers for a Next.js app acting as BFF in front of the Tawreed API. */
export function createBffRoutes(config: BffConfig) {
  const names = cookieNames(config);

  /** app/api/proxy/[...path]/route.ts — forwards to the API with the session token, refreshing once on 401. */
  async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    const { path } = await ctx.params;
    const joined = path.map(encodeURIComponent).join('/');
    const jar = await cookies();
    let token = jar.get(names.access)?.value;
    const refresh = jar.get(names.refresh)?.value;
    const writes: CookieWrite[] = [];
    if (!token && refresh) {
      const r = await refreshSession(config, refresh);
      writes.push(...r.cookies);
      token = r.accessToken;
    }
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();
    let res = await forward(config, req, joined, body, token);
    if (res.status === 401 && refresh && !writes.length) {
      const r = await refreshSession(config, refresh);
      writes.push(...r.cookies);
      if (r.ok) res = await forward(config, req, joined, body, r.accessToken);
    }
    return apply(toNext(res, res.status === 204 ? null : await res.arrayBuffer()), writes);
  }

  async function call<T>(path: string, body: unknown, token?: string): Promise<{ status: number; json: { data?: T; error?: unknown } }> {
    const res = await fetch(`${apiBase(config)}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return { status: res.status, json: (await res.json().catch(() => ({}))) as { data?: T; error?: unknown } };
  }

  /** Strips tokens from an auth result and stores them as httpOnly cookies. */
  function authResponse(status: number, json: { data?: AuthResult; error?: unknown }) {
    if (!json.data || json.data.status !== 'AUTHENTICATED') return NextResponse.json(json, { status });
    const { tokens, ...rest } = json.data;
    return apply(NextResponse.json({ data: rest }, { status }), sessionCookies(config, tokens));
  }

  /** app/api/auth/[action]/route.ts (POST). */
  async function auth(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
    const { action } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const token = (await cookies()).get(names.access)?.value;
    switch (action) {
      case 'otp-request': {
        const r = await call('/auth/otp/request', { ...body, app: config.app });
        return NextResponse.json(r.json, { status: r.status });
      }
      case 'otp-verify': {
        const r = await call<AuthResult>('/auth/otp/verify', { ...body, app: config.app });
        return authResponse(r.status, r.json);
      }
      case 'register': {
        const r = await call<AuthResult>('/auth/register/buyer', body);
        return authResponse(r.status, r.json);
      }
      case 'staff-login': {
        const r = await call<AuthResult>('/auth/staff/login', body);
        return authResponse(r.status, r.json);
      }
      case 'switch-context': {
        const r = await call<AuthResult>('/auth/switch-context', body, token);
        return authResponse(r.status, r.json);
      }
      case 'logout': {
        if (token) await call('/auth/logout', {}, token).catch(() => undefined);
        return apply(NextResponse.json({ data: { ok: true } }), clearedCookies(config));
      }
      default:
        return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Unknown auth action' } }, { status: 404 });
    }
  }

  return { proxy, auth };
}
