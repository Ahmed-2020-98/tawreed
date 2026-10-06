import { z } from 'zod';

/* ---------------------------------------------------------------- primitives */

export const uuid = z.uuid();

/** Normalises Saudi mobile numbers (05xxxxxxxx, 5xxxxxxxx, 9665…, +9665…, 009665…) to E.164. */
export function normalizeSaudiPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '').replace(/^00/, '+');
  const local = digits.replace(/^\+?966/, '').replace(/^0/, '');
  return /^5\d{8}$/.test(local) ? `+966${local}` : null;
}

export const saudiPhone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeSaudiPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'errors.invalidPhone' });
      return z.NEVER;
    }
    return normalized;
  });

/** Decimal string with up to `scale` fraction digits (API money/qty wire format). */
export const decimalString = (scale = 2) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'number' ? v.toString() : v.trim()))
    .refine((v) => new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`).test(v), { message: 'errors.invalidNumber' });

export const money = decimalString(2);
export const quantity = decimalString(3).refine((v) => Number(v) > 0, { message: 'errors.positiveNumber' });

export const localizedText = z.object({ ar: z.string().trim().min(1), en: z.string().trim().min(1) });

export const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v === '' ? undefined : v));

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'errors.invalidDate');

export const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/* ---------------------------------------------------------------- pagination */

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(60).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

export interface PageMeta {
  [key: string]: unknown;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* ---------------------------------------------------------------- envelopes */

export interface ApiData<T> {
  data: T;
}
export interface ApiPage<T> {
  data: T[];
  meta: PageMeta;
}
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/** Money as returned by the API: decimal string in SAR, e.g. "1250.50". */
export type Money = string;
/** Quantity decimal string (up to 3 decimals). */
export type Qty = string;
/** ISO-8601 timestamp string. */
export type Timestamp = string;

export interface Localized {
  ar: string;
  en: string;
}

export interface ImageRef {
  url: string;
  thumbUrl?: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
}

export interface CityRef {
  id: string;
  slug: string;
  name: Localized;
}
