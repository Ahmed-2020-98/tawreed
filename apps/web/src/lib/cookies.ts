/** Browser-side preference cookie (non-sensitive: city, UI prefs). */
export function setCookie(name: string, value: string, maxAgeDays = 365) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeDays * 86_400}; samesite=lax`;
}
