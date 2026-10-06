import { Injectable } from '@nestjs/common';
import { type Db, PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { dec, round2 } from '../pricing/domain/money.js';
import { resolveUnitPrice } from '../pricing/domain/pricing.js';
import { activeDealWhere, activeOfferWhere } from './catalog.presenters.js';

/** Keeps denormalised product price range / offer counts in sync (used for sorting, filters, cards). */
@Injectable()
export class ProductStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async refresh(productIds: string[], db: Db = this.prisma): Promise<void> {
    const ids = [...new Set(productIds)];
    if (!ids.length) return;
    const now = new Date();
    const offers = await db.offer.findMany({
      where: { productId: { in: ids }, ...activeOfferWhere },
      select: {
        productId: true,
        price: true,
        compareAtPrice: true,
        vatRate: true,
        minOrderQty: true,
        tiers: { select: { minQty: true, price: true } },
        deals: { where: activeDealWhere(now), select: { dealPrice: true, maxQtyPerOrder: true }, take: 1, orderBy: { dealPrice: 'asc' } },
      },
    });
    const byProduct = new Map<string, ReturnType<typeof dec>[]>();
    for (const o of offers) {
      const deal = o.deals[0];
      const { unitPrice } = resolveUnitPrice(
        { price: o.price, compareAtPrice: o.compareAtPrice, vatRate: o.vatRate, tiers: o.tiers, deal: deal ? { dealPrice: deal.dealPrice, maxQtyPerOrder: deal.maxQtyPerOrder } : null },
        o.minOrderQty,
      );
      const list = byProduct.get(o.productId) ?? [];
      list.push(unitPrice);
      byProduct.set(o.productId, list);
    }
    for (const id of ids) {
      const prices = byProduct.get(id) ?? [];
      const min = prices.length ? prices.reduce((a, b) => (a.lessThan(b) ? a : b)) : null;
      const max = prices.length ? prices.reduce((a, b) => (a.greaterThan(b) ? a : b)) : null;
      await db.product.update({
        where: { id },
        data: { offersCount: prices.length, minPrice: min ? round2(min).toFixed(2) : null, maxPrice: max ? round2(max).toFixed(2) : null },
      });
    }
  }

  async refreshForSupplier(supplierId: string): Promise<void> {
    const rows = await this.prisma.offer.findMany({ where: { supplierId }, select: { productId: true }, distinct: ['productId'] });
    await this.refresh(rows.map((r) => r.productId));
  }
}
