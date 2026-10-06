'use client';

import { Button, cn } from '@tawreed/ui';
import { useMutation } from '@tanstack/react-query';
import { Heart, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useSession } from '@/components/providers';
import { useRouter } from '@/i18n/navigation';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { useAddToCart } from '@/lib/hooks/use-cart';

export function QuickAdd({ offerId, qty, disabled, className }: { offerId: string; qty: string; disabled?: boolean; className?: string }) {
  const t = useTranslations('store');
  const { add, isPending } = useAddToCart();
  return (
    <Button size="sm" variant="soft" block disabled={disabled} loading={isPending} onClick={() => add(offerId, qty)} className={cn('hover:bg-brand-700 hover:text-white', className)}>
      <Plus />
      {t('addToCart')}
    </Button>
  );
}

export function FavoriteButton({ productId, initial, className }: { productId: string; initial: boolean; className?: string }) {
  const t = useTranslations('store');
  const api = useApi();
  const router = useRouter();
  const { me } = useSession();
  const [on, setOn] = useState(initial);
  const m = useMutation({
    mutationFn: (next: boolean) => (next ? api.post('/buyer/favorites', { productId }) : api.delete(`/buyer/favorites/${productId}`)),
    onError: (e) => {
      setOn((v) => !v);
      toastError(e);
    },
  });
  return (
    <button
      type="button"
      aria-label={on ? t('unfavorite') : t('favorite')}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        if (!me) return router.push('/login');
        setOn(!on);
        m.mutate(!on);
      }}
      className={cn('grid size-9 place-items-center rounded-full bg-white/95 text-gray-500 shadow-sm backdrop-blur transition hover:scale-105 hover:text-red-500', on && 'text-red-500', className)}
    >
      <Heart className={cn('size-[1.1rem]', on && 'fill-current')} />
    </button>
  );
}
