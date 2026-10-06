import { Injectable } from '@nestjs/common';
import type { AppClient, ContextSummary, ContextType, SessionContext } from '@tawreed/contracts';
import { permissionsFor } from '../../common/auth/access-token.service.js';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { FilesService } from '../files/files.service.js';
import type { SessionContextClaims } from './session.service.js';

export const APP_CONTEXT: Record<AppClient, ContextType> = {
  WEB: 'BUYER',
  BUYER_APP: 'BUYER',
  SUPPLIER_WEB: 'SUPPLIER',
  SUPPLIER_APP: 'SUPPLIER',
  DRIVER_APP: 'DRIVER',
  ADMIN: 'STAFF',
};

export interface ResolvedContext extends ContextSummary {
  verificationStatus: string | null;
}

/** Works out which contexts (companies / suppliers / driver profile / staff) a user can act in. */
@Injectable()
export class ContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  async available(user: User, type: ContextType): Promise<ResolvedContext[]> {
    switch (type) {
      case 'BUYER': {
        const memberships = await this.prisma.buyerMember.findMany({
          where: { userId: user.id, status: { in: ['ACTIVE', 'INVITED'] }, company: { deletedAt: null } },
          include: { company: { select: { id: true, name: true, logoFileId: true, verificationStatus: true } } },
          orderBy: { createdAt: 'asc' },
        });
        const logos = await this.files.urlMap(memberships.map((m) => m.company.logoFileId));
        return memberships.map((m) => ({
          type: 'BUYER',
          id: m.company.id,
          name: m.company.name,
          role: m.role,
          logoUrl: m.company.logoFileId ? logos.get(m.company.logoFileId)?.url ?? null : null,
          verificationStatus: m.company.verificationStatus,
        }));
      }
      case 'SUPPLIER': {
        const memberships = await this.prisma.supplierMember.findMany({
          where: { userId: user.id, status: { in: ['ACTIVE', 'INVITED'] }, supplier: { deletedAt: null, status: { not: 'REJECTED' } } },
          include: { supplier: { select: { id: true, nameAr: true, nameEn: true, logoFileId: true, verificationStatus: true } } },
          orderBy: { createdAt: 'asc' },
        });
        const logos = await this.files.urlMap(memberships.map((m) => m.supplier.logoFileId));
        return memberships.map((m) => ({
          type: 'SUPPLIER',
          id: m.supplier.id,
          name: user.locale === 'en' ? m.supplier.nameEn : m.supplier.nameAr,
          role: m.role,
          logoUrl: m.supplier.logoFileId ? logos.get(m.supplier.logoFileId)?.url ?? null : null,
          verificationStatus: m.supplier.verificationStatus,
        }));
      }
      case 'DRIVER': {
        const driver = await this.prisma.driver.findUnique({
          where: { userId: user.id },
          include: { supplier: { select: { nameAr: true, nameEn: true } } },
        });
        if (!driver || driver.status === 'SUSPENDED') return [];
        const fleet = driver.supplier ? (user.locale === 'en' ? driver.supplier.nameEn : driver.supplier.nameAr) : user.locale === 'en' ? 'Tawreed fleet' : 'أسطول توريد';
        return [{ type: 'DRIVER', id: driver.id, name: fleet, role: driver.ownerType, logoUrl: null, verificationStatus: null }];
      }
      case 'STAFF':
        return user.type === 'STAFF'
          ? [{ type: 'STAFF', id: null, name: user.locale === 'en' ? 'Tawreed' : 'توريد', role: user.staffRoles[0] ?? null, logoUrl: null, verificationStatus: null }]
          : [];
    }
  }

  claims(user: User, ctx: ResolvedContext): SessionContextClaims {
    return {
      contextType: ctx.type,
      contextId: ctx.id,
      role: ctx.type === 'STAFF' ? null : ctx.role,
      staffRoles: ctx.type === 'STAFF' ? (user.staffRoles) : [],
    };
  }

  toSessionContext(user: User, ctx: ResolvedContext): SessionContext {
    const claims = this.claims(user, ctx);
    return {
      type: ctx.type,
      id: ctx.id,
      name: ctx.name,
      role: ctx.role,
      logoUrl: ctx.logoUrl,
      verificationStatus: ctx.verificationStatus,
      permissions: [...permissionsFor(claims.contextType, claims.role, claims.staffRoles)],
    };
  }

  summary(ctx: ResolvedContext): ContextSummary {
    return { type: ctx.type, id: ctx.id, name: ctx.name, role: ctx.role, logoUrl: ctx.logoUrl };
  }
}
