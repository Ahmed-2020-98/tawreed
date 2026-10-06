import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type CreditApplicationDto,
  creditAdjustSchema,
  creditApplicationSchema,
  creditDecisionSchema,
  type CreditLedgerEntryDto,
  type CreditOverviewDto,
  ErrorCode,
  paginationQuery,
} from '@tawreed/contracts';
import { z } from 'zod';
import { AppError } from '../../common/http/app-error.js';
import { pageMeta } from '../../common/http/presenters.js';
import type { CreditAccount, Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { type Db, PrismaService, type Tx } from '../../infrastructure/prisma/prisma.service.js';
import { invoiceSummary, invoiceSummaryInclude } from '../invoices/invoice.presenter.js';
import { dec, type DecInput, money, sum } from '../pricing/domain/money.js';

export const creditAccountsQuery = paginationQuery.extend({ status: z.enum(['NO_CREDIT', 'ACTIVE', 'FROZEN', 'SUSPENDED']).optional() });
export const creditApplicationsQuery = paginationQuery.extend({ status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional() });

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  account(companyId: string, db: Db = this.prisma): Promise<CreditAccount> {
    return db.creditAccount.upsert({ where: { companyId }, create: { companyId }, update: {} });
  }

  available(a: Pick<CreditAccount, 'creditLimit' | 'usedAmount'>) {
    const v = dec(a.creditLimit).minus(dec(a.usedAmount));
    return v.greaterThan(0) ? v : dec(0);
  }

  /** Reserves credit atomically; throws CREDIT_* when not possible. */
  async charge(tx: Tx, companyId: string, amount: DecInput, ref: { orderId: string; note?: string; actorId?: string | null }): Promise<void> {
    const amt = dec(amount).toFixed(2);
    const rows = await tx.$queryRaw<{ usedAmount: string; id: string }[]>`
      UPDATE credit_accounts SET "usedAmount" = "usedAmount" + ${amt}::numeric, "updatedAt" = now()
      WHERE "companyId" = ${companyId}::uuid AND status = 'ACTIVE' AND "creditLimit" - "usedAmount" >= ${amt}::numeric
      RETURNING id, "usedAmount"::text`;
    const row = rows[0];
    if (!row) {
      const acc = await this.account(companyId, tx);
      if (acc.status === 'FROZEN') throw new AppError(ErrorCode.CREDIT_FROZEN, HttpStatus.UNPROCESSABLE_ENTITY);
      if (acc.status !== 'ACTIVE') throw new AppError(ErrorCode.CREDIT_NOT_AVAILABLE, HttpStatus.UNPROCESSABLE_ENTITY);
      throw new AppError(ErrorCode.CREDIT_LIMIT_EXCEEDED, HttpStatus.UNPROCESSABLE_ENTITY, { available: money(this.available(acc)) });
    }
    await tx.creditLedgerEntry.create({ data: { accountId: row.id, type: 'ORDER_CHARGE', amount: amt, balanceAfter: row.usedAmount, orderId: ref.orderId, note: ref.note ?? null, createdById: ref.actorId ?? null } });
  }

  /** Releases credit (order/supplier-order cancelled or rejected). */
  async reverse(tx: Tx, companyId: string, amount: DecInput, ref: { orderId?: string; invoiceId?: string; note?: string; actorId?: string | null }): Promise<void> {
    const acc = await this.account(companyId, tx);
    const next = dec(acc.usedAmount).minus(dec(amount));
    const used = next.greaterThan(0) ? next : dec(0);
    await tx.creditAccount.update({ where: { id: acc.id }, data: { usedAmount: used.toFixed(2) } });
    await tx.creditLedgerEntry.create({ data: { accountId: acc.id, type: 'REVERSAL', amount: dec(amount).negated().toFixed(2), balanceAfter: used.toFixed(2), orderId: ref.orderId ?? null, invoiceId: ref.invoiceId ?? null, note: ref.note ?? null, createdById: ref.actorId ?? null } });
  }

  /** Repayment restores available credit and lifts an overdue freeze when nothing is overdue anymore. */
  async repay(tx: Tx, companyId: string, amount: DecInput, ref: { paymentId: string; note?: string }): Promise<void> {
    const acc = await this.account(companyId, tx);
    const next = dec(acc.usedAmount).minus(dec(amount));
    const used = next.greaterThan(0) ? next : dec(0);
    const overdue = await tx.invoice.count({ where: { companyId, paymentMethod: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { lt: new Date(Date.now() - acc.graceDays * 86_400_000) } } });
    await tx.creditAccount.update({
      where: { id: acc.id },
      data: { usedAmount: used.toFixed(2), ...(acc.status === 'FROZEN' && overdue === 0 ? { status: 'ACTIVE', frozenReason: null } : {}) },
    });
    await tx.creditLedgerEntry.create({ data: { accountId: acc.id, type: 'REPAYMENT', amount: dec(amount).negated().toFixed(2), balanceAfter: used.toFixed(2), paymentId: ref.paymentId, note: ref.note ?? null } });
  }

  private applicationDto(a: Prisma.CreditApplicationGetPayload<{ include: { company: { select: { id: true; name: true } } } }>): CreditApplicationDto {
    return {
      id: a.id,
      requestedLimit: money(a.requestedLimit),
      requestedTermsDays: a.requestedTermsDays,
      monthlyPurchases: a.monthlyPurchases ? money(a.monthlyPurchases) : null,
      yearsInBusiness: a.yearsInBusiness,
      status: a.status,
      approvedLimit: a.approvedLimit ? money(a.approvedLimit) : null,
      approvedTermsDays: a.approvedTermsDays,
      decisionNote: a.decisionNote,
      createdAt: a.createdAt.toISOString(),
      decidedAt: a.decidedAt?.toISOString() ?? null,
      company: a.company,
    };
  }

  async overview(companyId: string): Promise<CreditOverviewDto> {
    const now = new Date();
    const [acc, invoices, pending] = await Promise.all([
      this.account(companyId),
      this.prisma.invoice.findMany({ where: { companyId, paymentMethod: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } }, include: invoiceSummaryInclude, orderBy: { dueDate: 'asc' } }),
      this.prisma.creditApplication.findFirst({ where: { companyId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } }, include: { company: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    const open = invoices.map((i) => invoiceSummary(i, now));
    const soon = new Date(now.getTime() + 7 * 86_400_000);
    return {
      status: acc.status,
      creditLimit: money(acc.creditLimit),
      usedAmount: money(acc.usedAmount),
      availableAmount: money(this.available(acc)),
      termsDays: acc.termsDays,
      dueSoonAmount: money(sum(invoices.filter((i) => i.dueDate && i.dueDate >= now && i.dueDate <= soon).map((i) => i.balanceDue))),
      overdueAmount: money(sum(invoices.filter((i) => i.dueDate && i.dueDate < now).map((i) => i.balanceDue))),
      nextDueDate: invoices.find((i) => i.dueDate && i.dueDate >= now)?.dueDate?.toISOString().slice(0, 10) ?? null,
      openInvoices: open,
      pendingApplication: pending ? this.applicationDto(pending) : null,
      canApply: !pending && acc.status !== 'SUSPENDED',
      frozenReason: acc.frozenReason,
    };
  }

  async ledger(companyId: string, page: number, pageSize: number) {
    const acc = await this.account(companyId);
    const [total, rows] = await Promise.all([
      this.prisma.creditLedgerEntry.count({ where: { accountId: acc.id } }),
      this.prisma.creditLedgerEntry.findMany({ where: { accountId: acc.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    const orderIds = rows.map((r) => r.orderId).filter((x): x is string => !!x);
    const orders = orderIds.length ? await this.prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, number: true } }) : [];
    const payIds = rows.map((r) => r.paymentId).filter((x): x is string => !!x);
    const payments = payIds.length ? await this.prisma.payment.findMany({ where: { id: { in: payIds } }, select: { id: true, number: true } }) : [];
    const data: CreditLedgerEntryDto[] = rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: money(r.amount),
      balanceAfter: money(r.balanceAfter),
      reference: orders.find((o) => o.id === r.orderId)?.number ?? payments.find((p) => p.id === r.paymentId)?.number ?? null,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    }));
    return { data, meta: pageMeta(page, pageSize, total) };
  }

  async apply(companyId: string, userId: string, input: z.output<typeof creditApplicationSchema>): Promise<CreditApplicationDto> {
    const pending = await this.prisma.creditApplication.count({ where: { companyId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } });
    if (pending) throw AppError.conflict(ErrorCode.CREDIT_APPLICATION_PENDING);
    const app = await this.prisma.tx(async (tx) => {
      const a = await tx.creditApplication.create({
        data: {
          companyId,
          requestedLimit: input.requestedLimit,
          requestedTermsDays: input.requestedTermsDays,
          monthlyPurchases: input.monthlyPurchases ?? null,
          yearsInBusiness: input.yearsInBusiness ?? null,
          documentFileIds: input.documentFileIds,
          notes: input.notes ?? null,
          createdById: userId,
        },
        include: { company: { select: { id: true, name: true } } },
      });
      await this.audit.record(tx, { action: 'credit.applied', entityType: 'CreditApplication', entityId: a.id, after: { requestedLimit: input.requestedLimit } });
      await this.outbox.publish(tx, 'credit.applied', { applicationId: a.id, companyId });
      return a;
    });
    return this.applicationDto(app);
  }

  /* ---------------------------------------------------------------- admin */

  async listApplications(q: z.output<typeof creditApplicationsQuery>) {
    const where: Prisma.CreditApplicationWhereInput = { ...(q.status ? { status: q.status } : {}), ...(q.q ? { company: { name: { contains: q.q, mode: 'insensitive' } } } : {}) };
    const [total, rows] = await Promise.all([
      this.prisma.creditApplication.count({ where }),
      this.prisma.creditApplication.findMany({ where, include: { company: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { data: rows.map((a) => this.applicationDto(a)), meta: pageMeta(q.page, q.pageSize, total) };
  }

  async decide(id: string, reviewerId: string, input: z.output<typeof creditDecisionSchema>): Promise<CreditApplicationDto> {
    const app = await this.prisma.creditApplication.findUnique({ where: { id } });
    if (!app) throw AppError.notFound();
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(app.status)) throw AppError.conflict(ErrorCode.INVALID_STATE_TRANSITION);
    const updated = await this.prisma.tx(async (tx) => {
      const limit = input.approvedLimit ?? app.requestedLimit.toString();
      const terms = input.approvedTermsDays ?? app.requestedTermsDays;
      const a = await tx.creditApplication.update({
        where: { id },
        data: { status: input.decision, approvedLimit: input.decision === 'APPROVED' ? limit : null, approvedTermsDays: input.decision === 'APPROVED' ? terms : null, decisionNote: input.note ?? null, decidedById: reviewerId, decidedAt: new Date() },
        include: { company: { select: { id: true, name: true } } },
      });
      if (input.decision === 'APPROVED') {
        await this.account(app.companyId, tx);
        await tx.creditAccount.update({ where: { companyId: app.companyId }, data: { status: 'ACTIVE', creditLimit: limit, termsDays: terms, approvedById: reviewerId, approvedAt: new Date(), frozenReason: null } });
      }
      await this.audit.record(tx, { action: 'credit.application_decided', entityType: 'CreditApplication', entityId: id, after: input });
      await this.outbox.publish(tx, 'credit.decided', { applicationId: id, companyId: app.companyId, decision: input.decision, limit });
      return a;
    });
    return this.applicationDto(updated);
  }

  async listAccounts(q: z.output<typeof creditAccountsQuery>) {
    const where: Prisma.CreditAccountWhereInput = { ...(q.status ? { status: q.status } : { status: { not: 'NO_CREDIT' } }), ...(q.q ? { company: { name: { contains: q.q, mode: 'insensitive' } } } : {}) };
    const [total, rows] = await Promise.all([
      this.prisma.creditAccount.count({ where }),
      this.prisma.creditAccount.findMany({ where, include: { company: { select: { id: true, name: true, businessType: true } } }, orderBy: { usedAmount: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    const overdue = await this.prisma.invoice.groupBy({ by: ['companyId'], where: { companyId: { in: rows.map((r) => r.companyId) }, paymentMethod: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { lt: new Date() } }, _sum: { balanceDue: true } });
    return {
      data: rows.map((r) => ({
        id: r.id,
        company: r.company,
        status: r.status,
        creditLimit: money(r.creditLimit),
        usedAmount: money(r.usedAmount),
        availableAmount: money(this.available(r)),
        utilization: dec(r.creditLimit).isZero() ? '0' : dec(r.usedAmount).dividedBy(dec(r.creditLimit)).toFixed(4),
        termsDays: r.termsDays,
        riskLevel: r.riskLevel,
        overdueAmount: money(overdue.find((o) => o.companyId === r.companyId)?._sum.balanceDue ?? 0),
        frozenReason: r.frozenReason,
        approvedAt: r.approvedAt?.toISOString() ?? null,
      })),
      meta: pageMeta(q.page, q.pageSize, total),
    };
  }

  async adjust(companyId: string, actorId: string, input: z.output<typeof creditAdjustSchema>) {
    const before = await this.account(companyId);
    await this.prisma.tx(async (tx) => {
      await tx.creditAccount.update({
        where: { companyId },
        data: {
          ...(input.creditLimit ? { creditLimit: input.creditLimit } : {}),
          ...(input.termsDays ? { termsDays: input.termsDays } : {}),
          ...(input.riskLevel ? { riskLevel: input.riskLevel } : {}),
          ...(input.status ? { status: input.status, frozenReason: input.status === 'FROZEN' ? input.reason : null } : {}),
          ...(before.status === 'NO_CREDIT' && input.creditLimit && !input.status ? { status: 'ACTIVE' } : {}),
          approvedById: actorId,
          approvedAt: new Date(),
        },
      });
      await this.audit.record(tx, {
        action: 'credit.adjusted',
        entityType: 'CreditAccount',
        entityId: before.id,
        before: { creditLimit: before.creditLimit.toString(), termsDays: before.termsDays, status: before.status },
        after: input,
      });
      await this.outbox.publish(tx, 'credit.adjusted', { companyId, ...input });
    });
    return this.overview(companyId);
  }
}
