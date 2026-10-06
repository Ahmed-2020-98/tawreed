import { createApiClient } from '@tawreed/api-client';
import type { AuthResult, AuthTokens } from '@tawreed/contracts';
import * as SecureStore from 'expo-secure-store';
import { apiOrigin, appClient } from '../config';

const KEY = `tw_session_${appClient()}`;
let tokens: AuthTokens | null = null;
let locale = 'ar';
let refreshing: Promise<boolean> | null = null;
const listeners = new Set<(signedIn: boolean) => void>();

export const setApiLocale = (l: string) => {
  locale = l;
};
export const onSessionChange = (fn: (signedIn: boolean) => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export async function loadTokens(): Promise<AuthTokens | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  tokens = raw ? (JSON.parse(raw) as AuthTokens) : null;
  return tokens;
}

export async function saveTokens(next: AuthTokens | null) {
  tokens = next;
  if (next) await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  else await SecureStore.deleteItemAsync(KEY);
  listeners.forEach((l) => l(!!next));
}

export const accessToken = () => tokens?.accessToken ?? null;

/** Rotates the refresh token once even if many requests hit 401 together. */
export function refreshSession(): Promise<boolean> {
  if (!tokens?.refreshToken) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${apiOrigin()}/api/v1/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: tokens?.refreshToken }) });
      if (res.status === 409) return true; // another refresh won the race moments ago
      if (!res.ok) {
        await saveTokens(null);
        return false;
      }
      const { data } = (await res.json()) as { data: AuthResult };
      if (data.status !== 'AUTHENTICATED') return false;
      await saveTokens(data.tokens);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export const api = createApiClient({
  baseUrl: `${apiOrigin()}/api/v1`,
  getToken: accessToken,
  locale: () => locale,
  onUnauthorized: refreshSession,
});

/** Stores tokens from an AUTHENTICATED result (OTP verify / register / switch context). */
export async function acceptAuthResult(result: AuthResult) {
  if (result.status === 'AUTHENTICATED') await saveTokens(result.tokens);
  return result;
}

export async function signOut() {
  if (tokens) await api.post('/auth/logout').catch(() => undefined);
  await saveTokens(null);
}
