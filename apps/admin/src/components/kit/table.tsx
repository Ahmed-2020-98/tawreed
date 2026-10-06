'use client';

import type { PageMeta } from '@tawreed/contracts';
import { Button, cn, EmptyState, Skeleton } from '@tawreed/ui';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { useRouter } from '@/i18n/navigation';
import { useUrlState } from '@/lib/hooks/use-list';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hide below this breakpoint to keep tables readable on small screens. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'end' | 'center';
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };
const ALIGN = { start: 'text-start', end: 'text-end', center: 'text-center' };

export function DataTable<T>({
  columns,
  rows,
  loading,
  rowKey,
  href,
  onRowClick,
  empty,
  className,
  dense,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  rowKey: (row: T) => string;
  href?: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: { title: React.ReactNode; description?: React.ReactNode; icon?: React.ReactNode };
  className?: string;
  dense?: boolean;
}) {
  const t = useTranslations('common');
  const router = useRouter();
  const clickable = !!(href || onRowClick);
  const pad = dense ? 'px-4 py-2.5' : 'px-4 py-3.5';
  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-xs', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500', ALIGN[c.align ?? 'start'], c.hideBelow && HIDE[c.hideBelow], c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && !rows.length
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.key} className={cn(pad, c.hideBelow && HIDE[c.hideBelow])}>
                        <Skeleton className="h-4 w-full max-w-40" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={clickable ? (e) => {
                      if ((e.target as HTMLElement).closest('a,button,[role=menuitem],input,label')) return;
                      if (onRowClick) onRowClick(row);
                      else if (href) router.push(href(row));
                    } : undefined}
                    className={cn('transition-colors', clickable && 'cursor-pointer hover:bg-brand-50/40')}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn(pad, 'align-middle text-gray-700', ALIGN[c.align ?? 'start'], c.hideBelow && HIDE[c.hideBelow], c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && !rows.length && <EmptyState icon={empty?.icon ?? <Inbox />} title={empty?.title ?? t('empty')} description={empty?.description} className="py-12" />}
    </div>
  );
}

/** Prev/next pager bound to the `page` URL param. */
export function Pager({ meta }: { meta?: PageMeta }) {
  const t = useTranslations('common');
  const { set } = useUrlState();
  if (!meta || meta.totalPages <= 1) return meta?.total ? <p className="mt-3 text-xs text-gray-500">{t('totalRows', { count: meta.total })}</p> : null;
  const go = (p: number) => set({ page: p === 1 ? undefined : p }, { resetPage: false });
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-gray-500">
        {t('pageOf', { page: meta.page, pages: meta.totalPages })} · {t('totalRows', { count: meta.total })}
      </p>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => go(meta.page - 1)}>
          <ChevronRight className="ltr:rotate-180" />
          {t('prev')}
        </Button>
        <Button size="sm" variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => go(meta.page + 1)}>
          {t('next')}
          <ChevronLeft className="ltr:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
