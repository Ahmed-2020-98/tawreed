/** Localized country name + flag emoji from an ISO-3166 alpha-2 code. */
export function country(code: string | null | undefined, locale: string): { name: string; flag: string } | null {
  if (!code || code.length !== 2) return null;
  const upper = code.toUpperCase();
  let name = upper;
  try {
    name = new Intl.DisplayNames([locale === 'ar' ? 'ar' : 'en'], { type: 'region' }).of(upper) ?? upper;
  } catch {
    /* keep the code */
  }
  const flag = String.fromCodePoint(...[...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return { name, flag };
}
