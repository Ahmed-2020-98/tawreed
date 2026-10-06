import { z } from 'zod';
import { type Money, paginationQuery } from '../common.js';
import { StaffRole } from '../enums.js';
import type { ProductCardDto } from './catalog.js';
import type { OrderSummaryDto, SupplierOrderListItemDto } from './commerce.js';

export interface SeriesPoint {
  date: string;
  value: Money;
  count?: number;
}

export interface BuyerDashboardDto {
  activeOrders: number;
  pendingPaymentOrders: number;
  openRfqs: number;
  quotesAwaiting: number;
  credit: { status: string; limit: Money; used: Money; available: Money; termsDays: number } | null;
  dueAmount: Money;
  overdueAmount: Money;
  monthSpend: Money;
  monthSavings: Money;
  spendSeries: SeriesPoint[];
  recentOrders: OrderSummaryDto[];
  buyAgain: ProductCardDto[];
  verificationStatus: string;
  unreadNotifications: number;
}

export interface SupplierDashboardDto {
  today: { orders: number; sales: Money };
  month: { orders: number; sales: Money; commission: Money };
  pendingAcceptance: number;
  inPreparation: number;
  readyForDispatch: number;
  outForDelivery: number;
  openRfqs: number;
  lowStockOffers: number;
  activeOffers: number;
  ratingAvg: string;
  ratingCount: number;
  acceptanceRate: string;
  salesSeries: SeriesPoint[];
  topProducts: { name: string; qty: string; total: Money }[];
  recentOrders: SupplierOrderListItemDto[];
  pendingPayout: Money;
  cashWithDrivers: Money;
  onboarding: Record<string, boolean>;
}

export interface AdminDashboardDto {
  kpis: {
    gmvToday: Money;
    gmvMonth: Money;
    ordersToday: number;
    ordersMonth: number;
    aov: Money;
    activeBuyers: number;
    newBuyersMonth: number;
    activeSuppliers: number;
    creditExposure: Money;
    overdueAmount: Money;
    commissionMonth: Money;
  };
  queues: { kyb: number; payments: number; creditApplications: number; supplierApplications: number; productReviews: number; deals: number; dispatch: number; disputes: number };
  gmvSeries: SeriesPoint[];
  ordersByStatus: { status: string; count: number }[];
  topCategories: { name: string; total: Money }[];
  topSuppliers: { name: string; total: Money; orders: number }[];
  topCities: { name: string; total: Money; orders: number }[];
  paymentMix: { method: string; total: Money; count: number }[];
  agingBuckets: { bucket: string; amount: Money }[];
}

export const staffInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  phone: z.string().optional(),
  password: z.string().min(8).max(100).optional(),
  staffRoles: z.array(z.enum(StaffRole)).min(1),
  jobTitle: z.string().max(80).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
});
export const auditQuery = paginationQuery.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.uuid().optional(),
  action: z.string().optional(),
});
export const favoriteSchema = z.object({ productId: z.uuid() });
