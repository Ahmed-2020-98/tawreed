import type { BffConfig } from '@tawreed/next-kit';

export const bff: BffConfig = {
  apiOrigin: process.env.API_ORIGIN ?? 'http://localhost:8030',
  app: 'ADMIN',
  // Distinct from the store (twb) — every localhost port shares one cookie jar.
  cookiePrefix: 'twa',
};

/** Storefront, for "view on site" links. */
export const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3030';
