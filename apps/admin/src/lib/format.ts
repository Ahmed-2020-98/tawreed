import { formatDate, formatDateTime, formatMoney, formatQty, formatRelative, type Locale } from '@tawreed/i18n';

export function formatters(locale: string) {
  const l: Locale = locale === 'en' ? 'en' : 'ar';
  return {
    money: (v: string | number | null | undefined, opts?: { symbol?: boolean; decimals?: number }) => (v == null ? '—' : formatMoney(v, l, opts)),
    qty: (v: string | number) => formatQty(v, l),
    date: (v: string | Date | null | undefined) => (v ? formatDate(v, l) : '—'),
    dateTime: (v: string | Date | null | undefined) => (v ? formatDateTime(v, l) : '—'),
    relative: (v: string | Date) => formatRelative(v, l),
    locale: l,
  };
}

/** Picks the current-locale string from an API `{ ar, en }` pair. */
export const pickLocale = (v: { ar: string; en: string } | string | null | undefined, locale: string) => (v == null ? '' : typeof v === 'string' ? v : locale === 'en' ? v.en : v.ar);
