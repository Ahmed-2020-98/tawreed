import { Injectable } from '@nestjs/common';
import type {
  ActorType,
  AddressSnapshot,
  DocumentDto,
  OrderDetailDto,
  OrderItemDto,
  OrderSummaryDto,
  PaymentDto,
  ShipmentSummaryDto,
  SupplierOrderDetailDto,
  SupplierOrderDto,
  SupplierOrderListItemDto,
  TimelineEventDto,
} from '@tawreed/contracts';
import { enumLabel, translate } from '@tawreed/i18n';
import { RequestContext } from '../../common/context/request-context.js';
import { loc } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { FilesService, type UrlPair } from '../files/files.service.js';
import { dec, money, qtyStr } from '../pricing/domain/money.js';
import { ACTIVE_SHIPMENT } from '../shipments/domain/shipment.machine.js';
import { allowedActions, canTransition, PROGRESS_STEPS, progressIndex } from './domain/supplier-order.machine.js';

export const shipmentSummaryInclude = {
  driver: { select: { id: true, user: { select: { name: true, phone: true } }, vehicle: { select: { plateNumber: true, type: true } } } },
  locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
} satisfies Prisma.ShipmentInclude;

export const supplierOrderInclude = {
  supplier: { select: { id: true, slug: true, nameAr: true, nameEn: true, logoFileId: true, ratingAvg: true, ratingCount: true, contactPhone: true, city: { select: { nameAr: true, nameEn: true } } } },
  items: { orderBy: { createdAt: 'asc' } },
  shipments: { include: shipmentSummaryInclude, orderBy: { createdAt: 'asc' } },
  invoice: { select: { id: true, number: true, status: true, total: true, balanceDue: true, dueDate: true } },
  review: { select: { rating: true, comment: true } },
} satisfies Prisma.SupplierOrderInclude;

export const orderDetailInclude = {
  company: { select: { id: true, name: true } },
  supplierOrders: { include: supplierOrderInclude, orderBy: { number: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
  payments: { orderBy: { createdAt: 'desc' } },
  documents: { include: { file: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

export const orderSummaryInclude = {
  supplierOrders: {
    select: { status: true, supplier: { select: { id: true, nameAr: true, nameEn: true, logoFileId: true } }, items: { select: { imageKey: true } } },
    orderBy: { number: 'asc' },
  },
} satisfies Prisma.OrderInclude;

type OrderDetailRow = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;
type OrderSummaryRow = Prisma.OrderGetPayload<{ include: typeof orderSummaryInclude }>;
type SupplierOrderRow = Prisma.SupplierOrderGetPayload<{ include: typeof supplierOrderInclude }>;
type ShipmentRow = Prisma.ShipmentGetPayload<{ include: typeof shipmentSummaryInclude }>;

const ACTION_NAMES: Record<string, string> = {
  accept: 'accept',
  reject: 'reject',
  start_preparing: 'start_preparing',
  mark_ready: 'mark_ready',
  cancel: 'cancel',
};

@Injectable()
export class OrderPresenter {
  constructor(
    private readonly files: FilesService,
    private readonly storage: StorageService,
  ) {}

  imageUrl(key: string | null): string | null {
    return key ? this.storage.publicUrl(key) : null;
  }

  address(snapshot: unknown): AddressSnapshot {
    return snapshot as AddressSnapshot;
  }

  item(i: SupplierOrderRow['items'][number]): OrderItemDto {
    return {
      id: i.id,
      productId: i.productId,
      productSlug: null,
      name: loc(i.productNameAr, i.productNameEn),
      unitName: loc(i.unitNameAr, i.unitNameEn),
      image: this.imageUrl(i.imageKey),
      sku: i.sku,
      qty: qtyStr(i.qty),
      unitPrice: money(i.unitPrice),
      listUnitPrice: money(i.listUnitPrice),
      priceSource: i.priceSource,
      discount: money(i.discount),
      vatRate: dec(i.vatRate).toString(),
      vatAmount: money(i.vatAmount),
      lineSubtotal: money(i.lineSubtotal),
      lineTotal: money(i.lineTotal),
      deliveredQty: qtyStr(i.deliveredQty),
    };
  }

  shipment(s: ShipmentRow): ShipmentSummaryDto {
    const last = s.locations[0];
    return {
      id: s.id,
      number: s.number,
      status: s.status,
      dispatchMode: s.dispatchMode,
      driver: s.driver ? { id: s.driver.id, name: s.driver.user.name, phone: s.driver.user.phone, vehicle: s.driver.vehicle } : null,
      scheduledDate: s.scheduledDate?.toISOString().slice(0, 10) ?? null,
      window: s.window,
      etaAt: s.etaAt?.toISOString() ?? null,
      codAmount: money(s.codAmount),
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
      lastLocation: last ? { lat: last.lat, lng: last.lng, recordedAt: last.recordedAt.toISOString() } : null,
      trackable: ACTIVE_SHIPMENT.includes(s.status) && s.status !== 'ASSIGNED',
    };
  }

  supplierOrder(so: SupplierOrderRow, logos: Map<string, UrlPair>, viewer: ActorType, extras: { reviewWindowDays?: number } = {}): SupplierOrderDto {
    const actions = allowedActions(so.status, viewer)
      .map((a) => ACTION_NAMES[a])
      .filter((a): a is string => !!a);
    if (viewer === 'BUYER') {
      const delivered = ['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED'].includes(so.status);
      const withinWindow = so.deliveredAt ? Date.now() - so.deliveredAt.getTime() < (extras.reviewWindowDays ?? 14) * 86_400_000 : false;
      if (delivered && !so.review && withinWindow) actions.push('rate');
      if (delivered && withinWindow) actions.push('report_issue');
      if (so.shipments.some((s) => ACTIVE_SHIPMENT.includes(s.status))) actions.push('track');
    }
    return {
      id: so.id,
      number: so.number,
      status: so.status,
      supplier: {
        id: so.supplier.id,
        slug: so.supplier.slug,
        name: loc(so.supplier.nameAr, so.supplier.nameEn),
        logoUrl: so.supplier.logoFileId ? logos.get(so.supplier.logoFileId)?.url ?? null : null,
        ratingAvg: dec(so.supplier.ratingAvg).toFixed(1),
        ratingCount: so.supplier.ratingCount,
        city: so.supplier.city ? loc(so.supplier.city.nameAr, so.supplier.city.nameEn) : null,
        phone: so.supplier.contactPhone,
      },
      items: so.items.map((i) => this.item(i)),
      subtotal: money(so.subtotal),
      discountTotal: money(so.discountTotal),
      deliveryFee: money(so.deliveryFee),
      vatTotal: money(so.vatTotal),
      total: money(so.total),
      deliveryDate: so.deliveryDate?.toISOString().slice(0, 10) ?? null,
      deliveryWindow: so.deliveryWindow,
      storageType: so.storageType,
      shipments: so.shipments.map((s) => this.shipment(s)),
      invoice: so.invoice ? { id: so.invoice.id, number: so.invoice.number, status: so.invoice.status, total: money(so.invoice.total), balanceDue: money(so.invoice.balanceDue), dueDate: so.invoice.dueDate?.toISOString().slice(0, 10) ?? null } : null,
      review: so.review,
      progress: { step: progressIndex(so.status), steps: PROGRESS_STEPS },
      allowedActions: actions,
      acceptedAt: so.acceptedAt?.toISOString() ?? null,
      deliveredAt: so.deliveredAt?.toISOString() ?? null,
      rejectReason: so.rejectReason,
      cancelReason: so.cancelReason,
      createdAt: so.createdAt.toISOString(),
    };
  }

  timeline(events: { id: string; type: string; note: string | null; actorType: ActorType; supplierOrderId: string | null; createdAt: Date; meta: unknown }[]): TimelineEventDto[] {
    const locale = RequestContext.locale();
    return events.map((e) => {
      const meta = (e.meta ?? {}) as Record<string, string>;
      return {
        id: e.id,
        type: e.type,
        title: translate(locale, `timeline.${e.type}`, {
          supplier: locale === 'en' ? meta.supplierEn ?? meta.supplierAr ?? '' : meta.supplierAr ?? '',
          driver: meta.driver ?? '',
        }),
        note: e.note,
        actorType: e.actorType,
        supplierOrderId: e.supplierOrderId,
        createdAt: e.createdAt.toISOString(),
      };
    });
  }

  documents(docs: Prisma.DocumentGetPayload<{ include: { file: true } }>[]): DocumentDto[] {
    const locale = RequestContext.locale();
    return docs.map((d) => ({
      id: d.id,
      type: d.type,
      number: d.number,
      title: loc(d.titleAr ?? '', d.titleEn ?? '') || enumLabel(locale, 'DocumentType', d.type),
      url: this.storage.url(d.file.key, d.file.visibility, 1800),
      createdAt: d.createdAt.toISOString(),
    }));
  }

  payment(p: Prisma.PaymentGetPayload<object>, extra: { orderNumber?: string | null; proofUrl?: string | null } = {}): PaymentDto {
    return {
      id: p.id,
      number: p.number,
      purpose: p.purpose,
      method: p.method,
      provider: p.provider,
      amount: money(p.amount),
      status: p.status,
      bankReference: p.bankReference,
      transferDate: p.transferDate?.toISOString().slice(0, 10) ?? null,
      proofUrl: extra.proofUrl ?? null,
      rejectionReason: p.rejectionReason,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      orderNumber: extra.orderNumber ?? null,
    };
  }

  async summaries(rows: OrderSummaryRow[]): Promise<OrderSummaryDto[]> {
    const logos = await this.files.urlMap(rows.flatMap((r) => r.supplierOrders.map((s) => s.supplier.logoFileId)));
    return rows.map((o) => {
      const items = o.supplierOrders.flatMap((s) => s.items);
      return {
        id: o.id,
        number: o.number,
        status: o.status,
        source: o.source,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        grandTotal: money(o.grandTotal),
        itemsCount: items.length,
        suppliers: o.supplierOrders.map((s) => ({
          id: s.supplier.id,
          name: loc(s.supplier.nameAr, s.supplier.nameEn),
          logoUrl: s.supplier.logoFileId ? logos.get(s.supplier.logoFileId)?.url ?? null : null,
          status: s.status,
        })),
        thumbnails: items
          .map((i) => this.imageUrl(i.imageKey))
          .filter((u): u is string => !!u)
          .slice(0, 4),
        placedAt: o.placedAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
      };
    });
  }

  async detail(o: OrderDetailRow, viewer: ActorType, reviewWindowDays = 14): Promise<OrderDetailDto> {
    const [summary] = await this.summaries([
      { ...o, supplierOrders: o.supplierOrders.map((s) => ({ status: s.status, supplier: s.supplier, items: s.items })) },
    ]);
    const logos = await this.files.urlMap(o.supplierOrders.map((s) => s.supplier.logoFileId));
    const proofs = await this.files.urlMap(o.payments.map((p) => p.proofFileId));
    const live = o.supplierOrders.filter((s) => !['CANCELLED', 'REJECTED'].includes(s.status));
    const actions: string[] = [];
    if (live.length && live.every((s) => canTransition(s.status, 'cancel', viewer))) actions.push('cancel');
    if (o.status === 'PENDING_PAYMENT' && o.paymentMethod === 'CARD') actions.push('pay_card');
    if (o.status === 'PENDING_PAYMENT' && o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus !== 'PENDING_VERIFICATION') actions.push('upload_transfer');
    if (viewer === 'BUYER') actions.push('reorder');
    return {
      ...(summary as OrderSummaryDto),
      address: this.address(o.addressSnapshot),
      subtotal: money(o.subtotal),
      discountTotal: money(o.discountTotal),
      deliveryTotal: money(o.deliveryTotal),
      vatTotal: money(o.vatTotal),
      amountPaid: money(o.amountPaid),
      couponCode: o.couponCode,
      notes: o.notes,
      supplierOrders: o.supplierOrders.map((so) => this.supplierOrder(so, logos, viewer, { reviewWindowDays })),
      timeline: this.timeline(o.events),
      payments: o.payments.map((p) => this.payment(p, { orderNumber: o.number, proofUrl: p.proofFileId ? proofs.get(p.proofFileId)?.url ?? null : null })),
      documents: this.documents(o.documents),
      allowedActions: actions,
      company: o.company,
      cancelReason: o.cancelReason,
    };
  }

  supplierListItem(
    so: Prisma.SupplierOrderGetPayload<{ include: { order: { select: { number: true; paymentMethod: true; addressSnapshot: true; company: { select: { id: true; name: true; businessType: true } } } }; _count: { select: { items: true } } } }>,
  ): SupplierOrderListItemDto {
    const address = so.order.addressSnapshot as unknown as AddressSnapshot;
    return {
      id: so.id,
      number: so.number,
      orderNumber: so.order.number,
      status: so.status,
      buyer: { id: so.order.company.id, name: so.order.company.name, businessType: so.order.company.businessType, city: address?.city ?? null },
      total: money(so.total),
      itemsCount: so._count.items,
      deliveryDate: so.deliveryDate?.toISOString().slice(0, 10) ?? null,
      deliveryWindow: so.deliveryWindow,
      paymentMethod: so.order.paymentMethod,
      storageType: so.storageType,
      acceptDeadlineAt: so.acceptDeadlineAt?.toISOString() ?? null,
      createdAt: so.createdAt.toISOString(),
    };
  }

  async supplierDetail(
    so: SupplierOrderRow & {
      order: { id: string; number: string; paymentMethod: OrderDetailDto['paymentMethod']; paymentStatus: OrderDetailDto['paymentStatus']; placedAt: Date | null; addressSnapshot: unknown; company: { id: string; name: string; businessType: string; phone: string | null; verificationStatus: string } };
      events: Prisma.OrderEventGetPayload<object>[];
      documents: Prisma.DocumentGetPayload<{ include: { file: true } }>[];
    },
    viewer: ActorType,
  ): Promise<SupplierOrderDetailDto> {
    const logos = await this.files.urlMap([so.supplier.logoFileId]);
    const base = this.supplierOrder(so, logos, viewer);
    return {
      ...base,
      order: { id: so.order.id, number: so.order.number, paymentMethod: so.order.paymentMethod, paymentStatus: so.order.paymentStatus, placedAt: so.order.placedAt?.toISOString() ?? null },
      buyer: { id: so.order.company.id, name: so.order.company.name, businessType: so.order.company.businessType, phone: so.order.company.phone, verificationStatus: so.order.company.verificationStatus },
      address: this.address(so.order.addressSnapshot),
      timeline: this.timeline(so.events),
      commissionRate: dec(so.commissionRate).toString(),
      commissionAmount: money(so.commissionAmount),
      netAmount: money(dec(so.subtotal).minus(dec(so.commissionAmount)).plus(dec(so.deliveryFee))),
      acceptDeadlineAt: so.acceptDeadlineAt?.toISOString() ?? null,
      documents: this.documents(so.documents),
    };
  }
}
