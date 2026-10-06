import type { ProductCardDto, ProductFacetsDto } from '@tawreed/contracts';
import { EmptyState, Pagination } from '@tawreed/ui';
import { PackageSearch } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { catalogContext, listQueryFrom } from '@/lib/catalog';
import { ActiveChips, Filters, MobileFilters, SortSelect } from './listing-controls';
import { ProductCard, ProductGrid } from './product-card';

type Search = Record<string, string | string[] | undefined>;

export async function ProductListing({ searchParams, base = {}, basePath, hideFilters = [], empty }: { searchParams: Search; base?: Record<string, string | boolean>; basePath: string; hideFilters?: ('brand' | 'origin' | 'storage')[]; empty?: React.ReactNode }) {
  const t = await getTranslations('store');
  const tc = await getTranslations('common');
  const { api, city } = await catalogContext();
  const query = { ...listQueryFrom(searchParams, base), city };
  const [page, facets] = await Promise.all([
    api.page<ProductCardDto>('/public/products', { query, cache: 'no-store' }),
    api.get<ProductFacetsDto>('/public/products/facets', { query: { ...query, page: undefined, pageSize: undefined, sort: undefined }, cache: 'no-store' }),
  ]);
  const labels: Record<string, string> = Object.fromEntries([...facets.brands.map((b): [string, string] => [`brand:${b.value}`, b.label]), ...facets.origins.map((o): [string, string] => [`origin:${o.value}`, o.label])]);
  const href = (p: number) => {
    const qs = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v[0]! : v]])));
    if (p > 1) qs.set('page', String(p));
    else qs.delete('page');
    const s = qs.toString();
    return `${basePath}${s ? `?${s}` : ''}`;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-44 rounded-2xl border border-gray-200/80 bg-white p-4">
          <Filters facets={facets} hide={hideFilters} />
        </div>
      </aside>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MobileFilters facets={facets} hide={hideFilters} />
            <p className="text-sm font-semibold text-gray-600">{t('results', { count: page.meta.total })}</p>
          </div>
          <SortSelect />
        </div>
        <div className="mb-4">
          <ActiveChips labels={labels} />
        </div>
        {page.data.length ? (
          <>
            <ProductGrid>
              {page.data.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </ProductGrid>
            <Pagination className="mt-10" page={page.meta.page} totalPages={page.meta.totalPages} href={href} LinkComponent={Link} labels={{ prev: tc('previous'), next: tc('next') }} />
          </>
        ) : (
          (empty ?? <EmptyState className="rounded-2xl border border-dashed border-gray-300 bg-white" icon={<PackageSearch />} title={t('searchEmpty')} description={t('searchEmptyBody')} />)
        )}
      </div>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-gray-300">/</span>}
            {i.href ? (
              <Link href={i.href} className="hover:text-brand-700">
                {i.label}
              </Link>
            ) : (
              <span className="font-semibold text-gray-800">{i.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
