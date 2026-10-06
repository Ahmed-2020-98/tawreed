import 'server-only';
import type { ProductListQuery } from '@tawreed/contracts';
import { getLocale } from 'next-intl/server';
import { getCitySlug } from './city';
import { serverApi } from './api';
import { getSession } from './session';

/** API client + delivery city for catalog reads (buyers → their address city, guests → cookie). */
export async function catalogContext() {
  const locale = await getLocale();
  const [api, me] = await Promise.all([serverApi(locale), getSession(locale)]);
  const city = me?.context.type === 'BUYER' ? undefined : await getCitySlug();
  return { api, city, locale, me };
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Maps URL search params to the product list query. */
export function listQueryFrom(sp: Search, base: Partial<ProductListQuery> = {}): Record<string, string | number | boolean | undefined> {
  return {
    q: one(sp.q),
    category: one(sp.category),
    brand: one(sp.brand),
    origin: one(sp.origin),
    storage: one(sp.storage),
    minPrice: one(sp.minPrice),
    maxPrice: one(sp.maxPrice),
    inStock: one(sp.inStock),
    onDeal: one(sp.onDeal),
    sort: one(sp.sort),
    page: Number(one(sp.page) ?? 1) || 1,
    pageSize: 24,
    ...(base as Record<string, string | number | boolean | undefined>),
  };
}
