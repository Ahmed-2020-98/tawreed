import type { BuyerRole, StaffRole, SupplierRole } from './enums.js';

export const BuyerPermission = [
  'buyer.catalog.view',
  'buyer.cart.manage',
  'buyer.orders.place',
  'buyer.orders.view',
  'buyer.orders.cancel',
  'buyer.rfq.manage',
  'buyer.quotations.accept',
  'buyer.invoices.view',
  'buyer.payments.manage',
  'buyer.credit.view',
  'buyer.credit.apply',
  'buyer.company.manage',
  'buyer.team.manage',
  'buyer.addresses.manage',
  'buyer.kyb.manage',
  'buyer.disputes.manage',
  'buyer.reviews.write',
] as const;
export type BuyerPermission = (typeof BuyerPermission)[number];

export const SupplierPermission = [
  'supplier.dashboard.view',
  'supplier.orders.view',
  'supplier.orders.manage',
  'supplier.offers.manage',
  'supplier.deals.manage',
  'supplier.rfq.manage',
  'supplier.fleet.manage',
  'supplier.finance.view',
  'supplier.profile.manage',
  'supplier.team.manage',
  'supplier.reviews.reply',
  'supplier.disputes.respond',
] as const;
export type SupplierPermission = (typeof SupplierPermission)[number];

export const StaffPermission = [
  'admin.dashboard.view',
  'admin.buyers.view',
  'admin.buyers.manage',
  'admin.kyb.review',
  'admin.suppliers.view',
  'admin.suppliers.manage',
  'admin.catalog.manage',
  'admin.orders.view',
  'admin.orders.manage',
  'admin.rfq.view',
  'admin.logistics.manage',
  'admin.finance.view',
  'admin.payments.verify',
  'admin.refunds.manage',
  'admin.credit.manage',
  'admin.collections.manage',
  'admin.settlements.manage',
  'admin.marketing.manage',
  'admin.content.manage',
  'admin.support.manage',
  'admin.disputes.manage',
  'admin.reports.view',
  'admin.staff.manage',
  'admin.settings.manage',
  'admin.audit.view',
] as const;
export type StaffPermission = (typeof StaffPermission)[number];

export type Permission = BuyerPermission | SupplierPermission | StaffPermission;

export const buyerRolePermissions: Record<BuyerRole, readonly BuyerPermission[]> = {
  OWNER: BuyerPermission,
  PURCHASER: [
    'buyer.catalog.view',
    'buyer.cart.manage',
    'buyer.orders.place',
    'buyer.orders.view',
    'buyer.orders.cancel',
    'buyer.rfq.manage',
    'buyer.quotations.accept',
    'buyer.invoices.view',
    'buyer.credit.view',
    'buyer.addresses.manage',
    'buyer.disputes.manage',
    'buyer.reviews.write',
  ],
  ACCOUNTANT: [
    'buyer.catalog.view',
    'buyer.orders.view',
    'buyer.invoices.view',
    'buyer.payments.manage',
    'buyer.credit.view',
    'buyer.credit.apply',
  ],
  VIEWER: ['buyer.catalog.view', 'buyer.orders.view', 'buyer.invoices.view'],
};

export const supplierRolePermissions: Record<SupplierRole, readonly SupplierPermission[]> = {
  OWNER: SupplierPermission,
  MANAGER: SupplierPermission.filter((p) => p !== 'supplier.team.manage'),
  SALES: [
    'supplier.dashboard.view',
    'supplier.orders.view',
    'supplier.offers.manage',
    'supplier.deals.manage',
    'supplier.rfq.manage',
    'supplier.reviews.reply',
  ],
  WAREHOUSE: ['supplier.dashboard.view', 'supplier.orders.view', 'supplier.orders.manage', 'supplier.fleet.manage'],
  FINANCE: ['supplier.dashboard.view', 'supplier.orders.view', 'supplier.finance.view', 'supplier.disputes.respond'],
};

export const staffRolePermissions: Record<StaffRole, readonly StaffPermission[]> = {
  SUPER_ADMIN: StaffPermission,
  ADMIN: StaffPermission.filter((p) => p !== 'admin.staff.manage'),
  OPERATIONS: [
    'admin.dashboard.view',
    'admin.buyers.view',
    'admin.suppliers.view',
    'admin.orders.view',
    'admin.orders.manage',
    'admin.rfq.view',
    'admin.logistics.manage',
    'admin.support.manage',
    'admin.disputes.manage',
    'admin.reports.view',
  ],
  CATALOG_MANAGER: ['admin.dashboard.view', 'admin.catalog.manage', 'admin.suppliers.view', 'admin.reports.view'],
  FINANCE: [
    'admin.dashboard.view',
    'admin.buyers.view',
    'admin.suppliers.view',
    'admin.orders.view',
    'admin.finance.view',
    'admin.payments.verify',
    'admin.refunds.manage',
    'admin.collections.manage',
    'admin.settlements.manage',
    'admin.reports.view',
  ],
  CREDIT_MANAGER: [
    'admin.dashboard.view',
    'admin.buyers.view',
    'admin.kyb.review',
    'admin.orders.view',
    'admin.finance.view',
    'admin.credit.manage',
    'admin.collections.manage',
    'admin.reports.view',
  ],
  LOGISTICS: ['admin.dashboard.view', 'admin.orders.view', 'admin.suppliers.view', 'admin.logistics.manage'],
  SUPPORT: [
    'admin.dashboard.view',
    'admin.buyers.view',
    'admin.suppliers.view',
    'admin.orders.view',
    'admin.kyb.review',
    'admin.support.manage',
    'admin.disputes.manage',
  ],
  MARKETING: ['admin.dashboard.view', 'admin.marketing.manage', 'admin.content.manage', 'admin.reports.view'],
};

export function permissionsForStaff(roles: readonly StaffRole[]): StaffPermission[] {
  return [...new Set(roles.flatMap((r) => staffRolePermissions[r]))];
}
