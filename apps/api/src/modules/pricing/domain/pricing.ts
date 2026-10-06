import type { ErrorCode, PriceSource } from '@tawreed/contracts';
import { dec, type Dec, type DecInput, D, round2, sum } from './money.js';

export const DEFAULT_VAT_RATE = '0.15';

export interface TierInput {
  minQty: DecInput;
  price: DecInput;
}

export interface DealInput {
  dealPrice: DecInput;
  maxQtyPerOrder?: DecInput | null;
  remainingQty?: DecInput | null;
  endsAt?: Date | null;
}

export interface OfferPricing {
  price: DecInput;
  compareAtPrice?: DecInput | null;
  vatRate: DecInput;
  tiers: TierInput[];
  deal?: DealInput | null;
}

export interface UnitPriceResult {
  unitPrice: Dec;
  listUnitPrice: Dec;
  source: Exclude<PriceSource, 'QUOTE'>;
  nextTier: { minQty: Dec; price: Dec } | null;
}

/** Price precedence: active deal → best matching volume tier → base price (always the lowest wins). */
export function resolveUnitPrice(offer: OfferPricing, qty: DecInput): UnitPriceResult {
  const q = dec(qty);
  const base = dec(offer.price);
  const tiers = offer.tiers.map((t) => ({ minQty: dec(t.minQty), price: dec(t.price) })).sort((a, b) => a.minQty.comparedTo(b.minQty));

  let unit = base;
  let source: UnitPriceResult['source'] = 'BASE';
  for (const t of tiers) {
    if (t.minQty.lessThanOrEqualTo(q) && t.price.lessThan(unit)) {
      unit = t.price;
      source = 'TIER';
    }
  }
  const deal = offer.deal;
  if (deal) {
    const dealPrice = dec(deal.dealPrice);
    const withinMax = deal.maxQtyPerOrder === null || deal.maxQtyPerOrder === undefined || q.lessThanOrEqualTo(dec(deal.maxQtyPerOrder));
    const withinCap = deal.remainingQty === null || deal.remainingQty === undefined || q.lessThanOrEqualTo(dec(deal.remainingQty));
    if (withinMax && withinCap && dealPrice.lessThan(unit)) {
      unit = dealPrice;
      source = 'DEAL';
    }
  }
  const nextTier = source === 'DEAL' ? null : (tiers.find((t) => t.minQty.greaterThan(q) && t.price.lessThan(unit)) ?? null);
  const compareAt = offer.compareAtPrice ? dec(offer.compareAtPrice) : null;
  const listUnitPrice = compareAt && compareAt.greaterThan(base) ? compareAt : base;
  return { unitPrice: unit, listUnitPrice, source, nextTier };
}

export interface LineAmounts {
  lineSubtotal: Dec;
  discount: Dec;
  taxable: Dec;
  vatAmount: Dec;
  lineTotal: Dec;
}

/** VAT is computed per line on the (discounted) taxable amount and rounded to halalas. */
export function computeLine(unitPrice: DecInput, qty: DecInput, vatRate: DecInput, discount: DecInput = 0): LineAmounts {
  const lineSubtotal = round2(dec(unitPrice).times(dec(qty)));
  const disc = round2(discount);
  const taxable = lineSubtotal.minus(disc);
  const vatAmount = round2(taxable.times(dec(vatRate)));
  return { lineSubtotal, discount: disc, taxable, vatAmount, lineTotal: taxable.plus(vatAmount) };
}

export interface QtyRules {
  minOrderQty: DecInput;
  qtyStep: DecInput;
  maxOrderQty?: DecInput | null;
  stockMode: 'TRACKED' | 'UNLIMITED' | 'ON_REQUEST';
  availableQty?: DecInput | null;
}

export interface QtyIssue {
  code: ErrorCode;
  params: Record<string, string | number>;
}

export function validateQty(rules: QtyRules, qty: DecInput): QtyIssue | null {
  const q = dec(qty);
  const min = dec(rules.minOrderQty);
  const step = dec(rules.qtyStep);
  if (q.lessThan(min)) return { code: 'MOQ_NOT_MET', params: { min: min.toString() } };
  if (step.greaterThan(0) && !q.dividedBy(step).isInteger()) return { code: 'QTY_STEP_INVALID', params: { step: step.toString() } };
  if (rules.maxOrderQty !== null && rules.maxOrderQty !== undefined && q.greaterThan(dec(rules.maxOrderQty))) {
    return { code: 'MAX_QTY_EXCEEDED', params: { max: dec(rules.maxOrderQty).toString() } };
  }
  if (rules.stockMode === 'TRACKED') {
    const available = dec(rules.availableQty ?? 0);
    if (q.greaterThan(available)) return { code: 'OUT_OF_STOCK', params: { available: available.toString() } };
  }
  return null;
}

/** Snaps an arbitrary quantity up to the nearest valid one (≥ MOQ, multiple of step). */
export function normalizeQty(rules: Pick<QtyRules, 'minOrderQty' | 'qtyStep'>, qty: DecInput): Dec {
  const min = dec(rules.minOrderQty);
  const step = dec(rules.qtyStep);
  let q = D.max(dec(qty), min);
  if (step.greaterThan(0)) q = q.dividedBy(step).ceil().times(step);
  return q;
}

/* ---------------------------------------------------------------- coupons */

export interface CouponRule {
  type: 'PERCENT' | 'FIXED' | 'FREE_DELIVERY';
  value: DecInput;
  maxDiscount?: DecInput | null;
  minOrderValue?: DecInput | null;
}

/** Discount amount on the eligible subtotal (FREE_DELIVERY returns 0 here; fees are waived separately). */
export function couponDiscount(rule: CouponRule, eligibleSubtotal: DecInput): Dec {
  const base = dec(eligibleSubtotal);
  if (rule.type === 'FREE_DELIVERY') return new D(0);
  let amount = rule.type === 'PERCENT' ? base.times(dec(rule.value)).dividedBy(100) : dec(rule.value);
  if (rule.maxDiscount !== null && rule.maxDiscount !== undefined) amount = D.min(amount, dec(rule.maxDiscount));
  return round2(D.min(amount, base));
}

/** Splits `total` across `weights` proportionally (halala-exact; remainder to the largest weight). */
export function allocate(total: DecInput, weights: DecInput[]): Dec[] {
  const t = round2(total);
  const w = weights.map((x) => dec(x));
  const wSum = sum(w);
  if (wSum.isZero() || t.isZero()) return w.map(() => new D(0));
  const parts = w.map((x) => round2(t.times(x).dividedBy(wSum)));
  const diff = t.minus(sum(parts));
  if (!diff.isZero()) {
    let idx = 0;
    w.forEach((x, i) => {
      if (x.greaterThan(w[idx] ?? 0)) idx = i;
    });
    parts[idx] = (parts[idx] ?? new D(0)).plus(diff);
  }
  return parts;
}

/* ---------------------------------------------------------------- groups */

export interface GroupFees {
  deliveryFee: DecInput;
  freeDeliveryThreshold?: DecInput | null;
  minOrderValue: DecInput;
  vatRate?: DecInput;
  waiveDelivery?: boolean;
}

export interface GroupTotals {
  subtotal: Dec;
  discountTotal: Dec;
  deliveryFee: Dec;
  deliveryVat: Dec;
  vatTotal: Dec;
  total: Dec;
  amountToFreeDelivery: Dec | null;
  amountToMinOrder: Dec;
  waivedDelivery: Dec;
}

/** Totals for one supplier group given already-computed line amounts. */
export function computeGroup(lines: LineAmounts[], fees: GroupFees): GroupTotals {
  const subtotal = sum(lines.map((l) => l.lineSubtotal));
  const discountTotal = sum(lines.map((l) => l.discount));
  const threshold = fees.freeDeliveryThreshold !== null && fees.freeDeliveryThreshold !== undefined ? dec(fees.freeDeliveryThreshold) : null;
  const qualifiesFree = threshold !== null && subtotal.greaterThanOrEqualTo(threshold);
  const baseFee = qualifiesFree ? new D(0) : round2(fees.deliveryFee);
  const deliveryFee = fees.waiveDelivery ? new D(0) : baseFee;
  const deliveryVat = round2(deliveryFee.times(dec(fees.vatRate ?? DEFAULT_VAT_RATE)));
  const vatTotal = sum(lines.map((l) => l.vatAmount)).plus(deliveryVat);
  const total = subtotal.minus(discountTotal).plus(deliveryFee).plus(vatTotal);
  return {
    subtotal,
    discountTotal,
    deliveryFee,
    deliveryVat,
    vatTotal,
    total,
    amountToFreeDelivery: threshold !== null && !qualifiesFree ? threshold.minus(subtotal) : null,
    amountToMinOrder: D.max(dec(fees.minOrderValue).minus(subtotal), 0),
    waivedDelivery: fees.waiveDelivery ? baseFee : new D(0),
  };
}

/** Platform commission on the supplier's pre-discount subtotal (platform-funded coupons don't reduce it). */
export function commission(subtotal: DecInput, rate: DecInput): Dec {
  return round2(dec(subtotal).times(dec(rate)));
}
