import { createApiClient } from '@tawreed/api-client';
import { cookies } from 'next/headers';
import { apiBase, type BffConfig, cookieNames } from './config';

/** API client for Server Components / Server Actions, authenticated with the session cookie when present. */
export function createServerApi(config: BffConfig) {
  return async (locale?: string) => {
    const jar = await cookies();
    const token = jar.get(cookieNames(config).access)?.value;
    return createApiClient({ baseUrl: apiBase(config), getToken: () => token, locale });
  };
}

/** Anonymous API client (safe inside cached/static rendering — never reads cookies). */
export function createPublicApi(config: BffConfig) {
  return (locale?: string) => createApiClient({ baseUrl: apiBase(config), locale });
}

export async function hasSession(config: BffConfig): Promise<boolean> {
  const jar = await cookies();
  const names = cookieNames(config);
  return !!(jar.get(names.access)?.value || jar.get(names.refresh)?.value);
}
