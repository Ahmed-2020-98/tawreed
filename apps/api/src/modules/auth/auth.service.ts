import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type AccountDeletionResult,
  type AuthResult,
  type AuthUser,
  type BuyerRegisterInput,
  ErrorCode,
  type MeResponse,
  type OtpRequestInput,
  type OtpRequestResult,
  type OtpVerifyInput,
  type SessionDto,
  type StaffLoginInput,
  type UpdateMeInput,
  buyerRegisterSchema,
  otpRequestSchema,
  otpVerifySchema,
  staffLoginSchema,
} from '@tawreed/contracts';
import type { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { RequestContext } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { buildSearchText } from '../../common/text/arabic.js';
import { AppConfig } from '../../config/app-config.js';
import { Prisma, type User } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';
import { JwtService } from '../../infrastructure/crypto/jwt.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { RedisService } from '../../infrastructure/redis/redis.service.js';
import { FilesService } from '../files/files.service.js';
import { APP_CONTEXT, ContextService, type ResolvedContext } from './context.service.js';
import { OtpService } from './otp.service.js';
import { SessionService } from './session.service.js';

const REGISTRATION_AUDIENCE = 'tawreed-registration';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly otp: OtpService,
    private readonly sessions: SessionService,
    private readonly contexts: ContextService,
    private readonly jwt: JwtService,
    private readonly crypto: CryptoService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly files: FilesService,
  ) {}

  async requestOtp(input: z.output<typeof otpRequestSchema>): Promise<OtpRequestResult> {
    const type = APP_CONTEXT[input.app];
    if (type === 'STAFF') throw AppError.forbidden();
    if (type !== 'BUYER') {
      const user = await this.prisma.user.findUnique({ where: { phone: input.phone } });
      if (!user || user.type !== type || user.deletedAt) throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const { code: _code, ...result } = await this.otp.issue('login', input.phone, { locale: RequestContext.locale(), ip: RequestContext.get()?.ip });
    return result;
  }

  async verifyOtp(input: z.output<typeof otpVerifySchema>): Promise<AuthResult> {
    await this.otp.verify('login', input.phone, input.code);
    const type = APP_CONTEXT[input.app];
    const user = await this.prisma.user.findUnique({ where: { phone: input.phone } });

    if (!user || user.deletedAt) {
      if (type === 'BUYER') return this.registrationRequired(input.phone, input.app);
      throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.assertUsable(user, type);
    const available = await this.contexts.available(user, type);
    if (!available.length) {
      if (type === 'BUYER') return this.registrationRequired(input.phone, input.app);
      throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(), lastLoginAt: new Date() } }),
      this.prisma.buyerMember.updateMany({ where: { userId: user.id, status: 'INVITED' }, data: { status: 'ACTIVE' } }),
      this.prisma.supplierMember.updateMany({ where: { userId: user.id, status: 'INVITED' }, data: { status: 'ACTIVE' } }),
    ]);
    const preferred = await this.preferredContext(user.id, input.app, available);
    return this.authenticate(user, input.app, preferred, available, { deviceId: input.deviceId, deviceName: input.deviceName });
  }

  async registerBuyer(input: z.output<typeof buyerRegisterSchema>): Promise<AuthResult> {
    const claims = await this.jwt.verify<{ phone: string; app: string }>(input.registrationToken, this.config.env.JWT_ACCESS_SECRET, REGISTRATION_AUDIENCE);
    if (!claims?.phone) throw AppError.unauthenticated(ErrorCode.SESSION_EXPIRED);
    const phone = claims.phone;

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing && existing.type !== 'BUYER') throw AppError.conflict(ErrorCode.ACCOUNT_TYPE_MISMATCH);

    const { user, companyId } = await this.prisma.tx(async (tx) => {
      const user = existing
        ? await tx.user.update({ where: { id: existing.id }, data: { name: input.name, email: input.email ?? existing.email, lastLoginAt: new Date() } })
        : await tx.user.create({
            data: { type: 'BUYER', name: input.name, phone, email: input.email?.toLowerCase() ?? null, phoneVerifiedAt: new Date(), lastLoginAt: new Date(), locale: RequestContext.locale() },
          });
      try {
        const company = await tx.buyerCompany.create({
          data: {
            name: input.company.name,
            legalName: input.company.legalName ?? null,
            businessType: input.company.businessType,
            crNumber: input.company.crNumber ?? null,
            vatNumber: input.company.vatNumber ?? null,
            cityId: input.company.cityId,
            branchesCount: input.company.branchesCount ?? 1,
            monthlyVolume: input.company.monthlyVolume ?? null,
            phone,
            email: input.email?.toLowerCase() ?? null,
            searchText: buildSearchText(input.company.name, input.company.legalName, input.company.crNumber, phone),
            members: { create: { userId: user.id, role: 'OWNER', status: 'ACTIVE' } },
            creditAccount: { create: { status: 'NO_CREDIT' } },
          },
        });
        await this.audit.record(tx, { action: 'buyer.registered', entityType: 'BuyerCompany', entityId: company.id, after: { name: company.name }, actorType: 'BUYER', actorId: user.id });
        await this.outbox.publish(tx, 'buyer.registered', { companyId: company.id, userId: user.id });
        return { user, companyId: company.id };
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const target = JSON.stringify(err.meta?.target ?? '');
          throw AppError.conflict(target.includes('vat') ? ErrorCode.DUPLICATE_VAT_NUMBER : ErrorCode.DUPLICATE_CR_NUMBER);
        }
        throw err;
      }
    });

    const available = await this.contexts.available(user, 'BUYER');
    const ctx = available.find((c) => c.id === companyId) ?? available[0];
    if (!ctx) throw new AppError(ErrorCode.INTERNAL, HttpStatus.INTERNAL_SERVER_ERROR);
    return this.authenticate(user, input.app, ctx, available, { deviceId: input.deviceId, deviceName: input.deviceName });
  }

  async staffLogin(input: z.output<typeof staffLoginSchema>): Promise<AuthResult> {
    const email = input.email.toLowerCase();
    const rlKey = `login:rl:${email}:${RequestContext.get()?.ip ?? 'na'}`;
    const attempts = await this.redis.client.incr(rlKey);
    if (attempts === 1) await this.redis.client.expire(rlKey, 15 * 60);
    if (attempts > 10) throw new AppError(ErrorCode.RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS);

    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = user?.passwordHash && user.type === 'STAFF' ? await this.crypto.verifyPassword(user.passwordHash, input.password) : false;
    if (!user || !valid) throw AppError.unauthenticated(ErrorCode.INVALID_CREDENTIALS);
    this.assertUsable(user, 'STAFF');
    await this.redis.client.del(rlKey);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const available = await this.contexts.available(user, 'STAFF');
    const ctx = available[0];
    if (!ctx) throw AppError.forbidden();
    await this.audit.record(this.prisma, { action: 'staff.login', entityType: 'User', entityId: user.id, actorType: 'STAFF', actorId: user.id });
    return this.authenticate(user, 'ADMIN', ctx, available, { deviceId: input.deviceId });
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    let resolved: { user: User; ctx: ResolvedContext; available: ResolvedContext[] } | undefined;
    const { tokens } = await this.sessions.rotate(refreshToken, async (session) => {
      const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
      if (!user || user.deletedAt) throw AppError.unauthenticated(ErrorCode.SESSION_EXPIRED);
      this.assertUsable(user, session.contextType);
      const available = await this.contexts.available(user, session.contextType);
      const ctx = available.find((c) => c.id === session.contextId) ?? available[0];
      if (!ctx) throw AppError.unauthenticated(ErrorCode.SESSION_EXPIRED);
      resolved = { user, ctx, available };
      return this.contexts.claims(user, ctx);
    });
    if (!resolved) throw AppError.unauthenticated(ErrorCode.SESSION_EXPIRED);
    const { user, ctx, available } = resolved;
    return {
      status: 'AUTHENTICATED',
      tokens,
      user: await this.toAuthUser(user),
      context: this.contexts.toSessionContext(user, ctx),
      availableContexts: available.map((c) => this.contexts.summary(c)),
    };
  }

  async logout(actor: Actor): Promise<void> {
    await this.sessions.revoke(actor.sessionId, 'logout');
  }

  async switchContext(actor: Actor, contextId: string): Promise<AuthResult> {
    const user = await this.getUser(actor.userId);
    const available = await this.contexts.available(user, actor.contextType);
    const ctx = available.find((c) => c.id === contextId);
    if (!ctx) throw AppError.forbidden();
    const tokens = await this.sessions.reissue(actor.sessionId, this.contexts.claims(user, ctx));
    return {
      status: 'AUTHENTICATED',
      tokens,
      user: await this.toAuthUser(user),
      context: this.contexts.toSessionContext(user, ctx),
      availableContexts: available.map((c) => this.contexts.summary(c)),
    };
  }

  async me(actor: Actor): Promise<MeResponse> {
    const user = await this.getUser(actor.userId);
    const available = await this.contexts.available(user, actor.contextType);
    const ctx = available.find((c) => c.id === actor.contextId) ?? available[0];
    if (!ctx) throw AppError.unauthenticated(ErrorCode.SESSION_EXPIRED);
    return {
      user: await this.toAuthUser(user),
      context: this.contexts.toSessionContext(user, ctx),
      availableContexts: available.map((c) => this.contexts.summary(c)),
    };
  }

  /** Records an account deletion request as a support lead (staff completes it within 30 days). */
  async requestDeletion(actor: Actor, reason?: string): Promise<AccountDeletionResult> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { id: true, name: true, phone: true } });
    const lead = await this.prisma.lead.create({
      data: {
        type: 'SUPPORT',
        name: user.name,
        phone: user.phone ?? '',
        source: 'account-deletion',
        message: [`طلب حذف حساب — user ${user.id}`, `context ${actor.contextType}${actor.contextId ? ` ${actor.contextId}` : ''}`, reason ? `السبب: ${reason}` : null].filter(Boolean).join('\n'),
      },
    });
    await this.outbox.publish(this.prisma, 'lead.created', { leadId: lead.id });
    return { requested: true, reference: lead.id.slice(-8).toUpperCase() };
  }

  async updateMe(actor: Actor, input: UpdateMeInput): Promise<MeResponse> {
    await this.prisma.user.update({
      where: { id: actor.userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email?.toLowerCase() ?? null } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
        ...(input.avatarFileId !== undefined ? { avatarFileId: input.avatarFileId } : {}),
      },
    });
    return this.me(actor);
  }

  async listSessions(actor: Actor): Promise<SessionDto[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId: actor.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      app: s.app,
      deviceName: s.deviceName,
      ip: s.ip,
      userAgent: s.userAgent,
      lastUsedAt: s.lastUsedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      current: s.id === actor.sessionId,
    }));
  }

  async revokeSession(actor: Actor, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId: actor.userId } });
    if (!session) throw AppError.notFound();
    await this.sessions.revoke(session.id, 'user_revoked');
  }

  /* ------------------------------------------------------------------ helpers */

  async toAuthUser(user: User): Promise<AuthUser> {
    return {
      id: user.id,
      type: user.type,
      name: user.name,
      phone: user.phone,
      email: user.email,
      locale: user.locale === 'en' ? 'en' : 'ar',
      avatarUrl: await this.files.url(user.avatarFileId),
    };
  }

  private async getUser(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw AppError.unauthenticated(ErrorCode.SESSION_EXPIRED);
    return user;
  }

  private assertUsable(user: User, type: string): void {
    if (user.status === 'SUSPENDED') throw AppError.forbidden(ErrorCode.ACCOUNT_SUSPENDED);
    if (user.type !== type) throw AppError.forbidden(ErrorCode.ACCOUNT_TYPE_MISMATCH);
  }

  private async registrationRequired(phone: string, app: string): Promise<AuthResult> {
    const registrationToken = await this.jwt.sign({ phone, app }, this.config.env.JWT_ACCESS_SECRET, 30 * 60, REGISTRATION_AUDIENCE);
    return { status: 'REGISTRATION_REQUIRED', registrationToken, phone };
  }

  private async preferredContext(userId: string, app: string, available: ResolvedContext[]): Promise<ResolvedContext> {
    const last = await this.prisma.session.findFirst({ where: { userId, app: app as never }, orderBy: { lastUsedAt: 'desc' }, select: { contextId: true } });
    return available.find((c) => c.id === last?.contextId) ?? (available[0] as ResolvedContext);
  }

  private async authenticate(user: User, app: OtpVerifyInput['app'] | 'ADMIN', ctx: ResolvedContext, available: ResolvedContext[], device: { deviceId?: string; deviceName?: string }): Promise<AuthResult> {
    const { tokens } = await this.sessions.create(user.id, app, this.contexts.claims(user, ctx), device);
    return {
      status: 'AUTHENTICATED',
      tokens,
      user: await this.toAuthUser(user),
      context: this.contexts.toSessionContext(user, ctx),
      availableContexts: available.map((c) => this.contexts.summary(c)),
    };
  }
}

export type { BuyerRegisterInput, OtpRequestInput, StaffLoginInput };
