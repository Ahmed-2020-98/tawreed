import { z } from 'zod';
import { type CityRef, type Money, money, optionalText, paginationQuery, saudiPhone, uuid } from '../common.js';
import {
  type BuyerRole as BuyerRoleT,
  BuyerRole,
  BusinessType,
  type BusinessType as BusinessTypeT,
  type CompanyStatus,
  FleetMode,
  type FleetMode as FleetModeT,
  KybDocType,
  type KybDocType as KybDocTypeT,
  type DocReviewStatus,
  type MemberStatus,
  SupplierRole,
  type SupplierRole as SupplierRoleT,
  type SupplierStatus,
  VerificationStatus,
  type VerificationStatus as VerificationStatusT,
  ApplicationStatus,
  type ApplicationStatus as ApplicationStatusT,
} from '../enums.js';

/* ---------------------------------------------------------------- buyer company */

export const updateCompanySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  legalName: optionalText,
  businessType: z.enum(BusinessType).optional(),
  crNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'errors.invalidCr')
    .nullable()
    .optional(),
  vatNumber: z
    .string()
    .trim()
    .regex(/^3\d{13}3$/, 'errors.invalidVat')
    .nullable()
    .optional(),
  cityId: uuid.optional(),
  logoFileId: uuid.nullable().optional(),
  phone: saudiPhone.optional(),
  email: z.email().nullable().optional(),
  branchesCount: z.number().int().min(1).max(500).optional(),
  monthlyVolume: z.string().max(40).nullable().optional(),
});
export type UpdateCompanyInput = z.input<typeof updateCompanySchema>;

export interface CompanyDto {
  id: string;
  name: string;
  legalName: string | null;
  businessType: BusinessTypeT;
  crNumber: string | null;
  vatNumber: string | null;
  city: CityRef | null;
  logoUrl: string | null;
  logoFileId: string | null;
  phone: string | null;
  email: string | null;
  verificationStatus: VerificationStatusT;
  status: CompanyStatus;
  branchesCount: number;
  monthlyVolume: string | null;
  createdAt: string;
}

export const addressInputSchema = z.object({
  label: z.string().trim().min(1).max(60),
  recipientName: z.string().trim().min(2).max(80),
  recipientPhone: saudiPhone,
  cityId: uuid,
  district: z.string().trim().min(2).max(80),
  street: optionalText,
  buildingNumber: z.string().trim().max(10).optional(),
  postalCode: z.string().trim().max(10).optional(),
  additionalNumber: z.string().trim().max(10).optional(),
  shortAddress: z.string().trim().max(12).optional(),
  lat: z.number().min(15).max(33),
  lng: z.number().min(33).max(56),
  notes: optionalText,
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.input<typeof addressInputSchema>;

export interface AddressDto {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  city: CityRef;
  district: string;
  street: string | null;
  buildingNumber: string | null;
  postalCode: string | null;
  additionalNumber: string | null;
  shortAddress: string | null;
  lat: number;
  lng: number;
  notes: string | null;
  isDefault: boolean;
  formatted: string;
}

export const inviteBuyerMemberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: saudiPhone,
  role: z.enum(BuyerRole),
});
export const updateBuyerMemberSchema = z.object({
  role: z.enum(BuyerRole).optional(),
  status: z.enum(['ACTIVE', 'REMOVED']).optional(),
});

export interface MemberDto {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: BuyerRoleT | SupplierRoleT;
  status: MemberStatus;
  lastLoginAt: string | null;
  createdAt: string;
  isYou: boolean;
}

/* ---------------------------------------------------------------- KYB */

export const addKybDocumentSchema = z.object({
  type: z.enum(KybDocType),
  fileId: uuid,
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export interface KybDocumentDto {
  id: string;
  type: KybDocTypeT;
  status: DocReviewStatus;
  fileName: string | null;
  fileUrl: string;
  mimeType: string;
  expiresAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface KybReviewDto {
  id: string;
  fromStatus: VerificationStatusT;
  toStatus: VerificationStatusT;
  note: string | null;
  requestedDocTypes: KybDocTypeT[];
  createdAt: string;
}

export interface KybOverviewDto {
  verificationStatus: VerificationStatusT;
  documents: KybDocumentDto[];
  requiredTypes: KybDocTypeT[];
  missingTypes: KybDocTypeT[];
  history: KybReviewDto[];
  canSubmit: boolean;
}

export const kybDecisionSchema = z.object({
  decision: z.enum(['VERIFIED', 'REJECTED', 'NEEDS_INFO']),
  note: optionalText,
  requestedDocTypes: z.array(z.enum(KybDocType)).max(7).default([]),
});
export const kybDocumentDecisionSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
  note: optionalText,
});
export const kybQueueQuery = paginationQuery.extend({
  status: z.enum(VerificationStatus).optional(),
  kind: z.enum(['BUYER', 'SUPPLIER']).default('BUYER'),
});

/* ---------------------------------------------------------------- supplier */

export const updateSupplierProfileSchema = z.object({
  nameAr: z.string().trim().min(2).max(120).optional(),
  nameEn: z.string().trim().min(2).max(120).optional(),
  legalName: optionalText,
  descriptionAr: z.string().trim().max(2000).optional(),
  descriptionEn: z.string().trim().max(2000).optional(),
  logoFileId: uuid.nullable().optional(),
  coverFileId: uuid.nullable().optional(),
  crNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'errors.invalidCr')
    .nullable()
    .optional(),
  vatNumber: z
    .string()
    .trim()
    .regex(/^3\d{13}3$/, 'errors.invalidVat')
    .nullable()
    .optional(),
  iban: z
    .string()
    .trim()
    .regex(/^SA\d{22}$/, 'errors.invalidIban')
    .nullable()
    .optional(),
  bankName: z.string().trim().max(80).nullable().optional(),
  beneficiaryName: z.string().trim().max(120).nullable().optional(),
  minOrderValue: money.optional(),
  fleetMode: z.enum(FleetMode).optional(),
  contactPhone: saudiPhone.optional(),
  contactEmail: z.email().nullable().optional(),
  cityId: uuid.optional(),
  foundedYear: z.number().int().min(1900).max(2100).nullable().optional(),
});
export type UpdateSupplierProfileInput = z.input<typeof updateSupplierProfileSchema>;

export const coverageInputSchema = z.object({
  items: z
    .array(
      z.object({
        cityId: uuid,
        deliveryFee: money,
        freeDeliveryThreshold: money.nullable().optional(),
        leadTimeDays: z.number().int().min(0).max(30),
        sameDayAvailable: z.boolean().default(false),
        cutoffTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable()
          .optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .max(60),
});

export const warehouseInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  cityId: uuid,
  district: optionalText,
  street: optionalText,
  lat: z.number(),
  lng: z.number(),
  contactPhone: saudiPhone.optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const inviteSupplierMemberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: saudiPhone,
  role: z.enum(SupplierRole),
});
export const updateSupplierMemberSchema = z.object({
  role: z.enum(SupplierRole).optional(),
  status: z.enum(['ACTIVE', 'REMOVED']).optional(),
});

export interface CoverageDto {
  id: string;
  city: CityRef;
  deliveryFee: Money;
  freeDeliveryThreshold: Money | null;
  leadTimeDays: number;
  sameDayAvailable: boolean;
  cutoffTime: string | null;
  isActive: boolean;
}

export interface WarehouseDto {
  id: string;
  name: string;
  city: CityRef;
  district: string | null;
  street: string | null;
  lat: number;
  lng: number;
  contactPhone: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface SupplierProfileDto {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  legalName: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  logoUrl: string | null;
  logoFileId: string | null;
  coverUrl: string | null;
  coverFileId: string | null;
  crNumber: string | null;
  vatNumber: string | null;
  iban: string | null;
  bankName: string | null;
  beneficiaryName: string | null;
  commissionRate: string;
  minOrderValue: Money;
  fleetMode: FleetModeT;
  status: SupplierStatus;
  verificationStatus: VerificationStatusT;
  ratingAvg: string;
  ratingCount: number;
  contactPhone: string | null;
  contactEmail: string | null;
  city: CityRef | null;
  foundedYear: number | null;
  isFeatured: boolean;
  coverage: CoverageDto[];
  warehouses: WarehouseDto[];
  onboarding: { profile: boolean; coverage: boolean; warehouse: boolean; bank: boolean; documents: boolean; offers: boolean };
  createdAt: string;
}

export const supplierApplicationSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(80),
  phone: saudiPhone,
  email: z.email().optional(),
  cityId: uuid.optional(),
  categories: z.array(z.string().max(60)).max(20).default([]),
  crNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'errors.invalidCr')
    .optional(),
  vatNumber: z.string().trim().max(20).optional(),
  message: z.string().trim().max(2000).optional(),
});
export type SupplierApplicationInput = z.input<typeof supplierApplicationSchema>;

export interface SupplierApplicationDto {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string | null;
  city: CityRef | null;
  categories: string[];
  crNumber: string | null;
  vatNumber: string | null;
  message: string | null;
  status: ApplicationStatusT;
  supplierId: string | null;
  notes: string | null;
  createdAt: string;
}

export const applicationDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'CONTACTED']),
  notes: optionalText,
  commissionRate: z.number().min(0).max(0.5).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  nameEn: z.string().trim().min(2).max(120).optional(),
});
export const applicationQuery = paginationQuery.extend({ status: z.enum(ApplicationStatus).optional() });
