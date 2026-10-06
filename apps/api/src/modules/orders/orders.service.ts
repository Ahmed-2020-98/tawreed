import { Injectable } from '@nestjs/common';
import {
  buyerOrderQuery,
  ErrorCode,
  type OrderDetailDto,
  type OrderStatus,
  paginationQuery,
  type reviewSchema,
  supplierOrderQuery,
  type SupplierOrderDetailDto,
  type SupplierOrderStatus,
} from '@tawreed/contracts';
import { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { pageMeta } from '../../common/http/presenters.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CartService } from '../cart/cart.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { normalizeQty } from '../pricing/domain/pricing.js';
import type { SupplierOrderAction } from './domain/supplier-order.machine.js';
import { OrderLifecycleService } from './order-lifecycle.service.js';
import { OrderPresenter, orderDetailInclude, orderSummaryInclude, supplierOrderInclude } from './order.presenter.js';

export const adminOrderQuery = paginationQuery.extend({
  status: z.string().optional(),
  supplierId: z.uuid().optional(),
  companyId: z.uuid().optional(),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER', 'COD', 'CREDIT']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const BUYER_ACTIVE: OrderStatus[] = ['PENDING_PAYMENT', 'PLACED', 'PROCESSING', 'PARTIALLY_DELIVERED'];
const BUYER_PAST: OrderStatus[] = ['DELIVERED', 'COMPLETED', 'CANCELLED'];
const SUPPLIER_TABS: Record<string, SupplierOrderStatus[]> = {
  NEW: ['PENDING'],
  IN_PROGRESS: ['ACCEPTED', 'PREPARING'],
  SHIPPING: ['READY', 'OUT_FOR_DELIVERY'],
  DONE: ['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED'],
  CLOSED: ['REJECTED', 'CANCELLED', 'RETURNED'],
};

const dateRange = (from?: string, to?: string): Prisma.DateTimeFilter | undefined =>
  from || to ? { ...(from ? { gte: new Date(`${from}T00:00:00+03:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59+03:00`) } : {}) } : undefined;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presenter: OrderPresenter,
    private readonly lifecycle: OrderLifecycleService,
    private readonly cart: CartService,
    private readonly settings: SettingsService,
  ) {}

  /* ---------------------------------------------------------------- buyer */

  async buyerList(companyId: string, q: z.output<typeof buyerOrderQuery>) {
    const status = q.status === 'ACTIVE' ? { in: BUYER_ACTIVE } : q.status === 'PAST' ? { in: BUYER_PAST } : q.status ? { equals: q.status } : undefined;
    const where: Prisma.OrderWhereInput = {
      companyId,
      ...(status ? { status } : {}),
      ...(q.q ? { OR: [{ number: { contains: q.q, mode: 'insensitive' } }, { supplierOrders: { some: { items: { some: { productNameAr: { contains: q.q } } } } } }] } : {}),
      ...(dateRange(q.from, q.to) ? { createdAt: dateRange(q.from, q.to) } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({ where, include: orderSummaryInclude, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { data: await this.presenter.summaries(rows), meta: pageMeta(q.page, q.pageSize, total) };
  }

  async buyerDetail(companyId: string, idOrNumber: string): Promise<OrderDetailDto> {
    const order = await this.prisma.order.findFirst({ where: { companyId, OR: [{ number: idOrNumber }, ...(this.isUuid(idOrNumber) ? [{ id: idOrNumber }] : [])] }, include: orderDetailInclude });
    if (!order) throw AppError.notFound();
    const { reviewWindowDays } = await this.settings.get('orders');
    return this.presenter.detail(order, 'BUYER', reviewWindowDays);
  }

  async buyerCancel(actor: Actor, idOrNumber: string, reason: string): Promise<OrderDetailDto> {
    const order = await this.prisma.order.findFirst({ where: { companyId: actor.contextId as string, OR: [{ number: idOrNumber }, ...(this.isUuid(idOrNumber) ? [{ id: idOrNumber }] : [])] }, select: { id: true } });
    if (!order) throw AppError.notFound();
    await this.prisma.tx((tx) => this.lifecycle.cancelOrder(tx, order.id, { type: 'BUYER', id: actor.userId }, reason));
    return this.buyerDetail(actor.contextId as string, order.id);
  }

  /** Adds every still-available item of a past order back into the cart. */
  /** Buyer rates a delivered supplier order once (within the review window); keeps the supplier's rating aggregate current. */
  async review(actor: Actor, supplierOrderId: string, input: z.output<typeof reviewSchema>) {
    const companyId = actor.contextId as string;
    const so = await this.prisma.supplierOrder.findFirst({ where: { id: supplierOrderId, order: { companyId } }, include: { review: { select: { id: true } } } });
    if (!so) throw AppError.notFound();
    if (so.review) throw AppError.conflict(ErrorCode.REVIEW_ALREADY_SUBMITTED);
    if (!['DELIVERED', 'COMPLETED', 'PARTIALLY_DELIVERED'].includes(so.status)) throw AppError.conflict(ErrorCode.INVALID_STATE_TRANSITION);
    await this.prisma.tx(async (tx) => {
      await tx.review.create({ data: { supplierOrderId: so.id, companyId, supplierId: so.supplierId, userId: actor.userId, rating: input.rating, qualityRating: input.qualityRating, deliveryRating: input.deliveryRating, comment: input.comment } });
      const agg = await tx.review.aggregate({ where: { supplierId: so.supplierId, isHidden: false }, _avg: { rating: true }, _count: true });
      await tx.supplier.update({ where: { id: so.supplierId }, data: { ratingAvg: (agg._avg.rating ?? 0).toFixed(2), ratingCount: agg._count } });
    });
    return this.buyerDetail(companyId, so.orderId);
  }

  async reorder(actor: Actor, idOrNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: { companyId: actor.contextId as string, OR: [{ number: idOrNumber }, ...(this.isUuid(idOrNumber) ? [{ id: idOrNumber }] : [])] },
      include: { supplierOrders: { include: { items: { include: { offer: true } } } } },
    });
    if (!order) throw AppError.notFound();
    const cart = await this.cart.cartFor(actor);
    let added = 0;
    let skipped = 0;
    for (const item of order.supplierOrders.flatMap((s) => s.items)) {
      const offer = item.offer;
      if (!offer || offer.status !== 'ACTIVE' || offer.deletedAt) {
        skipped++;
        continue;
      }
      const qty = normalizeQty(offer, item.qty).toString();
      await this.prisma.cartItem.upsert({ where: { cartId_offerId: { cartId: cart.id, offerId: offer.id } }, create: { cartId: cart.id, offerId: offer.id, qty }, update: { qty } });
      added++;
    }
    return { added, skipped, cart: await this.cart.get(actor) };
  }

  /** Buy-again product ids (most frequently ordered). */
  async buyAgainProductIds(companyId: string, take = 12): Promise<string[]> {
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { productId: { not: null }, supplierOrder: { order: { companyId, status: { not: 'CANCELLED' } } } },
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take,
    });
    return rows.map((r) => r.productId).filter((id): id is string => !!id);
  }

  /* ---------------------------------------------------------------- supplier */

  async supplierList(supplierId: string, q: z.output<typeof supplierOrderQuery>) {
    const tab = q.status && SUPPLIER_TABS[q.status];
    const where: Prisma.SupplierOrderWhereInput = {
      supplierId,
      status: tab ? { in: tab } : q.status ? { equals: q.status as SupplierOrderStatus } : { not: 'AWAITING_PAYMENT' },
      ...(q.q ? { OR: [{ number: { contains: q.q, mode: 'insensitive' } }, { order: { company: { name: { contains: q.q, mode: 'insensitive' } } } }] } : {}),
      ...(dateRange(q.from, q.to) ? { createdAt: dateRange(q.from, q.to) } : {}),
    };
    const [total, rows, counts] = await Promise.all([
      this.prisma.supplierOrder.count({ where }),
      this.prisma.supplierOrder.findMany({
        where,
        include: { order: { select: { number: true, paymentMethod: true, addressSnapshot: true, company: { select: { id: true, name: true, businessType: true } } } }, _count: { select: { items: true } } },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.supplierOrder.groupBy({ by: ['status'], where: { supplierId, status: { not: 'AWAITING_PAYMENT' } }, _count: { _all: true } }),
    ]);
    const tabCounts = Object.fromEntries(Object.entries(SUPPLIER_TABS).map(([k, statuses]) => [k, counts.filter((c) => statuses.includes(c.status)).reduce((a, c) => a + c._count._all, 0)]));
    return { data: rows.map((r) => this.presenter.supplierListItem(r)), meta: { ...pageMeta(q.page, q.pageSize, total), tabCounts } };
  }

  async supplierDetail(supplierId: string | null, id: string, viewer: 'SUPPLIER' | 'STAFF' = 'SUPPLIER'): Promise<SupplierOrderDetailDto> {
    const so = await this.prisma.supplierOrder.findFirst({
      where: { id, ...(supplierId ? { supplierId } : {}) },
      include: {
        ...supplierOrderInclude,
        order: { select: { id: true, number: true, paymentMethod: true, paymentStatus: true, placedAt: true, addressSnapshot: true, company: { select: { id: true, name: true, businessType: true, phone: true, verificationStatus: true } } } },
        events: { orderBy: { createdAt: 'asc' } },
        documents: { include: { file: true } },
      },
    });
    if (!so || (supplierId && so.status === 'AWAITING_PAYMENT')) throw AppError.notFound();
    return this.presenter.supplierDetail(so, viewer);
  }

  async supplierAction(actor: Actor, id: string, action: Extract<SupplierOrderAction, 'accept' | 'reject' | 'start_preparing' | 'mark_ready'>, reason?: string): Promise<SupplierOrderDetailDto> {
    const so = await this.prisma.supplierOrder.findFirst({ where: { id, supplierId: actor.contextId as string }, select: { id: true } });
    if (!so) throw AppError.notFound();
    await this.prisma.tx((tx) => this.lifecycle.transition(tx, so.id, action, { type: 'SUPPLIER', id: actor.userId }, { reason }));
    return this.supplierDetail(actor.contextId, id);
  }

  /* ---------------------------------------------------------------- admin */

  async adminList(q: z.output<typeof adminOrderQuery>) {
    const where: Prisma.OrderWhereInput = {
      ...(q.status ? { status: q.status as OrderStatus } : {}),
      ...(q.companyId ? { companyId: q.companyId } : {}),
      ...(q.supplierId ? { supplierOrders: { some: { supplierId: q.supplierId } } } : {}),
      ...(q.paymentMethod ? { paymentMethod: q.paymentMethod } : {}),
      ...(q.q ? { OR: [{ number: { contains: q.q, mode: 'insensitive' } }, { company: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}),
      ...(dateRange(q.from, q.to) ? { createdAt: dateRange(q.from, q.to) } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({ where, include: { ...orderSummaryInclude, company: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    const summaries = await this.presenter.summaries(rows);
    return { data: summaries.map((s, i) => ({ ...s, company: rows[i]?.company })), meta: pageMeta(q.page, q.pageSize, total) };
  }

  async adminDetail(idOrNumber: string): Promise<OrderDetailDto> {
    const order = await this.prisma.order.findFirst({ where: { OR: [{ number: idOrNumber }, ...(this.isUuid(idOrNumber) ? [{ id: idOrNumber }] : [])] }, include: orderDetailInclude });
    if (!order) throw AppError.notFound();
    return this.presenter.detail(order, 'STAFF');
  }

  async adminCancel(actor: Actor, id: string, reason: string): Promise<OrderDetailDto> {
    await this.prisma.tx((tx) => this.lifecycle.cancelOrder(tx, id, { type: 'STAFF', id: actor.userId }, reason));
    return this.adminDetail(id);
  }

  async adminSupplierOrderAction(actor: Actor, id: string, action: SupplierOrderAction, reason?: string): Promise<SupplierOrderDetailDto> {
    await this.prisma.tx((tx) => this.lifecycle.transition(tx, id, action, { type: 'STAFF', id: actor.userId }, { reason }));
    return this.supplierDetail(null, id, 'STAFF');
  }

  private isUuid(v: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  }

}
