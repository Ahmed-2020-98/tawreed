import type { BffConfig } from '@tawreed/next-kit';

export const bff: BffConfig = {
  apiOrigin: process.env.API_ORIGIN ?? 'http://localhost:8030',
  app: 'WEB',
  cookiePrefix: 'twb',
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3030';
/** Supplier web portal; until it ships, supplier links point to the apps section. */
export const SUPPLIER_URL = process.env.NEXT_PUBLIC_SUPPLIER_URL;
export const PUBLIC_API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:8030';
/** Base URL of public files: the API's /files/p locally, the Blob store's /p on Vercel (skips a redirect per image). */
export const PUBLIC_MEDIA_BASE = process.env.NEXT_PUBLIC_MEDIA_BASE ?? `${PUBLIC_API_ORIGIN}/files/p`;
