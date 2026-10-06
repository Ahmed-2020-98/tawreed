'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { formatters } from '../format';

export function useFormat() {
  const locale = useLocale();
  return useMemo(() => formatters(locale), [locale]);
}
