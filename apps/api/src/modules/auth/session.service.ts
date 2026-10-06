import { HttpStatus, Injectable } from '@nestjs/common';
import { type AppClient, type AuthTokens, type ContextType, ErrorCode, type StaffRole } from '@tawreed/contracts';
import { AccessTokenService } from '../../common/auth/access-token.service.js';
import { RequestContext } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { AppConfig } from '../../config/app-config.js';
import type { Session } from '../../generated/prisma/client.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

export interface SessionContextClaims {
  contextType: ContextType;
  contextId: string | null;
  role: string | null;
  staffRoles: StaffRole[];
}

const REFRESH_RACE_GRACE_MS = 15_000;

/** Refresh-token sessions: opaque 256-bit tokens stored as SHA-256, rotated on every use. */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly config: AppConfig,
    private readonly access: AccessTokenService,
  ) {}

  private expiry(): Date {
    return new Date(Date.now() + this.config.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  }

  async create(userId: string, app: AppClient, ctx: SessionContextClaims, device: { deviceId?: string; deviceName?: string } = {}): Promise<{ session: Session; tokens: AuthTokens }> {
    const refreshToken = this.crypto.randomToken();
    const reqCtx = RequestContext.get();
    const session = await this.prisma.session.create({
      data: {
        userId,
        app,
        contextType: ctx.contextType,
        contextId: ctx.contextId,
        refreshTokenHash: this.crypto.sha256(refreshToken),
        deviceId: device.deviceId ?? reqCtx?.deviceId ?? null,
        deviceName: device.deviceName ?? null,
        ip: reqCtx?.ip ?? null,
        userAgent: reqCtx?.userAgent?.slice(0, 300) ?? null,
        expiresAt: this.expiry(),
      },
    });
    return { session, tokens: await this.tokens(session, refreshToken, ctx) };
  }

  /** Rotates a refresh token. Reuse of an already-rotated token (outside a short grace window) revokes the session. */
  async rotate(refreshToken: string, ctx: (session: Session) => Promise<SessionContextClaims>): Promise<{ session: Session; tokens: AuthTokens }> {
    const hash = this.crypto.sha256(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    if (!session) {
      const reused = await this.prisma.session.findUnique({ where: { previousTokenHash: hash } });
      if (reused && !reused.revokedAt) {
        if (Date.now() - reused.lastUsedAt.getTime() < REFRESH_RACE_GRACE_MS) {
          throw AppError.conflict(ErrorCode.CONFLICT, {}, { reason: 'REFRESH_RACE' });
        }
        await this.revoke(reused.id, 'refresh_token_reuse');
        throw new AppError(ErrorCode.REFRESH_TOKEN_REUSED, HttpStatus.UNAUTHORIZED);
      }
      throw AppError.unauthenticated(ErrorCode.SESSION_EXPIRED);
    }
    if (session.revokedAt || session.expiresAt < new Date()) throw AppError.unauthenticated(ErrorCode.SESSION_EXPIRED);

    const claims = await ctx(session);
    const next = this.crypto.randomToken();
    const updated = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.crypto.sha256(next),
        previousTokenHash: hash,
        lastUsedAt: new Date(),
        expiresAt: this.expiry(),
        contextType: claims.contextType,
        contextId: claims.contextId,
      },
    });
    return { session: updated, tokens: await this.tokens(updated, next, claims) };
  }

  /** Re-issues tokens for an existing session with a new context (context switch). */
  async reissue(sessionId: string, claims: SessionContextClaims): Promise<AuthTokens> {
    const next = this.crypto.randomToken();
    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: { refreshTokenHash: this.crypto.sha256(next), previousTokenHash: null, contextType: claims.contextType, contextId: claims.contextId, lastUsedAt: new Date() },
    });
    // Previous access tokens (old context) simply expire (≤ JWT_ACCESS_TTL); the client swaps tokens immediately.
    return this.tokens(session, next, claims);
  }

  async revoke(sessionId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
    await this.access.revokeSession(sessionId);
  }

  async revokeAllForUser(userId: string, reason: string, exceptSessionId?: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({ where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) }, select: { id: true } });
    for (const s of sessions) await this.revoke(s.id, reason);
  }

  private async tokens(session: Session, refreshToken: string, ctx: SessionContextClaims): Promise<AuthTokens> {
    const accessToken = await this.access.sign({
      sub: session.userId,
      sid: session.id,
      app: session.app,
      ctx: ctx.contextType,
      cid: ctx.contextId,
      role: ctx.role,
      sr: ctx.staffRoles,
    });
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + this.access.ttlSeconds * 1000).toISOString(),
    };
  }
}
