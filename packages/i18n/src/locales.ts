export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const DEFAULT_LOCALE: Locale = 'ar';
export const TIME_ZONE = 'Asia/Riyadh';

export function isLocale(value: unknown): value is Locale {
  return value === 'ar' || value === 'en';
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const first = value.split(',')[0]?.trim().slice(0, 2).toLowerCase();
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export const isRtl = (locale: Locale) => locale === 'ar';
export const dir = (locale: Locale) => (isRtl(locale) ? 'rtl' : 'ltr');

/** Intl locale tags: Arabic with Latin digits + Gregorian calendar (matches Saudi B2B usage). */
export const intlLocale = (locale: Locale) => (locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-SA');
