import { z } from 'zod';
import { type CityRef, type ImageRef, isoDate, money, type Money, paginationQuery, quantity, type Qty, uuid } from '../common.js';
import {
  type ActorType,
  DeliveryWindow,
  type DeliveryWindow as DeliveryWindowT,
  type DocumentType,
  type InvoiceStatus,
  type OrderSource,
  type OrderStatus,
  PaymentMethod,
  type PaymentMethod as PaymentMethodT,
  PaymentPurpose,
  type PaymentPurpose as PaymentPurposeT,
  type PaymentProvider,
  type PaymentRecordStatus,
  type PaymentStatus,
  type PriceSource,
  type ShipmentStatus,
  type StorageType,
  type SupplierOrderStatus,
  SupplierOrderStatus as SupplierOrderStatusE,
  OrderStatus as OrderStatusE,
} from '../enums.js';
import type { ErrorCode } from '../errors.js';
import type { AddressDto } from './organizations.js';
import type { BankAccountDto } from './settings.js';
import type { StockStatus, SupplierMiniDto, UnitDto } from './catalog.js';

/* ---------------------------------------------------------------- cart */

export const addCartItemSchema = z.object({ offerId: uuid, qty: quantity });
export const updateCartItemSchema = z.object({ qty: quantity });
export const applyCouponSchema = z.object({ code: z.string().trim().min(3).max(30) });
export const cartQuery = z.object({ addressId: uuid.optional(), city: z.string().optional() });

export interface CartIssueDto {
  code: ErrorCode;
  message: string;
  params?: Record<string, string | number>;
}

export interface CartLineDto {
  id: string;
  offerId: string;
  product: { id: string; slug: string; name: string; image: ImageRef | null };
  unit: UnitDto;
  qty: Qty;
  unitPrice: Money;
  listUnitPrice: Money;
  priceSource: Exclude<PriceSource, 'QUOTE'>;
  nextTier: { minQty: Qty; price: Money } | null;
  lineSubtotal: Money;
  discount: Money;
  vatAmount: Money;
  lineTotal: Money;
  minOrderQty: Qty;
  qtyStep: Qty;
  maxOrderQty: Qty | null;
  stockStatus: StockStatus;
  availableQty: Qty | null;
  issues: CartIssueDto[];
}

export interface CartTotalsDto {
  subtotal: Money;
  discountTotal: Money;
  deliveryTotal: Money;
  vatTotal: Money;
  grandTotal: Money;
  savings: Money;
}

export interface CartGroupDto {
  supplier: SupplierMiniDto;
  items: CartLineDto[];
  subtotal: Money;
  discountTotal: Money;
  deliveryFee: Money;
  freeDeliveryThreshold: Money | null;
  amountToFreeDelivery: Money | null;
  minOrderValue: Money;
  amountToMinOrder: Money;
  vatTotal: Money;
  total: Money;
  leadTimeDays: number;
  sameDayAvailable: boolean;
  earliestDeliveryDate: string | null;
  storageType: StorageType;
  covered: boolean;
  issues: CartIssueDto[];
}

export interface CartDto {
  id: string;
  itemsCount: number;
  groups: CartGroupDto[];
  coupon: { code: string; description: string | null; discount: Money; freeDelivery: boolean } | null;
  totals: CartTotalsDto;
  issues: CartIssueDto[];
  canCheckout: boolean;
  city: CityRef | null;
}

/* ---------------------------------------------------------------- checkout */

export interface PaymentMethodOption {
  method: PaymentMethodT;
  available: boolean;
  reason: string | null;
  credit?: { available: Money; limit: Money; termsDays: number; status: string };
  bankAccounts?: BankAccountDto[];
}

export interface DeliverySlotDto {
  date: string;
  windows: DeliveryWindowT[];
}

export interface CheckoutOptionsDto {
  addresses: AddressDto[];
  selectedAddressId: string | null;
  paymentMethods: PaymentMethodOption[];
  deliverySlots: { supplierId: string; supplierName: string; slots: DeliverySlotDto[] }[];
  cart: CartDto;
  companyVerified: boolean;
}

export const placeOrderSchema = z.object({
  addressId: uuid,
  paymentMethod: z.enum(PaymentMethod),
  deliveries: z.array(z.object({ supplierId: uuid, date: isoDate, window: z.enum(DeliveryWindow) })).min(1),
  notes: z.string().trim().max(500).optional(),
  expectedTotal: money,
  returnUrl: z.url().optional(),
});
export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export interface PlaceOrderResult {
  order: OrderSummaryDto;
  payment: { method: PaymentMethodT; status: PaymentStatus; amount: Money; checkoutUrl: string | null; bankAccounts: BankAccountDto[] | null };
}

/* ---------------------------------------------------------------- orders */

export const buyerOrderQuery = paginationQuery.extend({
  status: z.union([z.enum(OrderStatusE), z.enum(['ACTIVE', 'PAST'])]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export const supplierOrderQuery = paginationQuery.extend({
  status: z.union([z.enum(SupplierOrderStatusE), z.enum(['NEW', 'IN_PROGRESS', 'SHIPPING', 'DONE', 'CLOSED'])]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export const cancelOrderSchema = z.object({ reason: z.string().trim().min(3).max(300) });
export const rejectSupplierOrderSchema = z.object({ reason: z.string().trim().min(3).max(300) });
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  qualityRating: z.number().int().min(1).max(5).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(1000).optional(),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export interface AddressSnapshot {
  label: string;
  recipientName: string;
  recipientPhone: string;
  city: string;
  cityId: string;
  district: string;
  street: string | null;
  buildingNumber: string | null;
  postalCode: string | null;
  shortAddress: string | null;
  lat: number;
  lng: number;
  notes: string | null;
  formatted: string;
}

export interface OrderItemDto {
  id: string;
  productId: string | null;
  productSlug: string | null;
  name: string;
  unitName: string;
  image: string | null;
  sku: string | null;
  qty: Qty;
  unitPrice: Money;
  listUnitPrice: Money;
  priceSource: PriceSource;
  discount: Money;
  vatRate: string;
  vatAmount: Money;
  lineSubtotal: Money;
  lineTotal: Money;
  deliveredQty: Qty;
}

export interface TimelineEventDto {
  id: string;
  type: string;
  title: string;
  note: string | null;
  actorType: ActorType;
  supplierOrderId: string | null;
  createdAt: string;
}

export interface ShipmentSummaryDto {
  id: string;
  number: string;
  status: ShipmentStatus;
  dispatchMode: string;
  driver: { id: string; name: string; phone: string | null; vehicle: { plateNumber: string; type: string } | null } | null;
  scheduledDate: string | null;
  window: DeliveryWindowT | null;
  etaAt: string | null;
  codAmount: Money;
  deliveredAt: string | null;
  lastLocation: { lat: number; lng: number; recordedAt: string } | null;
  trackable: boolean;
}

export interface SupplierOrderDto {
  id: string;
  number: string;
  status: SupplierOrderStatus;
  supplier: SupplierMiniDto & { phone: string | null };
  items: OrderItemDto[];
  subtotal: Money;
  discountTotal: Money;
  deliveryFee: Money;
  vatTotal: Money;
  total: Money;
  deliveryDate: string | null;
  deliveryWindow: DeliveryWindowT | null;
  storageType: StorageType;
  shipments: ShipmentSummaryDto[];
  invoice: { id: string; number: string; status: InvoiceStatus; total: Money; balanceDue: Money; dueDate: string | null } | null;
  review: { rating: number; comment: string | null } | null;
  progress: { step: number; steps: SupplierOrderStatus[] };
  allowedActions: string[];
  acceptedAt: string | null;
  deliveredAt: string | null;
  rejectReason: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface OrderSummaryDto {
  id: string;
  number: string;
  status: OrderStatus;
  source: OrderSource;
  paymentMethod: PaymentMethodT;
  paymentStatus: PaymentStatus;
  grandTotal: Money;
  itemsCount: number;
  suppliers: { id: string; name: string; logoUrl: string | null; status: SupplierOrderStatus }[];
  thumbnails: string[];
  placedAt: string | null;
  createdAt: string;
}

export interface DocumentDto {
  id: string;
  type: DocumentType;
  number: string | null;
  title: string;
  url: string;
  createdAt: string;
}

export interface OrderDetailDto extends OrderSummaryDto {
  address: AddressSnapshot;
  subtotal: Money;
  discountTotal: Money;
  deliveryTotal: Money;
  vatTotal: Money;
  amountPaid: Money;
  couponCode: string | null;
  notes: string | null;
  supplierOrders: SupplierOrderDto[];
  timeline: TimelineEventDto[];
  payments: PaymentDto[];
  documents: DocumentDto[];
  allowedActions: string[];
  company: { id: string; name: string };
  cancelReason: string | null;
}

export interface SupplierOrderListItemDto {
  id: string;
  number: string;
  orderNumber: string;
  status: SupplierOrderStatus;
  buyer: { id: string; name: string; businessType: string; city: string | null };
  total: Money;
  itemsCount: number;
  deliveryDate: string | null;
  deliveryWindow: DeliveryWindowT | null;
  paymentMethod: PaymentMethodT;
  storageType: StorageType;
  acceptDeadlineAt: string | null;
  createdAt: string;
}

export interface SupplierOrderDetailDto extends SupplierOrderDto {
  order: { id: string; number: string; paymentMethod: PaymentMethodT; paymentStatus: PaymentStatus; placedAt: string | null };
  buyer: { id: string; name: string; businessType: string; phone: string | null; verificationStatus: string };
  address: AddressSnapshot;
  timeline: TimelineEventDto[];
  commissionRate: string;
  commissionAmount: Money;
  netAmount: Money;
  acceptDeadlineAt: string | null;
  documents: DocumentDto[];
}

/* ---------------------------------------------------------------- payments */

export interface PaymentDto {
  id: string;
  number: string;
  purpose: PaymentPurposeT;
  method: PaymentMethodT;
  provider: PaymentProvider;
  amount: Money;
  status: PaymentRecordStatus;
  bankReference: string | null;
  transferDate: string | null;
  proofUrl: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  createdAt: string;
  orderNumber: string | null;
  company?: { id: string; name: string };
}

export const bankTransferSchema = z.object({
  purpose: z.enum(PaymentPurpose).default('ORDER'),
  orderId: uuid.optional(),
  invoiceIds: z.array(uuid).max(50).optional(),
  amount: money,
  bankReference: z.string().trim().min(3).max(60),
  transferDate: isoDate,
  proofFileId: uuid,
});
export type BankTransferInput = z.input<typeof bankTransferSchema>;

export const cardPaymentSchema = z.object({
  purpose: z.enum(PaymentPurpose).default('ORDER'),
  orderId: uuid.optional(),
  invoiceIds: z.array(uuid).max(50).optional(),
  amount: money.optional(),
  returnUrl: z.url(),
  source: z.enum(['src_all', 'src_card', 'src_sa.mada', 'src_apple_pay']).default('src_all'),
});
export type CardPaymentInput = z.input<typeof cardPaymentSchema>;

export interface CardPaymentInitResult {
  paymentId: string;
  checkoutUrl: string;
  amount: Money;
}

export interface PaymentVerifyResult {
  paymentId: string;
  status: PaymentRecordStatus;
  amount: Money;
  orderId: string | null;
  orderNumber: string | null;
  message: string;
}

export const paymentDecisionSchema = z.object({
  decision: z.enum(['CONFIRM', 'REJECT']),
  reason: z.string().trim().max(300).optional(),
});
export const adminPaymentQuery = paginationQuery.extend({
  status: z.enum(['INITIATED', 'PENDING_VERIFICATION', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED']).optional(),
  method: z.enum(PaymentMethod).optional(),
});

/* ---------------------------------------------------------------- credit & invoices */

export interface InvoiceSummaryDto {
  id: string;
  number: string;
  supplier: { id: string; name: string };
  company: { id: string; name: string };
  orderId: string;
  orderNumber: string;
  supplierOrderNumber: string;
  issueDate: string;
  dueDate: string | null;
  paymentMethod: PaymentMethodT;
  total: Money;
  vatTotal: Money;
  amountPaid: Money;
  balanceDue: Money;
  status: InvoiceStatus;
  isOverdue: boolean;
  daysOverdue: number;
}

export interface PartySnapshot {
  name: string;
  vatNumber: string | null;
  crNumber: string | null;
  address: string | null;
  phone: string | null;
}

export interface InvoiceLineDto {
  description: string;
  qty: Qty;
  unitPrice: Money;
  vatRate: string;
  vatAmount: Money;
  lineTotal: Money;
}

export interface InvoiceDetailDto extends InvoiceSummaryDto {
  seller: PartySnapshot;
  buyer: PartySnapshot;
  lines: InvoiceLineDto[];
  subtotal: Money;
  discountTotal: Money;
  deliveryFee: Money;
  zatcaQr: string;
  pdfUrl: string | null;
  supplyDate: string;
}

export const invoiceQuery = paginationQuery.extend({
  status: z.enum(['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'OPEN']).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export interface CreditOverviewDto {
  status: string;
  creditLimit: Money;
  usedAmount: Money;
  availableAmount: Money;
  termsDays: number;
  dueSoonAmount: Money;
  overdueAmount: Money;
  nextDueDate: string | null;
  openInvoices: InvoiceSummaryDto[];
  pendingApplication: CreditApplicationDto | null;
  canApply: boolean;
  frozenReason: string | null;
}

export interface CreditLedgerEntryDto {
  id: string;
  type: string;
  amount: Money;
  balanceAfter: Money;
  reference: string | null;
  note: string | null;
  createdAt: string;
}

export const creditApplicationSchema = z.object({
  requestedLimit: money,
  requestedTermsDays: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).default(30),
  monthlyPurchases: money.optional(),
  yearsInBusiness: z.number().int().min(0).max(100).optional(),
  documentFileIds: z.array(uuid).max(10).default([]),
  notes: z.string().trim().max(1000).optional(),
});
export type CreditApplicationInput = z.input<typeof creditApplicationSchema>;

export interface CreditApplicationDto {
  id: string;
  requestedLimit: Money;
  requestedTermsDays: number;
  monthlyPurchases: Money | null;
  yearsInBusiness: number | null;
  status: string;
  approvedLimit: Money | null;
  approvedTermsDays: number | null;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  company?: { id: string; name: string };
}

export const creditDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  approvedLimit: money.optional(),
  approvedTermsDays: z.number().int().min(7).max(120).optional(),
  note: z.string().trim().max(500).optional(),
});
export const creditAdjustSchema = z.object({
  creditLimit: money.optional(),
  termsDays: z.number().int().min(7).max(120).optional(),
  status: z.enum(['ACTIVE', 'FROZEN', 'SUSPENDED']).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  reason: z.string().trim().min(3).max(300),
});
