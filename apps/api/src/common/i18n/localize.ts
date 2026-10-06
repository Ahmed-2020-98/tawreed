import type { Locale } from '@tawreed/i18n';
import { RequestContext } from '../context/request-context.js';

/** Picks the Arabic or English variant for the current request locale. */
export function loc(ar: string, en: string, locale: Locale = RequestContext.locale()): string {
  return locale === 'en' ? en || ar : ar || en;
}

export function locNullable(ar: string | null | undefined, en: string | null | undefined, locale: Locale = RequestContext.locale()): string | null {
  const v = locale === 'en' ? (en ?? ar) : (ar ?? en);
  return v ?? null;
}
