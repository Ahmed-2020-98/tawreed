import { Injectable } from '@nestjs/common';
import type { JWTPayload } from 'jose';
import {
  buyerRolePermissions,
  permissionsForStaff,
  supplierRolePermissions,
  type AppClient,
  type BuyerRole,
  type ContextType,
  type StaffRole,
  type SupplierRole,
} from '@tawreed/contracts';
import { AppConfig } from '../../config/app-config.js';
import { JwtService } from '../../infrastructure/crypto/jwt.service.js';
import { RedisService } from '../../infrastructure/redis/redis.service.js';
import type { Actor } from '../context/request-context.js';

export interface AccessClaims extends JWTPayload {
  sub: string;
  sid: string;
  app: AppClient;
  ctx: ContextType;
  cid: string | null;
  role: string | null;
  sr: StaffRole[];
}

const DRIVER_PERMISSIONS = ['driver.tasks.manage'];

export function permissionsFor(ctx: ContextType, role: string | null, staffRoles: StaffRole[]): Set<string> {
  switch (ctx) {
    case 'BUYER':
      return new Set(role ? buyerRolePermissions[role as BuyerRole] ?? [] : []);
    case 'SUPPLIER':
      return new Set(role ? supplierRolePermissions[role as SupplierRole] ?? [] : []);
    case 'DRIVER':
      return new Set(DRIVER_PERMISSIONS);
    case 'STAFF':
      return new Set(permissionsForStaff(staffRoles));
  }
}

/** Issues/verifies access tokens and tracks revoked sessions in Redis. */
@Injectable()
export class AccessTokenService {
  constructor(
    private readonly config: AppConfig,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  get ttlSeconds(): number {
    return this.config.env.JWT_ACCESS_TTL_SECONDS;
  }

  sign(claims: AccessClaims): Promise<string> {
    return this.jwt.sign({ ...claims }, this.config.env.JWT_ACCESS_SECRET, this.ttlSeconds, 'tawreed-api');
  }

  async verify(token: string): Promise<Actor | null> {
    const claims = await this.jwt.verify<AccessClaims>(token, this.config.env.JWT_ACCESS_SECRET, 'tawreed-api');
    if (!claims?.sub || !claims.sid) return null;
    if (await this.redis.client.exists(this.revokedKey(claims.sid))) return null;
    return {
      userId: claims.sub,
      sessionId: claims.sid,
      app: claims.app,
      contextType: claims.ctx,
      contextId: claims.cid ?? null,
      role: claims.role ?? null,
      staffRoles: claims.sr ?? [],
      permissions: permissionsFor(claims.ctx, claims.role ?? null, claims.sr ?? []),
    };
  }

  /** Blocks outstanding access tokens of a session until they expire naturally. */
  async revokeSession(sessionId: string): Promise<void> {
    await this.redis.client.set(this.revokedKey(sessionId), '1', 'EX', this.ttlSeconds + 60);
  }

  private revokedKey(sid: string) {
    return `revoked:session:${sid}`;
  }
}
