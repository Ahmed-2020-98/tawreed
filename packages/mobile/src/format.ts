import { formatDate, formatDateTime, formatMoney, formatQty, formatRelative, type Locale } from '@tawreed/i18n';
import { useMemo } from 'react';
import { useLocale } from './i18n';

export function useFormat() {
  const { locale } = useLocale();
  return useMemo(() => {
    const l: Locale = locale;
    return {
      locale: l,
      money: (v: string | number | null | undefined, opts?: { symbol?: boolean; decimals?: number }) => (v == null ? '—' : formatMoney(v, l, opts)),
      qty: (v: string | number) => formatQty(v, l),
      date: (v: string | Date | null | undefined) => (v ? formatDate(v, l) : '—'),
      dateTime: (v: string | Date | null | undefined) => (v ? formatDateTime(v, l) : '—'),
      relative: (v: string | Date) => formatRelative(v, l),
      pick: (v: { ar: string; en: string } | string | null | undefined) => (v == null ? '' : typeof v === 'string' ? v : l === 'en' ? v.en : v.ar),
    };
  }, [locale]);
}
