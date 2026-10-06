import { Injectable } from '@nestjs/common';
import {
  type AddressDto,
  addressInputSchema,
  type CompanyDto,
  ErrorCode,
  inviteBuyerMemberSchema,
  type MemberDto,
  paginationQuery,
  updateBuyerMemberSchema,
  updateCompanySchema,
} from '@tawreed/contracts';
import { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { citySelect, cityRef, pageMeta } from '../../common/http/presenters.js';
import { loc } from '../../common/i18n/localize.js';
import { buildSearchText } from '../../common/text/arabic.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SmsService } from '../../infrastructure/sms/sms.service.js';
import { FilesService } from '../files/files.service.js';
import { money } from '../pricing/domain/money.js';
import { findOrCreateInvitee, memberDto } from './members.helper.js';

export const adminBuyerQuery = paginationQuery.extend({
  verificationStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'NEEDS_INFO']).optional(),
  businessType: z.string().optional(),
  cityId: z.uuid().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

const companyInclude = { city: { select: citySelect } } satisfies Prisma.BuyerCompanyInclude;
type CompanyRow = Prisma.BuyerCompanyGetPayload<{ include: typeof companyInclude }>;
type AddressRow = Prisma.BuyerAddressGetPayload<{ include: { city: { select: typeof citySelect } } }>;

@Injectable()
export class BuyersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly sms: SmsService,
  ) {}

  /* ---------------------------------------------------------------- company */

  async toCompanyDto(c: CompanyRow): Promise<CompanyDto> {
    return {
      id: c.id,
      name: c.name,
      legalName: c.legalName,
      businessType: c.businessType,
      crNumber: c.crNumber,
      vatNumber: c.vatNumber,
      city: cityRef(c.city),
      logoUrl: await this.files.url(c.logoFileId),
      logoFileId: c.logoFileId,
      phone: c.phone,
      email: c.email,
      verificationStatus: c.verificationStatus,
      status: c.status,
      branchesCount: c.branchesCount,
      monthlyVolume: c.monthlyVolume,
      createdAt: c.createdAt.toISOString(),
    };
  }

  async getCompany(companyId: string): Promise<CompanyDto> {
    const c = await this.prisma.buyerCompany.findFirst({ where: { id: companyId, deletedAt: null }, include: companyInclude });
    if (!c) throw AppError.notFound();
    return this.toCompanyDto(c);
  }

  async updateCompany(companyId: string, input: z.output<typeof updateCompanySchema>): Promise<CompanyDto> {
    const before = await this.prisma.buyerCompany.findUnique({ where: { id: companyId } });
    if (!before) throw AppError.notFound();
    const data: Prisma.BuyerCompanyUpdateInput = {};
    for (const [k, v] of Object.entries(input)) if (v !== undefined) (data as Record<string, unknown>)[k === 'cityId' ? 'city' : k] = k === 'cityId' ? { connect: { id: v as string } } : v;
    data.searchText = buildSearchText(input.name ?? before.name, input.legalName ?? before.legalName, input.crNumber ?? before.crNumber, input.phone ?? before.phone);
    try {
      await this.prisma.buyerCompany.update({ where: { id: companyId }, data });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw AppError.conflict(JSON.stringify(err.meta?.target ?? '').includes('vat') ? ErrorCode.DUPLICATE_VAT_NUMBER : ErrorCode.DUPLICATE_CR_NUMBER);
      }
      throw err;
    }
    await this.audit.record(this.prisma, { action: 'company.updated', entityType: 'BuyerCompany', entityId: companyId, before: { name: before.name, crNumber: before.crNumber, vatNumber: before.vatNumber }, after: input });
    return this.getCompany(companyId);
  }

  /* ---------------------------------------------------------------- addresses */

  addressDto(a: AddressRow): AddressDto {
    const city = loc(a.city.nameAr, a.city.nameEn);
    const parts = [a.buildingNumber && a.street ? `${a.buildingNumber} ${a.street}` : a.street, a.district, city, a.postalCode].filter(Boolean);
    return {
      id: a.id,
      label: a.label,
      recipientName: a.recipientName,
      recipientPhone: a.recipientPhone,
      city: cityRef(a.city) as AddressDto['city'],
      district: a.district,
      street: a.street,
      buildingNumber: a.buildingNumber,
      postalCode: a.postalCode,
      additionalNumber: a.additionalNumber,
      shortAddress: a.shortAddress,
      lat: a.lat,
      lng: a.lng,
      notes: a.notes,
      isDefault: a.isDefault,
      formatted: parts.join('، '),
    };
  }

  async listAddresses(companyId: string): Promise<AddressDto[]> {
    const rows = await this.prisma.buyerAddress.findMany({ where: { companyId, deletedAt: null }, include: { city: { select: citySelect } }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
    return rows.map((a) => this.addressDto(a));
  }

  async getAddress(companyId: string, id: string): Promise<AddressDto> {
    const a = await this.prisma.buyerAddress.findFirst({ where: { id, companyId, deletedAt: null }, include: { city: { select: citySelect } } });
    if (!a) throw AppError.notFound();
    return this.addressDto(a);
  }

  async saveAddress(companyId: string, input: z.output<typeof addressInputSchema>, id?: string): Promise<AddressDto> {
    const saved = await this.prisma.tx(async (tx) => {
      const count = await tx.buyerAddress.count({ where: { companyId, deletedAt: null } });
      const isDefault = input.isDefault || count === 0 || (id ? undefined : false);
      if (isDefault) await tx.buyerAddress.updateMany({ where: { companyId, isDefault: true }, data: { isDefault: false } });
      const data = {
        label: input.label,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        cityId: input.cityId,
        district: input.district,
        street: input.street ?? null,
        buildingNumber: input.buildingNumber ?? null,
        postalCode: input.postalCode ?? null,
        additionalNumber: input.additionalNumber ?? null,
        shortAddress: input.shortAddress ?? null,
        lat: input.lat,
        lng: input.lng,
        notes: input.notes ?? null,
        ...(isDefault !== undefined ? { isDefault: !!isDefault } : {}),
      };
      if (id) {
        const found = await tx.buyerAddress.findFirst({ where: { id, companyId, deletedAt: null } });
        if (!found) throw AppError.notFound();
        return tx.buyerAddress.update({ where: { id }, data });
      }
      return tx.buyerAddress.create({ data: { ...data, companyId } });
    });
    return this.getAddress(companyId, saved.id);
  }

  async deleteAddress(companyId: string, id: string): Promise<void> {
    const a = await this.prisma.buyerAddress.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!a) throw AppError.notFound();
    await this.prisma.tx(async (tx) => {
      await tx.buyerAddress.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
      if (a.isDefault) {
        const next = await tx.buyerAddress.findFirst({ where: { companyId, deletedAt: null }, orderBy: { createdAt: 'asc' } });
        if (next) await tx.buyerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
  }

  /* ---------------------------------------------------------------- members */

  async listMembers(companyId: string, actor: Actor): Promise<MemberDto[]> {
    const rows = await this.prisma.buyerMember.findMany({
      where: { companyId, status: { not: 'REMOVED' } },
      include: { user: { select: { name: true, phone: true, email: true, lastLoginAt: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((m) => memberDto(m, actor.userId));
  }

  async inviteMember(companyId: string, actor: Actor, input: z.output<typeof inviteBuyerMemberSchema>): Promise<MemberDto> {
    const company = await this.prisma.buyerCompany.findUnique({ where: { id: companyId }, select: { name: true } });
    const member = await this.prisma.tx(async (tx) => {
      const user = await findOrCreateInvitee(tx, { ...input, type: 'BUYER' });
      const existing = await tx.buyerMember.findUnique({ where: { companyId_userId: { companyId, userId: user.id } } });
      const m = existing
        ? await tx.buyerMember.update({ where: { id: existing.id }, data: { role: input.role, status: 'INVITED', invitedById: actor.userId }, include: { user: true } })
        : await tx.buyerMember.create({ data: { companyId, userId: user.id, role: input.role, status: 'INVITED', invitedById: actor.userId }, include: { user: true } });
      await this.audit.record(tx, { action: 'company.member_invited', entityType: 'BuyerCompany', entityId: companyId, after: { phone: input.phone, role: input.role } });
      return m;
    });
    await this.sms.send(input.phone, `تمت دعوتك للانضمام إلى حساب ${company?.name ?? ''} في توريد. حمّل التطبيق وسجّل الدخول برقم جوالك.`);
    return memberDto(member, actor.userId);
  }

  async updateMember(companyId: string, actor: Actor, memberId: string, input: z.output<typeof updateBuyerMemberSchema>): Promise<MemberDto> {
    const member = await this.prisma.buyerMember.findFirst({ where: { id: memberId, companyId } });
    if (!member) throw AppError.notFound();
    if (member.userId === actor.userId && input.role && input.role !== member.role) throw AppError.forbidden();
    const demotingOwner = member.role === 'OWNER' && ((input.role && input.role !== 'OWNER') || input.status === 'REMOVED');
    if (demotingOwner) {
      const owners = await this.prisma.buyerMember.count({ where: { companyId, role: 'OWNER', status: 'ACTIVE' } });
      if (owners <= 1) throw AppError.conflict(ErrorCode.LAST_OWNER);
    }
    const updated = await this.prisma.buyerMember.update({
      where: { id: memberId },
      data: { ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) },
      include: { user: true },
    });
    await this.audit.record(this.prisma, { action: 'company.member_updated', entityType: 'BuyerCompany', entityId: companyId, before: { role: member.role, status: member.status }, after: input });
    return memberDto(updated, actor.userId);
  }

  /* ---------------------------------------------------------------- admin */

  async adminList(q: z.output<typeof adminBuyerQuery>) {
    const where: Prisma.BuyerCompanyWhereInput = {
      deletedAt: null,
      ...(q.verificationStatus ? { verificationStatus: q.verificationStatus } : {}),
      ...(q.businessType ? { businessType: q.businessType as never } : {}),
      ...(q.cityId ? { cityId: q.cityId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { searchText: { contains: buildSearchText(q.q) } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.buyerCompany.count({ where }),
      this.prisma.buyerCompany.findMany({
        where,
        include: { ...companyInclude, creditAccount: true, _count: { select: { orders: true, members: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    const spend = await this.prisma.order.groupBy({ by: ['companyId'], where: { companyId: { in: rows.map((r) => r.id) }, status: { not: 'CANCELLED' } }, _sum: { grandTotal: true } });
    const data = await Promise.all(
      rows.map(async (r) => ({
        ...(await this.toCompanyDto(r)),
        ordersCount: r._count.orders,
        membersCount: r._count.members,
        totalSpend: money(spend.find((s) => s.companyId === r.id)?._sum.grandTotal ?? 0),
        credit: r.creditAccount ? { status: r.creditAccount.status, limit: money(r.creditAccount.creditLimit), used: money(r.creditAccount.usedAmount) } : null,
      })),
    );
    return { data, meta: pageMeta(q.page, q.pageSize, total) };
  }

  async adminDetail(companyId: string) {
    const c = await this.prisma.buyerCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      include: {
        ...companyInclude,
        creditAccount: true,
        accountManager: { select: { id: true, name: true } },
        members: { include: { user: { select: { name: true, phone: true, email: true, lastLoginAt: true } } }, orderBy: { createdAt: 'asc' } },
        addresses: { where: { deletedAt: null }, include: { city: { select: citySelect } } },
      },
    });
    if (!c) throw AppError.notFound();
    const [orders, stats, openInvoices] = await Promise.all([
      this.prisma.order.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, number: true, status: true, paymentMethod: true, grandTotal: true, createdAt: true } }),
      this.prisma.order.aggregate({ where: { companyId, status: { not: 'CANCELLED' } }, _sum: { grandTotal: true }, _count: { _all: true } }),
      this.prisma.invoice.aggregate({ where: { companyId, status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } }, _sum: { balanceDue: true }, _count: { _all: true } }),
    ]);
    return {
      company: await this.toCompanyDto(c),
      accountManager: c.accountManager,
      members: c.members.map((m) => memberDto(m, '')),
      addresses: c.addresses.map((a) => this.addressDto(a)),
      credit: c.creditAccount
        ? { status: c.creditAccount.status, limit: money(c.creditAccount.creditLimit), used: money(c.creditAccount.usedAmount), available: money(c.creditAccount.creditLimit.minus(c.creditAccount.usedAmount)), termsDays: c.creditAccount.termsDays, riskLevel: c.creditAccount.riskLevel }
        : null,
      stats: { ordersCount: stats._count._all, totalSpend: money(stats._sum.grandTotal ?? 0), openInvoices: openInvoices._count._all, outstanding: money(openInvoices._sum.balanceDue ?? 0) },
      recentOrders: orders.map((o) => ({ ...o, grandTotal: money(o.grandTotal), createdAt: o.createdAt.toISOString() })),
    };
  }

  async adminSetStatus(companyId: string, status: 'ACTIVE' | 'SUSPENDED', note?: string) {
    await this.prisma.buyerCompany.update({ where: { id: companyId }, data: { status } });
    await this.audit.record(this.prisma, { action: 'company.status_changed', entityType: 'BuyerCompany', entityId: companyId, after: { status, note } });
    await this.outbox.publish(this.prisma, 'company.status_changed', { companyId, status });
    return this.getCompany(companyId);
  }

  async adminSetAccountManager(companyId: string, userId: string | null) {
    await this.prisma.buyerCompany.update({ where: { id: companyId }, data: { accountManagerId: userId } });
    await this.audit.record(this.prisma, { action: 'company.account_manager_set', entityType: 'BuyerCompany', entityId: companyId, after: { userId } });
    return this.getCompany(companyId);
  }
}
