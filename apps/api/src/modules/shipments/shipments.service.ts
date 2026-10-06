import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type ActorType,
  createShipmentSchema,
  deliverSchema,
  driverLocationBatchSchema,
  type DriverSummaryDto,
  ErrorCode,
  failDeliverySchema,
  pickupSchema,
  type ShipmentDetailDto,
  shipmentListQuery,
  type ShipmentStatus,
} from '@tawreed/contracts';
import type { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { pageMeta } from '../../common/http/presenters.js';
import { loc } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService, type Tx } from '../../infrastructure/prisma/prisma.service.js';
import { SequenceService } from '../../infrastructure/sequences/sequence.service.js';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { OtpService } from '../auth/otp.service.js';
import type { AddressSnapshot } from '@tawreed/contracts';
import { FilesService } from '../files/files.service.js';
import { OrderEventsService } from '../orders/order-events.service.js';
import { OrderLifecycleService } from '../orders/order-lifecycle.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { dec, type Dec, money, qtyStr, sum } from '../pricing/domain/money.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { ACTIVE_SHIPMENT, type ShipmentAction, shipmentActions, shipmentNext } from './domain/shipment.machine.js';

const shipmentInclude = {
  supplierOrder: { select: { id: true, number: true, status: true, total: true, storageType: true } },
  order: { select: { id: true, number: true, companyId: true, paymentMethod: true, addressSnapshot: true, company: { select: { name: true, phone: true } } } },
  supplier: { select: { id: true, nameAr: true, nameEn: true, contactPhone: true } },
  driver: { select: { id: true, userId: true, user: { select: { name: true, phone: true } }, vehicle: { select: { plateNumber: true, type: true } } } },
  items: { include: { orderItem: { select: { productNameAr: true, productNameEn: true, unitNameAr: true, unitNameEn: true, imageKey: true } } } },
  events: { orderBy: { createdAt: 'asc' } },
  locations: { orderBy: { recordedAt: 'asc' }, take: 500 },
  pod: true,
} satisfies Prisma.ShipmentInclude;
type ShipmentRow = Prisma.ShipmentGetPayload<{ include: typeof shipmentInclude }>;

/** Lighter include for lists: no event history, only the latest GPS point. */
const shipmentListInclude = {
  ...shipmentInclude,
  events: { orderBy: { createdAt: 'desc' }, take: 1 },
  locations: { orderBy: { recordedAt: 'desc' }, take: 1 },
} satisfies Prisma.ShipmentInclude;

const EVENT_TYPE: Record<ShipmentAction, string> = {
  assign: 'shipment.assigned',
  unassign: 'shipment.created',
  accept: 'shipment.accepted',
  decline: 'shipment.created',
  pickup: 'shipment.picked_up',
  start: 'shipment.in_transit',
  arrive: 'shipment.arrived',
  deliver: 'shipment.delivered',
  fail: 'shipment.failed',
  cancel: 'shipment.cancelled',
};

const TIMESTAMP: Partial<Record<ShipmentAction, keyof Prisma.ShipmentUpdateInput>> = {
  assign: 'assignedAt',
  accept: 'acceptedAt',
  pickup: 'pickedUpAt',
  start: 'inTransitAt',
  arrive: 'arrivedAt',
  deliver: 'deliveredAt',
  fail: 'failedAt',
  cancel: 'cancelledAt',
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly events: OrderEventsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
    private readonly realtime: RealtimeService,
    private readonly payments: PaymentsService,
    private readonly files: FilesService,
    private readonly storage: StorageService,
  ) {}

  /* ---------------------------------------------------------------- presenter */

  async present(s: ShipmentRow, viewer: ActorType): Promise<ShipmentDetailDto> {
    const pickup = s.pickupSnapshot as { name: string; address: string; lat: number; lng: number; phone: string | null };
    const dropoff = s.dropoffSnapshot as unknown as AddressSnapshot;
    const podFiles = s.pod ? await this.files.urlMap([s.pod.signatureFileId, ...s.pod.photoFileIds]) : new Map<string, never>();
    const last = s.locations[s.locations.length - 1];
    return {
      id: s.id,
      number: s.number,
      status: s.status,
      dispatchMode: s.dispatchMode,
      supplierOrder: { id: s.supplierOrder.id, number: s.supplierOrder.number, status: s.supplierOrder.status, orderNumber: s.order.number },
      supplier: { id: s.supplier.id, name: loc(s.supplier.nameAr, s.supplier.nameEn), phone: s.supplier.contactPhone },
      buyer: { name: s.order.company.name, phone: dropoff.recipientPhone ?? s.order.company.phone },
      driver: s.driver ? { id: s.driver.id, name: s.driver.user.name, phone: s.driver.user.phone, vehicle: s.driver.vehicle } : null,
      pickup,
      dropoff,
      items: s.items.map((i) => ({
        orderItemId: i.orderItemId,
        name: loc(i.orderItem.productNameAr, i.orderItem.productNameEn),
        unitName: loc(i.orderItem.unitNameAr, i.orderItem.unitNameEn),
        image: i.orderItem.imageKey ? this.storage.publicUrl(i.orderItem.imageKey) : null,
        qty: qtyStr(i.qty),
        deliveredQty: i.deliveredQty ? qtyStr(i.deliveredQty) : null,
      })),
      scheduledDate: s.scheduledDate?.toISOString().slice(0, 10) ?? null,
      window: s.window,
      etaAt: s.etaAt?.toISOString() ?? null,
      distanceKm: s.distanceKm ? dec(s.distanceKm).toFixed(1) : null,
      codAmount: money(s.codAmount),
      codCollected: money(s.codCollected),
      storageType: s.supplierOrder.storageType,
      events: s.events.map((e) => ({ id: e.id, status: e.status, note: e.note, lat: e.lat, lng: e.lng, actorType: e.actorType, createdAt: e.createdAt.toISOString() })),
      route: s.locations.map((l) => ({ lat: l.lat, lng: l.lng, recordedAt: l.recordedAt.toISOString() })),
      lastLocation: last ? { lat: last.lat, lng: last.lng, recordedAt: last.recordedAt.toISOString() } : null,
      pod: s.pod
        ? {
            receiverName: s.pod.receiverName,
            receiverPhone: s.pod.receiverPhone,
            otpVerified: s.pod.otpVerified,
            signatureUrl: s.pod.signatureFileId ? podFiles.get(s.pod.signatureFileId)?.url ?? null : null,
            photoUrls: s.pod.photoFileIds.map((id) => podFiles.get(id)?.url).filter((u): u is string => !!u),
            lat: s.pod.lat,
            lng: s.pod.lng,
            notes: s.pod.notes,
            deliveredAt: s.pod.deliveredAt.toISOString(),
          }
        : null,
      allowedActions: shipmentActions(s.status, viewer),
      createdAt: s.createdAt.toISOString(),
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
      failureReason: s.failureReason,
    };
  }

  private async load(id: string, where: Prisma.ShipmentWhereInput = {}): Promise<ShipmentRow> {
    const s = await this.prisma.shipment.findFirst({ where: { id, ...where }, include: shipmentInclude });
    if (!s) throw AppError.notFound();
    return s;
  }

  async detail(id: string, actor: Actor): Promise<ShipmentDetailDto> {
    return this.present(await this.load(id, this.scopeFor(actor)), actor.contextType);
  }

  scopeFor(actor: Actor): Prisma.ShipmentWhereInput {
    switch (actor.contextType) {
      case 'BUYER':
        return { order: { companyId: actor.contextId as string } };
      case 'SUPPLIER':
        return { supplierId: actor.contextId as string };
      case 'DRIVER':
        return { driverId: actor.contextId };
      default:
        return {};
    }
  }

  private rooms(s: { id: string; supplierId: string; driverId: string | null; order: { companyId: string } }): string[] {
    return [`shipment:${s.id}`, `supplier:${s.supplierId}`, `company:${s.order.companyId}`, 'staff', ...(s.driverId ? [`driver:${s.driverId}`] : [])];
  }

  /* ---------------------------------------------------------------- create / assign */

  async create(actor: Actor, supplierOrderId: string, input: z.output<typeof createShipmentSchema>): Promise<ShipmentDetailDto> {
    const isStaff = actor.contextType === 'STAFF';
    const so = await this.prisma.supplierOrder.findFirst({
      where: { id: supplierOrderId, ...(isStaff ? {} : { supplierId: actor.contextId as string }) },
      include: {
        items: true,
        order: { select: { id: true, number: true, companyId: true, paymentMethod: true, paymentStatus: true, addressSnapshot: true } },
        supplier: { select: { id: true, nameAr: true, contactPhone: true, fleetMode: true, warehouses: { where: { isActive: true }, include: { city: true }, orderBy: { isDefault: 'desc' } } } },
        shipments: { where: { status: { notIn: ['CANCELLED', 'FAILED'] } }, include: { items: true } },
      },
    });
    if (!so) throw AppError.notFound();
    if (!['READY', 'PARTIALLY_DELIVERED'].includes(so.status)) throw AppError.conflict(ErrorCode.SHIPMENT_NOT_ASSIGNABLE);
    if (input.dispatchMode === 'SUPPLIER_FLEET' && so.supplier.fleetMode === 'PLATFORM' && !isStaff) throw AppError.conflict(ErrorCode.SHIPMENT_NOT_ASSIGNABLE);

    const shipped = new Map<string, Dec>();
    for (const sh of so.shipments) for (const it of sh.items) shipped.set(it.orderItemId, (shipped.get(it.orderItemId) ?? dec(0)).plus(dec(it.deliveredQty ?? it.qty)));
    const remaining = so.items
      .map((i) => ({ item: i, qty: dec(i.qty).minus(shipped.get(i.id) ?? dec(0)) }))
      .filter((r) => r.qty.greaterThan(0));
    const lines = input.items?.length
      ? input.items.map((l) => {
          const r = remaining.find((x) => x.item.id === l.orderItemId);
          if (!r || dec(l.qty).greaterThan(r.qty)) throw AppError.unprocessable(ErrorCode.DELIVERY_QTY_INVALID);
          return { item: r.item, qty: dec(l.qty) };
        })
      : remaining;
    if (!lines.length) throw AppError.conflict(ErrorCode.SHIPMENT_NOT_ASSIGNABLE);

    const warehouse = so.supplier.warehouses.find((w) => w.id === input.warehouseId) ?? so.supplier.warehouses[0];
    const dropoff = so.order.addressSnapshot as unknown as AddressSnapshot;
    const pickup = warehouse
      ? { name: `${so.supplier.nameAr} — ${warehouse.name}`, address: [warehouse.street, warehouse.district, warehouse.city.nameAr].filter(Boolean).join('، '), lat: warehouse.lat, lng: warehouse.lng, phone: warehouse.contactPhone ?? so.supplier.contactPhone }
      : { name: so.supplier.nameAr, address: '', lat: dropoff.lat, lng: dropoff.lng, phone: so.supplier.contactPhone };
    const goodsValue = sum(lines.map((l) => dec(l.item.lineTotal).times(l.qty).dividedBy(dec(l.item.qty))));
    const isFirst = so.shipments.length === 0;
    const codAmount = so.order.paymentMethod === 'COD' ? goodsValue.plus(isFirst ? dec(so.deliveryFee).times(1.15) : 0) : dec(0);

    if (input.driverId) await this.assertDriver(actor, input.driverId, input.dispatchMode);

    const id = await this.prisma.tx(async (tx) => {
      const status: ShipmentStatus = input.driverId ? 'ASSIGNED' : 'PENDING_ASSIGNMENT';
      const s = await tx.shipment.create({
        data: {
          number: await this.sequences.next(tx, 'SH'),
          supplierOrderId: so.id,
          orderId: so.order.id,
          supplierId: so.supplierId,
          driverId: input.driverId ?? null,
          vehicleId: input.vehicleId ?? null,
          dispatchMode: input.dispatchMode,
          status,
          pickupWarehouseId: warehouse?.id ?? null,
          pickupSnapshot: pickup,
          dropoffSnapshot: dropoff as unknown as Prisma.InputJsonValue,
          scheduledDate: input.scheduledDate ? new Date(`${input.scheduledDate}T00:00:00Z`) : so.deliveryDate,
          window: input.window ?? so.deliveryWindow,
          distanceKm: haversineKm(pickup, dropoff).toFixed(2),
          codAmount: money(codAmount),
          assignedAt: input.driverId ? new Date() : null,
          items: { create: lines.map((l) => ({ orderItemId: l.item.id, qty: l.qty.toFixed(3) })) },
        },
      });
      await tx.shipmentEvent.create({ data: { shipmentId: s.id, status, actorType: actor.contextType, actorId: actor.userId } });
      await this.events.add(tx, { orderId: so.order.id, supplierOrderId: so.id, shipmentId: s.id, type: input.driverId ? 'shipment.assigned' : 'shipment.created', actorType: actor.contextType, actorId: actor.userId, meta: input.driverId ? { driver: await this.driverName(tx, input.driverId) } : undefined });
      await this.outbox.publish(tx, input.driverId ? 'shipment.assigned' : 'shipment.created', { shipmentId: s.id, driverId: input.driverId ?? null, dispatchMode: input.dispatchMode });
      return s.id;
    });
    const s = await this.load(id);
    this.realtime.emit(this.rooms(s), 'shipment.updated', { shipmentId: id, status: s.status });
    return this.present(s, actor.contextType);
  }

  private async driverName(tx: Tx, driverId: string): Promise<string> {
    const d = await tx.driver.findUnique({ where: { id: driverId }, select: { user: { select: { name: true } } } });
    return d?.user.name ?? '';
  }

  private async assertDriver(actor: Actor, driverId: string, mode: 'SUPPLIER_FLEET' | 'PLATFORM_FLEET'): Promise<void> {
    const d = await this.prisma.driver.findUnique({ where: { id: driverId } });
    const ok =
      !!d &&
      d.status === 'ACTIVE' &&
      (mode === 'PLATFORM_FLEET' ? d.ownerType === 'PLATFORM' && actor.contextType === 'STAFF' : d.ownerType === 'SUPPLIER' && (actor.contextType === 'STAFF' || d.supplierId === actor.contextId));
    if (!ok) throw AppError.conflict(ErrorCode.DRIVER_NOT_AVAILABLE);
  }

  async assign(actor: Actor, shipmentId: string, driverId: string, vehicleId?: string): Promise<ShipmentDetailDto> {
    const s = await this.load(shipmentId, actor.contextType === 'SUPPLIER' ? { supplierId: actor.contextId as string, dispatchMode: 'SUPPLIER_FLEET' } : {});
    await this.assertDriver(actor, driverId, s.dispatchMode);
    return this.act(actor, s, 'assign', async (tx) => {
      await tx.shipment.update({ where: { id: s.id }, data: { driverId, vehicleId: vehicleId ?? null } });
      return { driver: await this.driverName(tx, driverId) };
    });
  }

  async unassign(actor: Actor, shipmentId: string): Promise<ShipmentDetailDto> {
    const s = await this.load(shipmentId, actor.contextType === 'SUPPLIER' ? { supplierId: actor.contextId as string } : {});
    return this.act(actor, s, 'unassign', async (tx) => {
      await tx.shipment.update({ where: { id: s.id }, data: { driverId: null, vehicleId: null } });
    });
  }

  async cancel(actor: Actor, shipmentId: string): Promise<ShipmentDetailDto> {
    const s = await this.load(shipmentId, actor.contextType === 'SUPPLIER' ? { supplierId: actor.contextId as string } : {});
    return this.act(actor, s, 'cancel');
  }

  /** Generic transition wrapper: state machine check, timestamps, shipment + order events, realtime, outbox. */
  private async act(actor: Actor, s: ShipmentRow, action: ShipmentAction, extra?: (tx: Tx) => Promise<Record<string, unknown> | void>, opts: { note?: string; lat?: number; lng?: number } = {}): Promise<ShipmentDetailDto> {
    const to = shipmentNext(s.status, action, actor.contextType);
    if (!to) throw AppError.invalidTransition(s.status, action);
    await this.prisma.tx(async (tx) => {
      const meta = (await extra?.(tx)) ?? undefined;
      const ts = TIMESTAMP[action];
      await tx.shipment.update({ where: { id: s.id }, data: { status: to, ...(ts ? { [ts]: new Date() } : {}) } });
      await tx.shipmentEvent.create({ data: { shipmentId: s.id, status: to, note: opts.note ?? null, lat: opts.lat ?? null, lng: opts.lng ?? null, actorType: actor.contextType, actorId: actor.userId } });
      if (!['unassign', 'decline'].includes(action)) {
        await this.events.add(tx, { orderId: s.orderId, supplierOrderId: s.supplierOrderId, shipmentId: s.id, type: EVENT_TYPE[action], actorType: actor.contextType, actorId: actor.userId, note: opts.note ?? null, meta: meta });
      }
      await this.outbox.publish(tx, 'shipment.status_changed', { shipmentId: s.id, from: s.status, to, action, supplierOrderId: s.supplierOrderId, orderId: s.orderId, companyId: s.order.companyId, driverId: s.driverId });
    });
    const fresh = await this.load(s.id);
    this.realtime.emit(this.rooms(fresh), 'shipment.updated', { shipmentId: s.id, status: fresh.status });
    return this.present(fresh, actor.contextType);
  }

  /* ---------------------------------------------------------------- driver journey */

  private async driverShipment(actor: Actor, id: string): Promise<ShipmentRow> {
    return this.load(id, { driverId: actor.contextId as string });
  }

  async accept(actor: Actor, id: string) {
    return this.act(actor, await this.driverShipment(actor, id), 'accept');
  }

  async decline(actor: Actor, id: string, note?: string) {
    const s = await this.driverShipment(actor, id);
    return this.act(actor, s, 'decline', async (tx) => {
      await tx.shipment.update({ where: { id: s.id }, data: { driverId: null } });
    }, { note });
  }

  async pickup(actor: Actor, id: string, input: z.output<typeof pickupSchema>) {
    const s = await this.driverShipment(actor, id);
    return this.act(actor, s, 'pickup', async (tx) => {
      await this.lifecycle.consumeStock(tx, s.items.map((i) => ({ orderItemId: i.orderItemId, qty: i.qty })));
      const so = await tx.supplierOrder.findUniqueOrThrow({ where: { id: s.supplierOrderId }, select: { status: true } });
      if (so.status === 'READY' || so.status === 'PARTIALLY_DELIVERED') await this.lifecycle.transition(tx, s.supplierOrderId, 'dispatch', { type: 'DRIVER', id: actor.userId });
    }, { note: input.note });
  }

  async start(actor: Actor, id: string, point: { lat?: number; lng?: number }) {
    const s = await this.driverShipment(actor, id);
    return this.act(actor, s, 'start', async (tx) => {
      const km = s.distanceKm ? Number(s.distanceKm) : 15;
      await tx.shipment.update({ where: { id: s.id }, data: { etaAt: new Date(Date.now() + ((km / 35) * 60 + 10) * 60_000) } });
    }, point);
  }

  async arrive(actor: Actor, id: string, point: { lat?: number; lng?: number }) {
    const s = await this.driverShipment(actor, id);
    const dto = await this.act(actor, s, 'arrive', undefined, point);
    const phone = (s.dropoffSnapshot as unknown as AddressSnapshot).recipientPhone;
    if (phone) {
      await this.otp.issue('delivery', phone, { subject: `shipment:${s.id}`, send: true }).catch(() => undefined);
      await this.prisma.shipment.update({ where: { id: s.id }, data: { deliveryOtpSentAt: new Date() } });
    }
    return dto;
  }

  async resendDeliveryOtp(actor: Actor, id: string): Promise<{ sent: boolean }> {
    const s = await this.driverShipment(actor, id);
    const phone = (s.dropoffSnapshot as unknown as AddressSnapshot).recipientPhone;
    if (!phone || s.status !== 'ARRIVED') throw AppError.conflict(ErrorCode.INVALID_STATE_TRANSITION);
    await this.otp.issue('delivery', phone, { subject: `shipment:${s.id}` });
    return { sent: true };
  }

  async deliver(actor: Actor, id: string, input: z.output<typeof deliverSchema>) {
    const s = await this.driverShipment(actor, id);
    let otpVerified = false;
    if (input.otp) {
      await this.otp.verify('delivery', `shipment:${s.id}`, input.otp).catch(() => {
        throw new AppError(ErrorCode.DELIVERY_OTP_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
      });
      otpVerified = true;
    }
    if (!otpVerified && !input.signatureFileId) throw new AppError(ErrorCode.DELIVERY_OTP_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
    const delivered = new Map(s.items.map((i) => [i.orderItemId, dec(i.qty)]));
    for (const l of input.items ?? []) {
      const shipped = delivered.get(l.orderItemId);
      if (!shipped || dec(l.deliveredQty).lessThan(0) || dec(l.deliveredQty).greaterThan(shipped)) throw AppError.unprocessable(ErrorCode.DELIVERY_QTY_INVALID);
      delivered.set(l.orderItemId, dec(l.deliveredQty));
    }
    return this.act(actor, s, 'deliver', async (tx) => {
      const now = new Date();
      await tx.proofOfDelivery.create({
        data: {
          shipmentId: s.id,
          receiverName: input.receiverName,
          receiverPhone: input.receiverPhone ?? null,
          otpVerified,
          signatureFileId: input.signatureFileId ?? null,
          photoFileIds: input.photoFileIds,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          notes: input.notes ?? null,
          deliveredAt: now,
          createdById: actor.userId,
        },
      });
      let partial = false;
      for (const item of s.items) {
        const qty = delivered.get(item.orderItemId) ?? dec(item.qty);
        if (qty.lessThan(dec(item.qty))) {
          partial = true;
          // Undelivered goods go back to the supplier's stock.
          const back = dec(item.qty).minus(qty).toFixed(3);
          const oi = await tx.orderItem.findUnique({ where: { id: item.orderItemId }, select: { offerId: true } });
          if (oi?.offerId) await tx.$executeRaw`UPDATE offers SET "stockQty" = "stockQty" + ${back}::numeric WHERE id = ${oi.offerId}::uuid AND "stockMode" = 'TRACKED'`;
        }
        await tx.shipmentItem.update({ where: { id: item.id }, data: { deliveredQty: qty.toFixed(3) } });
        await tx.orderItem.update({ where: { id: item.orderItemId }, data: { deliveredQty: { increment: qty.toFixed(3) } } });
      }
      const so = await tx.supplierOrder.findUniqueOrThrow({ where: { id: s.supplierOrderId }, include: { items: true, shipments: { where: { status: { in: ACTIVE_SHIPMENT }, id: { not: s.id } } } } });
      const allDelivered = so.items.every((i) => dec(i.deliveredQty).greaterThanOrEqualTo(dec(i.qty)));
      if (so.status === 'OUT_FOR_DELIVERY' || so.status === 'PARTIALLY_DELIVERED') {
        await this.lifecycle.transition(tx, so.id, allDelivered ? 'deliver' : 'partial_deliver', { type: 'DRIVER', id: actor.userId });
      }
      const cod = input.codCollected !== undefined ? dec(input.codCollected) : partial ? dec(0) : dec(s.codAmount);
      if (s.order.paymentMethod === 'COD' && cod.greaterThan(0)) {
        await tx.shipment.update({ where: { id: s.id }, data: { codCollected: money(cod) } });
        await tx.cashCollection.create({ data: { shipmentId: s.id, driverId: s.driverId as string, supplierOrderId: s.supplierOrderId, amount: money(cod), collectedAt: now } });
        await tx.driver.update({ where: { id: s.driverId as string }, data: { cashBalance: { increment: money(cod) } } });
        await this.payments.recordCod(tx, { orderId: s.orderId, companyId: s.order.companyId, amount: cod, driverUserId: actor.userId });
      }
      await tx.driver.update({ where: { id: s.driverId as string }, data: { deliveriesCount: { increment: 1 } } });
      await this.audit.record(tx, { action: 'shipment.delivered', entityType: 'Shipment', entityId: s.id, meta: { partial, otpVerified } });
    }, { lat: input.lat, lng: input.lng, note: input.notes });
  }

  async fail(actor: Actor, id: string, input: z.output<typeof failDeliverySchema>) {
    const s = actor.contextType === 'DRIVER' ? await this.driverShipment(actor, id) : await this.load(id);
    return this.act(actor, s, 'fail', async (tx) => {
      await tx.shipment.update({ where: { id: s.id }, data: { failureReason: input.reason, failureNote: input.note ?? null } });
      if (s.pickedUpAt) {
        for (const item of s.items) {
          const oi = await tx.orderItem.findUnique({ where: { id: item.orderItemId }, select: { offerId: true } });
          const q = dec(item.qty).toFixed(3);
          if (oi?.offerId) await tx.$executeRaw`UPDATE offers SET "stockQty" = "stockQty" + ${q}::numeric, "reservedQty" = "reservedQty" + ${q}::numeric WHERE id = ${oi.offerId}::uuid AND "stockMode" = 'TRACKED'`;
        }
      }
      const so = await tx.supplierOrder.findUniqueOrThrow({ where: { id: s.supplierOrderId }, select: { status: true } });
      if (so.status === 'OUT_FOR_DELIVERY') await this.lifecycle.transition(tx, s.supplierOrderId, 'delivery_failed', { type: actor.contextType, id: actor.userId }, { reason: input.reason });
    }, { note: input.note ?? input.reason, lat: input.lat, lng: input.lng });
  }

  /* ---------------------------------------------------------------- GPS & presence */

  async setOnline(actor: Actor, isOnline: boolean, lat?: number, lng?: number) {
    await this.prisma.driver.update({ where: { id: actor.contextId as string }, data: { isOnline, lastSeenAt: new Date(), ...(lat !== undefined && lng !== undefined ? { lastLat: lat, lastLng: lng } : {}) } });
    return { isOnline };
  }

  async locations(actor: Actor, input: z.output<typeof driverLocationBatchSchema>): Promise<{ accepted: number }> {
    const driverId = actor.contextId as string;
    const active = await this.prisma.shipment.findMany({ where: { driverId, status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] } }, select: { id: true, supplierId: true, driverId: true, order: { select: { companyId: true } } } });
    const activeIds = new Set(active.map((s) => s.id));
    const fallback = active.find((s) => s.id) ?? null;
    const rows = input.points.map((p) => ({
      driverId,
      shipmentId: p.shipmentId && activeIds.has(p.shipmentId) ? p.shipmentId : (fallback?.id ?? null),
      lat: p.lat,
      lng: p.lng,
      speed: p.speed ?? null,
      heading: p.heading ?? null,
      accuracy: p.accuracy ?? null,
      recordedAt: new Date(p.recordedAt),
    }));
    await this.prisma.shipmentLocation.createMany({ data: rows });
    const last = input.points.reduce((a, b) => (new Date(b.recordedAt) > new Date(a.recordedAt) ? b : a));
    await this.prisma.driver.update({ where: { id: driverId }, data: { lastLat: last.lat, lastLng: last.lng, lastSeenAt: new Date(), isOnline: true } });
    const payload = { driverId, lat: last.lat, lng: last.lng, heading: last.heading ?? null, recordedAt: last.recordedAt };
    for (const s of active) this.realtime.emit(this.rooms(s), 'driver.location', { ...payload, shipmentId: s.id });
    if (!active.length) this.realtime.emit('staff', 'driver.location', payload);
    return { accepted: rows.length };
  }

  /* ---------------------------------------------------------------- lists */

  async list(actor: Actor, q: z.output<typeof shipmentListQuery>) {
    const status = q.status === 'ACTIVE' ? { in: ACTIVE_SHIPMENT } : q.status === 'DONE' ? { in: ['DELIVERED', 'FAILED', 'CANCELLED'] as ShipmentStatus[] } : q.status ? { equals: q.status } : undefined;
    const where: Prisma.ShipmentWhereInput = {
      ...this.scopeFor(actor),
      ...(status ? { status } : {}),
      ...(q.dispatchMode ? { dispatchMode: q.dispatchMode } : {}),
      ...(q.driverId ? { driverId: q.driverId } : {}),
      ...(q.q ? { OR: [{ number: { contains: q.q, mode: 'insensitive' } }, { order: { number: { contains: q.q, mode: 'insensitive' } } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.findMany({ where, include: shipmentListInclude, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    const data = await Promise.all(rows.map((r) => this.present(r, actor.contextType)));
    return { data, meta: pageMeta(q.page, q.pageSize, total) };
  }

  async driverSummary(actor: Actor): Promise<DriverSummaryDto> {
    const driverId = actor.contextId as string;
    const start = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
    start.setHours(0, 0, 0, 0);
    const [driver, assigned, delivered, failed, active] = await Promise.all([
      this.prisma.driver.findUniqueOrThrow({ where: { id: driverId }, include: { user: { select: { name: true, phone: true } }, supplier: { select: { id: true, nameAr: true, nameEn: true } }, vehicle: true, _count: { select: { shipments: { where: { status: { in: ACTIVE_SHIPMENT } } } } } } }),
      this.prisma.shipment.count({ where: { driverId, status: { in: ACTIVE_SHIPMENT } } }),
      this.prisma.shipment.count({ where: { driverId, status: 'DELIVERED', deliveredAt: { gte: start } } }),
      this.prisma.shipment.count({ where: { driverId, status: 'FAILED', failedAt: { gte: start } } }),
      this.prisma.shipment.findFirst({ where: { driverId, status: { in: ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] } }, include: shipmentInclude, orderBy: { pickedUpAt: 'desc' } }),
    ]);
    return {
      driver: {
        id: driver.id,
        userId: driver.userId,
        name: driver.user.name,
        phone: driver.user.phone,
        ownerType: driver.ownerType,
        supplier: driver.supplier ? { id: driver.supplier.id, name: loc(driver.supplier.nameAr, driver.supplier.nameEn) } : null,
        status: driver.status,
        isOnline: driver.isOnline,
        lastLat: driver.lastLat,
        lastLng: driver.lastLng,
        lastSeenAt: driver.lastSeenAt?.toISOString() ?? null,
        vehicle: driver.vehicle ? { id: driver.vehicle.id, plateNumber: driver.vehicle.plateNumber, type: driver.vehicle.type, capacityKg: driver.vehicle.capacityKg, refrigerated: driver.vehicle.refrigerated, isActive: driver.vehicle.isActive } : null,
        deliveriesCount: driver.deliveriesCount,
        ratingAvg: dec(driver.ratingAvg).toFixed(1),
        cashBalance: money(driver.cashBalance),
        activeShipments: driver._count.shipments,
        nationalId: driver.nationalId,
        licenseNumber: driver.licenseNumber,
      },
      today: { assigned, delivered, failed },
      cashToHandOver: money(driver.cashBalance),
      activeShipment: active ? await this.present(active, 'DRIVER') : null,
    };
  }
}
