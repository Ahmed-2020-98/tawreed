import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type AddressSnapshot, type InvoiceDetailDto, invoiceQuery, type PartySnapshot } from '@tawreed/contracts';
import { enumLabel, formatDate, formatDateTime, formatMoney, formatQty } from '@tawreed/i18n';
import QRCode from 'qrcode';
import type { z } from 'zod';
import { AppError } from '../../common/http/app-error.js';
import { pageMeta } from '../../common/http/presenters.js';
import { loc } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { ASSETS_DIR } from '../../config/paths.js';
import { PdfService } from '../../infrastructure/pdf/pdf.service.js';
import { PrismaService, type Tx } from '../../infrastructure/prisma/prisma.service.js';
import { SequenceService } from '../../infrastructure/sequences/sequence.service.js';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { CreditService } from '../credit/credit.service.js';
import { FilesService } from '../files/files.service.js';
import { OrderEventsService } from '../orders/order-events.service.js';
import { dec, money, sum } from '../pricing/domain/money.js';
import { computeLine } from '../pricing/domain/pricing.js';
import { SettingsService } from '../settings/settings.service.js';
import { invoiceSummary, invoiceSummaryInclude } from './invoice.presenter.js';
import { zatcaQr } from './domain/zatca.js';

const L = {
  seller: 'البائع / Seller',
  buyer: 'المشتري / Buyer',
  name: 'الاسم',
  vat: 'الرقم الضريبي',
  cr: 'السجل التجاري',
  address: 'العنوان',
  order: 'رقم الطلب',
  supplyDate: 'تاريخ التوريد',
  payment: 'طريقة الدفع',
  dueDate: 'تاريخ الاستحقاق',
  item: 'الصنف',
  qty: 'الكمية',
  unitPrice: 'سعر الوحدة',
  taxable: 'المبلغ الخاضع',
  vatRate: 'النسبة',
  vatAmount: 'الضريبة',
  total: 'الإجمالي',
  subtotal: 'المجموع قبل الضريبة',
  discount: 'الخصم',
  delivery: 'رسوم التوصيل',
  vatTotal: 'ضريبة القيمة المضافة 15%',
  grandTotal: 'الإجمالي شامل الضريبة',
  footer: 'فاتورة ضريبية صادرة عبر منصة توريد نيابة عن البائع. للاستفسار: support@tawreed.sa',
  deliverTo: 'التسليم إلى',
  summary: 'ملخص',
  suppliers: 'عدد الموردين',
  from: 'من',
  to: 'إلى',
  receiver: 'المستلم',
  driver: 'السائق',
  vehicle: 'المركبة',
  deliveredAt: 'وقت التسليم',
  otp: 'التحقق برمز',
  shipped: 'المشحون',
  delivered: 'المسلَّم',
  driverSign: 'توقيع السائق',
  receiverSign: 'توقيع المستلم',
};

const detailInclude = {
  ...invoiceSummaryInclude,
  lines: true,
  documents: { include: { file: true }, where: { type: 'TAX_INVOICE' as const } },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class InvoicesService implements OnModuleInit {
  private readonly logger = new Logger('Invoices');
  private logoDataUrl: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly credit: CreditService,
    private readonly events: OrderEventsService,
    private readonly outbox: OutboxService,
    private readonly pdf: PdfService,
    private readonly files: FilesService,
    private readonly storage: StorageService,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit(): void {
    this.outbox.on<{ supplierOrderId: string; to: string; from: string }>('supplier_order.status_changed', async (p) => {
      if (p.to === 'DELIVERED' || (p.to === 'COMPLETED' && p.from === 'PARTIALLY_DELIVERED')) await this.issueForSupplierOrder(p.supplierOrderId);
    });
    this.outbox.on<{ invoiceId: string }>('invoice.issued', (p) => this.renderInvoicePdf(p.invoiceId));
    this.outbox.on<{ orderId: string }>('order.placed', (p) => this.renderPurchaseOrder(p.orderId));
    this.outbox.on<{ shipmentId: string; to: string }>('shipment.status_changed', async (p) => {
      if (p.to === 'DELIVERED') await this.renderDeliveryNote(p.shipmentId);
    });
  }

  private logo(): string {
    if (!this.logoDataUrl) {
      const svg = readFileSync(path.join(ASSETS_DIR, 'templates/logo.svg'));
      this.logoDataUrl = `data:image/svg+xml;base64,${svg.toString('base64')}`;
    }
    return this.logoDataUrl;
  }

  /* ---------------------------------------------------------------- issuance */

  async issueForSupplierOrder(supplierOrderId: string): Promise<void> {
    const exists = await this.prisma.invoice.findUnique({ where: { supplierOrderId }, select: { id: true } });
    if (exists) return;
    const so = await this.prisma.supplierOrder.findUnique({
      where: { id: supplierOrderId },
      include: {
        items: true,
        shipments: { select: { codCollected: true } },
        supplier: { include: { city: true, warehouses: { where: { isDefault: true }, take: 1 } } },
        order: { include: { company: { include: { city: true } } } },
      },
    });
    if (!so) return;
    const { termsDays } = await this.credit.account(so.order.companyId);
    await this.prisma.tx(async (tx) => {
      const lines = so.items
        .filter((i) => dec(i.deliveredQty).greaterThan(0))
        .map((i) => {
          const ratio = dec(i.deliveredQty).dividedBy(dec(i.qty));
          const amounts = computeLine(i.unitPrice, i.deliveredQty, i.vatRate, dec(i.discount).times(ratio));
          return { item: i, amounts };
        });
      const deliveryFee = dec(so.deliveryFee);
      const deliveryVat = deliveryFee.times('0.15').toDecimalPlaces(2);
      const subtotal = sum(lines.map((l) => l.amounts.lineSubtotal));
      const discount = sum(lines.map((l) => l.amounts.discount));
      const vatTotal = sum(lines.map((l) => l.amounts.vatAmount)).plus(deliveryVat);
      const total = subtotal.minus(discount).plus(deliveryFee).plus(vatTotal);
      const now = new Date();
      const paid =
        so.order.paymentMethod === 'CREDIT'
          ? dec(0)
          : so.order.paymentMethod === 'COD'
            ? sum(so.shipments.map((s) => s.codCollected))
            : ['PAID', 'PARTIALLY_REFUNDED'].includes(so.order.paymentStatus)
              ? total
              : dec(0);
      const amountPaid = paid.greaterThan(total) ? total : paid;
      const balance = total.minus(amountPaid);
      const seller: PartySnapshot = {
        name: so.supplier.legalName ?? so.supplier.nameAr,
        vatNumber: so.supplier.vatNumber,
        crNumber: so.supplier.crNumber,
        address: [so.supplier.warehouses[0]?.district, so.supplier.city?.nameAr].filter(Boolean).join('، ') || null,
        phone: so.supplier.contactPhone,
      };
      const addr = so.order.addressSnapshot as unknown as AddressSnapshot;
      const buyer: PartySnapshot = {
        name: so.order.company.legalName ?? so.order.company.name,
        vatNumber: so.order.company.vatNumber,
        crNumber: so.order.company.crNumber,
        address: addr?.formatted ?? so.order.company.city?.nameAr ?? null,
        phone: so.order.company.phone,
      };
      const invoice = await tx.invoice.create({
        data: {
          number: await this.sequences.next(tx, 'INV'),
          supplierOrderId: so.id,
          orderId: so.orderId,
          companyId: so.order.companyId,
          supplierId: so.supplierId,
          sellerSnapshot: seller as unknown as Prisma.InputJsonValue,
          buyerSnapshot: buyer as unknown as Prisma.InputJsonValue,
          issueDate: now,
          supplyDate: so.deliveredAt ?? now,
          dueDate: so.order.paymentMethod === 'CREDIT' ? new Date(now.getTime() + termsDays * 86_400_000) : null,
          paymentMethod: so.order.paymentMethod,
          subtotal: money(subtotal),
          discountTotal: money(discount),
          deliveryFee: money(deliveryFee),
          vatTotal: money(vatTotal),
          total: money(total),
          amountPaid: money(amountPaid),
          balanceDue: money(balance),
          status: balance.lessThanOrEqualTo(0) ? 'PAID' : amountPaid.greaterThan(0) ? 'PARTIALLY_PAID' : 'ISSUED',
          zatcaQr: zatcaQr({ sellerName: seller.name, vatNumber: seller.vatNumber ?? '300000000000003', timestamp: now, total: money(total), vatTotal: money(vatTotal) }),
          lines: {
            create: [
              ...lines.map((l) => ({
                orderItemId: l.item.id,
                descriptionAr: `${l.item.productNameAr} (${l.item.unitNameAr})`,
                descriptionEn: `${l.item.productNameEn} (${l.item.unitNameEn})`,
                qty: l.item.deliveredQty,
                unitPrice: l.item.unitPrice,
                vatRate: l.item.vatRate,
                vatAmount: money(l.amounts.vatAmount),
                lineTotal: money(l.amounts.lineTotal),
              })),
              ...(deliveryFee.greaterThan(0)
                ? [{ descriptionAr: 'رسوم التوصيل', descriptionEn: 'Delivery fee', qty: '1', unitPrice: money(deliveryFee), vatRate: '0.15', vatAmount: money(deliveryVat), lineTotal: money(deliveryFee.plus(deliveryVat)) }]
                : []),
            ],
          },
        },
      });
      // Credit orders: release the part of the reservation that wasn't delivered.
      if (so.order.paymentMethod === 'CREDIT' && dec(so.total).greaterThan(total)) {
        await this.credit.reverse(tx, so.order.companyId, dec(so.total).minus(total), { orderId: so.orderId, invoiceId: invoice.id, note: 'undelivered quantities' });
      }
      await this.events.add(tx, { orderId: so.orderId, supplierOrderId: so.id, type: 'invoice.issued', actorType: 'SYSTEM', meta: { number: invoice.number } });
      await this.outbox.publish(tx, 'invoice.issued', { invoiceId: invoice.id, companyId: so.order.companyId, supplierId: so.supplierId });
    });
  }

  /* ---------------------------------------------------------------- PDFs */

  private async storePdf(tx: Tx | PrismaService, buffer: Buffer, key: string, doc: Omit<Prisma.DocumentUncheckedCreateInput, 'fileId'>): Promise<string> {
    const file = await this.files.storeGenerated(buffer, { key, mimeType: 'application/pdf', purpose: 'GENERATED_PDF', originalName: key.split('/').pop() });
    const existing = await tx.document.findFirst({ where: { fileId: file.id } });
    if (!existing) await tx.document.create({ data: { ...doc, fileId: file.id } });
    return file.id;
  }

  async renderInvoicePdf(invoiceId: string): Promise<void> {
    const inv = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: { lines: true, order: { select: { number: true } } } });
    if (!inv) return;
    const seller = inv.sellerSnapshot as unknown as PartySnapshot;
    const buyer = inv.buyerSnapshot as unknown as PartySnapshot;
    const platform = await this.settings.get('platform');
    const m = (v: unknown) => formatMoney(String(v), 'ar');
    try {
      const buffer = await this.pdf.render('invoice', {
        locale: 'ar',
        dir: 'rtl',
        title: 'فاتورة ضريبية',
        titleAlt: 'Tax Invoice',
        numberLabel: 'رقم الفاتورة',
        dateLabel: 'تاريخ الإصدار',
        number: inv.number,
        date: formatDateTime(inv.issueDate, 'ar'),
        badge: enumLabel('ar', 'InvoiceStatus', inv.status),
        logo: this.logo(),
        l: L,
        seller: { ...seller, vatNumber: seller.vatNumber ?? '—', crNumber: seller.crNumber ?? '—', address: seller.address ?? '—' },
        buyer: { ...buyer, vatNumber: buyer.vatNumber ?? '—', crNumber: buyer.crNumber ?? '—', address: buyer.address ?? '—' },
        orderNumber: inv.order.number,
        supplyDate: formatDate(inv.supplyDate, 'ar'),
        paymentMethod: enumLabel('ar', 'PaymentMethod', inv.paymentMethod),
        dueDate: inv.dueDate ? formatDate(inv.dueDate, 'ar') : '—',
        lines: inv.lines.map((l, i) => {
          const taxable = dec(l.lineTotal).minus(dec(l.vatAmount));
          return { index: i + 1, description: l.descriptionAr, qty: formatQty(String(l.qty), 'ar'), unitPrice: m(l.unitPrice), taxable: m(taxable), vatRate: `${dec(l.vatRate).times(100).toFixed(0)}%`, vatAmount: m(l.vatAmount), lineTotal: m(l.lineTotal) };
        }),
        totals: { subtotal: m(inv.subtotal), discount: m(inv.discountTotal), hasDiscount: dec(inv.discountTotal).greaterThan(0), delivery: m(inv.deliveryFee), vat: m(inv.vatTotal), total: m(inv.total) },
        qr: await QRCode.toDataURL(inv.zatcaQr, { margin: 1, width: 240 }),
        platform: `${platform.legalName} · VAT ${platform.vatNumber}`,
      });
      const fileId = await this.storePdf(this.prisma, buffer, `documents/invoices/${inv.number}.pdf`, {
        type: 'TAX_INVOICE',
        number: inv.number,
        titleAr: `فاتورة ضريبية ${inv.number}`,
        titleEn: `Tax invoice ${inv.number}`,
        orderId: inv.orderId,
        supplierOrderId: inv.supplierOrderId,
        invoiceId: inv.id,
        companyId: inv.companyId,
        supplierId: inv.supplierId,
      });
      await this.prisma.invoice.update({ where: { id: inv.id }, data: { pdfFileId: fileId } });
    } catch (err) {
      this.logger.warn(`Invoice PDF ${inv.number} failed: ${(err as Error).message}`);
    }
  }

  async renderPurchaseOrder(orderId: string): Promise<void> {
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, include: { company: true, supplierOrders: { include: { items: true, supplier: { select: { nameAr: true } } }, orderBy: { number: 'asc' } } } });
    if (!o) return;
    const m = (v: unknown) => formatMoney(String(v), 'ar');
    const addr = o.addressSnapshot as unknown as AddressSnapshot;
    try {
      const buffer = await this.pdf.render('purchase-order', {
        locale: 'ar',
        dir: 'rtl',
        title: 'أمر شراء',
        titleAlt: 'Purchase Order',
        numberLabel: 'رقم الطلب',
        dateLabel: 'التاريخ',
        number: o.number,
        date: formatDateTime(o.createdAt, 'ar'),
        badge: enumLabel('ar', 'OrderStatus', o.status),
        logo: this.logo(),
        l: L,
        buyer: { name: o.company.name, vatNumber: o.company.vatNumber ?? '—' },
        address: addr?.formatted ?? '',
        paymentMethod: enumLabel('ar', 'PaymentMethod', o.paymentMethod),
        suppliersCount: o.supplierOrders.length,
        groups: o.supplierOrders.map((so) => ({
          supplier: so.supplier.nameAr,
          number: so.number,
          delivery: so.deliveryDate ? `${formatDate(so.deliveryDate, 'ar')} · ${so.deliveryWindow ? enumLabel('ar', 'DeliveryWindow', so.deliveryWindow) : ''}` : '',
          items: so.items.map((i) => ({ name: `${i.productNameAr} (${i.unitNameAr})`, qty: formatQty(String(i.qty), 'ar'), unitPrice: m(i.unitPrice), vat: m(i.vatAmount), total: m(i.lineTotal) })),
        })),
        totals: { subtotal: m(o.subtotal), discount: m(o.discountTotal), hasDiscount: dec(o.discountTotal).greaterThan(0), delivery: m(o.deliveryTotal), vat: m(o.vatTotal), total: m(o.grandTotal) },
      });
      await this.storePdf(this.prisma, buffer, `documents/orders/${o.number}-po.pdf`, { type: 'PURCHASE_ORDER', number: o.number, titleAr: `أمر شراء ${o.number}`, titleEn: `Purchase order ${o.number}`, orderId: o.id, companyId: o.companyId });
    } catch (err) {
      this.logger.warn(`PO PDF ${o.number} failed: ${(err as Error).message}`);
    }
  }

  async renderDeliveryNote(shipmentId: string): Promise<void> {
    const s = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { pod: true, items: { include: { orderItem: true } }, driver: { include: { user: true, vehicle: true } }, order: { include: { company: true } } },
    });
    if (!s) return;
    const pickup = s.pickupSnapshot as { name: string; address: string };
    const dropoff = s.dropoffSnapshot as unknown as AddressSnapshot;
    try {
      const buffer = await this.pdf.render('delivery-note', {
        locale: 'ar',
        dir: 'rtl',
        title: 'إذن تسليم',
        titleAlt: 'Delivery Note',
        numberLabel: 'رقم الشحنة',
        dateLabel: 'التاريخ',
        number: s.number,
        date: formatDateTime(s.deliveredAt ?? new Date(), 'ar'),
        logo: this.logo(),
        l: L,
        pickup,
        buyer: s.order.company.name,
        dropoff: dropoff.formatted,
        receiver: s.pod?.receiverName ?? '—',
        driver: s.driver?.user.name ?? '—',
        vehicle: s.driver?.vehicle?.plateNumber ?? '—',
        deliveredAt: s.deliveredAt ? formatDateTime(s.deliveredAt, 'ar') : '—',
        otp: s.pod?.otpVerified ? 'نعم ✓' : 'لا',
        items: s.items.map((i) => ({ name: `${i.orderItem.productNameAr} (${i.orderItem.unitNameAr})`, qty: formatQty(String(i.qty), 'ar'), delivered: formatQty(String(i.deliveredQty ?? i.qty), 'ar') })),
      });
      await this.storePdf(this.prisma, buffer, `documents/shipments/${s.number}-dn.pdf`, { type: 'DELIVERY_NOTE', number: s.number, titleAr: `إذن تسليم ${s.number}`, titleEn: `Delivery note ${s.number}`, orderId: s.orderId, supplierOrderId: s.supplierOrderId, shipmentId: s.id, companyId: s.order.companyId, supplierId: s.supplierId });
    } catch (err) {
      this.logger.warn(`Delivery note ${s.number} failed: ${(err as Error).message}`);
    }
  }

  /* ---------------------------------------------------------------- queries */

  async list(where: Prisma.InvoiceWhereInput, q: z.output<typeof invoiceQuery>) {
    const filter: Prisma.InvoiceWhereInput = {
      ...where,
      ...(q.status === 'OPEN' ? { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } } : q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ number: { contains: q.q, mode: 'insensitive' } }, { order: { number: { contains: q.q, mode: 'insensitive' } } }] } : {}),
      ...(q.from || q.to ? { issueDate: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(`${q.to}T23:59:59Z`) } : {}) } } : {}),
    };
    const [total, rows, agg] = await Promise.all([
      this.prisma.invoice.count({ where: filter }),
      this.prisma.invoice.findMany({ where: filter, include: invoiceSummaryInclude, orderBy: { issueDate: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      this.prisma.invoice.aggregate({ where: filter, _sum: { total: true, balanceDue: true, vatTotal: true } }),
    ]);
    return {
      data: rows.map((r) => invoiceSummary(r)),
      meta: { ...pageMeta(q.page, q.pageSize, total), sums: { total: money(agg._sum.total ?? 0), balanceDue: money(agg._sum.balanceDue ?? 0), vatTotal: money(agg._sum.vatTotal ?? 0) } },
    };
  }

  async detail(where: Prisma.InvoiceWhereInput, id: string): Promise<InvoiceDetailDto> {
    const key = /^[0-9a-f-]{36}$/i.test(id) ? { id } : { number: id };
    const inv = await this.prisma.invoice.findFirst({ where: { ...where, ...key }, include: detailInclude });
    if (!inv) throw AppError.notFound();
    const doc = inv.documents[0];
    return {
      ...invoiceSummary(inv),
      seller: inv.sellerSnapshot as unknown as PartySnapshot,
      buyer: inv.buyerSnapshot as unknown as PartySnapshot,
      lines: inv.lines.map((l) => ({ description: loc(l.descriptionAr, l.descriptionEn), qty: String(l.qty), unitPrice: money(l.unitPrice), vatRate: dec(l.vatRate).toString(), vatAmount: money(l.vatAmount), lineTotal: money(l.lineTotal) })),
      subtotal: money(inv.subtotal),
      discountTotal: money(inv.discountTotal),
      deliveryFee: money(inv.deliveryFee),
      zatcaQr: inv.zatcaQr,
      pdfUrl: doc ? this.storage.signedUrl(doc.file.key, 1800, `${inv.number}.pdf`) : null,
      supplyDate: inv.supplyDate.toISOString(),
    };
  }

  /** Ensures the PDF exists (renders on demand if the worker hasn't yet) and returns a signed URL. */
  async pdfUrl(where: Prisma.InvoiceWhereInput, id: string): Promise<{ url: string }> {
    let inv = await this.prisma.invoice.findFirst({ where: { ...where, id }, include: { documents: { include: { file: true }, where: { type: 'TAX_INVOICE' } } } });
    if (!inv) throw AppError.notFound();
    if (!inv.documents.length) {
      await this.renderInvoicePdf(inv.id);
      inv = await this.prisma.invoice.findFirstOrThrow({ where: { id }, include: { documents: { include: { file: true }, where: { type: 'TAX_INVOICE' } } } });
    }
    const doc = inv.documents[0];
    if (!doc) throw AppError.notFound();
    return { url: this.storage.signedUrl(doc.file.key, 1800, `${inv.number}.pdf`) };
  }
}
