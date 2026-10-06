import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Order } from '../../generated/prisma/client.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService, type Tx } from '../../infrastructure/prisma/prisma.service.js';
import { CreditService } from '../credit/credit.service.js';
import { dec, type DecInput, money } from '../pricing/domain/money.js';
import { TapClient } from './tap.client.js';

/**
 * Money back when (part of) an order is cancelled/rejected:
 *  CREDIT → ledger reversal (immediate, in tx) · CARD/BANK paid → Refund record, card refunds hit Tap after commit.
 */
@Injectable()
export class RefundService implements OnModuleInit {
  private readonly logger = new Logger('Refunds');

  constructor(
    private readonly prisma: PrismaService,
    private readonly credit: CreditService,
    private readonly tap: TapClient,
    private readonly outbox: OutboxService,
  ) {}

  onModuleInit(): void {
    this.outbox.on<{ refundId: string }>('refund.requested', ({ refundId }) => this.process(refundId));
  }

  async refundForCancellation(tx: Tx, order: Order, amount: DecInput, ctx: { supplierOrderId?: string; reason: string; actorId?: string | null }): Promise<void> {
    const amt = dec(amount);
    if (amt.lessThanOrEqualTo(0)) return;
    if (order.paymentMethod === 'CREDIT') {
      await this.credit.reverse(tx, order.companyId, amt, { orderId: order.id, note: ctx.reason, actorId: ctx.actorId });
      return;
    }
    const paid = dec(order.amountPaid).minus(dec(order.amountRefunded));
    if (paid.lessThanOrEqualTo(0)) return;
    const refundAmount = amt.greaterThan(paid) ? paid : amt;
    const payment = await tx.payment.findFirst({ where: { orderId: order.id, status: 'PAID', method: { in: ['CARD', 'BANK_TRANSFER'] } }, orderBy: { paidAt: 'desc' } });
    const refund = await tx.refund.create({
      data: { orderId: order.id, supplierOrderId: ctx.supplierOrderId ?? null, paymentId: payment?.id ?? null, amount: money(refundAmount), reason: ctx.reason, createdById: ctx.actorId ?? null },
    });
    const refunded = dec(order.amountRefunded).plus(refundAmount);
    await tx.order.update({
      where: { id: order.id },
      data: { amountRefunded: money(refunded), paymentStatus: refunded.greaterThanOrEqualTo(dec(order.amountPaid)) ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
    });
    await tx.orderEvent.create({ data: { orderId: order.id, supplierOrderId: ctx.supplierOrderId ?? null, type: 'payment.refunded', actorType: 'SYSTEM', meta: { amount: money(refundAmount) } } });
    await this.outbox.publish(tx, 'refund.requested', { refundId: refund.id });
  }

  /** Executes a pending refund (Tap for card payments; bank transfers are processed manually by finance). */
  async process(refundId: string): Promise<void> {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId }, include: { payment: true } });
    if (!refund || refund.status !== 'PENDING') return;
    if (refund.payment?.method === 'CARD' && refund.payment.providerRef) {
      const res = await this.tap.createRefund({ charge_id: refund.payment.providerRef, amount: Number(refund.amount), currency: 'SAR', reason: refund.reason.slice(0, 100), reference: { merchant: refund.id } });
      await this.prisma.refund.update({
        where: { id: refundId },
        data: res.ok ? { status: 'PROCESSED', providerRef: res.data?.id ?? null, processedAt: new Date() } : { status: 'FAILED' },
      });
      if (!res.ok) this.logger.warn(`Tap refund ${refundId} failed: ${res.error}`);
    }
  }
}
