import type { OfferSummaryDto, ProductCardDto, StockStatus, SupplierMiniDto, UnitDto } from '@tawreed/contracts';
import { loc, locNullable } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { dec, money, qtyStr } from '../pricing/domain/money.js';
import { resolveUnitPrice, type OfferPricing } from '../pricing/domain/pricing.js';
import type { FilesService, UrlPair } from '../files/files.service.js';

const NO_CITY = '00000000-0000-0000-0000-000000000000';

export const activeOfferWhere = {
  status: 'ACTIVE',
  deletedAt: null,
  supplier: { status: 'ACTIVE', deletedAt: null },
} satisfies Prisma.OfferWhereInput;

export function activeDealWhere(now: Date) {
  return { status: 'APPROVED', startsAt: { lte: now }, endsAt: { gt: now } } satisfies Prisma.DealWhereInput;
}

export function offerInclude(cityId: string | null, now: Date) {
  return {
    unit: true,
    tiers: { orderBy: { minQty: 'asc' } },
    deals: { where: activeDealWhere(now), orderBy: { dealPrice: 'asc' }, take: 1 },
    supplier: {
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        logoFileId: true,
        ratingAvg: true,
        ratingCount: true,
        minOrderValue: true,
        commissionRate: true,
        vatNumber: true,
        city: { select: { nameAr: true, nameEn: true } },
        coverage: { where: { isActive: true, cityId: cityId ?? NO_CITY }, take: 1 },
      },
    },
  } satisfies Prisma.OfferInclude;
}

export type OfferWithRelations = Prisma.OfferGetPayload<{ include: ReturnType<typeof offerInclude> }>;
export type UnitRow = Prisma.ProductUnitGetPayload<object>;

export const productCardInclude = {
  images: { orderBy: { sortOrder: 'asc' }, take: 1, include: { file: true } },
  category: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
  brand: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
} satisfies Prisma.ProductInclude;
export type ProductCardRow = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export function unitDto(u: UnitRow): UnitDto {
  return {
    id: u.id,
    code: u.code,
    name: loc(u.nameAr, u.nameEn),
    baseQuantity: qtyStr(u.baseQuantity),
    baseUnit: loc(u.baseUnitAr, u.baseUnitEn),
    isDefault: u.isDefault,
  };
}

export function offerPricing(o: OfferWithRelations): OfferPricing {
  const deal = o.deals[0];
  return {
    price: o.price,
    compareAtPrice: o.compareAtPrice,
    vatRate: o.vatRate,
    tiers: o.tiers.map((t) => ({ minQty: t.minQty, price: t.price })),
    deal: deal
      ? {
          dealPrice: deal.dealPrice,
          maxQtyPerOrder: deal.maxQtyPerOrder,
          remainingQty: deal.totalQtyCap ? dec(deal.totalQtyCap).minus(dec(deal.soldQty)) : null,
          endsAt: deal.endsAt,
        }
      : null,
  };
}

export function availableQty(o: Pick<OfferWithRelations, 'stockMode' | 'stockQty' | 'reservedQty'>) {
  return o.stockMode === 'TRACKED' ? dec(o.stockQty).minus(dec(o.reservedQty)) : null;
}

export function stockStatus(o: Pick<OfferWithRelations, 'stockMode' | 'stockQty' | 'reservedQty' | 'minOrderQty'>): StockStatus {
  if (o.stockMode === 'UNLIMITED') return 'IN_STOCK';
  if (o.stockMode === 'ON_REQUEST') return 'ON_REQUEST';
  const avail = availableQty(o) ?? dec(0);
  if (avail.lessThan(dec(o.minOrderQty))) return 'OUT_OF_STOCK';
  if (avail.lessThan(dec(o.minOrderQty).times(4))) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function supplierMini(s: OfferWithRelations['supplier'], logos: Map<string, UrlPair>): SupplierMiniDto {
  return {
    id: s.id,
    slug: s.slug,
    name: loc(s.nameAr, s.nameEn),
    logoUrl: s.logoFileId ? logos.get(s.logoFileId)?.url ?? null : null,
    ratingAvg: dec(s.ratingAvg).toFixed(1),
    ratingCount: s.ratingCount,
    city: s.city ? loc(s.city.nameAr, s.city.nameEn) : null,
  };
}

export function presentOffer(o: OfferWithRelations, opts: { logos: Map<string, UrlPair>; isBest: boolean }): OfferSummaryDto {
  const pricing = offerPricing(o);
  const atMoq = resolveUnitPrice(pricing, o.minOrderQty);
  const deal = o.deals[0];
  const coverage = o.supplier.coverage[0] ?? null;
  const baseQty = dec(o.unit.baseQuantity);
  const avail = availableQty(o);
  return {
    id: o.id,
    supplier: supplierMini(o.supplier, opts.logos),
    unit: unitDto(o.unit),
    price: money(o.price),
    compareAtPrice: o.compareAtPrice ? money(o.compareAtPrice) : null,
    effectivePrice: money(atMoq.unitPrice),
    priceSource: atMoq.source,
    pricePerBaseUnit: money(atMoq.unitPrice.dividedBy(baseQty.greaterThan(0) ? baseQty : 1)),
    deal: deal ? { id: deal.id, dealPrice: money(deal.dealPrice), endsAt: deal.endsAt.toISOString(), maxQtyPerOrder: deal.maxQtyPerOrder ? qtyStr(deal.maxQtyPerOrder) : null } : null,
    tiers: o.tiers.map((t) => ({ minQty: qtyStr(t.minQty), price: money(t.price) })),
    minOrderQty: qtyStr(o.minOrderQty),
    qtyStep: qtyStr(o.qtyStep),
    maxOrderQty: o.maxOrderQty ? qtyStr(o.maxOrderQty) : null,
    stockStatus: stockStatus(o),
    availableQty: avail ? qtyStr(avail.greaterThan(0) ? avail : 0) : null,
    leadTimeDays: o.leadTimeDays ?? coverage?.leadTimeDays ?? 1,
    deliveryFee: coverage ? money(coverage.deliveryFee) : null,
    freeDeliveryThreshold: coverage?.freeDeliveryThreshold ? money(coverage.freeDeliveryThreshold) : null,
    sameDayAvailable: coverage?.sameDayAvailable ?? false,
    coversCity: !!coverage,
    vatRate: dec(o.vatRate).toString(),
    isBest: opts.isBest,
  };
}

export function presentProductCard(
  p: ProductCardRow,
  offers: OfferSummaryDto[],
  opts: { files: FilesService; favorite: boolean },
): ProductCardDto {
  const img = p.images[0];
  const prices = offers.map((o) => dec(o.effectivePrice));
  const best = offers.find((o) => o.isBest) ?? offers[0] ?? null;
  const name = loc(p.nameAr, p.nameEn);
  return {
    id: p.id,
    slug: p.slug,
    name,
    image: img ? opts.files.imageRef(img.file, locNullable(img.altAr, img.altEn) ?? name) : null,
    category: { id: p.category.id, slug: p.category.slug, name: loc(p.category.nameAr, p.category.nameEn) },
    brand: p.brand ? { id: p.brand.id, slug: p.brand.slug, name: loc(p.brand.nameAr, p.brand.nameEn) } : null,
    originCountry: p.originCountry,
    storageType: p.storageType,
    tags: p.tags,
    offersCount: offers.length || p.offersCount,
    priceRange: prices.length
      ? { min: money(prices.reduce((a, b) => (a.lessThan(b) ? a : b))), max: money(prices.reduce((a, b) => (a.greaterThan(b) ? a : b))) }
      : p.minPrice
        ? { min: money(p.minPrice), max: money(p.maxPrice ?? p.minPrice) }
        : null,
    bestOffer: best,
    isFavorite: opts.favorite,
  };
}
