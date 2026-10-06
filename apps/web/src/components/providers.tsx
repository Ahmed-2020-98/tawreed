'use client';

import type { MeResponse } from '@tawreed/contracts';
import { Toaster } from '@tawreed/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState } from 'react';

interface SessionValue {
  me: MeResponse | null;
  locale: 'ar' | 'en';
  city: string;
}

const SessionContext = createContext<SessionValue>({ me: null, locale: 'ar', city: 'riyadh' });
export const useSession = () => useContext(SessionContext);

export function Providers({ children, me, locale, city }: SessionValue & { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 }, mutations: { retry: 0 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={{ me, locale, city }}>
        {children}
        <Toaster dir={locale === 'ar' ? 'rtl' : 'ltr'} />
      </SessionContext.Provider>
    </QueryClientProvider>
  );
}
