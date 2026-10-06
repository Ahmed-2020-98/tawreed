import { Decimal } from 'decimal.js';

/** Decimal configured for money: 28 significant digits, half-up rounding. */
export const D = Decimal.clone({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
export type Dec = InstanceType<typeof D>;
export type DecInput = Dec | string | number | { toString(): string };

export const dec = (v: DecInput | null | undefined): Dec => new D(v === null || v === undefined ? 0 : typeof v === 'object' && !(v instanceof D) ? v.toString() : (v));
export const round2 = (v: DecInput): Dec => dec(v).toDecimalPlaces(2, D.ROUND_HALF_UP);
export const round3 = (v: DecInput): Dec => dec(v).toDecimalPlaces(3, D.ROUND_HALF_UP);
export const sum = (values: DecInput[]): Dec => values.reduce<Dec>((acc, v) => acc.plus(dec(v)), new D(0));
export const money = (v: DecInput): string => round2(v).toFixed(2);
export const qtyStr = (v: DecInput): string => {
  const s = round3(v).toFixed(3);
  return s.replace(/\.?0+$/, '');
};
export const minDec = (a: Dec, b: Dec): Dec => (a.lessThan(b) ? a : b);
export const maxDec = (a: Dec, b: Dec): Dec => (a.greaterThan(b) ? a : b);
