'use client';

import type { OfferSummaryDto, ProductDetailDto } from '@tawreed/contracts';
import { Badge, Button, cn, QuantityStepper } from '@tawreed/ui';
import { BadgeCheck, Clock, FileText, ShoppingCart, Star, Truck, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useAddToCart } from '@/lib/hooks/use-cart';
import { useFormat } from '@/lib/hooks/use-format';
import { unitPriceFor } from '@/lib/pricing';

export function PurchasePanel({ product }: { product: ProductDetailDto }) {
  const t = useTranslations('product');
  const ts = useTranslations('store');
  const tc = useTranslations('common');
  const f = useFormat();
  const { add, isPending } = useAddToCart();
  const eligible = product.offers.filter((o) => o.coversCity && o.stockStatus !== 'OUT_OF_STOCK');
  const units = product.units.filter((u) => product.offers.some((o) => o.unit.id === u.id));
  const initialOffer = product.bestOffer ?? eligible[0] ?? product.offers[0];
  const [unitId, setUnitId] = useState(initialOffer?.unit.id ?? units[0]?.id);
  const unitOffers = useMemo(() => product.offers.filter((o) => o.unit.id === unitId).sort((a, b) => Number(b.coversCity) - Number(a.coversCity) || Number(a.effectivePrice) - Number(b.effectivePrice)), [product.offers, unitId]);
  const [offerId, setOfferId] = useState(initialOffer?.id);
  const offer = unitOffers.find((o) => o.id === offerId) ?? unitOffers[0];
  const [qty, setQty] = useState(Number(offer?.minOrderQty ?? 1));

  if (!offer) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-6 text-center">
        <p className="text-lg font-bold text-gray-900">{t('noOffers')}</p>
        <p className="mt-1 text-sm text-gray-500">{t('noOffersBody')}</p>
        <Button asChild className="mt-4" variant="secondary">
          <Link href={`/rfq/new?product=${product.slug}`}>{ts('requestQuote')}</Link>
        </Button>
      </div>
    );
  }

  const pick = (o: OfferSummaryDto) => {
    setUnitId(o.unit.id);
    setOfferId(o.id);
    setQty(o.unit.id === unitId ? Math.max(Number(o.minOrderQty), qty) : Number(o.minOrderQty));
  };
  // Every offer for the product (any unit), covered cities first, cheapest per base unit first.
  const allOffers = [...product.offers].sort((a, b) => Number(b.coversCity) - Number(a.coversCity) || Number(a.pricePerBaseUnit) - Number(b.pricePerBaseUnit));
  const { price, source } = unitPriceFor(offer, qty);
  const base = Number(offer.price);
  const total = price * qty;
  const perBase = price / Number(offer.unit.baseQuantity);
  const out = offer.stockStatus === 'OUT_OF_STOCK';

  return (
    <div className="space-y-4">
      {/* Unit toggle (e.g. bag / ton) */}
      {units.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-bold text-gray-700">{t('chooseUnit')}</p>
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {units.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setUnitId(u.id);
                  const first = product.offers.filter((o) => o.unit.id === u.id).sort((a, b) => Number(a.effectivePrice) - Number(b.effectivePrice))[0];
                  if (first) {
                    setOfferId(first.id);
                    setQty(Number(first.minOrderQty));
                  }
                }}
                className={cn('rounded-lg px-4 py-2 text-sm font-bold transition', u.id === unitId ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-gray-800')}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="num text-3xl font-black text-navy-900">{f.money(price)}</span>
              <span className="text-sm text-gray-500">/ {offer.unit.name}</span>
            </div>
            {price < base && <p className="num mt-0.5 text-sm text-gray-400 line-through">{f.money(base)}</p>}
            {Number(offer.unit.baseQuantity) !== 1 && <p className="num mt-1 text-sm text-gray-500">{t('perBaseUnit', { price: f.money(perBase), unit: offer.unit.baseUnit })}</p>}
          </div>
          {source === 'DEAL' && (
            <Badge tone="red" className="bg-red-600 text-white">
              <Zap />
              {ts('deal')}
            </Badge>
          )}
          {source === 'TIER' && <Badge tone="brand">{t('tierSave', { percent: Math.round((1 - price / base) * 100) })}</Badge>}
        </div>

        {offer.tiers.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
            <p className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500">{t('tiers')}</p>
            <ul className="divide-y divide-gray-100">
              {[{ minQty: offer.minOrderQty, price: offer.price }, ...offer.tiers].map((tier) => {
                const active = source !== 'DEAL' && unitPriceFor({ ...offer, deal: null }, qty).price === Number(tier.price);
                return (
                  <li key={tier.minQty} className={cn('flex items-center justify-between px-4 py-2.5 text-sm', active && 'bg-brand-50/70 font-bold text-brand-900')}>
                    <span className="num">{t('tierRow', { qty: f.qty(tier.minQty), unit: offer.unit.name })}</span>
                    <span className="num">{f.money(tier.price)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 text-sm font-bold text-gray-700">{t('quantity')}</p>
            <QuantityStepper size="lg" value={qty} onChange={setQty} min={Number(offer.minOrderQty)} step={Number(offer.qtyStep)} max={offer.maxOrderQty ? Number(offer.maxOrderQty) : offer.availableQty ? Number(offer.availableQty) : null} labels={{ dec: '−', inc: '+' }} />
            <p className="num mt-1.5 text-xs text-gray-500">
              {t('moq', { qty: f.qty(offer.minOrderQty), unit: offer.unit.name })}
              {Number(offer.qtyStep) > 1 && ` · ${t('step', { qty: f.qty(offer.qtyStep) })}`}
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm text-gray-500">{t('total')}</p>
            <p className="num text-2xl font-black text-brand-800">{f.money(total)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-[1fr_auto]">
          <Button size="lg" disabled={out || !offer.coversCity} loading={isPending} onClick={() => add(offer.id, qty)}>
            <ShoppingCart />
            {out ? ts('outOfStock') : ts('addToCart')}
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/rfq/new?product=${product.slug}&unit=${offer.unit.id}&qty=${qty}`}>
              <FileText />
              {ts('requestQuote')}
            </Link>
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">{t('vatNote')}</p>
      </div>

      {/* Seller + delivery */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="size-12 overflow-hidden rounded-xl bg-gray-100">{offer.supplier.logoUrl && <img src={offer.supplier.logoUrl} alt="" className="size-full object-cover" />}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{t('soldBy')}</p>
            <Link href={`/suppliers/${offer.supplier.slug}`} className="flex items-center gap-1 font-bold text-gray-900 hover:text-brand-800">
              {offer.supplier.name}
              <BadgeCheck className="size-4 text-brand-600" />
            </Link>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            <Star className="size-3.5 fill-current" />
            <span className="num">{offer.supplier.ratingAvg}</span>
          </span>
        </div>
        <div className="rule-dashed my-4" />
        {offer.coversCity ? (
          <ul className="space-y-2.5 text-sm text-gray-700">
            <li className="flex items-center gap-2.5">
              <Clock className="size-4 text-brand-600" />
              {t('delivery')} {t('deliveryIn', { count: offer.leadTimeDays })}
              {offer.sameDayAvailable && <Badge tone="mint" size="sm">{ts('sameDay')}</Badge>}
            </li>
            <li className="flex items-center gap-2.5">
              <Truck className="size-4 text-brand-600" />
              <span className="num">
                {t('deliveryFee', { fee: Number(offer.deliveryFee) ? f.money(offer.deliveryFee) : tc('free') })}
                {offer.freeDeliveryThreshold && ` · ${t('freeOver', { amount: f.money(offer.freeDeliveryThreshold) })}`}
              </span>
            </li>
          </ul>
        ) : (
          <p className="text-sm font-semibold text-amber-700">{t('notCovered')}</p>
        )}
      </div>

      {/* Other suppliers for the same unit */}
      {allOffers.length > 1 && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <p className="mb-3 font-extrabold text-navy-900">{t('otherSuppliers')}</p>
          <ul className="space-y-2.5">
            {allOffers.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => pick(o)}
                  disabled={!o.coversCity}
                  className={cn('flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-start transition disabled:opacity-50', o.id === offer.id ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300')}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-gray-900">{o.supplier.name}</span>
                    <span className="block text-xs font-semibold text-gray-600">{o.unit.name}</span>
                    <span className="text-xs text-gray-500">
                      {o.coversCity ? t('deliveryIn', { count: o.leadTimeDays }) : t('notCovered')} · <span className="num">★ {o.supplier.ratingAvg}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="num block font-extrabold text-navy-900">{f.money(o.effectivePrice)}</span>
                    {o.isBest && <span className="text-[0.6875rem] font-bold text-brand-700">{t('bestOffer')}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
