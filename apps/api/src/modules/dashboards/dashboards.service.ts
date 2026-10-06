import { Injectable } from '@nestjs/common';
import type { AdminDashboardDto, BuyerDashboardDto, SeriesPoint, SupplierDashboardDto } from '@tawreed/contracts';
import type { Actor } from '../../common/context/request-context.js';
import { loc } from '../../common/i18n/localize.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { ViewerService } from '../catalog/viewer.service.js';
import { CreditService } from '../credit/credit.service.js';
import { OrderPresenter, orderSummaryInclude } from '../orders/order.presenter.js';
import { OrdersService } from '../orders/orders.service.js';
import { dec, money, sum } from '../pricing/domain/money.js';
import { SuppliersService } from '../suppliers/suppliers.service.js';

const riyadhMidnight = (daysAgo = 0) => {
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  local.setHours(0, 0, 0, 0);
  const offset = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })).getTime();
  return new Date(local.getTime() + offset - daysAgo * 86_400_000);
};
const monthStart = () => {
  const d = riyadhMidnight();
  const local = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  return riyadhMidnight(local.getDate() - 1);
};

function fillSeries(rows: { d: string; v: string | null; c: bigint | number }[], days: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date(Date.now() - i * 86_400_000));
    const r = rows.find((x) => x.d === key);
    out.push({ date: key, value: money(r?.v ?? 0), count: Number(r?.c ?? 0) });
  }
  return out;
}

@Injectable()
export class DashboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presenter: OrderPresenter,
    private readonly orders: OrdersService,
    private readonly catalog: CatalogService,
    private readonly viewers: ViewerService,
    private readonly credit: CreditService,
    private readonly suppliers: SuppliersService,
  ) {}

  async buyer(actor: Actor): Promise<BuyerDashboardDto> {
    const companyId = actor.contextId as string;
    const since = riyadhMidnight(29);
    const [company, active, pendingPay, openRfqs, quotes, acc, invoices, month, recent, series, unread, buyAgainIds] = await Promise.all([
      this.prisma.buyerCompany.findUniqueOrThrow({ where: { id: companyId }, select: { verificationStatus: true } }),
      this.prisma.order.count({ where: { companyId, status: { in: ['PLACED', 'PROCESSING', 'PARTIALLY_DELIVERED'] } } }),
      this.prisma.order.count({ where: { companyId, status: 'PENDING_PAYMENT' } }),
      this.prisma.rfq.count({ where: { companyId, status: { in: ['OPEN', 'QUOTED'] } } }),
      this.prisma.quotation.count({ where: { rfq: { companyId, status: { in: ['OPEN', 'QUOTED'] } }, status: 'SUBMITTED' } }),
      this.credit.account(companyId),
      this.prisma.invoice.findMany({ where: { companyId, status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } }, select: { balanceDue: true, dueDate: true } }),
      this.prisma.order.aggregate({ where: { companyId, status: { not: 'CANCELLED' }, createdAt: { gte: monthStart() } }, _sum: { grandTotal: true, discountTotal: true } }),
      this.prisma.order.findMany({ where: { companyId }, include: orderSummaryInclude, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.$queryRaw<{ d: string; v: string | null; c: bigint }[]>`SELECT to_char(("createdAt" AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM-DD') d, SUM("grandTotal") v, COUNT(*) c FROM orders WHERE "companyId" = ${companyId}::uuid AND status <> 'CANCELLED' AND "createdAt" >= ${since} GROUP BY 1`,
      this.prisma.notification.count({ where: { userId: actor.userId, readAt: null } }),
      this.orders.buyAgainProductIds(companyId, 8),
    ]);
    const now = new Date();
    const viewer = await this.viewers.resolve(actor);
    return {
      activeOrders: active,
      pendingPaymentOrders: pendingPay,
      openRfqs,
      quotesAwaiting: quotes,
      credit: acc.status === 'NO_CREDIT' ? null : { status: acc.status, limit: money(acc.creditLimit), used: money(acc.usedAmount), available: money(this.credit.available(acc)), termsDays: acc.termsDays },
      dueAmount: money(sum(invoices.map((i) => i.balanceDue))),
      overdueAmount: money(sum(invoices.filter((i) => i.dueDate && i.dueDate < now).map((i) => i.balanceDue))),
      monthSpend: money(month._sum.grandTotal ?? 0),
      monthSavings: money(month._sum.discountTotal ?? 0),
      spendSeries: fillSeries(series, 30),
      recentOrders: await this.presenter.summaries(recent),
      buyAgain: await this.catalog.cardsByIds(buyAgainIds, viewer),
      verificationStatus: company.verificationStatus,
      unreadNotifications: unread,
    };
  }

  async supplier(actor: Actor): Promise<SupplierDashboardDto> {
    const supplierId = actor.contextId as string;
    const since = riyadhMidnight(29);
    const soldStatuses = ['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED'] as const;
    const [today, month, counts, openRfqs, offers, profile, series, top, recent, payout, cash, decided] = await Promise.all([
      this.prisma.supplierOrder.aggregate({ where: { supplierId, status: { in: [...soldStatuses] }, createdAt: { gte: riyadhMidnight() } }, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.supplierOrder.aggregate({ where: { supplierId, status: { in: [...soldStatuses] }, createdAt: { gte: monthStart() } }, _sum: { total: true, commissionAmount: true }, _count: { _all: true } }),
      this.prisma.supplierOrder.groupBy({ by: ['status'], where: { supplierId, status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } }, _count: { _all: true } }),
      this.prisma.rfqInvitation.count({ where: { supplierId, status: { in: ['INVITED', 'VIEWED'] }, rfq: { status: { in: ['OPEN', 'QUOTED'] } } } }),
      this.prisma.offer.findMany({ where: { supplierId, status: 'ACTIVE', deletedAt: null }, select: { stockMode: true, stockQty: true, reservedQty: true, minOrderQty: true } }),
      this.suppliers.profile(supplierId),
      this.prisma.$queryRaw<{ d: string; v: string | null; c: bigint }[]>`SELECT to_char(("createdAt" AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM-DD') d, SUM(total) v, COUNT(*) c FROM supplier_orders WHERE "supplierId" = ${supplierId}::uuid AND status NOT IN ('CANCELLED','REJECTED','AWAITING_PAYMENT') AND "createdAt" >= ${since} GROUP BY 1`,
      this.prisma.$queryRaw<{ name: string; qty: string; total: string }[]>`SELECT oi."productNameAr" name, SUM(oi.qty) qty, SUM(oi."lineTotal") total FROM order_items oi JOIN supplier_orders so ON so.id = oi."supplierOrderId" WHERE so."supplierId" = ${supplierId}::uuid AND so.status NOT IN ('CANCELLED','REJECTED','AWAITING_PAYMENT') AND so."createdAt" >= ${since} GROUP BY 1 ORDER BY 3 DESC LIMIT 5`,
      this.orders.supplierList(supplierId, { page: 1, pageSize: 5, sort: undefined, q: undefined, status: undefined, from: undefined, to: undefined }),
      this.prisma.supplierOrder.aggregate({ where: { supplierId, status: { in: ['DELIVERED', 'COMPLETED', 'PARTIALLY_DELIVERED'] }, settlementId: null }, _sum: { subtotal: true, commissionAmount: true, deliveryFee: true } }),
      this.prisma.cashCollection.aggregate({ where: { status: 'COLLECTED', driver: { supplierId } }, _sum: { amount: true } }),
      this.prisma.supplierOrder.groupBy({ by: ['status'], where: { supplierId, status: { in: ['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'REJECTED'] } }, _count: { _all: true } }),
    ]);
    const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;
    const decidedTotal = decided.reduce((a, x) => a + x._count._all, 0);
    const rejected = decided.find((x) => x.status === 'REJECTED')?._count._all ?? 0;
    return {
      today: { orders: today._count._all, sales: money(today._sum.total ?? 0) },
      month: { orders: month._count._all, sales: money(month._sum.total ?? 0), commission: money(month._sum.commissionAmount ?? 0) },
      pendingAcceptance: c('PENDING'),
      inPreparation: c('ACCEPTED') + c('PREPARING'),
      readyForDispatch: c('READY'),
      outForDelivery: c('OUT_FOR_DELIVERY'),
      openRfqs,
      lowStockOffers: offers.filter((o) => o.stockMode === 'TRACKED' && dec(o.stockQty).minus(dec(o.reservedQty)).lessThan(dec(o.minOrderQty).times(4))).length,
      activeOffers: offers.length,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      acceptanceRate: decidedTotal ? ((decidedTotal - rejected) / decidedTotal).toFixed(4) : '1',
      salesSeries: fillSeries(series, 30),
      topProducts: top.map((t) => ({ name: t.name, qty: dec(String(t.qty)).toString(), total: money(t.total) })),
      recentOrders: recent.data,
      pendingPayout: money(dec(payout._sum.subtotal ?? 0).minus(dec(payout._sum.commissionAmount ?? 0)).plus(dec(payout._sum.deliveryFee ?? 0))),
      cashWithDrivers: money(cash._sum.amount ?? 0),
      onboarding: profile.onboarding,
    };
  }

  async admin(): Promise<AdminDashboardDto> {
    const since = riyadhMidnight(29);
    const live = { status: { not: 'CANCELLED' as const } };
    const [gToday, gMonth, activeBuyers, newBuyers, activeSuppliers, exposure, overdue, commission, queues, series, byStatus, topCats, topSup, topCities, mix, aging] = await Promise.all([
      this.prisma.order.aggregate({ where: { ...live, createdAt: { gte: riyadhMidnight() } }, _sum: { grandTotal: true }, _count: { _all: true } }),
      this.prisma.order.aggregate({ where: { ...live, createdAt: { gte: monthStart() } }, _sum: { grandTotal: true }, _count: { _all: true } }),
      this.prisma.buyerCompany.count({ where: { deletedAt: null, status: 'ACTIVE', orders: { some: { createdAt: { gte: since } } } } }),
      this.prisma.buyerCompany.count({ where: { deletedAt: null, createdAt: { gte: monthStart() } } }),
      this.prisma.supplier.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.prisma.creditAccount.aggregate({ _sum: { usedAmount: true } }),
      this.prisma.invoice.aggregate({ where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] }, dueDate: { lt: new Date() } }, _sum: { balanceDue: true } }),
      this.prisma.supplierOrder.aggregate({ where: { status: { notIn: ['CANCELLED', 'REJECTED', 'AWAITING_PAYMENT'] }, createdAt: { gte: monthStart() } }, _sum: { commissionAmount: true } }),
      Promise.all([
        this.prisma.buyerCompany.count({ where: { verificationStatus: 'UNDER_REVIEW' } }),
        this.prisma.payment.count({ where: { status: 'PENDING_VERIFICATION' } }),
        this.prisma.creditApplication.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
        this.prisma.supplierApplication.count({ where: { status: { in: ['NEW', 'CONTACTED'] } } }),
        this.prisma.product.count({ where: { status: 'PENDING_REVIEW', deletedAt: null } }),
        this.prisma.deal.count({ where: { status: 'PENDING_APPROVAL' } }),
        this.prisma.shipment.count({ where: { status: 'PENDING_ASSIGNMENT', dispatchMode: 'PLATFORM_FLEET' } }),
        this.prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      ]),
      this.prisma.$queryRaw<{ d: string; v: string | null; c: bigint }[]>`SELECT to_char(("createdAt" AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM-DD') d, SUM("grandTotal") v, COUNT(*) c FROM orders WHERE status <> 'CANCELLED' AND "createdAt" >= ${since} GROUP BY 1`,
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.$queryRaw<{ nameAr: string; nameEn: string; total: string }[]>`SELECT COALESCE(pc."nameAr", c."nameAr") "nameAr", COALESCE(pc."nameEn", c."nameEn") "nameEn", SUM(oi."lineTotal") total FROM order_items oi JOIN products p ON p.id = oi."productId" JOIN categories c ON c.id = p."categoryId" LEFT JOIN categories pc ON pc.id = c."parentId" JOIN supplier_orders so ON so.id = oi."supplierOrderId" WHERE so.status NOT IN ('CANCELLED','REJECTED') AND so."createdAt" >= ${since} GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 6`,
      this.prisma.$queryRaw<{ nameAr: string; nameEn: string; total: string; orders: bigint }[]>`SELECT s."nameAr", s."nameEn", SUM(so.total) total, COUNT(*) orders FROM supplier_orders so JOIN suppliers s ON s.id = so."supplierId" WHERE so.status NOT IN ('CANCELLED','REJECTED','AWAITING_PAYMENT') AND so."createdAt" >= ${since} GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 6`,
      this.prisma.$queryRaw<{ name: string; total: string; orders: bigint }[]>`SELECT o."addressSnapshot"->>'city' name, SUM(o."grandTotal") total, COUNT(*) orders FROM orders o WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${since} GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
      this.prisma.order.groupBy({ by: ['paymentMethod'], where: { ...live, createdAt: { gte: since } }, _sum: { grandTotal: true }, _count: { _all: true } }),
      this.prisma.$queryRaw<{ bucket: string; amount: string }[]>(Prisma.sql`SELECT CASE WHEN "dueDate" >= CURRENT_DATE THEN 'current' WHEN CURRENT_DATE - "dueDate" <= 30 THEN '1-30' WHEN CURRENT_DATE - "dueDate" <= 60 THEN '31-60' WHEN CURRENT_DATE - "dueDate" <= 90 THEN '61-90' ELSE '90+' END bucket, SUM("balanceDue") amount FROM invoices WHERE status IN ('ISSUED','PARTIALLY_PAID','OVERDUE') AND "dueDate" IS NOT NULL GROUP BY 1`),
    ]);
    const [kyb, payments, creditApplications, supplierApplications, productReviews, deals, dispatch, disputes] = queues;
    const ordersMonth = gMonth._count._all;
    return {
      kpis: {
        gmvToday: money(gToday._sum.grandTotal ?? 0),
        gmvMonth: money(gMonth._sum.grandTotal ?? 0),
        ordersToday: gToday._count._all,
        ordersMonth,
        aov: money(ordersMonth ? dec(gMonth._sum.grandTotal ?? 0).dividedBy(ordersMonth) : 0),
        activeBuyers,
        newBuyersMonth: newBuyers,
        activeSuppliers,
        creditExposure: money(exposure._sum.usedAmount ?? 0),
        overdueAmount: money(overdue._sum.balanceDue ?? 0),
        commissionMonth: money(commission._sum.commissionAmount ?? 0),
      },
      queues: { kyb, payments, creditApplications, supplierApplications, productReviews, deals, dispatch, disputes },
      gmvSeries: fillSeries(series, 30),
      ordersByStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      topCategories: topCats.map((c) => ({ name: loc(c.nameAr, c.nameEn), total: money(c.total) })),
      topSuppliers: topSup.map((s) => ({ name: loc(s.nameAr, s.nameEn), total: money(s.total), orders: Number(s.orders) })),
      topCities: topCities.map((c) => ({ name: c.name ?? '—', total: money(c.total), orders: Number(c.orders) })),
      paymentMix: mix.map((p) => ({ method: p.paymentMethod, total: money(p._sum.grandTotal ?? 0), count: p._count._all })),
      agingBuckets: ['current', '1-30', '31-60', '61-90', '90+'].map((b) => ({ bucket: b, amount: money(aging.find((a) => a.bucket === b)?.amount ?? 0) })),
    };
  }
}
