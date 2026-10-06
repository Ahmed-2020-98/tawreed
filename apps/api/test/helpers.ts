import type { AddressInfo } from 'node:net';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApp } from '../src/bootstrap.js';
import { OutboxDispatcher } from '../src/infrastructure/outbox/outbox.dispatcher.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';

export interface ApiResponse<T = any> {
  status: number;
  body: { data: T; meta?: Record<string, unknown>; error: { code: string; message: string; details?: unknown; requestId?: string } };
  headers: Headers;
}

export interface TestApi {
  app: NestExpressApplication;
  prisma: PrismaService;
  baseUrl: string;
  req<T = any>(method: string, path: string, opts?: { token?: string; body?: unknown; headers?: Record<string, string> }): Promise<ApiResponse<T>>;
  get<T = any>(path: string, token?: string): Promise<ApiResponse<T>>;
  post<T = any>(path: string, body?: unknown, token?: string, headers?: Record<string, string>): Promise<ApiResponse<T>>;
  /** Phone OTP login (dev code 123456); tokens are cached per phone+app for the file. */
  login(phone: string, app?: string): Promise<string>;
  loginFull(phone: string, app?: string): Promise<any>;
  staffLogin(email?: string, password?: string): Promise<string>;
  drain(): Promise<void>;
  close(): Promise<void>;
}

export async function bootApi(): Promise<TestApi> {
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const tokens = new Map<string, string>();

  const req: TestApi['req'] = async (method, path, opts = {}) => {
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
        ...opts.headers,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let body: any = text;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      /* non-JSON (PDF etc.) */
    }
    return { status: res.status, body, headers: res.headers };
  };

  const loginFull = async (phone: string, client = 'WEB') => {
    let r1 = await req('POST', '/auth/otp/request', { body: { phone, app: client } });
    if (r1.status === 429 && r1.body.error?.code === 'OTP_RESEND_TOO_SOON') {
      await new Promise((r) => setTimeout(r, 1_100));
      r1 = await req('POST', '/auth/otp/request', { body: { phone, app: client } });
    }
    if (r1.status >= 300) throw new Error(`otp/request ${phone}: ${r1.status} ${JSON.stringify(r1.body)}`);
    const r2 = await req('POST', '/auth/otp/verify', { body: { phone, app: client, code: '123456' } });
    if (r2.status >= 300) throw new Error(`otp/verify ${phone}: ${r2.status} ${JSON.stringify(r2.body)}`);
    return r2.body.data;
  };

  const api: TestApi = {
    app,
    prisma: app.get(PrismaService),
    baseUrl,
    req,
    get: (path, token) => req('GET', path, { token }),
    post: (path, body, token, headers) => req('POST', path, { body: body ?? {}, token, headers }),
    loginFull,
    async login(phone, client = 'WEB') {
      const key = `${phone}:${client}`;
      const cached = tokens.get(key);
      if (cached) return cached;
      const data = await loginFull(phone, client);
      const token = data.tokens.accessToken as string;
      tokens.set(key, token);
      return token;
    },
    async staffLogin(email = 'admin@tawreed.test', password = 'password') {
      const key = `staff:${email}`;
      const cached = tokens.get(key);
      if (cached) return cached;
      const r = await req('POST', '/auth/staff/login', { body: { email, password } });
      if (r.status >= 300) throw new Error(`staff login: ${r.status} ${JSON.stringify(r.body)}`);
      tokens.set(key, r.body.data.tokens.accessToken);
      return r.body.data.tokens.accessToken;
    },
    async drain() {
      const outbox = app.get(OutboxDispatcher);
      while ((await outbox.drainInline(500)) > 0);
    },
    close: () => app.close(),
  };
  return api;
}

/** Tomorrow-or-later delivery slot for a supplier from checkout options. */
export function firstSlot(options: any, supplierId: string): { supplierId: string; date: string; window: string } {
  const s = options.deliverySlots.find((d: any) => d.supplierId === supplierId);
  if (!s?.slots.length) throw new Error(`no delivery slots for supplier ${supplierId}`);
  return { supplierId, date: s.slots[0].date, window: s.slots[0].windows[0] };
}
