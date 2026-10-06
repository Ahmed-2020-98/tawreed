'use client';

import type { ProductFacetsDto } from '@tawreed/contracts';
import { Button, Checkbox, cn, Input, Select, Sheet, SheetContent, SheetTrigger } from '@tawreed/ui';
import { SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

const SORTS = ['relevance', 'best_selling', 'price_asc', 'price_desc', 'newest', 'rating'] as const;

function useParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page');
    start(() => router.push(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false }));
  };
  return { params, update, pending };
}

export function SortSelect() {
  const t = useTranslations('store');
  const { params, update } = useParamsUpdater();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-gray-500 sm:inline">{t('sort')}</span>
      <Select aria-label={t('sort')} className="h-10 w-48" value={params.get('sort') ?? 'relevance'} onValueChange={(v) => update({ sort: v === 'relevance' ? null : v })} options={SORTS.map((s) => ({ value: s, label: t(`sorts.${s}`) }))} />
    </div>
  );
}

function toggleCsv(csv: string | null, value: string) {
  const set = new Set((csv ?? '').split(',').filter(Boolean));
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set].join(',') || null;
}

export function Filters({ facets, hide = [] }: { facets: ProductFacetsDto; hide?: ('brand' | 'origin' | 'storage')[] }) {
  const t = useTranslations('store');
  const te = useTranslations('enums.StorageType');
  const { params, update, pending } = useParamsUpdater();
  const [min, setMin] = useState(params.get('minPrice') ?? '');
  const [max, setMax] = useState(params.get('maxPrice') ?? '');
  const active = ['brand', 'origin', 'storage', 'minPrice', 'maxPrice', 'inStock', 'onDeal'].some((k) => params.get(k));

  const group = (title: string, children: React.ReactNode) => (
    <fieldset className="border-b border-gray-100 py-4 last:border-0">
      <legend className="mb-3 text-sm font-extrabold text-gray-900">{title}</legend>
      {children}
    </fieldset>
  );
  const checks = (key: 'brand' | 'origin', values: ProductFacetsDto['brands']) => (
    <ul className="max-h-56 space-y-2.5 overflow-y-auto pe-1">
      {values.map((v) => {
        const checked = (params.get(key) ?? '').split(',').includes(v.value);
        return (
          <li key={v.value}>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
              <Checkbox checked={checked} onCheckedChange={() => update({ [key]: toggleCsv(params.get(key), v.value) })} />
              <span className="flex-1 truncate">{v.label}</span>
              <span className="num text-xs text-gray-400">{v.count}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className={cn('transition', pending && 'pointer-events-none opacity-60')}>
      <div className="flex items-center justify-between pb-2">
        <p className="flex items-center gap-2 font-extrabold text-navy-900">
          <SlidersHorizontal className="size-4" />
          {t('filters')}
        </p>
        {active && (
          <button type="button" onClick={() => update({ brand: null, origin: null, storage: null, minPrice: null, maxPrice: null, inStock: null, onDeal: null })} className="text-xs font-bold text-red-600 hover:underline">
            {t('clearFilters')}
          </button>
        )}
      </div>
      {group(
        t('availability'),
        <div className="space-y-2.5">
          {(['inStock', 'onDeal'] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
              <Checkbox checked={params.get(k) === 'true'} onCheckedChange={(c) => update({ [k]: c ? 'true' : null })} />
              {k === 'inStock' ? t('inStockOnly') : t('dealsOnly')}
            </label>
          ))}
        </div>,
      )}
      {!hide.includes('brand') && facets.brands.length > 0 && group(t('brand'), checks('brand', facets.brands))}
      {!hide.includes('origin') && facets.origins.length > 0 && group(t('origin'), checks('origin', facets.origins))}
      {!hide.includes('storage') && facets.storageTypes.length > 1 &&
        group(
          t('storage'),
          <div className="flex flex-wrap gap-2">
            {facets.storageTypes.map((s) => {
              const on = params.get('storage') === s.value;
              return (
                <button key={s.value} type="button" onClick={() => update({ storage: on ? null : s.value })} className={cn('rounded-full border px-3 py-1.5 text-xs font-bold transition', on ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  {te(s.value as 'AMBIENT')} <span className="num opacity-60">({s.count})</span>
                </button>
              );
            })}
          </div>,
        )}
      {group(
        t('price'),
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ minPrice: min || null, maxPrice: max || null });
          }}
        >
          <Input inputSize="sm" inputMode="numeric" placeholder={facets.priceRange ? String(Math.floor(Number(facets.priceRange.min))) : t('min')} aria-label={t('min')} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} />
          <span className="text-gray-400">–</span>
          <Input inputSize="sm" inputMode="numeric" placeholder={facets.priceRange ? String(Math.ceil(Number(facets.priceRange.max))) : t('max')} aria-label={t('max')} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} />
          <Button type="submit" size="sm" variant="secondary">
            ✓
          </Button>
        </form>,
      )}
    </div>
  );
}

export function MobileFilters({ facets, hide }: { facets: ProductFacetsDto; hide?: ('brand' | 'origin' | 'storage')[] }) {
  const t = useTranslations('store');
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal />
          {t('filters')}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" title={t('filters')}>
        <div className="px-5 pb-6">
          <Filters facets={facets} hide={hide} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ActiveChips({ labels }: { labels: Record<string, string> }) {
  const { params, update } = useParamsUpdater();
  const chips: { key: string; value: string; label: string }[] = [];
  for (const key of ['brand', 'origin']) for (const v of (params.get(key) ?? '').split(',').filter(Boolean)) chips.push({ key, value: v, label: labels[`${key}:${v}`] ?? v });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button key={`${c.key}-${c.value}`} type="button" onClick={() => update({ [c.key]: toggleCsv(params.get(c.key), c.value) })} className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold text-white">
          {c.label}
          <X className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
