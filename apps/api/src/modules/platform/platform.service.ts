import { Injectable } from '@nestjs/common';
import { auditQuery, ErrorCode, staffInputSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { pageMeta } from '../../common/http/presenters.js';
import { buildSearchText } from '../../common/text/arabic.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SessionService } from '../auth/session.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { ViewerService } from '../catalog/viewer.service.js';
import { money } from '../pricing/domain/money.js';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
    private readonly catalog: CatalogService,
    private readonly viewers: ViewerService,
  ) {}

  /* ---------------------------------------------------------------- staff */

  async staff() {
    const rows = await this.prisma.user.findMany({ where: { type: 'STAFF', deletedAt: null }, orderBy: { createdAt: 'asc' } });
    return rows.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, staffRoles: u.staffRoles, jobTitle: u.jobTitle, status: u.status, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, twoFactorEnabled: u.twoFactorEnabled, createdAt: u.createdAt.toISOString() }));
  }

  async saveStaff(input: z.output<typeof staffInputSchema>, id?: string) {
    const email = input.email.toLowerCase();
    const data = { name: input.name, email, phone: input.phone || null, staffRoles: input.staffRoles, jobTitle: input.jobTitle ?? null, status: input.status, ...(input.password ? { passwordHash: await this.crypto.hashPassword(input.password) } : {}) };
    if (id) {
      await this.prisma.user.update({ where: { id }, data });
      if (input.status === 'SUSPENDED') await this.sessions.revokeAllForUser(id, 'suspended');
    } else {
      if (!input.password) throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED, {}, { fields: [{ path: 'password', message: 'required' }] });
      const exists = await this.prisma.user.findUnique({ where: { email } });
      if (exists) throw AppError.conflict(ErrorCode.CONFLICT);
      await this.prisma.user.create({ data: { ...data, type: 'STAFF' } });
    }
    await this.audit.record(this.prisma, { action: id ? 'staff.updated' : 'staff.created', entityType: 'User', entityId: id ?? email, after: { email, roles: input.staffRoles, status: input.status } });
    return this.staff();
  }

  async forceLogout(userId: string) {
    await this.sessions.revokeAllForUser(userId, 'forced_logout');
    await this.audit.record(this.prisma, { action: 'user.forced_logout', entityType: 'User', entityId: userId });
    return { ok: true };
  }

  async setUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    await this.prisma.user.update({ where: { id: userId }, data: { status } });
    if (status === 'SUSPENDED') await this.sessions.revokeAllForUser(userId, 'suspended');
    await this.audit.record(this.prisma, { action: 'user.status_changed', entityType: 'User', entityId: userId, after: { status } });
    return { ok: true };
  }

  /* ---------------------------------------------------------------- audit */

  async auditLog(q: z.output<typeof auditQuery>) {
    const where: Prisma.AuditLogWhereInput = {
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.action ? { action: { contains: q.action } } : {}),
    };
    const [total, rows] = await Promise.all([this.prisma.auditLog.count({ where }), this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize })]);
    const actors = await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.actorId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
    return {
      data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), actorName: actors.find((a) => a.id === r.actorId)?.name ?? null })),
      meta: pageMeta(q.page, q.pageSize, total),
    };
  }

  /* ---------------------------------------------------------------- global search (admin) */

  async search(q: string) {
    const term = buildSearchText(q);
    const [orders, companies, suppliers, products, invoices, users] = await Promise.all([
      this.prisma.order.findMany({ where: { number: { contains: q, mode: 'insensitive' } }, take: 5, select: { id: true, number: true, status: true, grandTotal: true } }),
      this.prisma.buyerCompany.findMany({ where: { searchText: { contains: term } }, take: 5, select: { id: true, name: true, verificationStatus: true } }),
      this.prisma.supplier.findMany({ where: { searchText: { contains: term } }, take: 5, select: { id: true, nameAr: true, status: true } }),
      this.prisma.product.findMany({ where: { searchText: { contains: term }, deletedAt: null }, take: 5, select: { id: true, nameAr: true, slug: true } }),
      this.prisma.invoice.findMany({ where: { number: { contains: q, mode: 'insensitive' } }, take: 5, select: { id: true, number: true, total: true, status: true } }),
      this.prisma.user.findMany({ where: { OR: [{ phone: { contains: q } }, { email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] }, take: 5, select: { id: true, name: true, phone: true, type: true } }),
    ]);
    return {
      orders: orders.map((o) => ({ ...o, grandTotal: money(o.grandTotal) })),
      companies,
      suppliers,
      products,
      invoices: invoices.map((i) => ({ ...i, total: money(i.total) })),
      users,
    };
  }

  /* ---------------------------------------------------------------- favorites */

  async favorites(actor: Actor) {
    const rows = await this.prisma.favorite.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' }, select: { productId: true } });
    return this.catalog.cardsByIds(rows.map((r) => r.productId), await this.viewers.resolve(actor));
  }

  async toggleFavorite(actor: Actor, productId: string, on: boolean) {
    if (on) await this.prisma.favorite.upsert({ where: { userId_productId: { userId: actor.userId, productId } }, create: { userId: actor.userId, productId }, update: {} });
    else await this.prisma.favorite.deleteMany({ where: { userId: actor.userId, productId } });
    return { productId, isFavorite: on };
  }
}
