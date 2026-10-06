import 'server-only';
import type { MeResponse } from '@tawreed/contracts';
import { cache } from 'react';
import { isSignedIn, serverApi } from './api';

/** Current staff session (null when signed out or not staff). Deduplicated per request. */
export const getStaff = cache(async (locale: string): Promise<MeResponse | null> => {
  if (!(await isSignedIn())) return null;
  try {
    const api = await serverApi(locale);
    const me = await api.get<MeResponse>('/auth/me', { cache: 'no-store' });
    return me.context.type === 'STAFF' ? me : null;
  } catch {
    return null;
  }
});

/** Redirects to the login page unless a staff member is signed in. */
export async function requireStaff(locale: string): Promise<MeResponse> {
  const me = await getStaff(locale);
  if (!me) {
    const { redirect } = await import('@/i18n/navigation');
    return redirect({ href: '/login', locale });
  }
  return me;
}
