import type { AuthResult } from '@tawreed/contracts';
import { NextResponse, type NextRequest } from 'next/server';
import { apiBase, type BffConfig, cookieNames } from './config';
import { clearedCookies, type CookieWrite, secondsLeft, sessionCookies } from './tokens';

/** Calls the API refresh endpoint. Returns cookies to write, or cleared cookies when the session is gone. */
export async function refreshSession(config: BffConfig, refreshToken: string): Promise<{ ok: boolean; cookies: CookieWrite[]; accessToken?: string }> {
  try {
    const res = await fetch(`${apiBase(config)}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }), cache: 'no-store' });
    // 409 = another tab refreshed a moment ago; keep the cookies and let the next request pick up the winner's.
    if (res.status === 409) return { ok: false, cookies: [] };
    if (!res.ok) return { ok: false, cookies: clearedCookies(config) };
    const { data } = (await res.json()) as { data: AuthResult };
    if (data.status !== 'AUTHENTICATED') return { ok: false, cookies: clearedCookies(config) };
    return { ok: true, cookies: sessionCookies(config, data.tokens), accessToken: data.tokens.accessToken };
  } catch {
    return { ok: false, cookies: [] };
  }
}

/**
 * For proxy.ts: refreshes an expiring access token *before* rendering so Server Components see a valid token,
 * and the rotated cookies reach the browser. Mutates `request.cookies`; returns the cookies to write (or null).
 */
export async function refreshInProxy(config: BffConfig, request: NextRequest): Promise<CookieWrite[] | null> {
  const names = cookieNames(config);
  const refresh = request.cookies.get(names.refresh)?.value;
  if (!refresh || secondsLeft(request.cookies.get(names.access)?.value) > 60) return null;
  const result = await refreshSession(config, refresh);
  if (!result.cookies.length) return null;
  for (const c of result.cookies) {
    if (c.value) request.cookies.set(c.name, c.value);
    else request.cookies.delete(c.name);
  }
  return result.cookies;
}

/** Merges refreshed cookies into the response produced by the rest of the proxy chain (e.g. next-intl). */
export function withRefreshedCookies(request: NextRequest, response: NextResponse, cookies: CookieWrite[] | null): NextResponse {
  if (!cookies) return response;
  let out = response;
  const isRedirect = response.status >= 300 && response.status < 400;
  if (!isRedirect) {
    // Forward the updated Cookie header to the render while keeping next-intl's rewrite/headers.
    out = NextResponse.next({ request: { headers: request.headers } });
    response.headers.forEach((value, key) => {
      if (key !== 'set-cookie' && !key.startsWith('x-middleware-override-headers') && !key.startsWith('x-middleware-request-')) out.headers.set(key, value);
    });
    for (const c of response.cookies.getAll()) out.cookies.set(c);
  }
  for (const c of cookies) out.cookies.set(c.name, c.value, c.options);
  return out;
}
