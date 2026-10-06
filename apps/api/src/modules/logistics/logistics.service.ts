import { Injectable } from '@nestjs/common';
import { type CashCollectionDto, type DriverDto, driverInputSchema, ErrorCode, type VehicleDto, vehicleInputSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import { AppError } from '../../common/http/app-error.js';
import { loc } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SmsService } from '../../infrastructure/sms/sms.service.js';
import { findOrCreateInvitee } from '../buyers/members.helper.js';
import { dec, money } from '../pricing/domain/money.js';
import { ACTIVE_SHIPMENT } from '../shipments/domain/shipment.machine.js';

/** Fleet scope: a supplier id (own fleet) or null for the Tawreed platform fleet. */
export type FleetScope = { supplierId: string } | { platform: true };

const driverInclude = {
  user: { select: { name: true, phone: true } },
  supplier: { select: { id: true, nameAr: true, nameEn: true } },
  vehicle: true,
  _count: { select: { shipments: { where: { status: { in: ACTIVE_SHIPMENT } } } } },
} satisfies Prisma.DriverInclude;
type DriverRow = Prisma.DriverGetPayload<{ include: typeof driverInclude }>;

const scopeWhere = (s: FleetScope) => ('supplierId' in s ? { ownerType: 'SUPPLIER' as const, supplierId: s.supplierId } : { ownerType: 'PLATFORM' as const });

@Injectable()
export class LogisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sms: SmsService,
  ) {}

  vehicleDto(v: Prisma.VehicleGetPayload<object>): VehicleDto {
    return { id: v.id, plateNumber: v.plateNumber, type: v.type, capacityKg: v.capacityKg, refrigerated: v.refrigerated, isActive: v.isActive };
  }

  driverDto(d: DriverRow): DriverDto {
    return {
      id: d.id,
      userId: d.userId,
      name: d.user.name,
      phone: d.user.phone,
      ownerType: d.ownerType,
      supplier: d.supplier ? { id: d.supplier.id, name: loc(d.supplier.nameAr, d.supplier.nameEn) } : null,
      status: d.status,
      isOnline: d.isOnline,
      lastLat: d.lastLat,
      lastLng: d.lastLng,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      vehicle: d.vehicle ? this.vehicleDto(d.vehicle) : null,
      deliveriesCount: d.deliveriesCount,
      ratingAvg: dec(d.ratingAvg).toFixed(1),
      cashBalance: money(d.cashBalance),
      activeShipments: d._count.shipments,
      nationalId: d.nationalId,
      licenseNumber: d.licenseNumber,
    };
  }

  async drivers(scope: FleetScope | null, opts: { onlineOnly?: boolean } = {}): Promise<DriverDto[]> {
    const rows = await this.prisma.driver.findMany({
      where: { ...(scope ? scopeWhere(scope) : {}), ...(opts.onlineOnly ? { isOnline: true, status: 'ACTIVE' } : {}) },
      include: driverInclude,
      orderBy: [{ isOnline: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((d) => this.driverDto(d));
  }

  async driver(scope: FleetScope | null, id: string): Promise<DriverDto> {
    const d = await this.prisma.driver.findFirst({ where: { id, ...(scope ? scopeWhere(scope) : {}) }, include: driverInclude });
    if (!d) throw AppError.notFound();
    return this.driverDto(d);
  }

  async saveDriver(scope: FleetScope, input: z.output<typeof driverInputSchema>, id?: string): Promise<DriverDto> {
    if (input.vehicleId) {
      const v = await this.prisma.vehicle.findFirst({ where: { id: input.vehicleId, ...scopeWhere(scope) } });
      if (!v) throw AppError.notFound();
    }
    const driverId = await this.prisma.tx(async (tx) => {
      const data = {
        nationalId: input.nationalId ?? null,
        licenseNumber: input.licenseNumber ?? null,
        licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : null,
        vehicleId: input.vehicleId ?? null,
        ...(input.status ? { status: input.status } : {}),
      };
      if (id) {
        const d = await tx.driver.findFirst({ where: { id, ...scopeWhere(scope) } });
        if (!d) throw AppError.notFound();
        await tx.driver.update({ where: { id }, data });
        await tx.user.update({ where: { id: d.userId }, data: { name: input.name } });
        return id;
      }
      const user = await findOrCreateInvitee(tx, { name: input.name, phone: input.phone, type: 'DRIVER' });
      if (await tx.driver.findUnique({ where: { userId: user.id } })) throw AppError.conflict(ErrorCode.PHONE_ALREADY_REGISTERED);
      const d = await tx.driver.create({ data: { ...data, userId: user.id, ...('supplierId' in scope ? { ownerType: 'SUPPLIER', supplierId: scope.supplierId } : { ownerType: 'PLATFORM' }) } });
      await this.audit.record(tx, { action: 'driver.created', entityType: 'Driver', entityId: d.id, after: { phone: input.phone } });
      return d.id;
    });
    if (!id) await this.sms.send(input.phone, 'تمت إضافتك كسائق في توريد. حمّل تطبيق سائق توريد وسجّل الدخول برقم جوالك.');
    return this.driver(scope, driverId);
  }

  async vehicles(scope: FleetScope | null): Promise<VehicleDto[]> {
    const rows = await this.prisma.vehicle.findMany({ where: scope ? scopeWhere(scope) : {}, orderBy: { createdAt: 'asc' } });
    return rows.map((v) => this.vehicleDto(v));
  }

  async saveVehicle(scope: FleetScope, input: z.output<typeof vehicleInputSchema>, id?: string): Promise<VehicleDto> {
    const data = { plateNumber: input.plateNumber.toUpperCase(), type: input.type, capacityKg: input.capacityKg, refrigerated: input.refrigerated, isActive: input.isActive };
    if (id) {
      const v = await this.prisma.vehicle.findFirst({ where: { id, ...scopeWhere(scope) } });
      if (!v) throw AppError.notFound();
      return this.vehicleDto(await this.prisma.vehicle.update({ where: { id }, data }));
    }
    const v = await this.prisma.vehicle.create({ data: { ...data, ...('supplierId' in scope ? { ownerType: 'SUPPLIER', supplierId: scope.supplierId } : { ownerType: 'PLATFORM' }) } });
    return this.vehicleDto(v);
  }

  async cashCollections(where: Prisma.CashCollectionWhereInput): Promise<CashCollectionDto[]> {
    const rows = await this.prisma.cashCollection.findMany({ where, include: { shipment: { select: { number: true, order: { select: { number: true } } } } }, orderBy: { collectedAt: 'desc' }, take: 200 });
    return rows.map((c) => ({
      id: c.id,
      shipmentNumber: c.shipment.number,
      orderNumber: c.shipment.order.number,
      amount: money(c.amount),
      status: c.status,
      collectedAt: c.collectedAt.toISOString(),
      handedOverAt: c.handedOverAt?.toISOString() ?? null,
    }));
  }

  /** Supplier/staff confirms receiving cash from a driver. */
  async confirmHandover(scope: FleetScope | null, collectionIds: string[], actorId: string): Promise<{ confirmed: number }> {
    const rows = await this.prisma.cashCollection.findMany({ where: { id: { in: collectionIds }, status: 'COLLECTED', ...(scope ? { driver: scopeWhere(scope) } : {}) } });
    await this.prisma.tx(async (tx) => {
      for (const c of rows) {
        await tx.cashCollection.update({ where: { id: c.id }, data: { status: scope ? 'HANDED_OVER' : 'RECONCILED', handedOverAt: new Date(), ...(scope ? {} : { reconciledById: actorId, reconciledAt: new Date() }) } });
        await tx.$executeRaw`UPDATE drivers SET "cashBalance" = GREATEST("cashBalance" - ${c.amount}::numeric, 0) WHERE id = ${c.driverId}::uuid`;
      }
      await this.audit.record(tx, { action: 'cash.handover_confirmed', entityType: 'CashCollection', meta: { count: rows.length } });
    });
    return { confirmed: rows.length };
  }
}
