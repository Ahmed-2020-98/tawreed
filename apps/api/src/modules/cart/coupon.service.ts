import { Injectable } from '@nestjs/common';
import type { ErrorCode } from '@tawreed/contracts';
import type { Coupon } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { dec, type Dec } from '../pricing/domain/money.js';

export interface CouponCheck {
  coupon: Coupon | null;
  error: { code: ErrorCode; params: Record<string, string | number> } | null;
  eligibleCategoryIds: Set<string> | null;
}

@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  findByCode(code: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  }

  /** Validates usage rules; `subtotalFor(scope)` returns the eligible subtotal for the coupon's category scope. */
  async check(coupon: Coupon | null, companyId: string, subtotalFor: (scope: Set<string> | null) => Dec): Promise<CouponCheck> {
    if (!coupon || !coupon.isActive) return { coupon: null, error: { code: 'COUPON_INVALID', params: {} }, eligibleCategoryIds: null };
    const now = new Date();
    if ((coupon.startsAt && coupon.startsAt > now) || (coupon.endsAt && coupon.endsAt < now)) {
      return { coupon: null, error: { code: 'COUPON_EXPIRED', params: {} }, eligibleCategoryIds: null };
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return { coupon: null, error: { code: 'COUPON_USAGE_EXCEEDED', params: {} }, eligibleCategoryIds: null };
    }
    const [companyUses, priorOrders] = await Promise.all([
      coupon.perCompanyLimit !== null ? this.prisma.couponRedemption.count({ where: { couponId: coupon.id, companyId } }) : Promise.resolve(0),
      coupon.firstOrderOnly ? this.prisma.order.count({ where: { companyId, status: { not: 'CANCELLED' } } }) : Promise.resolve(0),
    ]);
    if (coupon.perCompanyLimit !== null && companyUses >= coupon.perCompanyLimit) {
      return { coupon: null, error: { code: 'COUPON_USAGE_EXCEEDED', params: {} }, eligibleCategoryIds: null };
    }
    if (coupon.firstOrderOnly && priorOrders > 0) return { coupon: null, error: { code: 'COUPON_NOT_APPLICABLE', params: {} }, eligibleCategoryIds: null };
    const eligibleCategoryIds = coupon.categoryId ? new Set((await this.catalog.categoryScope(coupon.categoryId)) ?? []) : null;
    const subtotal = subtotalFor(eligibleCategoryIds);
    if (subtotal.isZero()) return { coupon: null, error: { code: 'COUPON_NOT_APPLICABLE', params: {} }, eligibleCategoryIds };
    if (subtotal.lessThan(dec(coupon.minOrderValue))) {
      return { coupon: null, error: { code: 'COUPON_MIN_ORDER', params: { min: dec(coupon.minOrderValue).toFixed(2) } }, eligibleCategoryIds };
    }
    return { coupon, error: null, eligibleCategoryIds };
  }
}
