import type { AdminDashboardDto, StaffPermission } from '@tawreed/contracts';
import {
  Banknote,
  Boxes,
  Building2,
  ClipboardList,
  FileSearch,
  FolderTree,
  HandCoins,
  History,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Percent,
  Receipt,
  Settings,
  ShieldCheck,
  Store,
  Tags,
  Truck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

export type QueueKey = keyof AdminDashboardDto['queues'];

export interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  perm: StaffPermission;
  queue?: QueueKey;
}

/** Pages that exist so far; the rest render as disabled "soon" entries until they ship. */
export const READY = new Set(['/', '/buyers', '/kyb', '/suppliers', '/applications']);

export const NAV: { key: string; items: NavItem[] }[] = [
  { key: 'overview', items: [{ key: 'dashboard', href: '/', icon: LayoutDashboard, perm: 'admin.dashboard.view' }] },
  {
    key: 'customers',
    items: [
      { key: 'buyers', href: '/buyers', icon: Building2, perm: 'admin.buyers.view' },
      { key: 'kyb', href: '/kyb', icon: ShieldCheck, perm: 'admin.kyb.review', queue: 'kyb' },
      { key: 'suppliers', href: '/suppliers', icon: Store, perm: 'admin.suppliers.view' },
      { key: 'applications', href: '/applications', icon: Inbox, perm: 'admin.suppliers.manage', queue: 'supplierApplications' },
    ],
  },
  {
    key: 'operations',
    items: [
      { key: 'orders', href: '/orders', icon: Package, perm: 'admin.orders.view' },
      { key: 'rfqs', href: '/rfqs', icon: FileSearch, perm: 'admin.rfq.view' },
      { key: 'dispatch', href: '/logistics', icon: Truck, perm: 'admin.logistics.manage', queue: 'dispatch' },
      { key: 'drivers', href: '/drivers', icon: Users, perm: 'admin.logistics.manage' },
    ],
  },
  {
    key: 'finance',
    items: [
      { key: 'payments', href: '/payments', icon: Banknote, perm: 'admin.finance.view', queue: 'payments' },
      { key: 'credit', href: '/credit', icon: Wallet, perm: 'admin.credit.manage', queue: 'creditApplications' },
      { key: 'invoices', href: '/invoices', icon: Receipt, perm: 'admin.finance.view' },
      { key: 'cash', href: '/cash', icon: HandCoins, perm: 'admin.finance.view' },
    ],
  },
  {
    key: 'catalog',
    items: [
      { key: 'products', href: '/products', icon: Boxes, perm: 'admin.catalog.manage', queue: 'productReviews' },
      { key: 'categories', href: '/categories', icon: FolderTree, perm: 'admin.catalog.manage' },
      { key: 'offers', href: '/offers', icon: Tags, perm: 'admin.catalog.manage' },
      { key: 'deals', href: '/deals', icon: Percent, perm: 'admin.catalog.manage', queue: 'deals' },
    ],
  },
  {
    key: 'system',
    items: [
      { key: 'leads', href: '/leads', icon: ClipboardList, perm: 'admin.content.manage' },
      { key: 'staff', href: '/staff', icon: UserCog, perm: 'admin.staff.manage' },
      { key: 'audit', href: '/audit', icon: History, perm: 'admin.audit.view' },
      { key: 'settings', href: '/settings', icon: Settings, perm: 'admin.settings.manage' },
    ],
  },
];
