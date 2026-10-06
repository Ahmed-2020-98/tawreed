import { z } from 'zod';
import { optionalText, paginationQuery, saudiPhone, uuid } from '../common.js';
import {
  BannerPlacement,
  type BannerPlacement as BannerPlacementT,
  BusinessType,
  FaqAudience,
  HomeSectionType,
  type HomeSectionType as HomeSectionTypeT,
  LeadStatus,
  LeadType,
  LinkType,
  type LinkType as LinkTypeT,
  PlatformScope,
  PublishStatus,
} from '../enums.js';
import type { BrandDto, CategoryDto, ProductCardDto, SupplierPublicDto } from './catalog.js';

export interface BannerDto {
  id: string;
  placement: BannerPlacementT;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  link: { type: LinkTypeT; value: string | null };
}

export type HomeSectionDto =
  | { id: string; type: 'PRODUCTS' | 'DEALS' | 'BUY_AGAIN'; title: string; items: ProductCardDto[]; viewAll: string | null }
  | { id: string; type: 'CATEGORIES'; title: string; items: CategoryDto[]; viewAll: string | null }
  | { id: string; type: 'BRANDS'; title: string; items: BrandDto[]; viewAll: string | null }
  | { id: string; type: 'SUPPLIERS'; title: string; items: SupplierPublicDto[]; viewAll: string | null }
  | { id: string; type: 'BANNER_STRIP'; title: string; items: BannerDto[]; viewAll: string | null };

export interface HomeDto {
  banners: BannerDto[];
  sections: HomeSectionDto[];
  city: { slug: string; name: string } | null;
}

export interface TestimonialDto {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  avatarUrl: string | null;
  rating: number;
}

export interface FaqDto {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

export interface BlogPostSummaryDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  tags: string[];
  authorName: string;
  publishedAt: string | null;
  readingMinutes: number;
}

export interface BlogPostDto extends BlogPostSummaryDto {
  body: string;
  related: BlogPostSummaryDto[];
}

export interface CmsPageDto {
  slug: string;
  title: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

export interface LandingDto {
  stats: { key: string; label: string; value: number; suffix: string | null }[];
  testimonials: TestimonialDto[];
  faqs: FaqDto[];
  categories: CategoryDto[];
  posts: BlogPostSummaryDto[];
  suppliers: SupplierPublicDto[];
  banners: BannerDto[];
}

export const leadSchema = z.object({
  type: z.enum(LeadType).default('BUYER'),
  name: z.string().trim().min(2).max(80),
  companyName: z.string().trim().max(120).optional(),
  phone: saudiPhone,
  email: z.email().optional(),
  cityId: uuid.optional(),
  message: z.string().trim().max(2000).optional(),
  source: z.string().max(40).optional(),
});
export type LeadInput = z.input<typeof leadSchema>;

/* ---------------------------------------------------------------- admin inputs */

export const bannerInputSchema = z.object({
  placement: z.enum(BannerPlacement),
  titleAr: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().min(2).max(120),
  subtitleAr: optionalText,
  subtitleEn: optionalText,
  ctaLabelAr: optionalText,
  ctaLabelEn: optionalText,
  imageFileId: uuid,
  mobileImageFileId: uuid.nullable().optional(),
  linkType: z.enum(LinkType).default('NONE'),
  linkValue: z.string().max(300).nullable().optional(),
  audience: z.array(z.enum(BusinessType)).default([]),
  startsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  endsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export const homeSectionInputSchema = z.object({
  type: z.enum(HomeSectionType),
  titleAr: z.string().trim().min(2).max(80),
  titleEn: z.string().trim().min(2).max(80),
  config: z.record(z.string(), z.unknown()).default({}),
  platform: z.enum(PlatformScope).default('ALL'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export const cmsPageInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  titleAr: z.string().min(2).max(160),
  titleEn: z.string().min(2).max(160),
  bodyAr: z.string().min(1),
  bodyEn: z.string().min(1),
  seoTitle: optionalText,
  seoDescription: optionalText,
  isPublished: z.boolean().default(true),
});
export const faqInputSchema = z.object({
  audience: z.enum(FaqAudience).default('ALL'),
  category: optionalText,
  questionAr: z.string().min(3).max(300),
  questionEn: z.string().min(3).max(300),
  answerAr: z.string().min(3).max(3000),
  answerEn: z.string().min(3).max(3000),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export const blogPostInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  titleAr: z.string().min(3).max(200),
  titleEn: z.string().min(3).max(200),
  excerptAr: z.string().min(3).max(400),
  excerptEn: z.string().min(3).max(400),
  bodyAr: z.string().min(1),
  bodyEn: z.string().min(1),
  coverFileId: uuid.nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  authorName: z.string().min(2).max(80),
  status: z.enum(PublishStatus).default('DRAFT'),
  readingMinutes: z.number().int().min(1).max(60).default(4),
});
export const testimonialInputSchema = z.object({
  nameAr: z.string().min(2).max(80),
  nameEn: z.string().min(2).max(80),
  roleAr: z.string().min(2).max(80),
  roleEn: z.string().min(2).max(80),
  companyAr: z.string().min(2).max(120),
  companyEn: z.string().min(2).max(120),
  businessType: z.enum(BusinessType).nullable().optional(),
  quoteAr: z.string().min(5).max(600),
  quoteEn: z.string().min(5).max(600),
  avatarFileId: uuid.nullable().optional(),
  rating: z.number().int().min(1).max(5).default(5),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export const landingStatInputSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/),
  labelAr: z.string().min(2).max(60),
  labelEn: z.string().min(2).max(60),
  value: z.number().int().min(0),
  suffix: z.string().max(5).nullable().optional(),
  sortOrder: z.number().int().default(0),
});
export const leadQuery = paginationQuery.extend({ status: z.enum(LeadStatus).optional(), type: z.enum(LeadType).optional() });
export const leadUpdateSchema = z.object({ status: z.enum(LeadStatus).optional(), notes: optionalText, assignedToId: uuid.nullable().optional() });

export type HomeSectionTypeName = HomeSectionTypeT;
