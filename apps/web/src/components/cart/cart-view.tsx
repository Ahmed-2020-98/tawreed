'use client';

import type { CartDto, CartGroupDto, CartLineDto } from '@tawreed/contracts';
import { Button, Card, cn, EmptyState, Input, QuantityStepper, Skeleton, toast } from '@tawreed/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Lock, ShoppingCart, Tag, Trash2, TrendingDown, Truck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { TotalsList } from './summary';

export function useCart() {
  const api = useApi();
  return useQuery({ queryKey: ['cart'], queryFn: () => api.get<CartDto>('/buyer/cart') });
}

function useCartMutation<V>(fn: (v: V) => Promise<CartDto>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      qc.setQueryData(['cart'], cart);
      qc.setQueryData(['cart', 'count'], cart.itemsCount);
    },
    onError: (e) => toastError(e),
  });
}

function Progress({ value, tone }: { value: number; tone: 'brand' | 'amber' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
      <div className={cn('h-full rounded-full transition-all duration-500', tone === 'brand' ? 'bg-brand-500' : 'bg-amber-500')} style={{ width: `${Math.min(100, Math.max(4, value * 100))}%` }} />
    </div>
  );
}

function Line({ line }: { line: CartLineDto }) {
  const t = useTranslations('cart');
  const f = useFormat();
  const api = useApi();
  const update = useCartMutation((qty: number) => api.patch<CartDto>(`/buyer/cart/items/${line.id}`, { qty: String(qty) }));
  const remove = useCartMutation(() => api.delete<CartDto>(`/buyer/cart/items/${line.id}`));
  const discounted = Number(line.unitPrice) < Number(line.listUnitPrice);
  return (
    <li className={cn('flex gap-4 py-4 transition', (update.isPending || remove.isPending) && 'opacity-60')}>
      <Link href={`/product/${line.product.slug}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:size-24">
        {line.product.image && <img src={line.product.image.thumbUrl ?? line.product.image.url} alt="" className="size-full object-cover" />}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/product/${line.product.slug}`} className="line-clamp-2 font-bold text-gray-900 hover:text-brand-800">
              {line.product.name}
            </Link>
            <p className="mt-0.5 text-sm text-gray-500">
              {line.unit.name} · <span className="num">{f.money(line.unitPrice)}</span>
              {discounted && <span className="num ms-1.5 text-xs text-gray-400 line-through">{f.money(line.listUnitPrice)}</span>}
            </p>
          </div>
          <p className="num shrink-0 text-lg font-extrabold text-navy-900">{f.money(line.lineTotal)}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper size="sm" value={Number(line.qty)} min={Number(line.minOrderQty)} step={Number(line.qtyStep)} max={line.maxOrderQty ? Number(line.maxOrderQty) : line.availableQty ? Number(line.availableQty) : null} onChange={(q) => update.mutate(q)} />
          <button type="button" onClick={() => remove.mutate(undefined)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 transition hover:text-red-600">
            <Trash2 className="size-4" />
            {t('remove')}
          </button>
        </div>
        {line.nextTier && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
            <TrendingDown className="size-3.5" />
            <span className="num">{t('nextTier', { qty: f.qty(Number(line.nextTier.minQty) - Number(line.qty)), price: f.money(line.nextTier.price) })}</span>
          </p>
        )}
        {line.issues.map((i) => (
          <p key={i.code} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <AlertTriangle className="size-3.5" />
            {i.message}
          </p>
        ))}
      </div>
    </li>
  );
}

function Group({ g }: { g: CartGroupDto }) {
  const t = useTranslations('cart');
  const f = useFormat();
  const min = Number(g.minOrderValue);
  const toMin = Number(g.amountToMinOrder);
  const toFree = g.amountToFreeDelivery ? Number(g.amountToFreeDelivery) : null;
  const free = g.freeDeliveryThreshold ? Number(g.freeDeliveryThreshold) : null;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-3.5">
        <Link href={`/suppliers/${g.supplier.slug}`} className="flex items-center gap-3">
          <span className="size-10 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">{g.supplier.logoUrl && <img src={g.supplier.logoUrl} alt="" className="size-full object-cover" />}</span>
          <span className="font-extrabold text-gray-900">{g.supplier.name}</span>
        </Link>
        {g.earliestDeliveryDate && (
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Truck className="size-4 text-brand-600" />
            {t('earliest', { date: f.date(g.earliestDeliveryDate) })}
          </span>
        )}
      </div>
      <div className="space-y-3 px-5 pt-4">
        {!g.covered ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <AlertTriangle className="size-4" />
            {t('notCovered')}
          </p>
        ) : toMin > 0 ? (
          <div>
            <p className="num mb-1.5 text-xs font-semibold text-amber-700">{t('minOrderLeft', { amount: f.money(toMin), min: f.money(min) })}</p>
            <Progress value={(min - toMin) / min} tone="amber" />
          </div>
        ) : toFree && toFree > 0 && free ? (
          <div>
            <p className="num mb-1.5 text-xs font-semibold text-gray-600">{t('freeDeliveryLeft', { amount: f.money(toFree) })}</p>
            <Progress value={(free - toFree) / free} tone="brand" />
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs font-bold text-brand-700">
            <CheckCircle2 className="size-4" />
            {Number(g.deliveryFee) === 0 ? t('freeDeliveryMet') : t('minOrderMet')}
          </p>
        )}
      </div>
      <ul className="divide-y divide-gray-100 px-5">
        {g.items.map((l) => (
          <Line key={l.id} line={l} />
        ))}
      </ul>
      <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-gray-100 bg-gray-50/40 px-5 py-3 text-sm">
        <span className="text-gray-500">
          {t('delivery')}: <span className="num font-semibold text-gray-800">{Number(g.deliveryFee) ? f.money(g.deliveryFee) : '0'}</span>
        </span>
        <span className="text-gray-500">
          {t('grandTotal')}: <span className="num font-extrabold text-navy-900">{f.money(g.total)}</span>
        </span>
      </div>
    </Card>
  );
}

function Coupon({ cart }: { cart: CartDto }) {
  const t = useTranslations('cart');
  const api = useApi();
  const [code, setCode] = useState('');
  const apply = useCartMutation((c: string) => api.post<CartDto>('/buyer/cart/coupon', { code: c }));
  const remove = useCartMutation(() => api.delete<CartDto>('/buyer/cart/coupon'));
  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-dashed border-brand-400 bg-brand-50/60 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm">
          <Tag className="size-4 text-brand-700" />
          <span className="num font-extrabold text-brand-800">{cart.coupon.code}</span>
          <span className="text-xs text-gray-600">{cart.coupon.description}</span>
        </span>
        <button type="button" aria-label={t('removeCoupon')} onClick={() => remove.mutate(undefined)} className="text-gray-400 hover:text-red-600">
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) apply.mutate(code.trim(), { onSuccess: () => toast.success(t('couponApplied')) });
      }}
    >
      <Input inputSize="sm" dir="ltr" placeholder={t('couponPlaceholder')} aria-label={t('coupon')} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} start={<Tag />} className="flex-1" />
      <Button type="submit" size="sm" variant="secondary" loading={apply.isPending}>
        {t('applyCoupon')}
      </Button>
    </form>
  );
}

export function CartView() {
  const t = useTranslations('cart');
  const api = useApi();
  const { data: cart, isLoading } = useCart();
  const clear = useCartMutation(() => api.delete<CartDto>('/buyer/cart'));

  if (isLoading || !cart) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }
  if (!cart.groups.length) {
    return (
      <Card>
        <EmptyState
          icon={<ShoppingCart />}
          title={t('empty')}
          description={t('emptyBody')}
          action={
            <Button asChild>
              <Link href="/store">{t('startShopping')}</Link>
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-navy-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('itemsCount', { count: cart.itemsCount })} · {t('splitNote', { count: cart.groups.length })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm(t('clearConfirm'))) clear.mutate(undefined);
            }}
          >
            <Trash2 />
            {t('clear')}
          </Button>
        </div>
        {cart.groups.map((g) => (
          <Group key={g.supplier.id} g={g} />
        ))}
      </div>
      <aside className="lg:sticky lg:top-44">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-extrabold text-gray-900">{t('summary')}</h2>
          <Coupon cart={cart} />
          <div className="mt-5">
            <TotalsList totals={cart.totals} />
          </div>
          {cart.issues.map((i) => (
            <p key={i.code} className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {i.message}
            </p>
          ))}
          <Button asChild={cart.canCheckout} size="lg" block className="mt-5" disabled={!cart.canCheckout}>
            {cart.canCheckout ? <Link href="/checkout">{t('checkout')}</Link> : <span>{t('checkout')}</span>}
          </Button>
          {!cart.canCheckout && <p className="mt-2 text-center text-xs text-gray-500">{t('fixIssues')}</p>}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Lock className="size-3.5" />
            {t('secure')}
          </p>
        </Card>
      </aside>
    </div>
  );
}
