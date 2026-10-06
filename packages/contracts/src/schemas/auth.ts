import { z } from 'zod';
import { optionalText, saudiPhone, uuid } from '../common.js';
import { AppClient, BusinessType, type ContextType, type UserType } from '../enums.js';

export const otpRequestSchema = z.object({
  phone: saudiPhone,
  app: z.enum(AppClient),
});
export type OtpRequestInput = z.input<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: saudiPhone,
  code: z.string().trim().regex(/^\d{4,6}$/, 'errors.invalidOtp'),
  app: z.enum(AppClient),
  deviceId: z.string().max(120).optional(),
  deviceName: z.string().max(120).optional(),
});
export type OtpVerifyInput = z.input<typeof otpVerifySchema>;

export const buyerRegisterSchema = z.object({
  registrationToken: z.string().min(20),
  name: z.string().trim().min(2).max(80),
  email: z.email().optional(),
  company: z.object({
    name: z.string().trim().min(2).max(120),
    legalName: optionalText,
    businessType: z.enum(BusinessType),
    crNumber: z
      .string()
      .trim()
      .regex(/^\d{10}$/, 'errors.invalidCr')
      .optional(),
    vatNumber: z
      .string()
      .trim()
      .regex(/^3\d{13}3$/, 'errors.invalidVat')
      .optional(),
    cityId: uuid,
    branchesCount: z.number().int().min(1).max(500).optional(),
    monthlyVolume: z.string().max(40).optional(),
  }),
  app: z.enum(['WEB', 'BUYER_APP']),
  deviceId: z.string().max(120).optional(),
  deviceName: z.string().max(120).optional(),
});
export type BuyerRegisterInput = z.input<typeof buyerRegisterSchema>;

export const staffLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(128),
  deviceId: z.string().max(120).optional(),
});
export type StaffLoginInput = z.input<typeof staffLoginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(20) });
export const switchContextSchema = z.object({ contextId: uuid });

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.email().nullable().optional(),
  locale: z.enum(['ar', 'en']).optional(),
  avatarFileId: uuid.nullable().optional(),
});
export type UpdateMeInput = z.input<typeof updateMeSchema>;

/** Account deletion request (Google Play / PDPL): recorded for the support team, completed within 30 days. */
export const accountDeletionSchema = z.object({ reason: z.string().trim().max(500).optional() });
export type AccountDeletionInput = z.input<typeof accountDeletionSchema>;
export interface AccountDeletionResult {
  requested: true;
  reference: string;
}

export interface OtpRequestResult {
  expiresInSeconds: number;
  resendInSeconds: number;
  /** Only present in development, to ease testing. */
  devCode?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

export interface AuthUser {
  id: string;
  type: UserType;
  name: string;
  phone: string | null;
  email: string | null;
  locale: 'ar' | 'en';
  avatarUrl: string | null;
}

export interface ContextSummary {
  type: ContextType;
  id: string | null;
  name: string;
  role: string | null;
  logoUrl: string | null;
}

export interface SessionContext extends ContextSummary {
  permissions: string[];
  /** Buyer/supplier verification status when applicable. */
  verificationStatus?: string | null;
}

export type AuthResult =
  | {
      status: 'AUTHENTICATED';
      tokens: AuthTokens;
      user: AuthUser;
      context: SessionContext;
      availableContexts: ContextSummary[];
    }
  | {
      status: 'REGISTRATION_REQUIRED';
      registrationToken: string;
      phone: string;
    };

export interface MeResponse {
  user: AuthUser;
  context: SessionContext;
  availableContexts: ContextSummary[];
}

export interface SessionDto {
  id: string;
  app: string;
  deviceName: string | null;
  ip: string | null;
  userAgent: string | null;
  lastUsedAt: string;
  createdAt: string;
  current: boolean;
}
