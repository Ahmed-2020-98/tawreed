/**
 * Enum values shared by API and clients. Keep in sync with apps/api/prisma/schema/*.prisma
 * (the API has a unit test asserting parity with the generated Prisma enums).
 */
const e = <const T extends readonly [string, ...string[]]>(values: T) => values;

export const UserType = e(['BUYER', 'SUPPLIER', 'DRIVER', 'STAFF']);
export const StaffRole = e([
  'SUPER_ADMIN',
  'ADMIN',
  'OPERATIONS',
  'CATALOG_MANAGER',
  'FINANCE',
  'CREDIT_MANAGER',
  'LOGISTICS',
  'SUPPORT',
  'MARKETING',
]);
export const AppClient = e(['WEB', 'ADMIN', 'SUPPLIER_WEB', 'BUYER_APP', 'SUPPLIER_APP', 'DRIVER_APP']);
export const ContextType = e(['BUYER', 'SUPPLIER', 'DRIVER', 'STAFF']);

export const BusinessType = e(['RETAIL', 'SUPERMARKET', 'RESTAURANT', 'CAFE', 'HOTEL', 'CATERING', 'COMPANY', 'OTHER']);
export const VerificationStatus = e(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'NEEDS_INFO']);
export const CompanyStatus = e(['ACTIVE', 'SUSPENDED']);
export const BuyerRole = e(['OWNER', 'PURCHASER', 'ACCOUNTANT', 'VIEWER']);
export const SupplierRole = e(['OWNER', 'MANAGER', 'SALES', 'WAREHOUSE', 'FINANCE']);
export const MemberStatus = e(['INVITED', 'ACTIVE', 'REMOVED']);
export const SupplierStatus = e(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']);
export const FleetMode = e(['OWN', 'PLATFORM', 'BOTH']);
export const ApplicationStatus = e(['NEW', 'CONTACTED', 'APPROVED', 'REJECTED']);
export const KybDocType = e([
  'COMMERCIAL_REGISTRATION',
  'VAT_CERTIFICATE',
  'NATIONAL_ADDRESS',
  'IBAN_LETTER',
  'AUTHORIZATION_LETTER',
  'FOOD_SAFETY_LICENSE',
  'OTHER',
]);
export const DocReviewStatus = e(['PENDING', 'ACCEPTED', 'REJECTED']);

export const StorageType = e(['AMBIENT', 'CHILLED', 'FROZEN']);
export const ProductStatus = e(['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'ARCHIVED']);
export const UnitCode = e(['PIECE', 'PACK', 'BOX', 'CARTON', 'BAG', 'SACK', 'KG', 'TON', 'LITER', 'BOTTLE', 'CAN', 'TRAY', 'PALLET']);
export const StockMode = e(['TRACKED', 'UNLIMITED', 'ON_REQUEST']);
export const OfferStatus = e(['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'REJECTED', 'ARCHIVED']);
export const DealStatus = e(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED']);
export const ListRecurrence = e(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']);

export const CouponType = e(['PERCENT', 'FIXED', 'FREE_DELIVERY']);
export const OrderSource = e(['WEB', 'BUYER_APP', 'RFQ', 'REORDER']);
export const OrderStatus = e(['PENDING_PAYMENT', 'PLACED', 'PROCESSING', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED', 'CANCELLED']);
export const SupplierOrderStatus = e([
  'AWAITING_PAYMENT',
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
  'RETURNED',
]);
export const PaymentMethod = e(['CARD', 'BANK_TRANSFER', 'COD', 'CREDIT']);
export const PaymentStatus = e([
  'UNPAID',
  'PENDING_VERIFICATION',
  'PAID',
  'PARTIALLY_PAID',
  'DEFERRED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'FAILED',
  'CANCELLED',
]);
export const DeliveryWindow = e(['MORNING', 'AFTERNOON', 'EVENING']);
export const PriceSource = e(['BASE', 'TIER', 'DEAL', 'QUOTE']);
export const ActorType = e(['BUYER', 'SUPPLIER', 'DRIVER', 'STAFF', 'SYSTEM']);

export const PaymentPreference = e(['ANY', 'CASH', 'CREDIT']);
export const RfqVisibility = e(['TARGETED', 'OPEN']);
export const RfqStatus = e(['DRAFT', 'OPEN', 'QUOTED', 'AWARDED', 'CLOSED', 'CANCELLED', 'EXPIRED']);
export const InvitationStatus = e(['INVITED', 'VIEWED', 'QUOTED', 'DECLINED']);
export const QuotationStatus = e(['SUBMITTED', 'REVISION_REQUESTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN']);
export const QuotationVersionStatus = e(['SUBMITTED', 'SUPERSEDED', 'ACCEPTED', 'REJECTED', 'EXPIRED']);

export const FleetOwner = e(['PLATFORM', 'SUPPLIER']);
export const DriverStatus = e(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
export const VehicleType = e(['VAN', 'PICKUP', 'TRUCK_3T', 'TRUCK_7T', 'TRUCK_12T', 'TRAILER']);
export const DispatchMode = e(['SUPPLIER_FLEET', 'PLATFORM_FLEET']);
export const ShipmentStatus = e([
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
]);
export const CashStatus = e(['COLLECTED', 'HANDED_OVER', 'RECONCILED']);

export const PaymentPurpose = e(['ORDER', 'CREDIT_REPAYMENT']);
export const PaymentProvider = e(['TAP', 'MANUAL', 'DRIVER_COD', 'CREDIT_LEDGER']);
export const PaymentRecordStatus = e(['INITIATED', 'PENDING_VERIFICATION', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED']);
export const RefundStatus = e(['PENDING', 'PROCESSED', 'FAILED']);
export const InvoiceStatus = e(['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID']);
export const CreditStatus = e(['NO_CREDIT', 'ACTIVE', 'FROZEN', 'SUSPENDED']);
export const RiskLevel = e(['LOW', 'MEDIUM', 'HIGH']);
export const LedgerType = e(['ORDER_CHARGE', 'REPAYMENT', 'REVERSAL', 'ADJUSTMENT']);
export const CreditApplicationStatus = e(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']);
export const CollectionActivityType = e(['CALL', 'SMS', 'EMAIL', 'VISIT', 'PROMISE_TO_PAY', 'NOTE']);
export const SettlementStatus = e(['DRAFT', 'APPROVED', 'PAID', 'CANCELLED']);

export const DisputeReason = e(['MISSING_ITEMS', 'DAMAGED', 'WRONG_ITEMS', 'QUALITY', 'LATE_DELIVERY', 'OVERCHARGED', 'OTHER']);
export const DisputeStatus = e(['OPEN', 'UNDER_REVIEW', 'AWAITING_BUYER', 'RESOLVED', 'REJECTED', 'CLOSED']);
export const DisputeResolution = e(['CREDIT_NOTE', 'REFUND', 'REPLACEMENT', 'NO_ACTION']);
export const TicketCategory = e(['ORDER', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'OTHER']);
export const TicketPriority = e(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const TicketStatus = e(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']);
export const NotificationChannel = e(['IN_APP', 'PUSH', 'SMS', 'EMAIL']);
export const NotificationCategory = e(['ORDERS', 'PAYMENTS', 'RFQ', 'DELIVERY', 'PROMOTIONS', 'ACCOUNT', 'SYSTEM']);

export const BannerPlacement = e(['HOME_HERO', 'HOME_STRIP', 'STORE_HERO', 'CATEGORY_TOP', 'APP_HOME']);
export const LinkType = e(['NONE', 'CATEGORY', 'PRODUCT', 'BRAND', 'SUPPLIER', 'DEALS', 'RFQ', 'URL']);
export const HomeSectionType = e(['CATEGORIES', 'DEALS', 'PRODUCTS', 'BRANDS', 'SUPPLIERS', 'BUY_AGAIN', 'BANNER_STRIP']);
export const PlatformScope = e(['ALL', 'WEB', 'APP']);
export const FaqAudience = e(['ALL', 'BUYER', 'SUPPLIER']);
export const PublishStatus = e(['DRAFT', 'PUBLISHED']);
export const LeadType = e(['BUYER', 'SUPPLIER', 'PARTNERSHIP', 'SUPPORT', 'OTHER']);
export const LeadStatus = e(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']);
export const FileVisibility = e(['PUBLIC', 'PRIVATE']);
export const FilePurpose = e([
  'PRODUCT_IMAGE',
  'CATEGORY_IMAGE',
  'BRAND_LOGO',
  'SUPPLIER_LOGO',
  'BANNER',
  'AVATAR',
  'BLOG_COVER',
  'KYB_DOCUMENT',
  'PAYMENT_PROOF',
  'POD_PHOTO',
  'POD_SIGNATURE',
  'PICKUP_PHOTO',
  'DISPUTE_PHOTO',
  'ATTACHMENT',
  'GENERATED_PDF',
  'OTHER',
]);
export const DocumentType = e([
  'PURCHASE_ORDER',
  'TAX_INVOICE',
  'DELIVERY_NOTE',
  'QUOTATION',
  'CREDIT_NOTE',
  'STATEMENT',
  'SETTLEMENT',
  'RECEIPT',
  'POD',
  'OTHER',
]);

type Values<T extends readonly string[]> = T[number];
export type UserType = Values<typeof UserType>;
export type StaffRole = Values<typeof StaffRole>;
export type AppClient = Values<typeof AppClient>;
export type ContextType = Values<typeof ContextType>;
export type BusinessType = Values<typeof BusinessType>;
export type VerificationStatus = Values<typeof VerificationStatus>;
export type CompanyStatus = Values<typeof CompanyStatus>;
export type BuyerRole = Values<typeof BuyerRole>;
export type SupplierRole = Values<typeof SupplierRole>;
export type MemberStatus = Values<typeof MemberStatus>;
export type SupplierStatus = Values<typeof SupplierStatus>;
export type FleetMode = Values<typeof FleetMode>;
export type ApplicationStatus = Values<typeof ApplicationStatus>;
export type KybDocType = Values<typeof KybDocType>;
export type DocReviewStatus = Values<typeof DocReviewStatus>;
export type StorageType = Values<typeof StorageType>;
export type ProductStatus = Values<typeof ProductStatus>;
export type UnitCode = Values<typeof UnitCode>;
export type StockMode = Values<typeof StockMode>;
export type OfferStatus = Values<typeof OfferStatus>;
export type DealStatus = Values<typeof DealStatus>;
export type ListRecurrence = Values<typeof ListRecurrence>;
export type CouponType = Values<typeof CouponType>;
export type OrderSource = Values<typeof OrderSource>;
export type OrderStatus = Values<typeof OrderStatus>;
export type SupplierOrderStatus = Values<typeof SupplierOrderStatus>;
export type PaymentMethod = Values<typeof PaymentMethod>;
export type PaymentStatus = Values<typeof PaymentStatus>;
export type DeliveryWindow = Values<typeof DeliveryWindow>;
export type PriceSource = Values<typeof PriceSource>;
export type ActorType = Values<typeof ActorType>;
export type PaymentPreference = Values<typeof PaymentPreference>;
export type RfqVisibility = Values<typeof RfqVisibility>;
export type RfqStatus = Values<typeof RfqStatus>;
export type InvitationStatus = Values<typeof InvitationStatus>;
export type QuotationStatus = Values<typeof QuotationStatus>;
export type QuotationVersionStatus = Values<typeof QuotationVersionStatus>;
export type FleetOwner = Values<typeof FleetOwner>;
export type DriverStatus = Values<typeof DriverStatus>;
export type VehicleType = Values<typeof VehicleType>;
export type DispatchMode = Values<typeof DispatchMode>;
export type ShipmentStatus = Values<typeof ShipmentStatus>;
export type CashStatus = Values<typeof CashStatus>;
export type PaymentPurpose = Values<typeof PaymentPurpose>;
export type PaymentProvider = Values<typeof PaymentProvider>;
export type PaymentRecordStatus = Values<typeof PaymentRecordStatus>;
export type RefundStatus = Values<typeof RefundStatus>;
export type InvoiceStatus = Values<typeof InvoiceStatus>;
export type CreditStatus = Values<typeof CreditStatus>;
export type RiskLevel = Values<typeof RiskLevel>;
export type LedgerType = Values<typeof LedgerType>;
export type CreditApplicationStatus = Values<typeof CreditApplicationStatus>;
export type CollectionActivityType = Values<typeof CollectionActivityType>;
export type SettlementStatus = Values<typeof SettlementStatus>;
export type DisputeReason = Values<typeof DisputeReason>;
export type DisputeStatus = Values<typeof DisputeStatus>;
export type DisputeResolution = Values<typeof DisputeResolution>;
export type TicketCategory = Values<typeof TicketCategory>;
export type TicketPriority = Values<typeof TicketPriority>;
export type TicketStatus = Values<typeof TicketStatus>;
export type NotificationChannel = Values<typeof NotificationChannel>;
export type NotificationCategory = Values<typeof NotificationCategory>;
export type BannerPlacement = Values<typeof BannerPlacement>;
export type LinkType = Values<typeof LinkType>;
export type HomeSectionType = Values<typeof HomeSectionType>;
export type PlatformScope = Values<typeof PlatformScope>;
export type FaqAudience = Values<typeof FaqAudience>;
export type PublishStatus = Values<typeof PublishStatus>;
export type LeadType = Values<typeof LeadType>;
export type LeadStatus = Values<typeof LeadStatus>;
export type FileVisibility = Values<typeof FileVisibility>;
export type FilePurpose = Values<typeof FilePurpose>;
export type DocumentType = Values<typeof DocumentType>;
