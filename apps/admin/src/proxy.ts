import { refreshInProxy, withRefreshedCookies } from '@tawreed/next-kit/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { bff } from './lib/config';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Rotate an expiring access token before rendering so Server Components always see a valid session.
  const refreshed = await refreshInProxy(bff, request);
  return withRefreshedCookies(request, intl(request), refreshed);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
