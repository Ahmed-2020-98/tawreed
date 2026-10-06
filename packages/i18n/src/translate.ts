import type { Locale } from './locales.js';
import { ar } from './messages/ar.js';
import { en } from './messages/en.js';

export type Messages = typeof ar;
export const messages: Record<Locale, Messages> = { ar, en };

type Params = Record<string, string | number | null | undefined>;

/** Walks a dotted path; flat keys that themselves contain dots (e.g. timeline "shipment.in_transit") match longest-first. */
function lookup(tree: unknown, key: string): unknown {
  const walk = (node: unknown, parts: string[]): unknown => {
    if (!parts.length) return node;
    if (!node || typeof node !== 'object') return undefined;
    for (let i = parts.length; i >= 1; i--) {
      const child = (node as Record<string, unknown>)[parts.slice(0, i).join('.')];
      if (child !== undefined) {
        const found = walk(child, parts.slice(i));
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  return walk(tree, key.split('.'));
}

/** Resolves a dotted key (e.g. "errors.OUT_OF_STOCK") with {param} interpolation; falls back to Arabic then the key. */
export function translate(locale: Locale, key: string, params?: Params): string {
  const raw = lookup(messages[locale], key) ?? lookup(messages.ar, key);
  if (typeof raw !== 'string') return key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, p: string) => {
    const v = params[p];
    return v === null || v === undefined ? '' : String(v);
  });
}

export const createTranslator = (locale: Locale) => (key: string, params?: Params) => translate(locale, key, params);

/** Label for an enum value: enums.<EnumName>.<VALUE>. */
export const enumLabel = (locale: Locale, enumName: string, value: string | null | undefined) =>
  value ? translate(locale, `enums.${enumName}.${value}`) : '—';
