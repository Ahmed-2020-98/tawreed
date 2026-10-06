import type { CartDto } from '@tawreed/contracts';
import { api, useErrorToast, useSession, useToast } from '@tawreed/mobile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslations } from 'use-intl';

export function useCartCount() {
  const { status } = useSession();
  return useQuery({ queryKey: ['cart', 'count'], queryFn: async () => (await api.get<{ itemsCount: number }>('/buyer/cart/count')).itemsCount, enabled: status === 'authed' });
}

/** Cart query that refreshes whenever the screen regains focus (tabs stay mounted). */
export function useCart() {
  const { status } = useSession();
  const q = useQuery({ queryKey: ['cart'], queryFn: () => api.get<CartDto>('/buyer/cart'), enabled: status === 'authed' });
  const { refetch } = q;
  useFocusEffect(
    useCallback(() => {
      if (status === 'authed') void refetch();
    }, [status, refetch]),
  );
  return q;
}

/** Cart mutation that keeps the cart + badge caches in sync. */
export function useCartMutation<V>(fn: (v: V) => Promise<CartDto>) {
  const qc = useQueryClient();
  const showError = useErrorToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      qc.setQueryData(['cart', 'count'], cart.itemsCount);
    },
    onError: (e) => showError(e),
  });
}

export function useAddToCart() {
  const { status } = useSession();
  const toast = useToast();
  const t = useTranslations('store');
  const m = useCartMutation((v: { offerId: string; qty: string }) => api.post<CartDto>('/buyer/cart/items', v));
  return {
    ...m,
    add: (offerId: string, qty: number | string) => {
      if (status !== 'authed') return router.push('/login');
      m.mutate({ offerId, qty: String(qty) }, { onSuccess: () => toast(t('added')) });
    },
  };
}

/** Redirects guests to login; returns true when the screen may render. */
export function useRequireAuth() {
  const { status } = useSession();
  if (status === 'guest') setTimeout(() => router.replace('/login'), 0);
  return status === 'authed';
}
