import 'server-only';
import { cookies } from 'next/headers';

export const CITY_COOKIE = 'twb_city';

/** Guest delivery city (buyers use their default address server-side). */
export async function getCitySlug(fallback = 'riyadh'): Promise<string> {
  return (await cookies()).get(CITY_COOKIE)?.value ?? fallback;
}
