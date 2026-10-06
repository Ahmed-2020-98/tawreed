'use client';

import type { QueryParams } from '@tawreed/api-client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useApi } from './use-api';

/** Filters live in the URL so lists are shareable and survive reloads. */
export function useUrlState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = useCallback((key: string) => params.get(key) ?? undefined, [params]);
  const set = useCallback(
    (patch: Record<string, string | number | undefined | null>, opts: { resetPage?: boolean } = { resetPage: true }) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '') next.delete(k);
        else next.set(k, String(v));
      }
      if (opts.resetPage && !('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  const all = useMemo(() => Object.fromEntries(params.entries()) as Record<string, string>, [params]);
  return { get, set, all };
}

/** Paginated list driven by URL params (page, q, filters) merged over `defaults`. */
export function useList<T>(path: string, defaults: QueryParams = {}, opts: { refetchInterval?: number; enabled?: boolean } = {}) {
  const api = useApi();
  const { all } = useUrlState();
  // 'ALL' in the URL overrides a default filter (e.g. payments default to "pending") without sending it to the API.
  const query = useMemo(() => Object.fromEntries(Object.entries({ pageSize: 20, ...defaults, ...all }).filter(([, v]) => (v as unknown) !== 'ALL')) as QueryParams, [defaults, all]);
  const result = useQuery({
    queryKey: [path, query],
    queryFn: () => api.page<T>(path, { query }),
    placeholderData: keepPreviousData,
    refetchInterval: opts.refetchInterval,
    enabled: opts.enabled ?? true,
  });
  return { ...result, query, rows: result.data?.data ?? [], meta: result.data?.meta };
}
