import type { AuthTokens } from '@tawreed/contracts';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { type BffConfig, cookieNames } from './config';

const REFRESH_MAX_AGE = 30 * 24 * 3600;

/** Seconds until the JWT expires (negative when expired, -1 when unreadable). */
export function secondsLeft(jwt: string | undefined): number {
  if (!jwt) return -1;
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: number };
    return payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : -1;
  } catch {
    return -1;
  }
}

export interface CookieWrite {
  name: string;
  value: string;
  options: Partial<ResponseCookie>;
}

export function sessionCookies(config: BffConfig, tokens: AuthTokens): CookieWrite[] {
  const names = cookieNames(config);
  const base = { httpOnly: true, sameSite: 'lax' as const, secure: config.secure ?? process.env.NODE_ENV === 'production', path: '/' };
  const accessAge = Math.max(60, Math.floor((new Date(tokens.accessTokenExpiresAt).getTime() - Date.now()) / 1000));
  return [
    { name: names.access, value: tokens.accessToken, options: { ...base, maxAge: accessAge } },
    { name: names.refresh, value: tokens.refreshToken, options: { ...base, maxAge: REFRESH_MAX_AGE } },
  ];
}

export function clearedCookies(config: BffConfig): CookieWrite[] {
  const names = cookieNames(config);
  return [names.access, names.refresh].map((name) => ({ name, value: '', options: { path: '/', maxAge: 0 } }));
}
