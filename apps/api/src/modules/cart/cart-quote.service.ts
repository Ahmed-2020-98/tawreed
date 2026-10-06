import { Injectable } from '@nestjs/common';
import type { CartDto, CartGroupDto, CartIssueDto, CartLineDto, CityRef, ErrorCode, StorageType } from '@tawreed/contracts';
import { translate } from '@tawreed/i18n';
import { RequestContext } from '../../common/context/request-context.js';
import { cityRef } from '../../common/http/presenters.js';
import { loc } from '../../common/i18n/localize.js';
import type { Coupon, SupplierCoverage } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { availableQty, offerInclude, offerPricing, type OfferWithRelations, stockStatus, supplierMini, unitDto } from '../catalog/catalog.presenters.js';
import { FilesService, type UrlPair } from '../files/files.service.js';
import { earliestDeliveryDate } from '../pricing/domain/delivery.js';
import { dec, type Dec, D, money, qtyStr, sum } from '../pricing/domain/money.js';
import { allocate, computeGroup, computeLine, couponDiscount, type GroupTotals, type LineAmounts, resolveUnitPrice, type UnitPriceResult, validateQty } from '../pricing/domain/pricing.js';
import { CouponService } from './coupon.service.js';

export interface QuoteItemInput {
  id: string;
  offerId: string;
  qty: Dec | string;
}

export interface QuoteLine {
  itemId: string;
  offer: OfferWithRelations;
  product: { id: string; slug: string; nameAr: string; nameEn: string; categoryId: string; storageType: StorageType; status: string; imageFile: { key: string; visibility: 'PUBLIC' | 'PRIVATE'; variants: unknown; width: number | null; height: number | null } | null };
  qty: Dec;
  price: UnitPriceResult;
  amounts: LineAmounts;
  issues: { code: ErrorCode; params: Record<string, string | number> }[];
  valid: boolean;
}

export interface QuoteGroup {
  supplierId: string;
  supplier: OfferWithRelations['supplier'];
  lines: QuoteLine[];
  coverage: SupplierCoverage | null;
  totals: GroupTotals;
  leadTimeDays: number;
  earliestDate: Date | null;
  storageType: StorageType;
  issues: { code: ErrorCode; params: Record<string, string | number> }[];
}

export interface CartQuote {
  groups: QuoteGroup[];
  coupon: Coupon | null;
  couponIssue: { code: ErrorCode; params: Record<string, string | number> } | null;
  couponDiscount: Dec;
  waivedDelivery: Dec;
  totals: { subtotal: Dec; discountTotal: Dec; deliveryTotal: Dec; vatTotal: Dec; grandTotal: Dec; savings: Dec };
  blocking: boolean;
  itemsCount: number;
}

const STORAGE_RANK: Record<StorageType, number> = { AMBIENT: 0, CHILLED: 1, FROZEN: 2 };

/** Prices a set of cart items for a delivery city (shared by cart, checkout and reorder). */
@Injectable()
export class CartQuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly coupons: CouponService,
  ) {}

  async quote(items: QuoteItemInput[], opts: { cityId: string | null; companyId: string; coupon: Coupon | null; now?: Date }): Promise<CartQuote> {
    const now = opts.now ?? new Date();
    const offers = await this.prisma.offer.findMany({
      where: { id: { in: items.map((i) => i.offerId) } },
      include: {
        ...offerInclude(opts.cityId, now),
        supplier: { select: { ...offerInclude(opts.cityId, now).supplier.select, status: true, deletedAt: true } },
        product: { select: { id: true, slug: true, nameAr: true, nameEn: true, categoryId: true, storageType: true, status: true, deletedAt: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { file: true } } } },
      },
    });

    // 1) Lines without coupon.
    const lines: QuoteLine[] = [];
    for (const item of items) {
      const offer = offers.find((o) => o.id === item.offerId);
      if (!offer) continue;
      const qty = dec(item.qty);
      const issues: QuoteLine['issues'] = [];
      const active = offer.status === 'ACTIVE' && !offer.deletedAt && offer.supplier.status === 'ACTIVE' && !offer.supplier.deletedAt && offer.product.status === 'ACTIVE' && !offer.product.deletedAt;
      if (!active) issues.push({ code: 'OFFER_UNAVAILABLE', params: {} });
      const avail = availableQty(offer);
      const qtyIssue = validateQty({ minOrderQty: offer.minOrderQty, qtyStep: offer.qtyStep, maxOrderQty: offer.maxOrderQty, stockMode: offer.stockMode, availableQty: avail }, qty);
      if (qtyIssue) issues.push({ code: qtyIssue.code, params: { ...qtyIssue.params, unit: loc(offer.unit.nameAr, offer.unit.nameEn) } });
      const price = resolveUnitPrice(offerPricing(offer), qty);
      const img = offer.product.images[0]?.file ?? null;
      lines.push({
        itemId: item.id,
        offer,
        product: { ...offer.product, imageFile: img },
        qty,
        price,
        amounts: computeLine(price.unitPrice, qty, offer.vatRate),
        issues,
        valid: issues.length === 0,
      });
    }

    // 2) Coupon.
    let coupon = opts.coupon;
    let couponIssue: CartQuote['couponIssue'] = null;
    let totalDiscount = new D(0);
    if (coupon) {
      const eligible = (scope: Set<string> | null) => lines.filter((l) => l.valid && (!scope || scope.has(l.product.categoryId)));
      const check = await this.coupons.check(coupon, opts.companyId, (scope) => sum(eligible(scope).map((l) => l.amounts.lineSubtotal)));
      if (check.error) {
        couponIssue = check.error;
        coupon = null;
      } else if (check.coupon) {
        const eligibleLines = eligible(check.eligibleCategoryIds);
        totalDiscount = couponDiscount(
          { type: check.coupon.type, value: check.coupon.value, maxDiscount: check.coupon.maxDiscount, minOrderValue: check.coupon.minOrderValue },
          sum(eligibleLines.map((l) => l.amounts.lineSubtotal)),
        );
        const parts = allocate(totalDiscount, eligibleLines.map((l) => l.amounts.lineSubtotal));
        eligibleLines.forEach((l, i) => {
          l.amounts = computeLine(l.price.unitPrice, l.qty, l.offer.vatRate, parts[i] ?? 0);
        });
      }
    }
    const waive = coupon?.type === 'FREE_DELIVERY';

    // 3) Supplier groups.
    const bySupplier = new Map<string, QuoteLine[]>();
    for (const l of lines) bySupplier.set(l.offer.supplierId, [...(bySupplier.get(l.offer.supplierId) ?? []), l]);
    const groups: QuoteGroup[] = [];
    for (const [supplierId, groupLines] of bySupplier) {
      const supplier = groupLines[0]?.offer.supplier as OfferWithRelations['supplier'];
      const coverage = (supplier.coverage[0]) ?? null;
      const validLines = groupLines.filter((l) => l.valid);
      const totals = computeGroup(validLines.map((l) => l.amounts), {
        deliveryFee: coverage?.deliveryFee ?? 0,
        freeDeliveryThreshold: coverage?.freeDeliveryThreshold ?? null,
        minOrderValue: supplier.minOrderValue,
        waiveDelivery: waive,
      });
      const issues: QuoteGroup['issues'] = [];
      const cityName = opts.cityId ? await this.cityName(opts.cityId) : '';
      if (!coverage) issues.push({ code: 'CITY_NOT_COVERED', params: { city: cityName } });
      if (totals.amountToMinOrder.greaterThan(0) && validLines.length) {
        issues.push({ code: 'MIN_ORDER_NOT_MET', params: { supplier: loc(supplier.nameAr, supplier.nameEn), min: money(supplier.minOrderValue), remaining: money(totals.amountToMinOrder) } });
      }
      const leadTimeDays = Math.max(coverage?.leadTimeDays ?? 1, ...groupLines.map((l) => l.offer.leadTimeDays ?? 0));
      groups.push({
        supplierId,
        supplier,
        lines: groupLines,
        coverage,
        totals,
        leadTimeDays,
        earliestDate: coverage ? earliestDeliveryDate({ leadTimeDays, sameDayAvailable: coverage.sameDayAvailable, cutoffTime: coverage.cutoffTime }, now) : null,
        storageType: groupLines.reduce<StorageType>((acc, l) => (STORAGE_RANK[l.product.storageType] > STORAGE_RANK[acc] ? l.product.storageType : acc), 'AMBIENT'),
        issues,
      });
    }

    const subtotal = sum(groups.map((g) => g.totals.subtotal));
    const discountTotal = sum(groups.map((g) => g.totals.discountTotal));
    const deliveryTotal = sum(groups.map((g) => g.totals.deliveryFee));
    const vatTotal = sum(groups.map((g) => g.totals.vatTotal));
    const waivedDelivery = sum(groups.map((g) => g.totals.waivedDelivery));
    const listSavings = sum(lines.filter((l) => l.valid).map((l) => l.price.listUnitPrice.minus(l.price.unitPrice).times(l.qty)));
    return {
      groups,
      coupon,
      couponIssue,
      couponDiscount: totalDiscount,
      waivedDelivery,
      totals: {
        subtotal,
        discountTotal,
        deliveryTotal,
        vatTotal,
        grandTotal: subtotal.minus(discountTotal).plus(deliveryTotal).plus(vatTotal),
        savings: listSavings.plus(discountTotal).plus(waivedDelivery),
      },
      blocking: lines.length === 0 || lines.some((l) => !l.valid) || groups.some((g) => g.issues.length > 0),
      itemsCount: lines.length,
    };
  }

  private cityCache = new Map<string, string>();
  private async cityName(id: string): Promise<string> {
    const key = `${id}:${RequestContext.locale()}`;
    if (!this.cityCache.has(key)) {
      const c = await this.prisma.city.findUnique({ where: { id }, select: { nameAr: true, nameEn: true } });
      this.cityCache.set(key, c ? loc(c.nameAr, c.nameEn) : '');
    }
    return this.cityCache.get(key) ?? '';
  }

  /* ---------------------------------------------------------------- presentation */

  issue(i: { code: ErrorCode; params: Record<string, string | number> }): CartIssueDto {
    return { code: i.code, message: translate(RequestContext.locale(), `errors.${i.code}`, i.params), params: i.params };
  }

  async toDto(cartId: string, q: CartQuote, city: { id: string; slug: string; nameAr: string; nameEn: string } | null): Promise<CartDto> {
    const logos: Map<string, UrlPair> = await this.files.urlMap(q.groups.map((g) => g.supplier.logoFileId));
    const groups: CartGroupDto[] = q.groups.map((g) => ({
      supplier: supplierMini(g.supplier, logos),
      items: g.lines.map((l): CartLineDto => {
        const avail = availableQty(l.offer);
        return {
          id: l.itemId,
          offerId: l.offer.id,
          product: { id: l.product.id, slug: l.product.slug, name: loc(l.product.nameAr, l.product.nameEn), image: this.files.imageRef(l.product.imageFile as never) },
          unit: unitDto(l.offer.unit),
          qty: qtyStr(l.qty),
          unitPrice: money(l.price.unitPrice),
          listUnitPrice: money(l.price.listUnitPrice),
          priceSource: l.price.source,
          nextTier: l.price.nextTier ? { minQty: qtyStr(l.price.nextTier.minQty), price: money(l.price.nextTier.price) } : null,
          lineSubtotal: money(l.amounts.lineSubtotal),
          discount: money(l.amounts.discount),
          vatAmount: money(l.amounts.vatAmount),
          lineTotal: money(l.amounts.lineTotal),
          minOrderQty: qtyStr(l.offer.minOrderQty),
          qtyStep: qtyStr(l.offer.qtyStep),
          maxOrderQty: l.offer.maxOrderQty ? qtyStr(l.offer.maxOrderQty) : null,
          stockStatus: stockStatus(l.offer),
          availableQty: avail ? qtyStr(avail.greaterThan(0) ? avail : 0) : null,
          issues: l.issues.map((i) => this.issue(i)),
        };
      }),
      subtotal: money(g.totals.subtotal),
      discountTotal: money(g.totals.discountTotal),
      deliveryFee: money(g.totals.deliveryFee),
      freeDeliveryThreshold: g.coverage?.freeDeliveryThreshold ? money(g.coverage.freeDeliveryThreshold) : null,
      amountToFreeDelivery: g.totals.amountToFreeDelivery ? money(g.totals.amountToFreeDelivery) : null,
      minOrderValue: money(g.supplier.minOrderValue),
      amountToMinOrder: money(g.totals.amountToMinOrder),
      vatTotal: money(g.totals.vatTotal),
      total: money(g.totals.total),
      leadTimeDays: g.leadTimeDays,
      sameDayAvailable: g.coverage?.sameDayAvailable ?? false,
      earliestDeliveryDate: g.earliestDate ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(g.earliestDate) : null,
      storageType: g.storageType,
      covered: !!g.coverage,
      issues: g.issues.map((i) => this.issue(i)),
    }));
    const cityDto: CityRef | null = cityRef(city);
    return {
      id: cartId,
      itemsCount: q.itemsCount,
      groups,
      coupon: q.coupon
        ? {
            code: q.coupon.code,
            description: loc(q.coupon.descriptionAr ?? '', q.coupon.descriptionEn ?? '') || null,
            discount: money(q.couponDiscount.plus(q.waivedDelivery)),
            freeDelivery: q.coupon.type === 'FREE_DELIVERY',
          }
        : null,
      totals: {
        subtotal: money(q.totals.subtotal),
        discountTotal: money(q.totals.discountTotal),
        deliveryTotal: money(q.totals.deliveryTotal),
        vatTotal: money(q.totals.vatTotal),
        grandTotal: money(q.totals.grandTotal),
        savings: money(q.totals.savings),
      },
      issues: q.couponIssue ? [this.issue(q.couponIssue)] : [],
      canCheckout: !q.blocking,
      city: cityDto,
    };
  }
}
