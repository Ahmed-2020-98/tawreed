import { AuthModule } from './auth/auth.module.js';
import { BuyersModule } from './buyers/buyers.module.js';
import { CartModule } from './cart/cart.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { ContentModule } from './content/content.module.js';
import { CreditModule } from './credit/credit.module.js';
import { DashboardsModule } from './dashboards/dashboards.module.js';
import { FilesModule } from './files/files.module.js';
import { GeoModule } from './geo/geo.module.js';
import { HealthModule } from './health/health.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { KybModule } from './kyb/kyb.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { OffersModule } from './offers/offers.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PlatformModule } from './platform/platform.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { RfqModule } from './rfq/rfq.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { ShipmentsModule } from './shipments/shipments.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';

/** Every feature module, in dependency-friendly order. */
export const FEATURE_MODULES = [
  HealthModule,
  SettingsModule,
  GeoModule,
  FilesModule,
  AuthModule,
  CatalogModule,
  OffersModule,
  BuyersModule,
  SuppliersModule,
  KybModule,
  CartModule,
  CreditModule,
  PaymentsModule,
  OrdersModule,
  CheckoutModule,
  RealtimeModule,
  ShipmentsModule,
  InvoicesModule,
  RfqModule,
  NotificationsModule,
  ContentModule,
  DashboardsModule,
  PlatformModule,
];
