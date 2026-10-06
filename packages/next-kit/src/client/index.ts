import { createApiClient } from '@tawreed/api-client';

/** Browser API client — goes through the app's BFF proxy so tokens never touch JavaScript. */
export function createBrowserApi(locale?: string | (() => string | undefined)) {
  return createApiClient({ baseUrl: '/api/proxy', locale });
}

type AuthAction = 'otp-request' | 'otp-verify' | 'register' | 'staff-login' | 'switch-context' | 'logout';

/** Calls the BFF auth routes (which set/clear the httpOnly session cookies). */
export function createBrowserAuth(locale?: string) {
  const client = createApiClient({ baseUrl: '/api/auth', locale });
  return <T = unknown>(action: AuthAction, body: unknown = {}) => client.post<T>(`/${action}`, body);
}
