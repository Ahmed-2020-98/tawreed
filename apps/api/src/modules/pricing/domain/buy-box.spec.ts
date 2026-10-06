import { rankOffers } from './buy-box.js';

const base = { vatRate: '0.15', tiers: [], minOrderQty: '1', leadTimeDays: 1, supplierRating: '4.5', inStock: true };

describe('rankOffers', () => {
  it('compares price per base unit so pack sizes are fair', () => {
    const ranked = rankOffers([
      { ...base, id: 'carton24', price: '48', baseQuantity: '24' }, // 2.00 / unit
      { ...base, id: 'carton12', price: '22.8', baseQuantity: '12' }, // 1.90 / unit
    ]);
    expect(ranked.map((o) => o.id)).toEqual(['carton12', 'carton24']);
  });
  it('puts in-stock first, then lead time, then rating', () => {
    const ranked = rankOffers([
      { ...base, id: 'oos', price: '1', baseQuantity: '1', inStock: false },
      { ...base, id: 'slow', price: '2', baseQuantity: '1', leadTimeDays: 3 },
      { ...base, id: 'fast-low', price: '2', baseQuantity: '1', supplierRating: '3.9' },
      { ...base, id: 'fast-high', price: '2', baseQuantity: '1', supplierRating: '4.9' },
    ]);
    expect(ranked.map((o) => o.id)).toEqual(['fast-high', 'fast-low', 'slow', 'oos']);
  });
});
