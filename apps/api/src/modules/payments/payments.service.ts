import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  adminPaymentQuery,
  bankTransferSchema,
  type CardPaymentInitResult,
  cardPaymentSchema,
  ErrorCode,
  type PaymentDto,
  paymentDecisionSchema,
  type PaymentVerifyResult,
} from '@tawreed/contracts';
import { translate } from '@tawreed/i18n';
import type { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { RequestContext } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { pageMeta } from '../../common/http/presenters.js';
import { AppConfig } from '../../config/app-config.js';
import type { Payment, Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService, type Tx } from '../../infrastructure/prisma/prisma.service.js';
import { SequenceService } from '../../infrastructure/sequences/sequence.service.js';
import { CreditService } from '../credit/credit.service.js';
import { FilesService } from '../files/files.service.js';
import { OrderEventsService } from '../orders/order-events.service.js';
import { OrderLifecycleService } from '../orders/order-lifecycle.service.js';
import { OrderPresenter } from '../orders/order.presenter.js';
import { dec, type Dec, money, sum } from '../pricing/domain/money.js';
import { TapClient, type TapCharge } from './tap.client.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly tap: TapClient,
    private readonly sequences: SequenceService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly events: OrderEventsService,
    private readonly credit: CreditService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly presenter: OrderPresenter,
    private readonly files: FilesService,
  ) {}

  /* ---------------------------------------------------------------- helpers */

  private async outstandingCredit(companyId: string, invoiceIds?: string[]) {
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, paymentMethod: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] }, ...(invoiceIds?.length ? { id: { in: invoiceIds } } : {}) },
      orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
    });
    return { invoices, total: sum(invoices.map((i) => i.balanceDue)) };
  }

  private async orderForPayment(companyId: string, orderId: string | undefined, method: 'CARD' | 'BANK_TRANSFER') {
    if (!orderId) throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED, {}, { fields: [{ path: 'orderId', message: 'required' }] });
    const order = await this.prisma.order.findFirst({ where: { id: orderId, companyId } });
    if (!order) throw AppError.notFound();
    if (order.paymentMethod !== method || !['UNPAID', 'PARTIALLY_PAID', 'FAILED', 'PENDING_VERIFICATION'].includes(order.paymentStatus) || order.status === 'CANCELLED') {
      throw AppError.conflict(ErrorCode.PAYMENT_ALREADY_SETTLED);
    }
    const due = dec(order.grandTotal).minus(dec(order.amountPaid));
    return { order, due };
  }

  /* ---------------------------------------------------------------- card (Tap) */

  async initCard(actor: Actor, input: z.output<typeof cardPaymentSchema>): Promise<CardPaymentInitResult> {
    const companyId = actor.contextId as string;
    const company = await this.prisma.buyerCompany.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, email: true, phone: true } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { name: true, email: true, phone: true } });
    let amount: Dec;
    let orderId: string | null = null;
    let orderNumber: string | null = null;
    if (input.purpose === 'ORDER') {
      const { order, due } = await this.orderForPayment(companyId, input.orderId, 'CARD');
      amount = due;
      orderId = order.id;
      orderNumber = order.number;
    } else {
      const { total } = await this.outstandingCredit(companyId, input.invoiceIds);
      amount = input.amount ? dec(input.amount) : total;
      if (amount.lessThanOrEqualTo(0) || amount.greaterThan(total)) throw new AppError(ErrorCode.AMOUNT_EXCEEDS_BALANCE, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const payment = await this.prisma.tx(async (tx) =>
      tx.payment.create({
        data: {
          number: await this.sequences.next(tx, 'PAY'),
          companyId,
          orderId,
          purpose: input.purpose,
          method: 'CARD',
          provider: 'TAP',
          amount: money(amount),
          status: 'INITIATED',
          createdById: actor.userId,
          providerPayload: input.invoiceIds?.length ? ({ invoiceIds: input.invoiceIds }) : undefined,
        },
      }),
    );

    const sep = input.returnUrl.includes('?') ? '&' : '?';
    const phone = (user.phone ?? company.phone ?? '').replace('+966', '');
    const [firstName, ...rest] = user.name.split(' ');
    const charge = await this.tap.createCharge(
      {
        amount: Number(money(amount)),
        currency: 'SAR',
        threeDSecure: true,
        save_card: false,
        description: orderNumber ? `Tawreed order ${orderNumber}` : 'Tawreed credit repayment',
        statement_descriptor: 'TAWREED',
        customer: {
          first_name: firstName || company.name,
          last_name: rest.join(' ') || undefined,
          email: user.email ?? company.email ?? undefined,
          phone: phone ? { country_code: '966', number: phone } : undefined,
        },
        source: { id: input.source },
        redirect: { url: `${input.returnUrl}${sep}payment=${payment.id}` },
        post: { url: `${this.config.env.API_PUBLIC_URL}/api/v1/webhooks/tap` },
        reference: { transaction: payment.number, order: orderNumber ?? payment.number },
        metadata: { paymentId: payment.id, purpose: input.purpose },
      },
      RequestContext.locale(),
    );
    if (!charge.ok || !charge.data?.transaction?.url) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: charge.error ?? 'no checkout url' } });
      throw new AppError(ErrorCode.PAYMENT_PROVIDER_ERROR, HttpStatus.BAD_GATEWAY);
    }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: charge.data.id, providerStatus: charge.data.status, checkoutUrl: charge.data.transaction.url },
    });
    return { paymentId: payment.id, checkoutUrl: charge.data.transaction.url, amount: money(amount) };
  }

  /** Verifies a card payment with Tap (source of truth) — safe to call repeatedly (redirect page, polling, webhook). */
  async verify(companyId: string | null, paymentId: string): Promise<PaymentVerifyResult> {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, ...(companyId ? { companyId } : {}) }, include: { order: { select: { id: true, number: true } } } });
    if (!payment) throw AppError.notFound();
    if (payment.status === 'INITIATED' && payment.provider === 'TAP' && payment.providerRef) {
      const res = await this.tap.retrieveCharge(payment.providerRef);
      if (res.ok && res.data) await this.applyChargeStatus(payment, res.data);
    }
    const fresh = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const locale = RequestContext.locale();
    return {
      paymentId,
      status: fresh.status,
      amount: money(fresh.amount),
      orderId: payment.order?.id ?? null,
      orderNumber: payment.order?.number ?? null,
      message: fresh.status === 'PAID' ? translate(locale, 'enums.PaymentRecordStatus.PAID') : fresh.status === 'FAILED' ? translate(locale, 'errors.PAYMENT_FAILED') : translate(locale, 'enums.PaymentRecordStatus.INITIATED'),
    };
  }

  async webhook(charge: TapCharge, hashstring: string | undefined): Promise<void> {
    const valid = this.tap.verifyWebhook(charge, hashstring);
    const eventId = `${charge.id}:${charge.status}`;
    const stored = await this.prisma.webhookEvent.upsert({
      where: { provider_eventId: { provider: 'tap', eventId } },
      create: { provider: 'tap', eventId, signatureValid: valid, payload: charge as unknown as Prisma.InputJsonValue },
      update: {},
    });
    if (stored.processedAt) return;
    if (!valid) {
      this.logger.warn(`Rejected Tap webhook with invalid signature for ${charge.id}`);
      await this.prisma.webhookEvent.update({ where: { id: stored.id }, data: { error: 'invalid signature' } });
      return;
    }
    const payment = await this.prisma.payment.findUnique({ where: { providerRef: charge.id } });
    if (payment) {
      // Re-read from Tap instead of trusting the payload blindly.
      const res = await this.tap.retrieveCharge(charge.id);
      if (res.ok && res.data) await this.applyChargeStatus(payment, res.data);
    }
    await this.prisma.webhookEvent.update({ where: { id: stored.id }, data: { processedAt: new Date() } });
  }

  private async applyChargeStatus(payment: Payment, charge: TapCharge): Promise<void> {
    if (TapClient.isPaid(charge.status)) {
      await this.prisma.tx(async (tx) => {
        const locked = await tx.payment.updateMany({ where: { id: payment.id, status: 'INITIATED' }, data: { status: 'PAID', paidAt: new Date(), providerStatus: charge.status, providerPayload: charge as unknown as Prisma.InputJsonValue } });
        if (locked.count === 0) return;
        await this.settle(tx, { ...payment, status: 'PAID' });
      });
    } else if (TapClient.isFinalFailure(charge.status)) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: 'INITIATED' },
        data: { status: 'FAILED', providerStatus: charge.status, failureReason: charge.response?.message ?? charge.status },
      });
      if (payment.orderId) await this.prisma.order.updateMany({ where: { id: payment.orderId, paymentStatus: 'UNPAID' }, data: { paymentStatus: 'FAILED' } });
    }
  }

  /** Applies a confirmed payment: order payment → order lifecycle; credit repayment → invoice allocation + credit ledger. */
  private async settle(tx: Tx, payment: Payment): Promise<void> {
    if (payment.purpose === 'ORDER' && payment.orderId) {
      await this.lifecycle.confirmPayment(tx, payment.orderId, payment.amount, payment.id);
      await this.events.add(tx, { orderId: payment.orderId, type: 'payment.confirmed', actorType: 'SYSTEM', meta: { amount: money(payment.amount), method: payment.method } });
    } else if (payment.purpose === 'CREDIT_REPAYMENT') {
      const invoiceIds = ((payment.providerPayload as { invoiceIds?: string[] } | null)?.invoiceIds ?? []).filter(Boolean);
      const invoices = await tx.invoice.findMany({
        where: { companyId: payment.companyId, paymentMethod: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] }, ...(invoiceIds.length ? { id: { in: invoiceIds } } : {}) },
        orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
      });
      let remaining = dec(payment.amount);
      for (const inv of invoices) {
        if (remaining.lessThanOrEqualTo(0)) break;
        const apply = remaining.greaterThan(dec(inv.balanceDue)) ? dec(inv.balanceDue) : remaining;
        const balance = dec(inv.balanceDue).minus(apply);
        await tx.invoice.update({
          where: { id: inv.id },
          data: { amountPaid: money(dec(inv.amountPaid).plus(apply)), balanceDue: money(balance), status: balance.lessThanOrEqualTo(0) ? 'PAID' : 'PARTIALLY_PAID' },
        });
        await tx.paymentAllocation.create({ data: { paymentId: payment.id, invoiceId: inv.id, amount: money(apply) } });
        remaining = remaining.minus(apply);
      }
      await this.credit.repay(tx, payment.companyId, payment.amount, { paymentId: payment.id });
    }
    await this.audit.record(tx, { action: 'payment.confirmed', entityType: 'Payment', entityId: payment.id, after: { amount: payment.amount.toString(), method: payment.method } });
    await this.outbox.publish(tx, 'payment.confirmed', { paymentId: payment.id, companyId: payment.companyId, orderId: payment.orderId, purpose: payment.purpose });
  }

  /* ---------------------------------------------------------------- bank transfer */

  async submitBankTransfer(actor: Actor, input: z.output<typeof bankTransferSchema>): Promise<PaymentDto> {
    const companyId = actor.contextId as string;
    const file = await this.prisma.storedFile.findUnique({ where: { id: input.proofFileId } });
    if (!file || file.ownerUserId !== actor.userId) throw AppError.notFound();
    let orderId: string | null = null;
    if (input.purpose === 'ORDER') {
      const { order, due } = await this.orderForPayment(companyId, input.orderId, 'BANK_TRANSFER');
      if (dec(input.amount).greaterThan(due)) throw new AppError(ErrorCode.AMOUNT_EXCEEDS_BALANCE, HttpStatus.UNPROCESSABLE_ENTITY);
      orderId = order.id;
    } else {
      const { total } = await this.outstandingCredit(companyId, input.invoiceIds);
      if (dec(input.amount).greaterThan(total)) throw new AppError(ErrorCode.AMOUNT_EXCEEDS_BALANCE, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const payment = await this.prisma.tx(async (tx) => {
      const p = await tx.payment.create({
        data: {
          number: await this.sequences.next(tx, 'PAY'),
          companyId,
          orderId,
          purpose: input.purpose,
          method: 'BANK_TRANSFER',
          provider: 'MANUAL',
          amount: input.amount,
          status: 'PENDING_VERIFICATION',
          bankReference: input.bankReference,
          transferDate: new Date(input.transferDate),
          proofFileId: file.id,
          createdById: actor.userId,
          providerPayload: input.invoiceIds?.length ? ({ invoiceIds: input.invoiceIds }) : undefined,
        },
      });
      if (orderId) {
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'PENDING_VERIFICATION' } });
        await this.events.add(tx, { orderId, type: 'payment.submitted', actorType: 'BUYER', actorId: actor.userId, meta: { amount: input.amount } });
      }
      await this.outbox.publish(tx, 'payment.submitted', { paymentId: p.id, companyId });
      return p;
    });
    return this.presenter.payment(payment, { proofUrl: this.files.urls(file)?.url ?? null });
  }

  async decide(actorId: string, paymentId: string, input: z.output<typeof paymentDecisionSchema>): Promise<PaymentDto> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw AppError.notFound();
    if (payment.status !== 'PENDING_VERIFICATION') throw AppError.conflict(ErrorCode.PAYMENT_ALREADY_SETTLED);
    await this.prisma.tx(async (tx) => {
      if (input.decision === 'CONFIRM') {
        await tx.payment.update({ where: { id: paymentId }, data: { status: 'PAID', paidAt: new Date(), verifiedById: actorId, verifiedAt: new Date() } });
        await this.settle(tx, { ...payment, status: 'PAID' });
      } else {
        await tx.payment.update({ where: { id: paymentId }, data: { status: 'FAILED', rejectionReason: input.reason ?? null, verifiedById: actorId, verifiedAt: new Date() } });
        if (payment.orderId) {
          await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'UNPAID' } });
          await this.events.add(tx, { orderId: payment.orderId, type: 'payment.rejected', actorType: 'STAFF', actorId, note: input.reason ?? null });
        }
        await this.audit.record(tx, { action: 'payment.rejected', entityType: 'Payment', entityId: paymentId, after: input });
        await this.outbox.publish(tx, 'payment.rejected', { paymentId, companyId: payment.companyId, reason: input.reason ?? null });
      }
    });
    return this.adminGet(paymentId);
  }

  /* ---------------------------------------------------------------- queries */

  async buyerList(companyId: string, page: number, pageSize: number) {
    const [total, rows] = await Promise.all([
      this.prisma.payment.count({ where: { companyId, status: { not: 'INITIATED' } } }),
      this.prisma.payment.findMany({ where: { companyId, status: { not: 'INITIATED' } }, include: { order: { select: { number: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const proofs = await this.files.urlMap(rows.map((r) => r.proofFileId));
    return { data: rows.map((p) => this.presenter.payment(p, { orderNumber: p.order?.number, proofUrl: p.proofFileId ? proofs.get(p.proofFileId)?.url ?? null : null })), meta: pageMeta(page, pageSize, total) };
  }

  async adminList(q: z.output<typeof adminPaymentQuery>) {
    const where: Prisma.PaymentWhereInput = {
      ...(q.status ? { status: q.status } : { status: { not: 'INITIATED' } }),
      ...(q.method ? { method: q.method } : {}),
      ...(q.q ? { OR: [{ number: { contains: q.q, mode: 'insensitive' } }, { bankReference: { contains: q.q, mode: 'insensitive' } }, { company: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({ where, include: { order: { select: { number: true } }, company: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    const proofs = await this.files.urlMap(rows.map((r) => r.proofFileId));
    return {
      data: rows.map((p) => ({ ...this.presenter.payment(p, { orderNumber: p.order?.number, proofUrl: p.proofFileId ? proofs.get(p.proofFileId)?.url ?? null : null }), company: p.company })),
      meta: pageMeta(q.page, q.pageSize, total),
    };
  }

  async adminGet(id: string): Promise<PaymentDto> {
    const p = await this.prisma.payment.findUnique({ where: { id }, include: { order: { select: { number: true } }, company: { select: { id: true, name: true } } } });
    if (!p) throw AppError.notFound();
    const proof = await this.files.url(p.proofFileId);
    return { ...this.presenter.payment(p, { orderNumber: p.order?.number, proofUrl: proof }), company: p.company };
  }

  /** COD cash collected by a driver → a paid payment on the order. */
  async recordCod(tx: Tx, input: { orderId: string; companyId: string; amount: Dec; driverUserId: string }): Promise<void> {
    if (input.amount.lessThanOrEqualTo(0)) return;
    const payment = await tx.payment.create({
      data: {
        number: await this.sequences.next(tx, 'PAY'),
        companyId: input.companyId,
        orderId: input.orderId,
        purpose: 'ORDER',
        method: 'COD',
        provider: 'DRIVER_COD',
        amount: money(input.amount),
        status: 'PAID',
        paidAt: new Date(),
        createdById: input.driverUserId,
      },
    });
    const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
    const paid = dec(order.amountPaid).plus(input.amount);
    await tx.order.update({ where: { id: order.id }, data: { amountPaid: money(paid), paymentStatus: paid.greaterThanOrEqualTo(dec(order.grandTotal)) ? 'PAID' : 'PARTIALLY_PAID' } });
    await this.outbox.publish(tx, 'payment.confirmed', { paymentId: payment.id, companyId: input.companyId, orderId: input.orderId, purpose: 'ORDER' });
  }
}
