import { z } from 'zod';
import { type CityRef, isoDate, money, type Money, paginationQuery, type Qty, quantity, uuid } from '../common.js';
import {
  DeliveryWindow,
  type InvitationStatus,
  PaymentMethod,
  type PaymentMethod as PaymentMethodT,
  PaymentPreference,
  type PaymentPreference as PaymentPreferenceT,
  type QuotationStatus,
  type QuotationVersionStatus,
  RfqStatus,
  type RfqStatus as RfqStatusT,
  RfqVisibility,
  type RfqVisibility as RfqVisibilityT,
  StorageType,
  type StorageType as StorageTypeT,
} from '../enums.js';
import type { SupplierMiniDto } from './catalog.js';
import type { PlaceOrderResult } from './commerce.js';

export const rfqItemInputSchema = z.object({
  productId: uuid.optional(),
  productUnitId: uuid.optional(),
  name: z.string().trim().min(2).max(160),
  specs: z.string().trim().max(500).optional(),
  qty: quantity,
  unitLabelAr: z.string().trim().min(1).max(30),
  unitLabelEn: z.string().trim().min(1).max(30),
  targetUnitPrice: money.optional(),
});

export const createRfqSchema = z.object({
  title: z.string().trim().min(3).max(120),
  cityId: uuid,
  addressId: uuid.optional(),
  neededBy: isoDate.optional(),
  paymentPreference: z.enum(PaymentPreference).default('ANY'),
  storageType: z.enum(StorageType).optional(),
  notes: z.string().trim().max(2000).optional(),
  attachmentFileIds: z.array(uuid).max(10).default([]),
  visibility: z.enum(RfqVisibility).default('OPEN'),
  supplierIds: z.array(uuid).max(20).default([]),
  items: z.array(rfqItemInputSchema).min(1).max(50),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});
export type CreateRfqInput = z.input<typeof createRfqSchema>;

export const rfqListQuery = paginationQuery.extend({ status: z.enum(RfqStatus).optional() });
export const supplierRfqQuery = paginationQuery.extend({ status: z.enum(['NEW', 'QUOTED', 'CLOSED']).optional() });

export interface RfqItemDto {
  id: string;
  productId: string | null;
  productSlug: string | null;
  image: string | null;
  name: string;
  specs: string | null;
  qty: Qty;
  unitLabel: string;
  targetUnitPrice: Money | null;
}

export interface QuotationItemDto {
  id: string;
  rfqItemId: string;
  offerId: string | null;
  description: string;
  qty: Qty;
  unitPrice: Money;
  vatRate: string;
  lineTotal: Money;
  notes: string | null;
}

export interface QuotationVersionDto {
  id: string;
  version: number;
  subtotal: Money;
  deliveryFee: Money;
  vatTotal: Money;
  total: Money;
  validUntil: string;
  leadTimeDays: number;
  paymentMethods: PaymentMethodT[];
  notes: string | null;
  changeSummary: string | null;
  status: QuotationVersionStatus;
  items: QuotationItemDto[];
  createdAt: string;
}

export interface QuotationSummaryDto {
  id: string;
  number: string;
  supplier: SupplierMiniDto;
  status: QuotationStatus;
  current: QuotationVersionDto;
  versionsCount: number;
  unreadMessages: number;
  isLowest: boolean;
  isFastest: boolean;
}

export interface QuotationMessageDto {
  id: string;
  senderType: string;
  senderName: string;
  body: string;
  mine: boolean;
  createdAt: string;
}

export interface RfqSummaryDto {
  id: string;
  number: string;
  title: string;
  status: RfqStatusT;
  city: CityRef;
  neededBy: string | null;
  itemsCount: number;
  quotesCount: number;
  bestQuoteTotal: Money | null;
  expiresAt: string | null;
  createdAt: string;
  company?: { id: string; name: string };
}

export interface RfqDetailDto extends RfqSummaryDto {
  items: RfqItemDto[];
  paymentPreference: PaymentPreferenceT;
  storageType: StorageTypeT | null;
  notes: string | null;
  attachments: { id: string; name: string | null; url: string }[];
  visibility: RfqVisibilityT;
  invitationsCount: number;
  quotations: QuotationSummaryDto[];
  allowedActions: string[];
}

export interface QuotationDetailDto extends QuotationSummaryDto {
  rfq: RfqDetailDto;
  versions: QuotationVersionDto[];
  messages: QuotationMessageDto[];
  allowedActions: string[];
}

export interface SupplierRfqInboxItemDto {
  rfqId: string;
  number: string;
  title: string;
  buyer: { name: string; businessType: string; verified: boolean };
  city: CityRef;
  itemsCount: number;
  neededBy: string | null;
  expiresAt: string | null;
  invitationStatus: InvitationStatus;
  myQuotation: { id: string; status: QuotationStatus; total: Money; version: number } | null;
  competitorsCount: number;
  createdAt: string;
}

export const submitQuotationSchema = z.object({
  items: z
    .array(
      z.object({
        rfqItemId: uuid,
        unitPrice: money,
        qty: quantity.optional(),
        offerId: uuid.optional(),
        notes: z.string().max(300).optional(),
      }),
    )
    .min(1),
  deliveryFee: money.default('0'),
  validUntil: isoDate,
  leadTimeDays: z.number().int().min(0).max(90),
  paymentMethods: z.array(z.enum(PaymentMethod)).min(1),
  notes: z.string().trim().max(2000).optional(),
  changeSummary: z.string().trim().max(500).optional(),
});
export type SubmitQuotationInput = z.input<typeof submitQuotationSchema>;

export const declineRfqSchema = z.object({ reason: z.string().trim().min(3).max(300) });
export const quotationMessageSchema = z.object({ body: z.string().trim().min(1).max(2000), fileIds: z.array(uuid).max(5).default([]) });
export const requestRevisionSchema = z.object({ message: z.string().trim().min(3).max(1000) });
export const acceptQuotationSchema = z.object({
  versionId: uuid,
  otp: z.string().regex(/^\d{4,6}$/),
  paymentMethod: z.enum(PaymentMethod),
  addressId: uuid,
  deliveryDate: isoDate.optional(),
  deliveryWindow: z.enum(DeliveryWindow).optional(),
  termsAccepted: z.literal(true),
  returnUrl: z.url().optional(),
});
export type AcceptQuotationInput = z.input<typeof acceptQuotationSchema>;

export interface AcceptQuotationResult extends PlaceOrderResult {
  approvalId: string;
}
