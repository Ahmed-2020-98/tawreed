import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { formatDate, formatMoney } from '@tawreed/i18n';
import { AppConfig } from '../../config/app-config.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { QueueService } from '../../infrastructure/queue/queue.service.js';
import { ProductStatsService } from '../catalog/product-stats.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrderLifecycleService } from '../orders/order-lifecycle.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { dec, money, sum } from '../pricing/domain/money.js';

/** Recurring maintenance jobs (BullMQ job schedulers, Asia/Riyadh) + delayed outbox timeouts. */
@Injectable()
export class JobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Jobs');

  constructor(
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly outbox: OutboxService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly stats: ProductStatsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.outbox.on<{ orderId: string }>('order.unpaid_timeout', ({ orderId }) => this.cancelUnpaid(orderId));
    if (!this.config.runsWorkers || this.config.isTest) return;
    const jobs: Record<string, () => Promise<unknown>> = {
      'supplier-sla': () => this.supplierSla(),
      'auto-complete': () => this.autoComplete(),
      'credit-collections': () => this.creditCollections(),
      'expire-quotations': () => this.expireQuotations(),
      'deal-prices': () => this.refreshDealPrices(),
    };
    this.queues.worker('scheduled', async (job) => {
      const fn = jobs[job.name];
      if (fn) await fn();
    }, { concurrency: 1 });
    await Promise.all([
      this.queues.schedule('scheduled', 'supplier-sla', '*/5 * * * *'),
      this.queues.schedule('scheduled', 'auto-complete', '15 2 * * *'),
      this.queues.schedule('scheduled', 'credit-collections', '0 9 * * *'),
      this.queues.schedule('scheduled', 'expire-quotations', '10 * * * *'),
      this.queues.schedule('scheduled', 'deal-prices', '*/15 * * * *'),
    ]).catch((err: Error) => this.logger.warn(`Scheduling failed: ${err.message}`));
  }

  async cancelUnpaid(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { supplierOrders: { where: { status: 'AWAITING_PAYMENT' } } } });
    if (!order || order.status !== 'PENDING_PAYMENT' || order.paymentStatus === 'PENDING_VERIFICATION') return;
    await this.prisma.tx(async (tx) => {
      for (const so of order.supplierOrders) await this.lifecycle.transition(tx, so.id, 'cancel', { type: 'SYSTEM' }, { reason: 'انتهت مهلة الدفع' });
    });
  }

  async supplierSla(): Promise<number> {
    const late = await this.prisma.supplierOrder.findMany({ where: { status: 'PENDING', acceptDeadlineAt: { lt: new Date() } }, select: { id: true } });
    for (const so of late) {
      await this.prisma.tx((tx) => this.lifecycle.transition(tx, so.id, 'cancel', { type: 'SYSTEM' }, { reason: 'لم يقبل المورد الطلب في الوقت المحدد' })).catch((e: Error) => this.logger.warn(e.message));
    }
    return late.length;
  }

  async autoComplete(): Promise<number> {
    const { completeAfterDays } = await this.settings.get('orders');
    const due = await this.prisma.supplierOrder.findMany({
      where: { status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] }, deliveredAt: { lt: new Date(Date.now() - completeAfterDays * 86_400_000) }, disputes: { none: { status: { in: ['OPEN', 'UNDER_REVIEW', 'AWAITING_BUYER'] } } }, shipments: { none: { status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] } } } },
      select: { id: true },
    });
    for (const so of due) await this.prisma.tx((tx) => this.lifecycle.transition(tx, so.id, 'complete', { type: 'SYSTEM' })).catch((e: Error) => this.logger.warn(e.message));
    return due.length;
  }

  /** Marks overdue invoices, sends reminders at configured offsets and freezes credit after the grace period. */
  async creditCollections(): Promise<{ reminders: number; frozen: number }> {
    const { reminderOffsets, graceDays } = await this.settings.get('credit');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await this.prisma.invoice.updateMany({ where: { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, dueDate: { lt: today } }, data: { status: 'OVERDUE' } });
    const open = await this.prisma.invoice.findMany({ where: { paymentMethod: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { not: null } }, include: { reminders: true } });
    let reminders = 0;
    for (const inv of open) {
      const diff = Math.round((today.getTime() - (inv.dueDate as Date).getTime()) / 86_400_000);
      const offset = reminderOffsets.find((o) => o === diff);
      if (offset === undefined || inv.reminders.some((r) => r.offsetDays === offset)) continue;
      await this.prisma.invoiceReminder.create({ data: { invoiceId: inv.id, offsetDays: offset } });
      const when = offset < 0 ? `خلال ${-offset} أيام (${formatDate(inv.dueDate, 'ar')})` : offset === 0 ? 'اليوم' : `منذ ${offset} أيام`;
      await this.notifications.send({ userIds: await this.notifications.companyUsers(inv.companyId, ['OWNER', 'ACCOUNTANT']), template: 'invoiceDue', params: { number: inv.number, amount: formatMoney(String(inv.balanceDue), 'ar'), when }, category: 'PAYMENTS', data: { screen: 'credit' }, channels: ['IN_APP', 'PUSH', 'SMS', 'EMAIL'] });
      reminders++;
    }
    const cutoff = new Date(today.getTime() - graceDays * 86_400_000);
    const overdueByCompany = new Map<string, ReturnType<typeof dec>[]>();
    for (const inv of open.filter((i) => (i.dueDate as Date) < cutoff)) overdueByCompany.set(inv.companyId, [...(overdueByCompany.get(inv.companyId) ?? []), dec(inv.balanceDue)]);
    let frozen = 0;
    for (const [companyId, amounts] of overdueByCompany) {
      const updated = await this.prisma.creditAccount.updateMany({ where: { companyId, status: 'ACTIVE' }, data: { status: 'FROZEN', frozenReason: 'فواتير متأخرة' } });
      if (updated.count) {
        frozen++;
        await this.notifications.send({ userIds: await this.notifications.companyUsers(companyId, ['OWNER', 'ACCOUNTANT']), template: 'creditFrozen', params: { amount: formatMoney(money(sum(amounts)), 'ar') }, category: 'PAYMENTS', data: { screen: 'credit' }, channels: ['IN_APP', 'PUSH', 'SMS'] });
      }
    }
    return { reminders, frozen };
  }

  async expireQuotations(): Promise<number> {
    const expired = await this.prisma.quotationVersion.findMany({ where: { status: 'SUBMITTED', validUntil: { lt: new Date() } }, select: { id: true, quotationId: true } });
    if (!expired.length) return 0;
    await this.prisma.quotationVersion.updateMany({ where: { id: { in: expired.map((e) => e.id) } }, data: { status: 'EXPIRED' } });
    await this.prisma.quotation.updateMany({ where: { id: { in: expired.map((e) => e.quotationId) }, status: 'SUBMITTED' }, data: { status: 'EXPIRED' } });
    return expired.length;
  }

  async refreshDealPrices(): Promise<void> {
    const since = new Date(Date.now() - 20 * 60_000);
    const deals = await this.prisma.deal.findMany({ where: { OR: [{ startsAt: { gte: since, lte: new Date() } }, { endsAt: { gte: since, lte: new Date() } }] }, select: { offer: { select: { productId: true } } } });
    await this.stats.refresh(deals.map((d) => d.offer.productId));
  }
}
