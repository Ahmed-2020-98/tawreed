'use client';

import { ApiError } from '@tawreed/api-client';
import { createBrowserApi, createBrowserAuth } from '@tawreed/next-kit/client';
import { toast } from '@tawreed/ui';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

export function useApi() {
  const locale = useLocale();
  return useMemo(() => createBrowserApi(locale), [locale]);
}

export function useAuthApi() {
  const locale = useLocale();
  return useMemo(() => createBrowserAuth(locale), [locale]);
}

/** Shows the API's localized error message as a toast. */
export function toastError(e: unknown, fallback = 'Error') {
  toast.error(e instanceof ApiError ? e.message : fallback);
}
