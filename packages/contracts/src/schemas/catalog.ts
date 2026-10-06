import { z } from 'zod';
import { type ImageRef, type Money, paginationQuery, type Qty } from '../common.js';
import { type PriceSource, StorageType, type StorageType as StorageTypeT, type UnitCode } from '../enums.js';

export const productSort = ['relevance', 'price_asc', 'price_desc', 'newest', 'best_selling', 'rating'] as const;
export type ProductSort = (typeof productSort)[number];

const csv = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined));
const bool = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === true || v === 'true' || v === '1'));

export const productListQuery = paginationQuery.extend({
  category: z.string().trim().optional(),
  brand: csv,
  supplier: z.string().trim().optional(),
  origin: csv,
  storage: z.enum(StorageType).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: bool,
  onDeal: bool,
  featured: bool,
  city: z.string().trim().optional(),
  ids: csv,
  sort: z.enum(productSort).default('relevance'),
});
export type ProductListQuery = z.input<typeof productListQuery>;

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ON_REQUEST';

export interface UnitDto {
  id: string;
  code: UnitCode;
  name: string;
  baseQuantity: Qty;
  baseUnit: string;
  isDefault: boolean;
}

export interface SupplierMiniDto {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  ratingAvg: string;
  ratingCount: number;
  city: string | null;
}

export interface TierDto {
  minQty: Qty;
  price: Money;
}

export interface OfferSummaryDto {
  id: string;
  supplier: SupplierMiniDto;
  unit: UnitDto;
  price: Money;
  compareAtPrice: Money | null;
  effectivePrice: Money;
  priceSource: Exclude<PriceSource, 'QUOTE'>;
  pricePerBaseUnit: Money;
  deal: { id: string; dealPrice: Money; endsAt: string; maxQtyPerOrder: Qty | null } | null;
  tiers: TierDto[];
  minOrderQty: Qty;
  qtyStep: Qty;
  maxOrderQty: Qty | null;
  stockStatus: StockStatus;
  availableQty: Qty | null;
  leadTimeDays: number;
  deliveryFee: Money | null;
  freeDeliveryThreshold: Money | null;
  sameDayAvailable: boolean;
  coversCity: boolean;
  vatRate: string;
  isBest: boolean;
}

export interface CategoryRefDto {
  id: string;
  slug: string;
  name: string;
}

export interface BrandRefDto {
  id: string;
  slug: string;
  name: string;
}

export interface ProductCardDto {
  id: string;
  slug: string;
  name: string;
  image: ImageRef | null;
  category: CategoryRefDto;
  brand: BrandRefDto | null;
  originCountry: string | null;
  storageType: StorageTypeT;
  tags: string[];
  offersCount: number;
  priceRange: { min: Money; max: Money } | null;
  bestOffer: OfferSummaryDto | null;
  isFavorite: boolean;
}

export interface SpecDto {
  key: string;
  value: string;
}

export interface ProductDetailDto extends ProductCardDto {
  description: string | null;
  images: ImageRef[];
  specs: SpecDto[];
  units: UnitDto[];
  barcode: string | null;
  offers: OfferSummaryDto[];
  breadcrumbs: CategoryRefDto[];
  seo: { title: string; description: string };
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryDto[];
}

export interface BrandDto {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  originCountry: string | null;
  productCount: number;
}

export interface SupplierPublicDto extends SupplierMiniDto {
  description: string | null;
  coverUrl: string | null;
  minOrderValue: Money;
  productsCount: number;
  foundedYear: number | null;
  isFeatured: boolean;
  coverage: { citySlug: string; cityName: string; leadTimeDays: number; sameDay: boolean; deliveryFee: Money; freeDeliveryThreshold: Money | null }[];
  fleetMode: string;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface ProductFacetsDto {
  brands: FacetValue[];
  origins: FacetValue[];
  storageTypes: FacetValue[];
  priceRange: { min: Money; max: Money } | null;
}

export interface SearchSuggestionsDto {
  products: { slug: string; name: string; imageUrl: string | null; price: Money | null }[];
  categories: CategoryRefDto[];
  brands: BrandRefDto[];
}

export const suggestQuery = z.object({ q: z.string().trim().min(1).max(80) });
