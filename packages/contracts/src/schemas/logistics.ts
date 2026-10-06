import { z } from 'zod';
import { isoDate, money, type Money, paginationQuery, type Qty, quantity, saudiPhone, uuid } from '../common.js';
import {
  DeliveryWindow,
  type DeliveryWindow as DeliveryWindowT,
  DispatchMode,
  type DispatchMode as DispatchModeT,
  type DriverStatus,
  type FleetOwner,
  type ShipmentStatus,
  ShipmentStatus as ShipmentStatusE,
  VehicleType,
  type VehicleType as VehicleTypeT,
} from '../enums.js';
import type { AddressSnapshot } from './commerce.js';

export interface VehicleDto {
  id: string;
  plateNumber: string;
  type: VehicleTypeT;
  capacityKg: number;
  refrigerated: boolean;
  isActive: boolean;
}

export interface DriverDto {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  ownerType: FleetOwner;
  supplier: { id: string; name: string } | null;
  status: DriverStatus;
  isOnline: boolean;
  lastLat: number | null;
  lastLng: number | null;
  lastSeenAt: string | null;
  vehicle: VehicleDto | null;
  deliveriesCount: number;
  ratingAvg: string;
  cashBalance: Money;
  activeShipments: number;
  nationalId: string | null;
  licenseNumber: string | null;
}

export const driverInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: saudiPhone,
  nationalId: z.string().trim().max(20).optional(),
  licenseNumber: z.string().trim().max(30).optional(),
  licenseExpiry: isoDate.optional(),
  vehicleId: uuid.nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});
export const vehicleInputSchema = z.object({
  plateNumber: z.string().trim().min(3).max(20),
  type: z.enum(VehicleType),
  capacityKg: z.number().int().min(100).max(60000),
  refrigerated: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createShipmentSchema = z.object({
  dispatchMode: z.enum(DispatchMode).default('SUPPLIER_FLEET'),
  driverId: uuid.optional(),
  vehicleId: uuid.optional(),
  warehouseId: uuid.optional(),
  items: z.array(z.object({ orderItemId: uuid, qty: quantity })).optional(),
  scheduledDate: isoDate.optional(),
  window: z.enum(DeliveryWindow).optional(),
});
export const assignShipmentSchema = z.object({ driverId: uuid, vehicleId: uuid.optional() });

export interface ShipmentEventDto {
  id: string;
  status: ShipmentStatus;
  note: string | null;
  lat: number | null;
  lng: number | null;
  actorType: string;
  createdAt: string;
}

export interface PodDto {
  receiverName: string;
  receiverPhone: string | null;
  otpVerified: boolean;
  signatureUrl: string | null;
  photoUrls: string[];
  lat: number | null;
  lng: number | null;
  notes: string | null;
  deliveredAt: string;
}

export interface ShipmentDetailDto {
  id: string;
  number: string;
  status: ShipmentStatus;
  dispatchMode: DispatchModeT;
  supplierOrder: { id: string; number: string; status: string; orderNumber: string };
  supplier: { id: string; name: string; phone: string | null };
  buyer: { name: string; phone: string | null };
  driver: { id: string; name: string; phone: string | null; vehicle: { plateNumber: string; type: string } | null } | null;
  pickup: { name: string; address: string; lat: number; lng: number; phone: string | null };
  dropoff: AddressSnapshot;
  items: { orderItemId: string; name: string; unitName: string; image: string | null; qty: Qty; deliveredQty: Qty | null }[];
  scheduledDate: string | null;
  window: DeliveryWindowT | null;
  etaAt: string | null;
  distanceKm: string | null;
  codAmount: Money;
  codCollected: Money;
  storageType: string;
  events: ShipmentEventDto[];
  route: { lat: number; lng: number; recordedAt: string }[];
  lastLocation: { lat: number; lng: number; recordedAt: string } | null;
  pod: PodDto | null;
  allowedActions: string[];
  createdAt: string;
  deliveredAt: string | null;
  failureReason: string | null;
}

export const shipmentListQuery = paginationQuery.extend({
  status: z.union([z.enum(ShipmentStatusE), z.enum(['ACTIVE', 'DONE'])]).optional(),
  dispatchMode: z.enum(DispatchMode).optional(),
  driverId: uuid.optional(),
});

export const driverStatusSchema = z.object({
  isOnline: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export const driverLocationBatchSchema = z.object({
  points: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        speed: z.number().nullable().optional(),
        heading: z.number().nullable().optional(),
        accuracy: z.number().nullable().optional(),
        recordedAt: z.iso.datetime({ offset: true }),
        shipmentId: uuid.optional(),
      }),
    )
    .min(1)
    .max(200),
});
export const pickupSchema = z.object({ photoFileIds: z.array(uuid).max(6).default([]), note: z.string().max(300).optional() });
export const geoPointSchema = z.object({ lat: z.number().optional(), lng: z.number().optional() });
export const deliverSchema = z.object({
  receiverName: z.string().trim().min(2).max(80),
  receiverPhone: saudiPhone.optional(),
  otp: z.string().regex(/^\d{4,6}$/).optional(),
  signatureFileId: uuid.optional(),
  photoFileIds: z.array(uuid).max(6).default([]),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(z.object({ orderItemId: uuid, deliveredQty: z.union([z.string(), z.number()]).transform(String) })).optional(),
  codCollected: money.optional(),
});
export type DeliverInput = z.input<typeof deliverSchema>;
export const failDeliverySchema = z.object({
  reason: z.enum(['CUSTOMER_UNAVAILABLE', 'ADDRESS_NOT_FOUND', 'REFUSED', 'DAMAGED', 'VEHICLE_ISSUE', 'OTHER']),
  note: z.string().max(500).optional(),
  photoFileIds: z.array(uuid).max(6).default([]),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export interface DriverSummaryDto {
  driver: DriverDto;
  today: { assigned: number; delivered: number; failed: number };
  cashToHandOver: Money;
  activeShipment: ShipmentDetailDto | null;
}

export interface CashCollectionDto {
  id: string;
  shipmentNumber: string;
  orderNumber: string;
  amount: Money;
  status: string;
  collectedAt: string;
  handedOverAt: string | null;
}

export interface WsTicketDto {
  ticket: string;
  url: string;
  expiresAt: string;
}
