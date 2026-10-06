import { z } from 'zod';
import { type Money, money, optionalText, paginationQuery, quantity, type Qty, uuid } from '../common.js';
import { DealStatus, OfferStatus, ProductStatus, StockMode, StorageType, UnitCode } from '../enums.js';
import type { OfferStatus as OfferStatusT, ProductStatus as ProductStatusT, StockMode as StockModeT, StorageType as StorageTypeT, UnitCode as UnitCodeT, DealStatus as DealStatusT } from '../enums.js';
import type { ImageRef } from '../common.js';

const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/, 'errors.invalidSlug');

export const categoryInputSchema = z.object({
  parentId: uuid.nullable().optional(),
  slug,
  nameAr: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().min(2).max(80),
  descriptionAr: optionalText,
  descriptionEn: optionalText,
  icon: z.string().max(40).nullable().optional(),
  imageFileId: uuid.nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  commissionRate: z.number().min(0).max(0.5).nullable().optional(),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const brandInputSchema = z.object({
  slug,
  nameAr: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  logoFileId: uuid.nullable().optional(),
  originCountry: z.string().length(2).nullable().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type BrandInput = z.input<typeof brandInputSchema>;

export const unitInputSchema = z.object({
  id: uuid.optional(),
  code: z.enum(UnitCode),
  nameAr: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  baseQuantity: quantity,
  baseUnitAr: z.string().trim().min(1).max(20),
  baseUnitEn: z.string().trim().min(1).max(20),
  barcode: z.string().max(40).nullable().optional(),
  weightKg: quantity.nullable().optional(),
  isDefault: z.boolean().default(false),
});

export const specInputSchema = z.object({
  keyAr: z.string().trim().min(1).max(60),
  keyEn: z.string().trim().min(1).max(60),
  valueAr: z.string().trim().min(1).max(200),
  valueEn: z.string().trim().min(1).max(200),
});

export const productInputSchema = z.object({
  slug: slug.optional(),
  categoryId: uuid,
  brandId: uuid.nullable().optional(),
  nameAr: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(160),
  descriptionAr: z.string().trim().max(5000).optional(),
  descriptionEn: z.string().trim().max(5000).optional(),
  barcode: z.string().max(40).nullable().optional(),
  sku: z.string().max(60).nullable().optional(),
  originCountry: z.string().length(2).nullable().optional(),
  storageType: z.enum(StorageType).default('AMBIENT'),
  specs: z.array(specInputSchema).max(30).default([]),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  imageFileIds: z.array(uuid).max(10).default([]),
  units: z.array(unitInputSchema).min(1).max(8),
  isFeatured: z.boolean().default(false),
  status: z.enum(ProductStatus).optional(),
});
export type ProductInput = z.input<typeof productInputSchema>;

export const tierInputSchema = z.object({ minQty: quantity, price: money });

export const offerInputSchema = z.object({
  productUnitId: uuid,
  sku: z.string().max(60).nullable().optional(),
  price: money,
  compareAtPrice: money.nullable().optional(),
  minOrderQty: quantity.default('1'),
  qtyStep: quantity.default('1'),
  maxOrderQty: quantity.nullable().optional(),
  stockMode: z.enum(StockMode).default('TRACKED'),
  stockQty: z.union([z.string(), z.number()]).transform((v) => String(v)).default('0'),
  leadTimeDays: z.number().int().min(0).max(60).nullable().optional(),
  status: z.enum(['ACTIVE', 'PAUSED']).default('ACTIVE'),
  tiers: z.array(tierInputSchema).max(8).default([]),
});
export type OfferInput = z.input<typeof offerInputSchema>;

export const offerUpdateSchema = offerInputSchema.omit({ productUnitId: true }).partial();
export type OfferUpdateInput = z.input<typeof offerUpdateSchema>;

export const offerBulkUpdateSchema = z.object({
  items: z
    .array(
      z.object({
        offerId: uuid,
        price: money.optional(),
        stockQty: z.union([z.string(), z.number()]).transform((v) => String(v)).optional(),
        status: z.enum(['ACTIVE', 'PAUSED']).optional(),
      }),
    )
    .min(1)
    .max(200),
});

export const offerListQuery = paginationQuery.extend({
  status: z.enum(OfferStatus).optional(),
  categoryId: uuid.optional(),
  lowStock: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
});

export const productProposalSchema = productInputSchema.extend({
  offer: offerInputSchema.omit({ productUnitId: true }),
});
export type ProductProposalInput = z.input<typeof productProposalSchema>;

export const dealInputSchema = z.object({
  offerId: uuid,
  titleAr: z.string().trim().max(80).optional(),
  titleEn: z.string().trim().max(80).optional(),
  dealPrice: money,
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  maxQtyPerOrder: quantity.nullable().optional(),
  totalQtyCap: quantity.nullable().optional(),
});
export type DealInput = z.input<typeof dealInputSchema>;

export const reviewDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  note: optionalText,
});

export const catalogAdminQuery = paginationQuery.extend({
  status: z.enum(ProductStatus).optional(),
  categoryId: uuid.optional(),
  brandId: uuid.optional(),
  proposed: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true'),
});

export const dealListQuery = paginationQuery.extend({ status: z.enum(DealStatus).optional() });

/* ---------------------------------------------------------------- management DTOs */

export interface UnitManageDto {
  id: string;
  code: UnitCodeT;
  nameAr: string;
  nameEn: string;
  baseQuantity: Qty;
  baseUnitAr: string;
  baseUnitEn: string;
  barcode: string | null;
  weightKg: Qty | null;
  isDefault: boolean;
}

export interface ProductManageDto {
  id: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  category: { id: string; nameAr: string; nameEn: string };
  brand: { id: string; nameAr: string; nameEn: string } | null;
  originCountry: string | null;
  storageType: StorageTypeT;
  specs: z.infer<typeof specInputSchema>[];
  tags: string[];
  images: (ImageRef & { fileId: string })[];
  units: UnitManageDto[];
  status: ProductStatusT;
  isFeatured: boolean;
  offersCount: number;
  minPrice: Money | null;
  maxPrice: Money | null;
  salesCount: number;
  proposedBy: { id: string; name: string } | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfferManageDto {
  id: string;
  product: { id: string; slug: string; nameAr: string; nameEn: string; image: ImageRef | null; status: ProductStatusT };
  unit: UnitManageDto;
  supplier: { id: string; nameAr: string; nameEn: string };
  sku: string | null;
  price: Money;
  compareAtPrice: Money | null;
  vatRate: string;
  minOrderQty: Qty;
  qtyStep: Qty;
  maxOrderQty: Qty | null;
  stockMode: StockModeT;
  stockQty: Qty;
  reservedQty: Qty;
  availableQty: Qty;
  leadTimeDays: number | null;
  status: OfferStatusT;
  tiers: { minQty: Qty; price: Money }[];
  isBuyBox: boolean;
  competitorsCount: number;
  bestCompetitorPrice: Money | null;
  activeDeal: { id: string; dealPrice: Money; endsAt: string } | null;
  updatedAt: string;
}

export interface DealDto {
  id: string;
  offerId: string;
  product: { nameAr: string; nameEn: string; image: ImageRef | null };
  supplier: { id: string; nameAr: string; nameEn: string };
  titleAr: string | null;
  titleEn: string | null;
  dealPrice: Money;
  regularPrice: Money;
  startsAt: string;
  endsAt: string;
  maxQtyPerOrder: Qty | null;
  totalQtyCap: Qty | null;
  soldQty: Qty;
  status: DealStatusT;
  reviewNote: string | null;
  createdAt: string;
}
