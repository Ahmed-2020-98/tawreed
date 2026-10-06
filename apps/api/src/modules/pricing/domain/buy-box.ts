import { dec, type DecInput } from './money.js';
import { resolveUnitPrice, type OfferPricing } from './pricing.js';

export interface RankableOffer extends OfferPricing {
  id: string;
  minOrderQty: DecInput;
  baseQuantity: DecInput;
  leadTimeDays: number;
  supplierRating: DecInput;
  inStock: boolean;
}

/**
 * Buy-box ordering: in-stock first, then lowest effective price per base unit at MOQ (so a 24-pack
 * and a 12-pack compare fairly), then faster lead time, then higher supplier rating.
 */
export function rankOffers<T extends RankableOffer>(offers: T[]): T[] {
  const scored = offers.map((o) => {
    const { unitPrice } = resolveUnitPrice(o, o.minOrderQty);
    const perBase = unitPrice.dividedBy(dec(o.baseQuantity).greaterThan(0) ? dec(o.baseQuantity) : 1);
    return { o, perBase };
  });
  scored.sort((a, b) => {
    if (a.o.inStock !== b.o.inStock) return a.o.inStock ? -1 : 1;
    const price = a.perBase.comparedTo(b.perBase);
    if (price !== 0) return price;
    if (a.o.leadTimeDays !== b.o.leadTimeDays) return a.o.leadTimeDays - b.o.leadTimeDays;
    return dec(b.o.supplierRating).comparedTo(dec(a.o.supplierRating));
  });
  return scored.map((s) => s.o);
}
