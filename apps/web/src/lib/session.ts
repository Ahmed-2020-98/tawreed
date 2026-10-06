import 'server-only';
import type { MeResponse, PublicSettingsDto } from '@tawreed/contracts';
import { cache } from 'react';
import { isSignedIn, publicApi, serverApi } from './api';

/** Current buyer session (null for guests). Deduplicated per request. */
export const getSession = cache(async (locale: string): Promise<MeResponse | null> => {
  if (!(await isSignedIn())) return null;
  try {
    const api = await serverApi(locale);
    return await api.get<MeResponse>('/auth/me', { cache: 'no-store' });
  } catch {
    return null;
  }
});

export const getSettings = cache(async (locale: string): Promise<PublicSettingsDto> => {
  return publicApi(locale).get<PublicSettingsDto>('/public/settings', { next: { revalidate: 300 } });
});

/** Redirects guests (or non-buyer sessions) to login, returning the buyer session. */
export async function requireBuyer(locale: string, next: string): Promise<MeResponse> {
  const me = await getSession(locale);
  if (!me || me.context.type !== 'BUYER') {
    const { redirect } = await import('@/i18n/navigation');
    return redirect({ href: `/login?next=${encodeURIComponent(next)}`, locale });
  }
  return me;
}
