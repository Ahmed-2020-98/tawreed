import type { OfferSummaryDto } from '@tawreed/contracts';

/** Display-only mirror of the server price resolution: deal → best tier → base. The API stays authoritative. */
export function unitPriceFor(offer: OfferSummaryDto, qty: number): { price: number; source: 'DEAL' | 'TIER' | 'BASE' } {
  if (offer.deal && (!offer.deal.maxQtyPerOrder || qty <= Number(offer.deal.maxQtyPerOrder))) return { price: Number(offer.deal.dealPrice), source: 'DEAL' };
  const tier = [...offer.tiers].sort((a, b) => Number(b.minQty) - Number(a.minQty)).find((t) => qty >= Number(t.minQty));
  if (tier) return { price: Number(tier.price), source: 'TIER' };
  return { price: Number(offer.price), source: 'BASE' };
}
