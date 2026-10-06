type Primitive = string | number | boolean | null | undefined;
export type QueryParams = Record<string, Primitive | Primitive[]>;

/** Serialises params to a query string, skipping empty values; arrays repeat the key. */
export function toQueryString(params?: QueryParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) if (v !== undefined && v !== null && v !== '') search.append(key, String(v));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
