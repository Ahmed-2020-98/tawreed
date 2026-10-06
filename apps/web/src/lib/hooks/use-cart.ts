'use client';

import type { CartDto } from '@tawreed/contracts';
import { toast } from '@tawreed/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useSession } from '@/components/providers';
import { useRouter } from '@/i18n/navigation';
import { toastError, useApi } from './use-api';

/** Adds an offer to the cart; sends guests to login first. */
export function useAddToCart() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const { me } = useSession();
  const t = useTranslations('store');
  const mutation = useMutation({
    mutationFn: (input: { offerId: string; qty: string }) => api.post<CartDto>('/buyer/cart/items', input),
    onSuccess: (cart) => {
      qc.setQueryData(['cart', 'count'], cart.itemsCount);
      qc.setQueryData(['cart'], cart);
      toast.success(t('added'), { action: { label: t('viewCart'), onClick: () => router.push('/cart') } });
    },
    onError: (e) => toastError(e),
  });
  return {
    ...mutation,
    add: (offerId: string, qty: string | number) => {
      if (!me || me.context.type !== 'BUYER') {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      mutation.mutate({ offerId, qty: String(qty) });
    },
  };
}
