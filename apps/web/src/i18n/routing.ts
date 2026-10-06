import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  // Arabic lives at "/", English at "/en".
  localePrefix: 'as-needed',
  // Saudi-first: "/" is always Arabic; visitors switch explicitly (saved in the locale cookie).
  localeDetection: false,
  localeCookie: { name: 'twb_locale', maxAge: 60 * 60 * 24 * 365 },
});

export type AppLocale = (typeof routing.locales)[number];
