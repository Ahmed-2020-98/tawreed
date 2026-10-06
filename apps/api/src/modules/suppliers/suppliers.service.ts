import { Injectable } from '@nestjs/common';
import {
  applicationDecisionSchema,
  applicationQuery,
  type CoverageDto,
  coverageInputSchema,
  ErrorCode,
  inviteSupplierMemberSchema,
  type MemberDto,
  paginationQuery,
  type SupplierApplicationDto,
  supplierApplicationSchema,
  type SupplierProfileDto,
  updateSupplierMemberSchema,
  updateSupplierProfileSchema,
  type WarehouseDto,
  warehouseInputSchema,
} from '@tawreed/contracts';
import { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { citySelect, cityRef, pageMeta } from '../../common/http/presenters.js';
import { buildSearchText, slugify } from '../../common/text/arabic.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SmsService } from '../../infrastructure/sms/sms.service.js';
import { findOrCreateInvitee, memberDto } from '../buyers/members.helper.js';
import { ProductStatsService } from '../catalog/product-stats.service.js';
import { FilesService } from '../files/files.service.js';
import { dec, money } from '../pricing/domain/money.js';

export const adminSupplierQuery = paginationQuery.extend({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']).optional(),
  verificationStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'NEEDS_INFO']).optional(),
});

export const adminSupplierUpdateSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']).optional(),
  commissionRate: z.number().min(0).max(0.5).optional(),
  isFeatured: z.boolean().optional(),
  minOrderValue: z.union([z.string(), z.number()]).transform(String).optional(),
});

const profileInclude = {
  city: { select: citySelect },
  coverage: { include: { city: { select: citySelect } }, orderBy: { createdAt: 'asc' } },
  warehouses: { include: { city: { select: citySelect } }, orderBy: { createdAt: 'asc' } },
  _count: { select: { offers: { where: { status: 'ACTIVE', deletedAt: null } }, documents: true } },
} satisfies Prisma.SupplierInclude;
type ProfileRow = Prisma.SupplierGetPayload<{ include: typeof profileInclude }>;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly sms: SmsService,
    private readonly stats: ProductStatsService,
  ) {}

  private coverageDto(c: ProfileRow['coverage'][number]): CoverageDto {
    return {
      id: c.id,
      city: cityRef(c.city) as CoverageDto['city'],
      deliveryFee: money(c.deliveryFee),
      freeDeliveryThreshold: c.freeDeliveryThreshold ? money(c.freeDeliveryThreshold) : null,
      leadTimeDays: c.leadTimeDays,
      sameDayAvailable: c.sameDayAvailable,
      cutoffTime: c.cutoffTime,
      isActive: c.isActive,
    };
  }

  private warehouseDto(w: ProfileRow['warehouses'][number]): WarehouseDto {
    return {
      id: w.id,
      name: w.name,
      city: cityRef(w.city) as WarehouseDto['city'],
      district: w.district,
      street: w.street,
      lat: w.lat,
      lng: w.lng,
      contactPhone: w.contactPhone,
      isDefault: w.isDefault,
      isActive: w.isActive,
    };
  }

  async toProfile(s: ProfileRow): Promise<SupplierProfileDto> {
    const urls = await this.files.urlMap([s.logoFileId, s.coverFileId]);
    return {
      id: s.id,
      slug: s.slug,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      legalName: s.legalName,
      descriptionAr: s.descriptionAr,
      descriptionEn: s.descriptionEn,
      logoUrl: s.logoFileId ? urls.get(s.logoFileId)?.url ?? null : null,
      logoFileId: s.logoFileId,
      coverUrl: s.coverFileId ? urls.get(s.coverFileId)?.url ?? null : null,
      coverFileId: s.coverFileId,
      crNumber: s.crNumber,
      vatNumber: s.vatNumber,
      iban: s.iban,
      bankName: s.bankName,
      beneficiaryName: s.beneficiaryName,
      commissionRate: dec(s.commissionRate).toString(),
      minOrderValue: money(s.minOrderValue),
      fleetMode: s.fleetMode,
      status: s.status,
      verificationStatus: s.verificationStatus,
      ratingAvg: dec(s.ratingAvg).toFixed(1),
      ratingCount: s.ratingCount,
      contactPhone: s.contactPhone,
      contactEmail: s.contactEmail,
      city: cityRef(s.city),
      foundedYear: s.foundedYear,
      isFeatured: s.isFeatured,
      coverage: s.coverage.map((c) => this.coverageDto(c)),
      warehouses: s.warehouses.map((w) => this.warehouseDto(w)),
      onboarding: {
        profile: !!(s.descriptionAr && s.logoFileId && s.crNumber),
        coverage: s.coverage.some((c) => c.isActive),
        warehouse: s.warehouses.some((w) => w.isActive),
        bank: !!(s.iban && s.bankName),
        documents: s._count.documents > 0,
        offers: s._count.offers > 0,
      },
      createdAt: s.createdAt.toISOString(),
    };
  }

  async profile(supplierId: string): Promise<SupplierProfileDto> {
    const s = await this.prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null }, include: profileInclude });
    if (!s) throw AppError.notFound();
    return this.toProfile(s);
  }

  async updateProfile(supplierId: string, input: z.output<typeof updateSupplierProfileSchema>): Promise<SupplierProfileDto> {
    const before = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!before) throw AppError.notFound();
    const data: Prisma.SupplierUncheckedUpdateInput = {};
    for (const [k, v] of Object.entries(input)) if (v !== undefined) (data as Record<string, unknown>)[k] = v;
    data.searchText = buildSearchText(input.nameAr ?? before.nameAr, input.nameEn ?? before.nameEn, input.crNumber ?? before.crNumber);
    try {
      await this.prisma.supplier.update({ where: { id: supplierId }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw AppError.conflict(JSON.stringify(err.meta?.target ?? '').includes('vat') ? ErrorCode.DUPLICATE_VAT_NUMBER : ErrorCode.DUPLICATE_CR_NUMBER);
      }
      throw err;
    }
    await this.audit.record(this.prisma, { action: 'supplier.profile_updated', entityType: 'Supplier', entityId: supplierId, after: input });
    return this.profile(supplierId);
  }

  async saveCoverage(supplierId: string, input: z.output<typeof coverageInputSchema>): Promise<SupplierProfileDto> {
    await this.prisma.tx(async (tx) => {
      const keep = new Set(input.items.map((i) => i.cityId));
      await tx.supplierCoverage.updateMany({ where: { supplierId, cityId: { notIn: [...keep] } }, data: { isActive: false } });
      for (const item of input.items) {
        const data = {
          deliveryFee: item.deliveryFee,
          freeDeliveryThreshold: item.freeDeliveryThreshold ?? null,
          leadTimeDays: item.leadTimeDays,
          sameDayAvailable: item.sameDayAvailable,
          cutoffTime: item.cutoffTime ?? null,
          isActive: item.isActive,
        };
        await tx.supplierCoverage.upsert({ where: { supplierId_cityId: { supplierId, cityId: item.cityId } }, create: { ...data, supplierId, cityId: item.cityId }, update: data });
      }
      await this.audit.record(tx, { action: 'supplier.coverage_updated', entityType: 'Supplier', entityId: supplierId, meta: { cities: input.items.length } });
    });
    return this.profile(supplierId);
  }

  async saveWarehouse(supplierId: string, input: z.output<typeof warehouseInputSchema>, id?: string): Promise<SupplierProfileDto> {
    await this.prisma.tx(async (tx) => {
      if (input.isDefault) await tx.supplierWarehouse.updateMany({ where: { supplierId }, data: { isDefault: false } });
      const data = { name: input.name, cityId: input.cityId, district: input.district ?? null, street: input.street ?? null, lat: input.lat, lng: input.lng, contactPhone: input.contactPhone ?? null, isDefault: input.isDefault, isActive: input.isActive };
      if (id) {
        const found = await tx.supplierWarehouse.findFirst({ where: { id, supplierId } });
        if (!found) throw AppError.notFound();
        await tx.supplierWarehouse.update({ where: { id }, data });
      } else {
        const count = await tx.supplierWarehouse.count({ where: { supplierId } });
        await tx.supplierWarehouse.create({ data: { ...data, supplierId, isDefault: input.isDefault || count === 0 } });
      }
    });
    return this.profile(supplierId);
  }

  async deleteWarehouse(supplierId: string, id: string): Promise<SupplierProfileDto> {
    const w = await this.prisma.supplierWarehouse.findFirst({ where: { id, supplierId } });
    if (!w) throw AppError.notFound();
    await this.prisma.supplierWarehouse.update({ where: { id }, data: { isActive: false, isDefault: false } });
    return this.profile(supplierId);
  }

  /* ---------------------------------------------------------------- members */

  async listMembers(supplierId: string, actor: Actor): Promise<MemberDto[]> {
    const rows = await this.prisma.supplierMember.findMany({ where: { supplierId, status: { not: 'REMOVED' } }, include: { user: true }, orderBy: { createdAt: 'asc' } });
    return rows.map((m) => memberDto(m, actor.userId));
  }

  async inviteMember(supplierId: string, actor: Actor, input: z.output<typeof inviteSupplierMemberSchema>): Promise<MemberDto> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId }, select: { nameAr: true } });
    const m = await this.prisma.tx(async (tx) => {
      const user = await findOrCreateInvitee(tx, { ...input, type: 'SUPPLIER' });
      const existing = await tx.supplierMember.findUnique({ where: { supplierId_userId: { supplierId, userId: user.id } } });
      const member = existing
        ? await tx.supplierMember.update({ where: { id: existing.id }, data: { role: input.role, status: 'INVITED' }, include: { user: true } })
        : await tx.supplierMember.create({ data: { supplierId, userId: user.id, role: input.role, status: 'INVITED', invitedById: actor.userId }, include: { user: true } });
      await this.audit.record(tx, { action: 'supplier.member_invited', entityType: 'Supplier', entityId: supplierId, after: { phone: input.phone, role: input.role } });
      return member;
    });
    await this.sms.send(input.phone, `تمت إضافتك إلى فريق ${supplier?.nameAr ?? ''} على توريد. سجّل الدخول لتطبيق الموردين برقم جوالك.`);
    return memberDto(m, actor.userId);
  }

  async updateMember(supplierId: string, actor: Actor, memberId: string, input: z.output<typeof updateSupplierMemberSchema>): Promise<MemberDto> {
    const member = await this.prisma.supplierMember.findFirst({ where: { id: memberId, supplierId } });
    if (!member) throw AppError.notFound();
    if (member.userId === actor.userId && input.role && input.role !== member.role) throw AppError.forbidden();
    if (member.role === 'OWNER' && ((input.role && input.role !== 'OWNER') || input.status === 'REMOVED')) {
      const owners = await this.prisma.supplierMember.count({ where: { supplierId, role: 'OWNER', status: 'ACTIVE' } });
      if (owners <= 1) throw AppError.conflict(ErrorCode.LAST_OWNER);
    }
    const updated = await this.prisma.supplierMember.update({ where: { id: memberId }, data: { ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) }, include: { user: true } });
    await this.audit.record(this.prisma, { action: 'supplier.member_updated', entityType: 'Supplier', entityId: supplierId, after: input });
    return memberDto(updated, actor.userId);
  }

  /* ---------------------------------------------------------------- applications */

  private applicationDto(a: Prisma.SupplierApplicationGetPayload<{ include: { city: { select: typeof citySelect } } }>): SupplierApplicationDto {
    return {
      id: a.id,
      companyName: a.companyName,
      contactName: a.contactName,
      phone: a.phone,
      email: a.email,
      city: cityRef(a.city),
      categories: a.categories,
      crNumber: a.crNumber,
      vatNumber: a.vatNumber,
      message: a.message,
      status: a.status,
      supplierId: a.supplierId,
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
    };
  }

  async apply(input: z.output<typeof supplierApplicationSchema>): Promise<{ id: string }> {
    const app = await this.prisma.tx(async (tx) => {
      const a = await tx.supplierApplication.create({
        data: { companyName: input.companyName, contactName: input.contactName, phone: input.phone, email: input.email ?? null, cityId: input.cityId ?? null, categories: input.categories, crNumber: input.crNumber ?? null, vatNumber: input.vatNumber ?? null, message: input.message ?? null },
      });
      await this.outbox.publish(tx, 'supplier.applied', { applicationId: a.id });
      return a;
    });
    return { id: app.id };
  }

  async listApplications(q: z.output<typeof applicationQuery>) {
    const where: Prisma.SupplierApplicationWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ companyName: { contains: q.q, mode: 'insensitive' } }, { phone: { contains: q.q } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.supplierApplication.count({ where }),
      this.prisma.supplierApplication.findMany({ where, include: { city: { select: citySelect } }, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { data: rows.map((a) => this.applicationDto(a)), meta: pageMeta(q.page, q.pageSize, total) };
  }

  async decideApplication(id: string, reviewerId: string, input: z.output<typeof applicationDecisionSchema>): Promise<SupplierApplicationDto> {
    const app = await this.prisma.supplierApplication.findUnique({ where: { id }, include: { city: { select: citySelect } } });
    if (!app) throw AppError.notFound();
    if (app.status === 'APPROVED') throw AppError.conflict(ErrorCode.INVALID_STATE_TRANSITION);
    if (input.decision !== 'APPROVE') {
      const updated = await this.prisma.supplierApplication.update({ where: { id }, data: { status: input.decision === 'REJECT' ? 'REJECTED' : 'CONTACTED', notes: input.notes ?? app.notes, reviewedById: reviewerId }, include: { city: { select: citySelect } } });
      await this.audit.record(this.prisma, { action: 'supplier_application.decided', entityType: 'SupplierApplication', entityId: id, after: input });
      return this.applicationDto(updated);
    }
    const updated = await this.prisma.tx(async (tx) => {
      const nameEn = input.nameEn ?? app.companyName;
      let slug = input.slug ?? (slugify(nameEn) || `supplier-${Date.now()}`);
      if (await tx.supplier.findUnique({ where: { slug } })) slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
      const user = await findOrCreateInvitee(tx, { name: app.contactName, phone: app.phone, type: 'SUPPLIER' });
      const supplier = await tx.supplier.create({
        data: {
          slug,
          nameAr: app.companyName,
          nameEn,
          crNumber: app.crNumber,
          vatNumber: app.vatNumber && /^3\d{13}3$/.test(app.vatNumber) ? app.vatNumber : null,
          contactPhone: app.phone,
          contactEmail: app.email,
          cityId: app.cityId,
          commissionRate: input.commissionRate ?? 0.05,
          searchText: buildSearchText(app.companyName, nameEn, app.crNumber),
          members: { create: { userId: user.id, role: 'OWNER', status: 'ACTIVE' } },
        },
      });
      const a = await tx.supplierApplication.update({ where: { id }, data: { status: 'APPROVED', supplierId: supplier.id, notes: input.notes ?? app.notes, reviewedById: reviewerId }, include: { city: { select: citySelect } } });
      await this.audit.record(tx, { action: 'supplier_application.approved', entityType: 'Supplier', entityId: supplier.id, meta: { applicationId: id } });
      await this.outbox.publish(tx, 'supplier.approved', { supplierId: supplier.id, userId: user.id });
      return a;
    });
    await this.sms.send(app.phone, 'تم قبول طلب انضمامك كمورد في توريد 🎉 سجّل الدخول لبوابة الموردين برقم جوالك لإكمال ملفك.');
    return this.applicationDto(updated);
  }

  /* ---------------------------------------------------------------- admin suppliers */

  async adminList(q: z.output<typeof adminSupplierQuery>) {
    const where: Prisma.SupplierWhereInput = {
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.verificationStatus ? { verificationStatus: q.verificationStatus } : {}),
      ...(q.q ? { searchText: { contains: buildSearchText(q.q) } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({ where, include: profileInclude, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    const sales = await this.prisma.supplierOrder.groupBy({ by: ['supplierId'], where: { supplierId: { in: rows.map((r) => r.id) }, status: { in: ['DELIVERED', 'COMPLETED', 'PARTIALLY_DELIVERED'] } }, _sum: { total: true }, _count: { _all: true } });
    const data = await Promise.all(
      rows.map(async (s) => {
        const agg = sales.find((x) => x.supplierId === s.id);
        return { ...(await this.toProfile(s)), activeOffers: s._count.offers, deliveredOrders: agg?._count._all ?? 0, gmv: money(agg?._sum.total ?? 0) };
      }),
    );
    return { data, meta: pageMeta(q.page, q.pageSize, total) };
  }

  async adminUpdate(id: string, input: z.output<typeof adminSupplierUpdateSchema>): Promise<SupplierProfileDto> {
    const before = await this.prisma.supplier.findUnique({ where: { id } });
    if (!before) throw AppError.notFound();
    await this.prisma.supplier.update({ where: { id }, data: { ...input } });
    await this.audit.record(this.prisma, { action: 'supplier.admin_updated', entityType: 'Supplier', entityId: id, before: { status: before.status, commissionRate: before.commissionRate.toString() }, after: input });
    if (input.status && input.status !== before.status) {
      await this.outbox.publish(this.prisma, 'supplier.status_changed', { supplierId: id, status: input.status });
      await this.stats.refreshForSupplier(id);
    }
    return this.profile(id);
  }
}
