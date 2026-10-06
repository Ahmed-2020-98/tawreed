import { Injectable } from '@nestjs/common';
import { type ActorType, ErrorCode } from '@tawreed/contracts';
import { AppError } from '../../common/http/app-error.js';
import type { Prisma, SupplierOrder } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import type { Tx } from '../../infrastructure/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { RefundService } from '../payments/refund.service.js';
import { dec, type DecInput, money } from '../pricing/domain/money.js';
import { canTransition, deriveOrderStatus, nextStatus, type SupplierOrderAction } from './domain/supplier-order.machine.js';
import { OrderEventsService } from './order-events.service.js';

export interface LifecycleActor {
  type: ActorType;
  id?: string | null;
}

const EVENT_FOR: Partial<Record<SupplierOrderAction, string>> = {
  accept: 'supplier_order.accepted',
  reject: 'supplier_order.rejected',
  start_preparing: 'supplier_order.preparing',
  mark_ready: 'supplier_order.ready',
  dispatch: 'supplier_order.dispatched',
  deliver: 'supplier_order.delivered',
  partial_deliver: 'supplier_order.partially_delivered',
  delivery_failed: 'supplier_order.delivery_failed',
  complete: 'supplier_order.completed',
  cancel: 'supplier_order.cancelled',
};

/** Owns every supplier-order state change and its side effects (stock, deals, money, aggregate status, events). */
@Injectable()
export class OrderLifecycleService {
  constructor(
    private readonly events: OrderEventsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly refunds: RefundService,
    private readonly settings: SettingsService,
  ) {}

  async transition(tx: Tx, supplierOrderId: string, action: SupplierOrderAction, actor: LifecycleActor, opts: { reason?: string; note?: string } = {}): Promise<SupplierOrder> {
    const so = await tx.supplierOrder.findUnique({ where: { id: supplierOrderId }, include: { supplier: { select: { nameAr: true, nameEn: true } } } });
    if (!so) throw AppError.notFound();
    const to = nextStatus(so.status, action, actor.type);
    if (!to) throw AppError.invalidTransition(so.status, action);
    const now = new Date();
    const data: Prisma.SupplierOrderUpdateInput = { status: to };
    switch (action) {
      case 'confirm_payment': {
        const hours = (await this.settings.get('orders')).supplierAcceptHours;
        data.acceptDeadlineAt = new Date(now.getTime() + hours * 3_600_000);
        break;
      }
      case 'accept':
        data.acceptedAt = now;
        break;
      case 'reject':
        data.rejectedAt = now;
        data.rejectReason = opts.reason ?? null;
        break;
      case 'start_preparing':
        data.preparingAt = now;
        break;
      case 'mark_ready':
        data.readyAt = now;
        if (!so.preparingAt) data.preparingAt = now;
        break;
      case 'dispatch':
        data.dispatchedAt = now;
        break;
      case 'deliver':
      case 'partial_deliver':
        data.deliveredAt = now;
        break;
      case 'complete':
        data.completedAt = now;
        break;
      case 'cancel':
        data.cancelledAt = now;
        data.cancelReason = opts.reason ?? null;
        break;
      default:
        break;
    }
    const updated = await tx.supplierOrder.update({ where: { id: so.id }, data });

    if (action === 'reject' || action === 'cancel') {
      await this.releaseReservations(tx, so.id);
      await tx.shipment.updateMany({ where: { supplierOrderId: so.id, status: { in: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'ACCEPTED'] } }, data: { status: 'CANCELLED', cancelledAt: now } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: so.orderId } });
      if (so.status !== 'AWAITING_PAYMENT' || order.paymentMethod === 'CREDIT') {
        await this.refunds.refundForCancellation(tx, order, so.total, { supplierOrderId: so.id, reason: opts.reason ?? action, actorId: actor.id });
      }
    }

    const eventType = EVENT_FOR[action];
    if (eventType) {
      await this.events.add(tx, {
        orderId: so.orderId,
        supplierOrderId: so.id,
        type: eventType,
        fromStatus: so.status,
        toStatus: to,
        actorType: actor.type,
        actorId: actor.id,
        note: opts.reason ?? opts.note ?? null,
        meta: { supplierAr: so.supplier.nameAr, supplierEn: so.supplier.nameEn },
      });
    }
    await this.recomputeOrderStatus(tx, so.orderId, actor);
    await this.outbox.publish(tx, 'supplier_order.status_changed', { supplierOrderId: so.id, orderId: so.orderId, supplierId: so.supplierId, from: so.status, to, action, reason: opts.reason ?? null });
    return updated;
  }

  async recomputeOrderStatus(tx: Tx, orderId: string, actor: LifecycleActor = { type: 'SYSTEM' }): Promise<void> {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { supplierOrders: { select: { status: true } } } });
    const status = deriveOrderStatus(order.supplierOrders.map((s) => s.status));
    if (status === order.status) return;
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
    });
    if (status === 'CANCELLED' || status === 'COMPLETED') {
      await this.events.add(tx, { orderId, type: status === 'CANCELLED' ? 'order.cancelled' : 'order.completed', fromStatus: order.status, toStatus: status, actorType: actor.type, actorId: actor.id });
    }
    if (status === 'CANCELLED') await this.releaseCoupon(tx, orderId);
    await this.outbox.publish(tx, 'order.status_changed', { orderId, from: order.status, to: status });
  }

  /** Buyer/staff cancellation of the whole order (every live supplier order must allow it). */
  async cancelOrder(tx: Tx, orderId: string, actor: LifecycleActor, reason: string): Promise<void> {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { supplierOrders: true } });
    if (!order) throw AppError.notFound();
    const live = order.supplierOrders.filter((s) => !['CANCELLED', 'REJECTED'].includes(s.status));
    if (!live.length || live.some((s) => !canTransition(s.status, 'cancel', actor.type))) {
      throw AppError.conflict(ErrorCode.ORDER_NOT_CANCELLABLE);
    }
    for (const so of live) await this.transition(tx, so.id, 'cancel', actor, { reason });
    await this.audit.record(tx, { action: 'order.cancelled', entityType: 'Order', entityId: orderId, after: { reason } });
  }

  /** Card/bank payment confirmed for an order (full or partial). */
  async confirmPayment(tx: Tx, orderId: string, amount: DecInput, paymentId: string): Promise<void> {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { supplierOrders: true } });
    const paid = dec(order.amountPaid).plus(dec(amount));
    const fullyPaid = paid.greaterThanOrEqualTo(dec(order.grandTotal));
    await tx.order.update({
      where: { id: orderId },
      data: { amountPaid: money(paid), paymentStatus: fullyPaid ? 'PAID' : 'PARTIALLY_PAID', ...(order.status === 'PENDING_PAYMENT' && fullyPaid ? { placedAt: new Date() } : {}) },
    });
    await this.events.add(tx, { orderId, type: 'order.paid', actorType: 'SYSTEM', meta: { amount: money(amount), paymentId } });
    if (fullyPaid) {
      for (const so of order.supplierOrders.filter((s) => s.status === 'AWAITING_PAYMENT')) {
        await this.transition(tx, so.id, 'confirm_payment', { type: 'SYSTEM' });
      }
    }
    await this.outbox.publish(tx, 'order.paid', { orderId, paymentId, amount: money(amount), fullyPaid });
  }

  /** Releases stock reservations and deal capacity for a supplier order that won't ship. */
  async releaseReservations(tx: Tx, supplierOrderId: string): Promise<void> {
    const items = await tx.orderItem.findMany({ where: { supplierOrderId }, select: { offerId: true, qty: true, deliveredQty: true, dealId: true } });
    for (const item of items) {
      const remaining = dec(item.qty).minus(dec(item.deliveredQty));
      if (remaining.lessThanOrEqualTo(0)) continue;
      if (item.offerId) {
        await tx.$executeRaw`UPDATE offers SET "reservedQty" = GREATEST("reservedQty" - ${remaining.toFixed(3)}::numeric, 0), "updatedAt" = now() WHERE id = ${item.offerId}::uuid AND "stockMode" = 'TRACKED'`;
      }
      if (item.dealId) {
        await tx.$executeRaw`UPDATE deals SET "soldQty" = GREATEST("soldQty" - ${remaining.toFixed(3)}::numeric, 0), "updatedAt" = now() WHERE id = ${item.dealId}::uuid`;
      }
    }
  }

  /** Moves reserved stock out of inventory when goods leave the supplier (shipment picked up). */
  async consumeStock(tx: Tx, lines: { orderItemId: string; qty: DecInput }[]): Promise<void> {
    for (const line of lines) {
      const item = await tx.orderItem.findUnique({ where: { id: line.orderItemId }, select: { offerId: true } });
      if (!item?.offerId) continue;
      const q = dec(line.qty).toFixed(3);
      await tx.$executeRaw`UPDATE offers SET "stockQty" = GREATEST("stockQty" - ${q}::numeric, 0), "reservedQty" = GREATEST("reservedQty" - ${q}::numeric, 0), "updatedAt" = now() WHERE id = ${item.offerId}::uuid AND "stockMode" = 'TRACKED'`;
    }
  }

  private async releaseCoupon(tx: Tx, orderId: string): Promise<void> {
    const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
    if (!redemption) return;
    await tx.couponRedemption.delete({ where: { id: redemption.id } });
    await tx.$executeRaw`UPDATE coupons SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE id = ${redemption.couponId}::uuid`;
  }
}
