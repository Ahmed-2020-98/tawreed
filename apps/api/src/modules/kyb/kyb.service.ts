import { Injectable } from '@nestjs/common';
import {
  type PageMeta,
  addKybDocumentSchema,
  ErrorCode,
  type KybDocType,
  type KybDocumentDto,
  kybDecisionSchema,
  kybDocumentDecisionSchema,
  type KybOverviewDto,
  kybQueueQuery,
} from '@tawreed/contracts';
import type { z } from 'zod';
import { AppError } from '../../common/http/app-error.js';
import { pageMeta } from '../../common/http/presenters.js';
import { buildSearchText } from '../../common/text/arabic.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { ProductStatsService } from '../catalog/product-stats.service.js';

export type KybOwner = { kind: 'BUYER'; id: string } | { kind: 'SUPPLIER'; id: string };

export const REQUIRED_DOCS: Record<KybOwner['kind'], KybDocType[]> = {
  BUYER: ['COMMERCIAL_REGISTRATION', 'NATIONAL_ADDRESS'],
  SUPPLIER: ['COMMERCIAL_REGISTRATION', 'VAT_CERTIFICATE', 'IBAN_LETTER', 'NATIONAL_ADDRESS'],
};

export interface KybQueueItem {
  kind: 'BUYER' | 'SUPPLIER';
  id: string;
  name: string;
  businessType: string | null;
  city: string | null;
  crNumber: string | null;
  verificationStatus: string;
  documentsCount: number;
  updatedAt: string;
}

const ownerWhere = (o: KybOwner) => (o.kind === 'BUYER' ? { buyerCompanyId: o.id } : { supplierId: o.id });

/** Business verification (KYB) for buyer companies and suppliers. */
@Injectable()
export class KybService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly stats: ProductStatsService,
  ) {}

  private async status(owner: KybOwner) {
    const row =
      owner.kind === 'BUYER'
        ? await this.prisma.buyerCompany.findUnique({ where: { id: owner.id }, select: { verificationStatus: true } })
        : await this.prisma.supplier.findUnique({ where: { id: owner.id }, select: { verificationStatus: true } });
    if (!row) throw AppError.notFound();
    return row.verificationStatus;
  }

  private docDto(d: Prisma.KybDocumentGetPayload<{ include: { file: true } }>): KybDocumentDto {
    return {
      id: d.id,
      type: d.type,
      status: d.status,
      fileName: d.file.originalName,
      fileUrl: this.storage.url(d.file.key, d.file.visibility, 1800),
      mimeType: d.file.mimeType,
      expiresAt: d.expiresAt?.toISOString().slice(0, 10) ?? null,
      reviewNote: d.reviewNote,
      createdAt: d.createdAt.toISOString(),
    };
  }

  async overview(owner: KybOwner): Promise<KybOverviewDto> {
    const [verificationStatus, docs, history] = await Promise.all([
      this.status(owner),
      this.prisma.kybDocument.findMany({ where: ownerWhere(owner), include: { file: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.kybReview.findMany({ where: ownerWhere(owner), orderBy: { createdAt: 'desc' } }),
    ]);
    const required = REQUIRED_DOCS[owner.kind];
    const present = new Set(docs.filter((d) => d.status !== 'REJECTED').map((d) => d.type));
    const missing = required.filter((t) => !present.has(t));
    return {
      verificationStatus,
      documents: docs.map((d) => this.docDto(d)),
      requiredTypes: required,
      missingTypes: missing,
      history: history.map((h) => ({ id: h.id, fromStatus: h.fromStatus, toStatus: h.toStatus, note: h.note, requestedDocTypes: h.requestedDocTypes, createdAt: h.createdAt.toISOString() })),
      canSubmit: missing.length === 0 && ['PENDING', 'NEEDS_INFO', 'REJECTED'].includes(verificationStatus),
    };
  }

  async addDocument(owner: KybOwner, userId: string, input: z.output<typeof addKybDocumentSchema>): Promise<KybOverviewDto> {
    const file = await this.prisma.storedFile.findUnique({ where: { id: input.fileId } });
    if (!file || (file.ownerUserId && file.ownerUserId !== userId)) throw AppError.notFound();
    if (file.purpose !== 'KYB_DOCUMENT') throw AppError.unprocessable(ErrorCode.FILE_TYPE_NOT_ALLOWED);
    await this.prisma.kybDocument.create({ data: { ...ownerWhere(owner), type: input.type, fileId: file.id, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } });
    return this.overview(owner);
  }

  async removeDocument(owner: KybOwner, id: string): Promise<KybOverviewDto> {
    const doc = await this.prisma.kybDocument.findFirst({ where: { id, ...ownerWhere(owner) } });
    if (!doc) throw AppError.notFound();
    if (doc.status === 'ACCEPTED') throw AppError.conflict(ErrorCode.INVALID_STATE_TRANSITION);
    await this.prisma.kybDocument.delete({ where: { id } });
    return this.overview(owner);
  }

  private async setStatus(tx: Prisma.TransactionClient, owner: KybOwner, to: KybOverviewDto['verificationStatus']) {
    if (owner.kind === 'BUYER') {
      await tx.buyerCompany.update({ where: { id: owner.id }, data: { verificationStatus: to, ...(to === 'VERIFIED' ? { verifiedAt: new Date() } : {}) } });
    } else {
      const s = await tx.supplier.findUnique({ where: { id: owner.id }, select: { status: true } });
      await tx.supplier.update({
        where: { id: owner.id },
        data: { verificationStatus: to, ...(to === 'VERIFIED' && s?.status === 'PENDING' ? { status: 'ACTIVE' } : {}) },
      });
    }
  }

  async submit(owner: KybOwner): Promise<KybOverviewDto> {
    const ov = await this.overview(owner);
    if (!ov.canSubmit) throw AppError.conflict(ErrorCode.INVALID_STATE_TRANSITION, {}, { missing: ov.missingTypes });
    await this.prisma.tx(async (tx) => {
      await this.setStatus(tx, owner, 'UNDER_REVIEW');
      await tx.kybReview.create({ data: { ...ownerWhere(owner), fromStatus: ov.verificationStatus, toStatus: 'UNDER_REVIEW', note: null } });
      await this.audit.record(tx, { action: 'kyb.submitted', entityType: owner.kind === 'BUYER' ? 'BuyerCompany' : 'Supplier', entityId: owner.id });
      await this.outbox.publish(tx, 'kyb.submitted', { kind: owner.kind, id: owner.id });
    });
    return this.overview(owner);
  }

  /* ---------------------------------------------------------------- admin */

  async queue(q: z.output<typeof kybQueueQuery>): Promise<{ data: KybQueueItem[]; meta: PageMeta }> {
    const statusFilter = q.status ? { verificationStatus: q.status } : { verificationStatus: { in: ['UNDER_REVIEW' as const, 'NEEDS_INFO' as const, 'PENDING' as const] } };
    const search = q.q ? { searchText: { contains: buildSearchText(q.q) } } : {};
    if (q.kind === 'BUYER') {
      const where = { deletedAt: null, ...statusFilter, ...search };
      const [total, rows] = await Promise.all([
        this.prisma.buyerCompany.count({ where }),
        this.prisma.buyerCompany.findMany({ where, include: { city: true, _count: { select: { documents: true } } }, orderBy: { updatedAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
      ]);
      return {
        data: rows.map((r) => ({ kind: 'BUYER' as const, id: r.id, name: r.name, businessType: r.businessType, city: r.city?.nameAr ?? null, crNumber: r.crNumber, verificationStatus: r.verificationStatus, documentsCount: r._count.documents, updatedAt: r.updatedAt.toISOString() })),
        meta: pageMeta(q.page, q.pageSize, total),
      };
    }
    const where = { deletedAt: null, ...statusFilter, ...search };
    const [total, rows] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({ where, include: { city: true, _count: { select: { documents: true } } }, orderBy: { updatedAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return {
      data: rows.map((r) => ({ kind: 'SUPPLIER' as const, id: r.id, name: r.nameAr, businessType: null, city: r.city?.nameAr ?? null, crNumber: r.crNumber, verificationStatus: r.verificationStatus, documentsCount: r._count.documents, updatedAt: r.updatedAt.toISOString() })),
      meta: pageMeta(q.page, q.pageSize, total),
    };
  }

  async decideDocument(id: string, reviewerId: string, input: z.output<typeof kybDocumentDecisionSchema>): Promise<KybDocumentDto> {
    const doc = await this.prisma.kybDocument.update({ where: { id }, data: { status: input.status, reviewNote: input.note ?? null, reviewedById: reviewerId, reviewedAt: new Date() }, include: { file: true } });
    await this.audit.record(this.prisma, { action: 'kyb.document_reviewed', entityType: 'KybDocument', entityId: id, after: input });
    return this.docDto(doc);
  }

  async decide(owner: KybOwner, reviewerId: string, input: z.output<typeof kybDecisionSchema>): Promise<KybOverviewDto> {
    const from = await this.status(owner);
    await this.prisma.tx(async (tx) => {
      await this.setStatus(tx, owner, input.decision);
      await tx.kybReview.create({ data: { ...ownerWhere(owner), fromStatus: from, toStatus: input.decision, note: input.note ?? null, requestedDocTypes: input.requestedDocTypes, reviewerId } });
      if (input.decision === 'VERIFIED') await tx.kybDocument.updateMany({ where: { ...ownerWhere(owner), status: 'PENDING' }, data: { status: 'ACCEPTED', reviewedById: reviewerId, reviewedAt: new Date() } });
      await this.audit.record(tx, { action: 'kyb.decided', entityType: owner.kind === 'BUYER' ? 'BuyerCompany' : 'Supplier', entityId: owner.id, before: { status: from }, after: input });
      await this.outbox.publish(tx, 'kyb.decided', { kind: owner.kind, id: owner.id, decision: input.decision, note: input.note ?? null });
    });
    if (owner.kind === 'SUPPLIER' && input.decision === 'VERIFIED') await this.stats.refreshForSupplier(owner.id);
    return this.overview(owner);
  }
}
