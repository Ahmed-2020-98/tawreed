import { allocate, commission, computeGroup, computeLine, couponDiscount, normalizeQty, resolveUnitPrice, validateQty } from './pricing.js';

const offer = {
  price: '18.50',
  compareAtPrice: '21.00',
  vatRate: '0.15',
  tiers: [
    { minQty: '10000', price: '17.90' },
    { minQty: '20000', price: '17.40' },
  ],
};

describe('resolveUnitPrice', () => {
  it('uses base price below the first tier and suggests the next tier', () => {
    const r = resolveUnitPrice(offer, '5000');
    expect(r.unitPrice.toFixed(2)).toBe('18.50');
    expect(r.source).toBe('BASE');
    expect(r.nextTier?.minQty.toString()).toBe('10000');
    expect(r.listUnitPrice.toFixed(2)).toBe('21.00');
  });

  it('picks the best matching tier', () => {
    expect(resolveUnitPrice(offer, '10000').unitPrice.toFixed(2)).toBe('17.90');
    const r = resolveUnitPrice(offer, '25000');
    expect(r.unitPrice.toFixed(2)).toBe('17.40');
    expect(r.source).toBe('TIER');
    expect(r.nextTier).toBeNull();
  });

  it('applies a deal only when cheaper and within the per-order limit', () => {
    const withDeal = { ...offer, deal: { dealPrice: '16.99', maxQtyPerOrder: '15000' } };
    expect(resolveUnitPrice(withDeal, '12000').source).toBe('DEAL');
    expect(resolveUnitPrice(withDeal, '20000').source).toBe('TIER');
    const expensiveDeal = { ...offer, deal: { dealPrice: '18.00' } };
    expect(resolveUnitPrice(expensiveDeal, '25000').unitPrice.toFixed(2)).toBe('17.40');
  });
});

describe('computeLine', () => {
  it('computes VAT per line with halala rounding', () => {
    const l = computeLine('18.50', '20000', '0.15');
    expect(l.lineSubtotal.toFixed(2)).toBe('370000.00');
    expect(l.vatAmount.toFixed(2)).toBe('55500.00');
    expect(l.lineTotal.toFixed(2)).toBe('425500.00');
  });

  it('taxes the discounted amount', () => {
    const l = computeLine('3.33', '3', '0.15', '1.00');
    expect(l.lineSubtotal.toFixed(2)).toBe('9.99');
    expect(l.taxable.toFixed(2)).toBe('8.99');
    expect(l.vatAmount.toFixed(2)).toBe('1.35');
  });
});

describe('validateQty / normalizeQty', () => {
  const rules = { minOrderQty: '5', qtyStep: '5', maxOrderQty: '100', stockMode: 'TRACKED' as const, availableQty: '60' };
  it('enforces MOQ, step, max and stock', () => {
    expect(validateQty(rules, '3')?.code).toBe('MOQ_NOT_MET');
    expect(validateQty(rules, '7')?.code).toBe('QTY_STEP_INVALID');
    expect(validateQty({ ...rules, availableQty: '500' }, '105')?.code).toBe('MAX_QTY_EXCEEDED');
    expect(validateQty(rules, '65')?.code).toBe('OUT_OF_STOCK');
    expect(validateQty(rules, '60')).toBeNull();
    expect(validateQty({ ...rules, stockMode: 'UNLIMITED' }, '95')).toBeNull();
  });
  it('snaps to the next valid quantity', () => {
    expect(normalizeQty(rules, '1').toString()).toBe('5');
    expect(normalizeQty(rules, '11').toString()).toBe('15');
  });
});

describe('coupons & allocation', () => {
  it('caps percentage discounts', () => {
    expect(couponDiscount({ type: 'PERCENT', value: '10', maxDiscount: '50' }, '1000').toFixed(2)).toBe('50.00');
    expect(couponDiscount({ type: 'PERCENT', value: '10' }, '300').toFixed(2)).toBe('30.00');
    expect(couponDiscount({ type: 'FIXED', value: '500' }, '120').toFixed(2)).toBe('120.00');
    expect(couponDiscount({ type: 'FREE_DELIVERY', value: '0' }, '1000').toFixed(2)).toBe('0.00');
  });
  it('allocates exactly to the halala', () => {
    const parts = allocate('10.00', ['1', '1', '1']);
    expect(parts.map((p) => p.toFixed(2)).sort()).toEqual(['3.33', '3.33', '3.34']);
    expect(parts.reduce((a, b) => a.plus(b)).toFixed(2)).toBe('10.00');
    expect(allocate('100', ['300', '100']).map((p) => p.toFixed(2))).toEqual(['75.00', '25.00']);
  });
});

describe('computeGroup', () => {
  const lines = [computeLine('100', '3', '0.15'), computeLine('50', '2', '0.15')];
  it('charges delivery below the free threshold and reports gaps', () => {
    const g = computeGroup(lines, { deliveryFee: '25', freeDeliveryThreshold: '500', minOrderValue: '450' });
    expect(g.subtotal.toFixed(2)).toBe('400.00');
    expect(g.deliveryFee.toFixed(2)).toBe('25.00');
    expect(g.deliveryVat.toFixed(2)).toBe('3.75');
    expect(g.vatTotal.toFixed(2)).toBe('63.75');
    expect(g.total.toFixed(2)).toBe('488.75');
    expect(g.amountToFreeDelivery?.toFixed(2)).toBe('100.00');
    expect(g.amountToMinOrder.toFixed(2)).toBe('50.00');
  });
  it('waives delivery above the threshold or with a free-delivery coupon', () => {
    expect(computeGroup(lines, { deliveryFee: '25', freeDeliveryThreshold: '300', minOrderValue: '0' }).deliveryFee.toFixed(2)).toBe('0.00');
    const waived = computeGroup(lines, { deliveryFee: '25', freeDeliveryThreshold: null, minOrderValue: '0', waiveDelivery: true });
    expect(waived.deliveryFee.toFixed(2)).toBe('0.00');
    expect(waived.waivedDelivery.toFixed(2)).toBe('25.00');
  });
  it('computes commission on the pre-discount subtotal', () => {
    expect(commission('370000', '0.035').toFixed(2)).toBe('12950.00');
  });
});
