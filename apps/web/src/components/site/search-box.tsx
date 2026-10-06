'use client';

import type { SearchSuggestionsDto } from '@tawreed/contracts';
import { formatMoney } from '@tawreed/i18n';
import { cn } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpLeft, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { useApi } from '@/lib/hooks/use-api';

function useDebounced<T>(value: T, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function SearchBox({ className, defaultValue = '', autoFocus }: { className?: string; defaultValue?: string; autoFocus?: boolean }) {
  const t = useTranslations('header');
  const tc = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';
  const api = useApi();
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const term = useDebounced(q.trim());
  const { data } = useQuery({
    queryKey: ['suggest', term],
    queryFn: () => api.get<SearchSuggestionsDto>('/public/search/suggest', { query: { q: term } }),
    enabled: term.length >= 2,
    staleTime: 60_000,
  });

  useEffect(() => {
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (value = q) => {
    const v = value.trim();
    if (!v) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };
  const s = data;
  const hasAny = !!s && s.products.length + s.categories.length + s.brands.length > 0;

  return (
    <div ref={wrap} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="group flex h-12 items-center rounded-xl border border-gray-200 bg-gray-50 ps-4 pe-1.5 transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-400/15"
      >
        <Search className="size-5 shrink-0 text-gray-400 group-focus-within:text-brand-600" />
        <input
          value={q}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && hasAny}
          role="combobox"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[0.9375rem] outline-none placeholder:text-gray-400"
        />
        {q && (
          <button type="button" aria-label="Clear" onClick={() => setQ('')} className="grid size-8 place-items-center rounded-lg text-gray-400 hover:text-gray-700">
            <X className="size-4" />
          </button>
        )}
        <button type="submit" className="hidden h-9 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-800 sm:block">
          {tc('search')}
        </button>
      </form>

      {open && term.length >= 2 && s && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          {!hasAny ? (
            <p className="p-5 text-center text-sm text-gray-500">{t('suggestions.empty')}</p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto p-2">
              {!!s.products.length && (
                <Group title={t('suggestions.products')}>
                  {s.products.map((p) => (
                    <Link key={p.slug} href={`/product/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-gray-50">
                      <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">{p.imageUrl && <img src={p.imageUrl} alt="" className="size-full object-cover" />}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{p.name}</span>
                      {p.price && <span className="num shrink-0 text-sm font-bold text-brand-800">{formatMoney(p.price, locale)}</span>}
                    </Link>
                  ))}
                </Group>
              )}
              {!!s.categories.length && (
                <Group title={t('suggestions.categories')}>
                  <div className="flex flex-wrap gap-2 px-2.5 pb-2">
                    {s.categories.map((c) => (
                      <Link key={c.slug} href={`/c/${c.slug}`} onClick={() => setOpen(false)} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-brand-50 hover:text-brand-800">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </Group>
              )}
              {!!s.brands.length && (
                <Group title={t('suggestions.brands')}>
                  <div className="flex flex-wrap gap-2 px-2.5 pb-2">
                    {s.brands.map((b) => (
                      <Link key={b.slug} href={`/brands/${b.slug}`} onClick={() => setOpen(false)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand-300">
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </Group>
              )}
              <button type="button" onClick={() => submit()} className="mt-1 flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-bold text-brand-800 hover:bg-brand-50">
                {t('suggestions.seeAll', { q: term })}
                <ArrowUpLeft className="size-4 ltr:-scale-x-100" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2.5 pb-1 pt-2 text-[0.6875rem] font-bold uppercase tracking-wide text-gray-400">{title}</p>
      {children}
    </div>
  );
}
