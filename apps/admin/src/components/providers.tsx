'use client';

import type { MeResponse, StaffPermission } from '@tawreed/contracts';
import { Toaster } from '@tawreed/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState } from 'react';

interface StaffValue {
  me: MeResponse | null;
  locale: 'ar' | 'en';
}

const StaffContext = createContext<StaffValue>({ me: null, locale: 'ar' });
export const useStaff = () => useContext(StaffContext);

/** True when the signed-in staff member holds `permission` (the API enforces it too). */
export function useCan() {
  const { me } = useStaff();
  const perms = new Set(me?.context.permissions ?? []);
  return (permission: StaffPermission) => perms.has(permission);
}

export function Providers({ children, me, locale }: StaffValue & { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: true, retry: 1 }, mutations: { retry: 0 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <StaffContext.Provider value={{ me, locale }}>
        {children}
        <Toaster dir={locale === 'ar' ? 'rtl' : 'ltr'} />
      </StaffContext.Provider>
    </QueryClientProvider>
  );
}
