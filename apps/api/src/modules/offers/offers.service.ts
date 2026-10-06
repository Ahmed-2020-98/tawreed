import { Injectable } from '@nestjs/common';
import {
  type DealDto,
  dealInputSchema,
  dealListQuery,
  ErrorCode,
  type OfferManageDto,
  offerBulkUpdateSchema,
  offerInputSchema,
  offerListQuery,
  offerUpdateSchema,
  type PageMeta,
  productProposalSchema,
  reviewDecisionSchema,
} from '@tawreed/contracts';
import type { z } from 'zod';
import { AppError } from '../../common/http/app-error.js';
import { buildSearchText } from '../../common/text/arabic.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService, type Tx } from '../../infrastructure/prisma/prisma.service.js';
import { CatalogAdminService } from '../catalog/catalog-admin.service.js';
import { activeDealWhere, activeOfferWhere } from '../catalog/catalog.presenters.js';
import { ProductStatsService } from '../catalog/product-stats.service.js';
import { FilesService } from '../files/files.service.js';
import { dec, money, qtyStr } from '../pricing/domain/money.js';
import { resolveUnitPrice } from '../pricing/domain/pricing.js';

const offerManageInclude = (now: Date) =>
  ({
    product: { select: { id: true, slug: true, nameAr: true, nameEn: true, status: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { file: true } } } },
    unit: true,
    supplier: { select: { id: true, nameAr: true, nameEn: true } },
    tiers: { orderBy: { minQty: 'asc' } },
    deals: { where: activeDealWhere(now), take: 1, orderBy: { dealPrice: 'asc' } },
  }) satisfies Prisma.OfferInclude;
type OfferManageRow = Prisma.OfferGetPayload<{ include: ReturnType<typeof offerManageInclude> }>;

const dealInclude = {
  offer: { include: { product: { select: { nameAr: true, nameEn: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { file: true } } } } } },
  supplier: { select: { id: true, nameAr: true, nameEn: true } },
} satisfies Prisma.DealInclude;
type DealRow = Prisma.DealGetPayload<{ include: typeof dealInclude }>;

const meta = (page: number, pageSize: number, total: number): PageMeta => ({ page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });

/** Supplier offer management (+ admin moderation). Every change refreshes product price caches. */
@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly stats: ProductStatsService,
    private readonly catalogAdmin: CatalogAdminService,
  ) {}

  /* ---------------------------------------------------------------- presenters */

  private async present(rows: OfferManageRow[]): Promise<OfferManageDto[]> {
    if (!rows.length) return [];
    const productIds = [...new Set(rows.map((r) => r.productId))];
    const competitors = await this.prisma.offer.findMany({
      where: { productId: { in: productIds }, ...activeOfferWhere },
      select: { id: true, productId: true, supplierId: true, price: true, minOrderQty: true, vatRate: true, compareAtPrice: true, unit: { select: { baseQuantity: true } }, tiers: { select: { minQty: true, price: true } } },
    });
    const perBase = (o: (typeof competitors)[number]) =>
      resolveUnitPrice({ price: o.price, compareAtPrice: o.compareAtPrice, vatRate: o.vatRate, tiers: o.tiers }, o.minOrderQty).unitPrice.dividedBy(dec(o.unit.baseQuantity));
    return rows.map((r) => {
      const others = competitors.filter((c) => c.productId === r.productId && c.supplierId !== r.supplierId);
      const mine = competitors.find((c) => c.id === r.id);
      const best = others.reduce<(typeof competitors)[number] | null>((acc, c) => (!acc || perBase(c).lessThan(perBase(acc)) ? c : acc), null);
      const available = dec(r.stockQty).minus(dec(r.reservedQty));
      const deal = r.deals[0];
      return {
        id: r.id,
        product: { id: r.product.id, slug: r.product.slug, nameAr: r.product.nameAr, nameEn: r.product.nameEn, image: this.files.imageRef(r.product.images[0]?.file), status: r.product.status },
        unit: this.catalogAdmin.unitDto(r.unit),
        supplier: r.supplier,
        sku: r.sku,
        price: money(r.price),
        compareAtPrice: r.compareAtPrice ? money(r.compareAtPrice) : null,
        vatRate: dec(r.vatRate).toString(),
        minOrderQty: qtyStr(r.minOrderQty),
        qtyStep: qtyStr(r.qtyStep),
        maxOrderQty: r.maxOrderQty ? qtyStr(r.maxOrderQty) : null,
        stockMode: r.stockMode,
        stockQty: qtyStr(r.stockQty),
        reservedQty: qtyStr(r.reservedQty),
        availableQty: qtyStr(available.greaterThan(0) ? available : 0),
        leadTimeDays: r.leadTimeDays,
        status: r.status,
        tiers: r.tiers.map((t) => ({ minQty: qtyStr(t.minQty), price: money(t.price) })),
        isBuyBox: !!mine && (!best || perBase(mine).lessThanOrEqualTo(perBase(best))),
        competitorsCount: others.length,
        bestCompetitorPrice: best ? money(resolveUnitPrice({ price: best.price, vatRate: best.vatRate, tiers: best.tiers }, best.minOrderQty).unitPrice) : null,
        activeDeal: deal ? { id: deal.id, dealPrice: money(deal.dealPrice), endsAt: deal.endsAt.toISOString() } : null,
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  private presentDeal(d: DealRow): DealDto {
    return {
      id: d.id,
      offerId: d.offerId,
      product: { nameAr: d.offer.product.nameAr, nameEn: d.offer.product.nameEn, image: this.files.imageRef(d.offer.product.images[0]?.file) },
      supplier: d.supplier,
      titleAr: d.titleAr,
      titleEn: d.titleEn,
      dealPrice: money(d.dealPrice),
      regularPrice: money(d.offer.price),
      startsAt: d.startsAt.toISOString(),
      endsAt: d.endsAt.toISOString(),
      maxQtyPerOrder: d.maxQtyPerOrder ? qtyStr(d.maxQtyPerOrder) : null,
      totalQtyCap: d.totalQtyCap ? qtyStr(d.totalQtyCap) : null,
      soldQty: qtyStr(d.soldQty),
      status: d.status,
      reviewNote: d.reviewNote,
      createdAt: d.createdAt.toISOString(),
    };
  }

  /* ---------------------------------------------------------------- supplier offers */

  async list(supplierId: string | null, q: z.output<typeof offerListQuery>): Promise<{ data: OfferManageDto[]; meta: PageMeta }> {
    const where: Prisma.OfferWhereInput = {
      deletedAt: null,
      ...(supplierId ? { supplierId } : {}),
      ...(q.status ? { status: q.status } : { status: { not: 'ARCHIVED' } }),
      ...(q.categoryId ? { product: { categoryId: q.categoryId } } : {}),
      ...(q.q ? { product: { searchText: { contains: buildSearchText(q.q) } } } : {}),
    };
    let rows = await this.prisma.offer.findMany({ where, include: offerManageInclude(new Date()), orderBy: { updatedAt: 'desc' } });
    if (q.lowStock) rows = rows.filter((r) => r.stockMode === 'TRACKED' && dec(r.stockQty).minus(dec(r.reservedQty)).lessThan(dec(r.minOrderQty).times(4)));
    const total = rows.length;
    const page = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    return { data: await this.present(page), meta: meta(q.page, q.pageSize, total) };
  }

  async get(supplierId: string | null, id: string): Promise<OfferManageDto> {
    const row = await this.prisma.offer.findFirst({ where: { id, deletedAt: null, ...(supplierId ? { supplierId } : {}) }, include: offerManageInclude(new Date()) });
    if (!row) throw AppError.notFound();
    return (await this.present([row]))[0] as OfferManageDto;
  }

  private async writeTiers(tx: Tx, offerId: string, tiers: { minQty: string; price: string }[]): Promise<void> {
    await tx.offerPriceTier.deleteMany({ where: { offerId } });
    const seen = new Set<string>();
    const unique = tiers.filter((t) => (seen.has(t.minQty) ? false : (seen.add(t.minQty), true)));
    if (unique.length) await tx.offerPriceTier.createMany({ data: unique.map((t) => ({ offerId, minQty: t.minQty, price: t.price })) });
  }

  async create(supplierId: string, input: z.output<typeof offerInputSchema>): Promise<OfferManageDto> {
    const unit = await this.prisma.productUnit.findUnique({ where: { id: input.productUnitId }, include: { product: { select: { id: true, status: true, deletedAt: true } } } });
    if (!unit || unit.product.deletedAt || unit.product.status === 'ARCHIVED') throw AppError.notFound();
    const existing = await this.prisma.offer.findUnique({ where: { supplierId_productUnitId: { supplierId, productUnitId: unit.id } } });
    if (existing && existing.status !== 'ARCHIVED' && !existing.deletedAt) throw AppError.conflict(ErrorCode.CONFLICT, {}, { offerId: existing.id });
    const data = {
      sku: input.sku ?? null,
      price: input.price,
      compareAtPrice: input.compareAtPrice ?? null,
      minOrderQty: input.minOrderQty,
      qtyStep: input.qtyStep,
      maxOrderQty: input.maxOrderQty ?? null,
      stockMode: input.stockMode,
      stockQty: input.stockQty,
      leadTimeDays: input.leadTimeDays ?? null,
      status: unit.product.status === 'ACTIVE' ? input.status : ('PENDING_REVIEW' as const),
      deletedAt: null,
    };
    const offerId = await this.prisma.tx(async (tx) => {
      const offer = existing
        ? await tx.offer.update({ where: { id: existing.id }, data })
        : await tx.offer.create({ data: { ...data, supplierId, productId: unit.productId, productUnitId: unit.id } });
      await this.writeTiers(tx, offer.id, input.tiers);
      await this.audit.record(tx, { action: 'offer.created', entityType: 'Offer', entityId: offer.id, after: { price: input.price, productId: unit.productId } });
      return offer.id;
    });
    await this.stats.refresh([unit.productId]);
    return this.get(supplierId, offerId);
  }

  async update(supplierId: string | null, id: string, input: z.output<typeof offerUpdateSchema>): Promise<OfferManageDto> {
    const offer = await this.prisma.offer.findFirst({ where: { id, deletedAt: null, ...(supplierId ? { supplierId } : {}) } });
    if (!offer) throw AppError.notFound();
    await this.prisma.tx(async (tx) => {
      const { tiers, ...rest } = input;
      const data: Prisma.OfferUpdateInput = {};
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) (data as Record<string, unknown>)[k] = v;
      if (offer.status === 'PENDING_REVIEW' || offer.status === 'REJECTED') delete data.status;
      await tx.offer.update({ where: { id }, data });
      if (tiers) await this.writeTiers(tx, id, tiers);
      await this.audit.record(tx, { action: 'offer.updated', entityType: 'Offer', entityId: id, before: { price: offer.price.toString(), stockQty: offer.stockQty.toString(), status: offer.status }, after: rest });
      if (input.price !== undefined && dec(input.price).lessThan(dec(offer.price))) {
        await this.outbox.publish(tx, 'offer.price_dropped', { offerId: id, productId: offer.productId, oldPrice: offer.price.toString(), newPrice: input.price });
      }
    });
    await this.stats.refresh([offer.productId]);
    return this.get(supplierId, id);
  }

  async bulkUpdate(supplierId: string, input: z.output<typeof offerBulkUpdateSchema>): Promise<{ updated: number }> {
    const offers = await this.prisma.offer.findMany({ where: { id: { in: input.items.map((i) => i.offerId) }, supplierId, deletedAt: null } });
    await this.prisma.tx(async (tx) => {
      for (const item of input.items) {
        const offer = offers.find((o) => o.id === item.offerId);
        if (!offer) continue;
        await tx.offer.update({
          where: { id: offer.id },
          data: {
            ...(item.price !== undefined ? { price: item.price } : {}),
            ...(item.stockQty !== undefined ? { stockQty: item.stockQty } : {}),
            ...(item.status !== undefined && offer.status !== 'PENDING_REVIEW' ? { status: item.status } : {}),
          },
        });
      }
      await this.audit.record(tx, { action: 'offer.bulk_updated', entityType: 'Supplier', entityId: supplierId, meta: { count: offers.length } });
    });
    await this.stats.refresh(offers.map((o) => o.productId));
    return { updated: offers.length };
  }

  async archive(supplierId: string | null, id: string): Promise<void> {
    const offer = await this.prisma.offer.findFirst({ where: { id, deletedAt: null, ...(supplierId ? { supplierId } : {}) } });
    if (!offer) throw AppError.notFound();
    await this.prisma.offer.update({ where: { id }, data: { status: 'ARCHIVED' } });
    await this.audit.record(this.prisma, { action: 'offer.archived', entityType: 'Offer', entityId: id });
    await this.stats.refresh([offer.productId]);
  }

  /** Master catalog search for suppliers adding offers: shows which units they already sell. */
  async searchMasterCatalog(supplierId: string, q: string | undefined, categoryId: string | undefined) {
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(q ? { searchText: { contains: buildSearchText(q) } } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { file: true } },
        units: { orderBy: { sortOrder: 'asc' }, include: { offers: { where: { supplierId, deletedAt: null, status: { not: 'ARCHIVED' } }, select: { id: true, status: true } } } },
        category: { select: { nameAr: true, nameEn: true } },
        brand: { select: { nameAr: true, nameEn: true } },
      },
      orderBy: { salesCount: 'desc' },
      take: 30,
    });
    return products.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      image: this.files.imageRef(p.images[0]?.file),
      category: p.category,
      brand: p.brand,
      offersCount: p.offersCount,
      minPrice: p.minPrice ? money(p.minPrice) : null,
      units: p.units.map((u) => ({ ...this.catalogAdmin.unitDto(u), myOfferId: u.offers[0]?.id ?? null, myOfferStatus: u.offers[0]?.status ?? null })),
    }));
  }

  /** Supplier proposes a new catalog product + its offer (both pending admin review). */
  async propose(supplierId: string, input: z.output<typeof productProposalSchema>): Promise<OfferManageDto> {
    const offerId = await this.prisma.tx(async (tx) => {
      const { offer, ...product } = input;
      const productId = await this.catalogAdmin.upsertProduct(tx, product, { status: 'PENDING_REVIEW', proposedBySupplierId: supplierId });
      const unit = await tx.productUnit.findFirst({ where: { productId, isDefault: true } });
      if (!unit) throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED);
      const created = await tx.offer.create({
        data: {
          supplierId,
          productId,
          productUnitId: unit.id,
          sku: offer.sku ?? null,
          price: offer.price,
          compareAtPrice: offer.compareAtPrice ?? null,
          minOrderQty: offer.minOrderQty,
          qtyStep: offer.qtyStep,
          maxOrderQty: offer.maxOrderQty ?? null,
          stockMode: offer.stockMode,
          stockQty: offer.stockQty,
          leadTimeDays: offer.leadTimeDays ?? null,
          status: 'PENDING_REVIEW',
        },
      });
      await this.writeTiers(tx, created.id, offer.tiers);
      await this.audit.record(tx, { action: 'product.proposed', entityType: 'Product', entityId: productId, meta: { supplierId } });
      await this.outbox.publish(tx, 'product.proposed', { productId, supplierId });
      return created.id;
    });
    return this.get(supplierId, offerId);
  }

  /* ---------------------------------------------------------------- deals */

  async listDeals(supplierId: string | null, q: z.output<typeof dealListQuery>) {
    const where: Prisma.DealWhereInput = { ...(supplierId ? { supplierId } : {}), ...(q.status ? { status: q.status } : {}) };
    const [total, rows] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.findMany({ where, include: dealInclude, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { data: rows.map((d) => this.presentDeal(d)), meta: meta(q.page, q.pageSize, total) };
  }

  async createDeal(supplierId: string, input: z.output<typeof dealInputSchema>): Promise<DealDto> {
    const offer = await this.prisma.offer.findFirst({ where: { id: input.offerId, supplierId, deletedAt: null } });
    if (!offer) throw AppError.notFound();
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt || dec(input.dealPrice).greaterThanOrEqualTo(dec(offer.price))) throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED, {}, { fields: [{ path: 'dealPrice', message: 'must be below the regular price' }] });
    const deal = await this.prisma.tx(async (tx) => {
      const d = await tx.deal.create({
        data: { offerId: offer.id, supplierId, titleAr: input.titleAr ?? null, titleEn: input.titleEn ?? null, dealPrice: input.dealPrice, startsAt, endsAt, maxQtyPerOrder: input.maxQtyPerOrder ?? null, totalQtyCap: input.totalQtyCap ?? null },
        include: dealInclude,
      });
      await this.audit.record(tx, { action: 'deal.created', entityType: 'Deal', entityId: d.id });
      await this.outbox.publish(tx, 'deal.submitted', { dealId: d.id, supplierId });
      return d;
    });
    return this.presentDeal(deal);
  }

  async cancelDeal(supplierId: string | null, id: string): Promise<DealDto> {
    const deal = await this.prisma.deal.findFirst({ where: { id, ...(supplierId ? { supplierId } : {}) }, include: dealInclude });
    if (!deal) throw AppError.notFound();
    const updated = await this.prisma.deal.update({ where: { id }, data: { status: 'CANCELLED' }, include: dealInclude });
    await this.audit.record(this.prisma, { action: 'deal.cancelled', entityType: 'Deal', entityId: id });
    await this.stats.refresh([deal.offer.productId]);
    return this.presentDeal(updated);
  }

  async reviewDeal(id: string, input: z.output<typeof reviewDecisionSchema>, reviewerId: string): Promise<DealDto> {
    const deal = await this.prisma.deal.findUnique({ where: { id }, include: dealInclude });
    if (!deal) throw AppError.notFound();
    const updated = await this.prisma.tx(async (tx) => {
      const d = await tx.deal.update({ where: { id }, data: { status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewedById: reviewerId, reviewNote: input.note ?? null }, include: dealInclude });
      await this.audit.record(tx, { action: 'deal.reviewed', entityType: 'Deal', entityId: id, after: { decision: input.decision } });
      await this.outbox.publish(tx, 'deal.reviewed', { dealId: id, supplierId: deal.supplierId, decision: input.decision });
      return d;
    });
    await this.stats.refresh([deal.offer.productId]);
    return this.presentDeal(updated);
  }

  async reviewOffer(id: string, input: z.output<typeof reviewDecisionSchema>): Promise<OfferManageDto> {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer) throw AppError.notFound();
    await this.prisma.offer.update({ where: { id }, data: { status: input.decision === 'APPROVE' ? 'ACTIVE' : 'REJECTED' } });
    await this.audit.record(this.prisma, { action: 'offer.reviewed', entityType: 'Offer', entityId: id, after: input });
    await this.stats.refresh([offer.productId]);
    return this.get(null, id);
  }
}
