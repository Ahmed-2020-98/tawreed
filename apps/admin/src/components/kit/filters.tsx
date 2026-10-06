'use client';

import { cn, Input, Select } from '@tawreed/ui';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useUrlState } from '@/lib/hooks/use-list';

/** Row of filters above a table. */
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4 flex flex-wrap items-center gap-2.5', className)}>{children}</div>;
}

/** Debounced search bound to the `q` URL param. */
export function SearchFilter({ placeholder, className }: { placeholder?: string; className?: string }) {
  const t = useTranslations('common');
  const { get, set } = useUrlState();
  const current = get('q') ?? '';
  const [value, setValue] = useState(current);
  // Follow external URL changes (back/forward, cleared filters) without an effect.
  const [synced, setSynced] = useState(current);
  if (synced !== current) {
    setSynced(current);
    setValue(current);
  }
  useEffect(() => {
    if (value === current) return;
    const id = setTimeout(() => set({ q: value.trim() || undefined }), 350);
    return () => clearTimeout(id);
  }, [value, current, set]);
  return (
    <Input
      inputSize="sm"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder ?? t('search')}
      start={<Search />}
      end={
        value ? (
          <button type="button" onClick={() => setValue('')} className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-gray-100" aria-label={t('clear')}>
            <X className="size-4" />
          </button>
        ) : undefined
      }
      className={cn('w-full sm:w-72', className)}
    />
  );
}

/** Dropdown bound to one URL param; the first option clears it. */
export function SelectFilter({ param, options, allLabel, className }: { param: string; options: { value: string; label: React.ReactNode }[]; allLabel: string; className?: string }) {
  const { get, set } = useUrlState();
  return (
    <Select
      aria-label={allLabel}
      value={get(param) ?? '__all'}
      onValueChange={(v) => set({ [param]: v === '__all' ? undefined : v })}
      options={[{ value: '__all', label: allLabel }, ...options]}
      className={cn('h-9 w-auto min-w-40 text-sm', className)}
    />
  );
}

/** Segmented status tabs bound to one URL param (value '' = all). */
export function TabFilter({ param, options, fallback = '' }: { param: string; options: { value: string; label: React.ReactNode; count?: number }[]; fallback?: string }) {
  const { get, set } = useUrlState();
  const current = get(param) ?? fallback;
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 scrollbar-none">
      {options.map((o) => (
        <button
          key={o.value || 'all'}
          type="button"
          onClick={() => set({ [param]: o.value === fallback ? undefined : o.value || (fallback ? 'ALL' : undefined) })}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition',
            current === o.value || (o.value === '' && current === 'ALL') ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800',
          )}
        >
          {o.label}
          {o.count != null && o.count > 0 && <span className="num rounded-full bg-amber-100 px-1.5 text-[0.6875rem] font-bold text-amber-800">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
