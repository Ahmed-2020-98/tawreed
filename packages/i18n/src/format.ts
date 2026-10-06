import { intlLocale, TIME_ZONE, type Locale } from './locales.js';

type Numeric = number | string | null | undefined;
const toNumber = (v: Numeric) => (v === null || v === undefined || v === '' ? 0 : Number(v));

/**
 * Arabic-Indic / Persian digits and separators → Latin. Some engines (Hermes on React Native)
 * ignore the `-u-nu-latn` extension, so every formatter output is normalized for consistency.
 */
export function latinize(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',');
}

interface Formatter<T> {
  format: (v: T) => string;
}
const cache = new Map<string, Formatter<never>>();
function nf(locale: Locale, opts: Intl.NumberFormatOptions): Formatter<number> {
  const key = `n|${locale}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as Formatter<number> | undefined;
  if (!f) {
    const intl = new Intl.NumberFormat(intlLocale(locale), opts);
    f = { format: (v: number) => latinize(intl.format(v)) };
    cache.set(key, f);
  }
  return f;
}
function df(locale: Locale, opts: Intl.DateTimeFormatOptions): Formatter<Date> {
  const key = `d|${locale}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as Formatter<Date> | undefined;
  if (!f) {
    const intl = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TIME_ZONE, ...opts });
    f = { format: (v: Date) => latinize(intl.format(v)) };
    cache.set(key, f);
  }
  return f;
}

export const currencySymbol = (locale: Locale) => (locale === 'ar' ? 'ر.س' : 'SAR');

/** 1250.5 → "1,250.50 ر.س" / "SAR 1,250.50". */
export function formatMoney(value: Numeric, locale: Locale, opts: { symbol?: boolean; decimals?: number } = {}): string {
  const { symbol = true, decimals = 2 } = opts;
  const amount = nf(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(toNumber(value));
  if (!symbol) return amount;
  return locale === 'ar' ? `${amount} ${currencySymbol(locale)}` : `${currencySymbol(locale)} ${amount}`;
}

export function formatNumber(value: Numeric, locale: Locale, maxDecimals = 2): string {
  return nf(locale, { maximumFractionDigits: maxDecimals }).format(toNumber(value));
}

/** Quantities keep up to 3 decimals and drop trailing zeros. */
export const formatQty = (value: Numeric, locale: Locale) => formatNumber(value, locale, 3);

export function formatPercent(value: Numeric, locale: Locale, decimals = 0): string {
  return nf(locale, { style: 'percent', maximumFractionDigits: decimals }).format(toNumber(value));
}

export function formatDate(value: string | Date | null | undefined, locale: Locale, style: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'numeric', year: 'numeric' }
      : style === 'medium'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return df(locale, opts).format(d);
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return df(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
}

export function formatTime(value: string | Date | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return df(locale, { hour: 'numeric', minute: '2-digit' }).format(d);
}

/** Relative time like "منذ 5 دقائق" / "5 minutes ago". */
export function formatRelative(value: string | Date, locale: Locale, now: Date = new Date()): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const intlRtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });
  const rtf = { format: (v: number, u: Intl.RelativeTimeFormatUnit) => latinize(intlRtf.format(v, u)) };
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return formatDate(d, locale);
}

/** Masks a Saudi phone for display: +966 5X XXX XX12 style. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const m = /^\+966(5\d)(\d{3})(\d{4})$/.exec(phone);
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : phone;
}
