import { Injectable, type OnModuleInit } from '@nestjs/common';
import { formatDate, formatMoney, formatTime } from '@tawreed/i18n';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { NotificationsService } from './notifications.service.js';

type P = Record<string, unknown>;
/** Stringifies template params: strings, numbers and Decimal-like values (Prisma money fields). */
const str = (v: unknown, fallback = ''): string => {
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (v && typeof v === 'object' && typeof (v as { toFixed?: unknown }).toFixed === 'function') return (v as { toFixed: (d?: number) => string }).toFixed();
  return fallback;
};
const m = (v: unknown) => formatMoney(str(v, '0'), 'ar');

/** Turns domain events (transactional outbox) into notifications + realtime refresh hints. */
@Injectable()
export class NotificationHandlers implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxService,
    private readonly n: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  onModuleInit(): void {
    const on = (type: string, fn: (p: P) => Promise<void>) => this.outbox.on<P>(type, fn);

    on('buyer.registered', async (p) => {
      await this.n.send({ userIds: [p.userId as string], template: 'welcome', category: 'ACCOUNT', data: { screen: 'kyb' } });
      await this.n.send({ userIds: await this.n.staffWith('admin.kyb.review'), template: 'staffAlert', params: { text: 'منشأة جديدة سجلت في المنصة' }, category: 'SYSTEM', channels: ['IN_APP'], data: { screen: 'buyer', id: p.companyId as string } });
    });

    on('order.placed', async (p) => {
      const o = await this.prisma.order.findUnique({ where: { id: p.orderId as string }, include: { company: { select: { name: true } }, supplierOrders: { select: { id: true, supplierId: true, number: true, total: true, status: true, acceptDeadlineAt: true } } } });
      if (!o) return;
      await this.n.send({ userIds: [o.placedById], template: 'orderPlaced', params: { number: o.number, total: m(o.grandTotal) }, category: 'ORDERS', data: { screen: 'order', id: o.number } });
      if (!p.prepaid) await this.notifySuppliersOfNewOrder(o);
      this.realtime.emit('staff', 'dashboard.refresh', { reason: 'order.placed' });
    });

    on('order.paid', async (p) => {
      if (!p.fullyPaid) return;
      const o = await this.prisma.order.findUnique({ where: { id: p.orderId as string }, include: { company: { select: { name: true } }, supplierOrders: { select: { id: true, supplierId: true, number: true, total: true, status: true, acceptDeadlineAt: true } } } });
      if (!o) return;
      await this.n.send({ userIds: [o.placedById], template: 'orderPaid', params: { number: o.number }, category: 'PAYMENTS', data: { screen: 'order', id: o.number } });
      await this.notifySuppliersOfNewOrder(o);
    });

    on('supplier_order.status_changed', async (p) => {
      const so = await this.prisma.supplierOrder.findUnique({ where: { id: p.supplierOrderId as string }, include: { supplier: { select: { nameAr: true } }, order: { select: { number: true, placedById: true, companyId: true } } } });
      if (!so) return;
      const params = { number: so.order.number, supplier: so.supplier.nameAr, reason: str(p.reason) };
      const buyer = [so.order.placedById];
      const data = { screen: 'order', id: so.order.number };
      switch (p.to) {
        case 'ACCEPTED':
          await this.n.send({ userIds: buyer, template: 'supplierAccepted', params, category: 'ORDERS', data });
          break;
        case 'REJECTED':
          await this.n.send({ userIds: buyer, template: 'supplierRejected', params, category: 'ORDERS', data, channels: ['IN_APP', 'PUSH', 'SMS'] });
          break;
        case 'OUT_FOR_DELIVERY':
          if (p.from !== 'PARTIALLY_DELIVERED') await this.n.send({ userIds: buyer, template: 'orderDispatched', params, category: 'DELIVERY', data });
          break;
        case 'DELIVERED':
          await this.n.send({ userIds: buyer, template: 'orderDelivered', params, category: 'DELIVERY', data });
          break;
        case 'CANCELLED':
          await this.n.send({ userIds: p.action === 'cancel' ? [...buyer, ...(await this.n.supplierUsers(so.supplierId))] : buyer, template: 'orderCancelled', params, category: 'ORDERS', data });
          break;
        default:
          break;
      }
      this.realtime.emit([`company:${so.order.companyId}`, `supplier:${so.supplierId}`], 'order.updated', { orderId: so.orderId, supplierOrderId: so.id, status: p.to });
    });

    on('shipment.assigned', async (p) => this.driverTask(p.shipmentId as string));
    on('shipment.status_changed', async (p) => {
      if (p.action === 'assign') await this.driverTask(p.shipmentId as string);
      if (p.to === 'ARRIVED') {
        const s = await this.prisma.shipment.findUnique({ where: { id: p.shipmentId as string }, select: { order: { select: { number: true, placedById: true } } } });
        if (s) await this.n.send({ userIds: [s.order.placedById], template: 'driverArrived', params: { number: s.order.number }, category: 'DELIVERY', data: { screen: 'order', id: s.order.number } });
      }
      if (p.action === 'unassign' || p.action === 'decline') this.realtime.emit('staff', 'dispatch.refresh', { shipmentId: p.shipmentId });
    });
    on('shipment.created', async (p) => {
      if (p.dispatchMode === 'PLATFORM_FLEET') {
        await this.n.send({ userIds: await this.n.staffWith('admin.logistics.manage'), template: 'staffAlert', params: { text: 'شحنة جديدة بانتظار إسناد سائق من أسطول توريد' }, category: 'DELIVERY', channels: ['IN_APP'], data: { screen: 'dispatch', id: p.shipmentId as string } });
        this.realtime.emit('staff', 'dispatch.refresh', { shipmentId: p.shipmentId });
      }
    });

    on('invoice.issued', async (p) => {
      const inv = await this.prisma.invoice.findUnique({ where: { id: p.invoiceId as string }, include: { order: { select: { placedById: true } } } });
      if (!inv) return;
      const due = inv.dueDate && Number(inv.balanceDue) > 0 ? ` — مستحقة في ${formatDate(inv.dueDate, 'ar')}` : '';
      const accountants = await this.n.companyUsers(inv.companyId, ['OWNER', 'ACCOUNTANT']);
      await this.n.send({ userIds: [inv.order.placedById, ...accountants], template: 'invoiceIssued', params: { number: inv.number, total: m(inv.total), due }, category: 'PAYMENTS', data: { screen: 'invoice', id: inv.id }, channels: ['IN_APP', 'PUSH', 'EMAIL'] });
    });

    on('payment.confirmed', async (p) => {
      const pay = await this.prisma.payment.findUnique({ where: { id: p.paymentId as string } });
      if (!pay || pay.method === 'COD') return;
      await this.n.send({ userIds: [...new Set([pay.createdById ?? '', ...(await this.n.companyUsers(pay.companyId, ['OWNER', 'ACCOUNTANT']))])], template: 'paymentConfirmed', params: { number: pay.number, amount: m(pay.amount) }, category: 'PAYMENTS', data: { screen: 'payments' } });
    });
    on('payment.rejected', async (p) => {
      const pay = await this.prisma.payment.findUnique({ where: { id: p.paymentId as string } });
      if (pay) await this.n.send({ userIds: [pay.createdById ?? ''], template: 'paymentRejected', params: { number: pay.number, reason: str(p.reason) }, category: 'PAYMENTS', data: { screen: 'payments' } });
    });
    on('payment.submitted', async () => {
      await this.n.send({ userIds: await this.n.staffWith('admin.payments.verify'), template: 'staffAlert', params: { text: 'إيصال تحويل بنكي جديد بانتظار التحقق' }, category: 'PAYMENTS', channels: ['IN_APP'], data: { screen: 'payments' } });
    });

    on('rfq.submitted', async (p) => {
      const r = await this.prisma.rfq.findUnique({ where: { id: p.rfqId as string }, include: { company: { select: { name: true } }, _count: { select: { items: true } } } });
      if (!r) return;
      for (const supplierId of (p.supplierIds as string[]) ?? []) {
        await this.n.send({ userIds: await this.n.supplierUsers(supplierId, ['OWNER', 'MANAGER', 'SALES']), template: 'rfqInvited', params: { buyer: r.company.name, title: r.title, items: r._count.items }, category: 'RFQ', data: { screen: 'rfq', id: r.id } });
      }
    });
    const quoteToBuyer = async (p: P, template: string) => {
      const q = await this.prisma.quotation.findUnique({ where: { id: p.quotationId as string }, include: { supplier: { select: { nameAr: true } }, rfq: { select: { number: true, createdById: true } }, versions: { orderBy: { version: 'desc' }, take: 1 } } });
      if (q) await this.n.send({ userIds: [q.rfq.createdById], template, params: { supplier: q.supplier.nameAr, total: m(q.versions[0]?.total), number: q.rfq.number }, category: 'RFQ', data: { screen: 'quotation', id: q.id } });
    };
    on('quotation.submitted', (p) => quoteToBuyer(p, 'quotationReceived'));
    on('quotation.revised', (p) => quoteToBuyer(p, 'quotationRevised'));
    on('quotation.accepted', async (p) => {
      const q = await this.prisma.quotation.findUnique({ where: { id: p.quotationId as string }, include: { rfq: { select: { company: { select: { name: true } } } }, order: { select: { number: true } } } });
      if (q) await this.n.send({ userIds: await this.n.supplierUsers(q.supplierId), template: 'quotationAccepted', params: { buyer: q.rfq.company.name, order: q.order?.number ?? '' }, category: 'RFQ', data: { screen: 'quotation', id: q.id }, channels: ['IN_APP', 'PUSH', 'SMS'] });
    });
    on('quotation.revision_requested', async (p) => {
      const q = await this.prisma.quotation.findUnique({ where: { id: p.quotationId as string }, include: { rfq: { select: { company: { select: { name: true } } } } } });
      if (q) await this.n.send({ userIds: await this.n.supplierUsers(q.supplierId), template: 'quotationRevision', params: { buyer: q.rfq.company.name, number: q.number }, category: 'RFQ', data: { screen: 'quotation', id: q.id } });
    });
    on('quotation.message', async (p) => {
      const q = await this.prisma.quotation.findUnique({ where: { id: p.quotationId as string }, select: { id: true, number: true, supplierId: true, rfq: { select: { createdById: true } } } });
      if (!q) return;
      const to = p.from === 'BUYER' ? await this.n.supplierUsers(q.supplierId) : [q.rfq.createdById];
      await this.n.send({ userIds: to, template: 'quotationMessage', params: { number: q.number }, category: 'RFQ', data: { screen: 'quotation', id: q.id }, channels: ['IN_APP', 'PUSH'] });
      this.realtime.emit(to.map((u) => `user:${u}`), 'quotation.message', { quotationId: q.id });
    });

    on('kyb.decided', async (p) => {
      const template = p.decision === 'VERIFIED' ? 'kybVerified' : p.decision === 'NEEDS_INFO' ? 'kybNeedsInfo' : 'kybRejected';
      const users = p.kind === 'BUYER' ? await this.n.companyUsers(p.id as string, ['OWNER']) : await this.n.supplierUsers(p.id as string, ['OWNER']);
      await this.n.send({ userIds: users, template, params: { note: str(p.note) }, category: 'ACCOUNT', data: { screen: 'kyb' }, channels: ['IN_APP', 'PUSH', 'SMS', 'EMAIL'] });
    });
    on('kyb.submitted', async () => {
      await this.n.send({ userIds: await this.n.staffWith('admin.kyb.review'), template: 'staffAlert', params: { text: 'مستندات توثيق جديدة بانتظار المراجعة' }, category: 'ACCOUNT', channels: ['IN_APP'], data: { screen: 'kyb' } });
    });
    on('credit.applied', async () => {
      await this.n.send({ userIds: await this.n.staffWith('admin.credit.manage'), template: 'staffAlert', params: { text: 'طلب دفع آجل جديد' }, category: 'PAYMENTS', channels: ['IN_APP'], data: { screen: 'credit-applications' } });
    });
    on('credit.decided', async (p) => {
      const acc = await this.prisma.creditAccount.findUnique({ where: { companyId: p.companyId as string } });
      await this.n.send({
        userIds: await this.n.companyUsers(p.companyId as string, ['OWNER', 'ACCOUNTANT']),
        template: p.decision === 'APPROVED' ? 'creditApproved' : 'creditRejected',
        params: { limit: m(acc?.creditLimit), days: acc?.termsDays ?? 30 },
        category: 'PAYMENTS',
        data: { screen: 'credit' },
        channels: ['IN_APP', 'PUSH', 'SMS'],
      });
    });
    on('supplier.applied', async () => {
      await this.n.send({ userIds: await this.n.staffWith('admin.suppliers.manage'), template: 'staffAlert', params: { text: 'طلب انضمام مورد جديد' }, category: 'SYSTEM', channels: ['IN_APP'], data: { screen: 'supplier-applications' } });
    });
    on('product.proposed', async () => {
      await this.n.send({ userIds: await this.n.staffWith('admin.catalog.manage'), template: 'staffAlert', params: { text: 'منتج جديد مقترح من مورد بانتظار المراجعة' }, category: 'SYSTEM', channels: ['IN_APP'], data: { screen: 'products-review' } });
    });
    on('deal.submitted', async () => {
      await this.n.send({ userIds: await this.n.staffWith('admin.catalog.manage'), template: 'staffAlert', params: { text: 'عرض خاص جديد بانتظار الموافقة' }, category: 'PROMOTIONS', channels: ['IN_APP'], data: { screen: 'deals' } });
    });
    on('deal.reviewed', async (p) => {
      await this.n.send({ userIds: await this.n.supplierUsers(p.supplierId as string), template: 'dealReviewed', params: { decision: p.decision === 'APPROVE' ? 'الموافقة على' : 'رفض' }, category: 'PROMOTIONS', data: { screen: 'deals' } });
    });
  }

  private async notifySuppliersOfNewOrder(o: { number: string; company: { name: string }; supplierOrders: { id: string; supplierId: string; number: string; total: unknown; status: string; acceptDeadlineAt: Date | null }[] }) {
    for (const so of o.supplierOrders.filter((s) => s.status === 'PENDING')) {
      await this.n.send({
        userIds: await this.n.supplierUsers(so.supplierId, ['OWNER', 'MANAGER', 'SALES', 'WAREHOUSE']),
        template: 'newSupplierOrder',
        params: { number: so.number, buyer: o.company.name, total: m(so.total), deadline: so.acceptDeadlineAt ? formatTime(so.acceptDeadlineAt, 'ar') : '' },
        category: 'ORDERS',
        data: { screen: 'supplier-order', id: so.id },
        channels: ['IN_APP', 'PUSH', 'SMS'],
      });
      this.realtime.emit(`supplier:${so.supplierId}`, 'order.new', { supplierOrderId: so.id });
    }
  }

  private async driverTask(shipmentId: string) {
    const s = await this.prisma.shipment.findUnique({ where: { id: shipmentId }, include: { supplier: { select: { nameAr: true } } } });
    if (!s?.driverId) return;
    const drop = s.dropoffSnapshot as { city?: string };
    await this.n.send({ userIds: await this.n.driverUser(s.driverId), template: 'driverAssigned', params: { number: s.number, supplier: s.supplier.nameAr, city: drop.city ?? '' }, category: 'DELIVERY', data: { screen: 'task', id: s.id }, channels: ['IN_APP', 'PUSH', 'SMS'] });
    this.realtime.emit(`driver:${s.driverId}`, 'task.assigned', { shipmentId: s.id });
  }
}
