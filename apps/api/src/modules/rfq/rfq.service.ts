import { createHash } from 'node:crypto';
import { HttpStatus, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  type AcceptQuotationResult,
  acceptQuotationSchema,
  createRfqSchema,
  ErrorCode,
  type OtpRequestResult,
  type QuotationDetailDto,
  type QuotationSummaryDto,
  type QuotationVersionDto,
  quotationMessageSchema,
  type RfqDetailDto,
  rfqListQuery,
  type RfqSummaryDto,
  submitQuotationSchema,
  supplierRfqQuery,
  type SupplierRfqInboxItemDto,
} from '@tawreed/contracts';
import type { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { RequestContext } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { citySelect, cityRef, pageMeta } from '../../common/http/presenters.js';
import { loc } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SequenceService } from '../../infrastructure/sequences/sequence.service.js';
import { StorageService } from '../../infrastructure/storage/storage.service.js';
import { OtpService } from '../auth/otp.service.js';
import { supplierMini } from '../catalog/catalog.presenters.js';
import { CheckoutService } from '../checkout/checkout.service.js';
import { CreditService } from '../credit/credit.service.js';
import { FilesService } from '../files/files.service.js';
import { OrderEventsService } from '../orders/order-events.service.js';
import { OrderPresenter, orderSummaryInclude } from '../orders/order.presenter.js';
import { PaymentsService } from '../payments/payments.service.js';
import { dec, money, qtyStr, sum } from '../pricing/domain/money.js';
import { commission, computeLine } from '../pricing/domain/pricing.js';
import { SettingsService } from '../settings/settings.service.js';

const supplierSelect = {
  id: true,
  slug: true,
  nameAr: true,
  nameEn: true,
  logoFileId: true,
  ratingAvg: true,
  ratingCount: true,
  minOrderValue: true,
  commissionRate: true,
  vatNumber: true,
  city: { select: { nameAr: true, nameEn: true } },
  coverage: { where: { cityId: '00000000-0000-0000-0000-000000000000' } },
} as const;

const versionInclude = { items: true } satisfies Prisma.QuotationVersionInclude;
const quotationInclude = {
  supplier: { select: supplierSelect },
  versions: { include: versionInclude, orderBy: { version: 'desc' } },
  messages: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.QuotationInclude;
const rfqInclude = {
  city: { select: citySelect },
  company: { select: { id: true, name: true, businessType: true, verificationStatus: true } },
  items: { orderBy: { sortOrder: 'asc' }, include: { product: { select: { slug: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { file: true } } } } } },
  quotations: { include: quotationInclude },
  _count: { select: { invitations: true } },
} satisfies Prisma.RfqInclude;
type RfqRow = Prisma.RfqGetPayload<{ include: typeof rfqInclude }>;
type QuotationRow = Prisma.QuotationGetPayload<{ include: typeof quotationInclude }>;

@Injectable()
export class RfqService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequenceService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly files: FilesService,
    private readonly storage: StorageService,
    private readonly otp: OtpService,
    private readonly checkout: CheckoutService,
    private readonly credit: CreditService,
    private readonly events: OrderEventsService,
    private readonly presenter: OrderPresenter,
    private readonly payments: PaymentsService,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit(): void {
    this.outbox.on<{ rfqId: string }>('rfq.expire_check', ({ rfqId }) => this.expireRfq(rfqId));
  }

  /* ---------------------------------------------------------------- presenters */

  private version(v: QuotationRow['versions'][number]): QuotationVersionDto {
    return {
      id: v.id,
      version: v.version,
      subtotal: money(v.subtotal),
      deliveryFee: money(v.deliveryFee),
      vatTotal: money(v.vatTotal),
      total: money(v.total),
      validUntil: v.validUntil.toISOString(),
      leadTimeDays: v.leadTimeDays,
      paymentMethods: v.paymentMethods,
      notes: v.notes,
      changeSummary: v.changeSummary,
      status: v.status,
      items: v.items.map((i) => ({ id: i.id, rfqItemId: i.rfqItemId, offerId: i.offerId, description: i.description, qty: qtyStr(i.qty), unitPrice: money(i.unitPrice), vatRate: dec(i.vatRate).toString(), lineTotal: money(i.lineTotal), notes: i.notes })),
      createdAt: v.createdAt.toISOString(),
    };
  }

  private async quotationSummaries(rows: QuotationRow[], viewerUserId: string, viewerType: string): Promise<QuotationSummaryDto[]> {
    const logos = await this.files.urlMap(rows.map((q) => q.supplier.logoFileId));
    const live = rows.filter((q) => ['SUBMITTED', 'REVISION_REQUESTED', 'ACCEPTED'].includes(q.status) && q.versions[0]);
    const lowest = live.reduce<QuotationRow | null>((a, q) => (!a || dec(q.versions[0]!.total).lessThan(dec(a.versions[0]!.total)) ? q : a), null);
    const fastest = live.reduce<QuotationRow | null>((a, q) => (!a || q.versions[0]!.leadTimeDays < a.versions[0]!.leadTimeDays ? q : a), null);
    return rows
      .filter((q) => q.versions[0])
      .map((q) => ({
        id: q.id,
        number: q.number,
        supplier: supplierMini({ ...q.supplier, coverage: [] }, logos),
        status: q.status,
        current: this.version(q.versions[0]!),
        versionsCount: q.versions.length,
        unreadMessages: q.messages.filter((m) => !m.readAt && m.senderId !== viewerUserId && m.senderType !== viewerType).length,
        isLowest: lowest?.id === q.id && live.length > 1,
        isFastest: fastest?.id === q.id && live.length > 1,
      }));
  }

  private async rfqDetail(r: RfqRow, viewer: Actor): Promise<RfqDetailDto> {
    const attachments = await this.prisma.storedFile.findMany({ where: { id: { in: r.attachmentFileIds } } });
    const quotations = viewer.contextType === 'SUPPLIER' ? r.quotations.filter((q) => q.supplierId === viewer.contextId) : r.quotations;
    const actions: string[] = [];
    if (viewer.contextType === 'BUYER' && ['OPEN', 'QUOTED'].includes(r.status)) actions.push('cancel');
    return {
      ...this.rfqSummary(r),
      items: r.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productSlug: i.product?.slug ?? null,
        image: i.product?.images[0] ? this.files.urls(i.product.images[0].file)?.thumbUrl ?? null : null,
        name: i.name,
        specs: i.specs,
        qty: qtyStr(i.qty),
        unitLabel: loc(i.unitLabelAr, i.unitLabelEn),
        targetUnitPrice: i.targetUnitPrice ? money(i.targetUnitPrice) : null,
      })),
      paymentPreference: r.paymentPreference,
      storageType: r.storageType,
      notes: r.notes,
      attachments: attachments.map((f) => ({ id: f.id, name: f.originalName, url: this.storage.url(f.key, f.visibility, 1800) })),
      visibility: r.visibility,
      invitationsCount: r._count.invitations,
      quotations: await this.quotationSummaries(quotations, viewer.userId, viewer.contextType),
      allowedActions: actions,
    };
  }

  private rfqSummary(r: Pick<RfqRow, 'id' | 'number' | 'title' | 'status' | 'city' | 'neededBy' | 'expiresAt' | 'createdAt' | 'quotesCount'> & { company: { id: string; name: string }; items: unknown[]; quotations: { status: string; versions: { total: unknown }[] }[] }): RfqSummaryDto {
    const totals = r.quotations.filter((q) => q.status !== 'WITHDRAWN' && q.versions[0]).map((q) => dec(String(q.versions[0]!.total)));
    return {
      id: r.id,
      number: r.number,
      title: r.title,
      status: r.status,
      city: cityRef(r.city) as RfqSummaryDto['city'],
      neededBy: r.neededBy?.toISOString().slice(0, 10) ?? null,
      itemsCount: r.items.length,
      quotesCount: r.quotesCount,
      bestQuoteTotal: totals.length ? money(totals.reduce((a, b) => (a.lessThan(b) ? a : b))) : null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      company: { id: r.company.id, name: r.company.name },
    };
  }

  /* ---------------------------------------------------------------- buyer */

  async create(actor: Actor, input: z.output<typeof createRfqSchema>): Promise<RfqDetailDto> {
    const companyId = actor.contextId as string;
    const productIds = input.items.map((i) => i.productId).filter((x): x is string => !!x);
    const products = productIds.length ? await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, categoryId: true } }) : [];
    const categoryIds = [...new Set(products.map((p) => p.categoryId))];

    let supplierIds = input.supplierIds;
    if (input.visibility === 'OPEN' || !supplierIds.length) {
      const matching = await this.prisma.supplier.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          coverage: { some: { cityId: input.cityId, isActive: true } },
          ...(productIds.length || categoryIds.length
            ? { offers: { some: { status: 'ACTIVE', deletedAt: null, OR: [{ productId: { in: productIds } }, { product: { categoryId: { in: categoryIds } } }] } } }
            : {}),
        },
        orderBy: { ratingAvg: 'desc' },
        take: 15,
        select: { id: true },
      });
      supplierIds = [...new Set([...supplierIds, ...matching.map((s) => s.id)])];
    }

    const rfqId = await this.prisma.tx(async (tx) => {
      const rfq = await tx.rfq.create({
        data: {
          number: await this.sequences.next(tx, 'RFQ'),
          companyId,
          createdById: actor.userId,
          title: input.title,
          cityId: input.cityId,
          addressId: input.addressId ?? null,
          neededBy: input.neededBy ? new Date(input.neededBy) : null,
          paymentPreference: input.paymentPreference,
          storageType: input.storageType ?? null,
          notes: input.notes ?? null,
          attachmentFileIds: input.attachmentFileIds,
          visibility: input.visibility,
          status: 'OPEN',
          submittedAt: new Date(),
          expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
          items: {
            create: input.items.map((i, idx) => ({
              productId: i.productId ?? null,
              productUnitId: i.productUnitId ?? null,
              name: i.name,
              specs: i.specs ?? null,
              qty: i.qty,
              unitLabelAr: i.unitLabelAr,
              unitLabelEn: i.unitLabelEn,
              targetUnitPrice: i.targetUnitPrice ?? null,
              sortOrder: idx,
            })),
          },
          invitations: { create: supplierIds.map((supplierId) => ({ supplierId })) },
        },
      });
      await this.audit.record(tx, { action: 'rfq.submitted', entityType: 'Rfq', entityId: rfq.id, meta: { invited: supplierIds.length } });
      await this.outbox.publish(tx, 'rfq.submitted', { rfqId: rfq.id, supplierIds, companyId });
      await this.outbox.publish(tx, 'rfq.expire_check', { rfqId: rfq.id }, { delayMs: input.expiresInDays * 86_400_000 + 60_000 });
      return rfq.id;
    });
    return this.buyerDetail(actor, rfqId);
  }

  async buyerList(companyId: string, q: z.output<typeof rfqListQuery>) {
    const where: Prisma.RfqWhereInput = { companyId, ...(q.status ? { status: q.status } : {}), ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { number: { contains: q.q, mode: 'insensitive' } }] } : {}) };
    const [total, rows] = await Promise.all([
      this.prisma.rfq.count({ where }),
      this.prisma.rfq.findMany({
        where,
        include: { city: { select: citySelect }, company: { select: { id: true, name: true } }, items: { select: { id: true } }, quotations: { select: { status: true, versions: { select: { total: true }, orderBy: { version: 'desc' }, take: 1 } } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { data: rows.map((r) => this.rfqSummary(r)), meta: pageMeta(q.page, q.pageSize, total) };
  }

  async buyerDetail(actor: Actor, idOrNumber: string): Promise<RfqDetailDto> {
    const r = await this.prisma.rfq.findFirst({ where: { companyId: actor.contextId as string, ...(this.isUuid(idOrNumber) ? { id: idOrNumber } : { number: idOrNumber }) }, include: rfqInclude });
    if (!r) throw AppError.notFound();
    return this.rfqDetail(r, actor);
  }

  async cancel(actor: Actor, id: string): Promise<RfqDetailDto> {
    const r = await this.prisma.rfq.findFirst({ where: { id, companyId: actor.contextId as string } });
    if (!r) throw AppError.notFound();
    if (!['OPEN', 'QUOTED'].includes(r.status)) throw AppError.conflict(ErrorCode.RFQ_CLOSED);
    await this.prisma.$transaction([
      this.prisma.rfq.update({ where: { id }, data: { status: 'CANCELLED', closedAt: new Date() } }),
      this.prisma.quotation.updateMany({ where: { rfqId: id, status: { in: ['SUBMITTED', 'REVISION_REQUESTED'] } }, data: { status: 'REJECTED' } }),
    ]);
    await this.outbox.publish(this.prisma, 'rfq.cancelled', { rfqId: id });
    return this.buyerDetail(actor, id);
  }

  private async loadQuotation(where: Prisma.QuotationWhereInput): Promise<QuotationRow & { rfq: RfqRow }> {
    const q = await this.prisma.quotation.findFirst({ where, include: { ...quotationInclude, rfq: { include: rfqInclude } } });
    if (!q) throw AppError.notFound();
    return q;
  }

  async quotationDetail(actor: Actor, id: string): Promise<QuotationDetailDto> {
    const scope: Prisma.QuotationWhereInput =
      actor.contextType === 'BUYER' ? { rfq: { companyId: actor.contextId as string } } : actor.contextType === 'SUPPLIER' ? { supplierId: actor.contextId as string } : {};
    const q = await this.loadQuotation({ id, ...scope });
    await this.prisma.quotationMessage.updateMany({ where: { quotationId: id, readAt: null, senderType: { not: actor.contextType } }, data: { readAt: new Date() } });
    const [summary] = await this.quotationSummaries([q], actor.userId, actor.contextType);
    const senders = await this.prisma.user.findMany({ where: { id: { in: q.messages.map((m) => m.senderId) } }, select: { id: true, name: true } });
    const actions: string[] = [];
    const open = ['OPEN', 'QUOTED'].includes(q.rfq.status);
    if (actor.contextType === 'BUYER' && open && q.status === 'SUBMITTED') actions.push('accept', 'request_revision', 'reject');
    if (actor.contextType === 'BUYER' && open && q.status === 'REVISION_REQUESTED') actions.push('reject');
    if (actor.contextType === 'SUPPLIER' && open && ['SUBMITTED', 'REVISION_REQUESTED'].includes(q.status)) actions.push('revise', 'withdraw');
    return {
      ...(summary as QuotationSummaryDto),
      rfq: await this.rfqDetail(q.rfq, actor),
      versions: q.versions.map((v) => this.version(v)),
      messages: q.messages.map((m) => ({ id: m.id, senderType: m.senderType, senderName: senders.find((s) => s.id === m.senderId)?.name ?? '', body: m.body, mine: m.senderId === actor.userId, createdAt: m.createdAt.toISOString() })),
      allowedActions: actions,
    };
  }

  async message(actor: Actor, quotationId: string, input: z.output<typeof quotationMessageSchema>) {
    const scope: Prisma.QuotationWhereInput = actor.contextType === 'BUYER' ? { rfq: { companyId: actor.contextId as string } } : { supplierId: actor.contextId as string };
    const q = await this.prisma.quotation.findFirst({ where: { id: quotationId, ...scope }, include: { rfq: { select: { companyId: true } } } });
    if (!q) throw AppError.notFound();
    await this.prisma.quotationMessage.create({ data: { quotationId, senderType: actor.contextType, senderId: actor.userId, body: input.body, fileIds: input.fileIds } });
    await this.outbox.publish(this.prisma, 'quotation.message', { quotationId, from: actor.contextType, supplierId: q.supplierId, companyId: q.rfq.companyId });
    return this.quotationDetail(actor, quotationId);
  }

  async requestRevision(actor: Actor, quotationId: string, message: string) {
    const q = await this.loadQuotation({ id: quotationId, rfq: { companyId: actor.contextId as string } });
    if (q.status !== 'SUBMITTED') throw AppError.conflict(ErrorCode.QUOTATION_NOT_ACCEPTABLE);
    await this.prisma.$transaction([
      this.prisma.quotation.update({ where: { id: quotationId }, data: { status: 'REVISION_REQUESTED' } }),
      this.prisma.quotationMessage.create({ data: { quotationId, senderType: 'BUYER', senderId: actor.userId, body: message } }),
    ]);
    await this.outbox.publish(this.prisma, 'quotation.revision_requested', { quotationId, supplierId: q.supplierId });
    return this.quotationDetail(actor, quotationId);
  }

  async reject(actor: Actor, quotationId: string) {
    const q = await this.loadQuotation({ id: quotationId, rfq: { companyId: actor.contextId as string } });
    if (!['SUBMITTED', 'REVISION_REQUESTED'].includes(q.status)) throw AppError.conflict(ErrorCode.QUOTATION_NOT_ACCEPTABLE);
    await this.prisma.quotation.update({ where: { id: quotationId }, data: { status: 'REJECTED' } });
    await this.outbox.publish(this.prisma, 'quotation.rejected', { quotationId, supplierId: q.supplierId });
    return this.quotationDetail(actor, quotationId);
  }

  async requestAcceptOtp(actor: Actor, quotationId: string): Promise<OtpRequestResult> {
    const q = await this.loadQuotation({ id: quotationId, rfq: { companyId: actor.contextId as string } });
    if (q.status !== 'SUBMITTED') throw AppError.conflict(ErrorCode.QUOTATION_NOT_ACCEPTABLE);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { phone: true } });
    if (!user.phone) throw AppError.forbidden();
    const { code: _c, ...res } = await this.otp.issue('quote-accept', user.phone, { subject: `quote:${quotationId}:${actor.userId}`, locale: RequestContext.locale() });
    return res;
  }

  /** OTP-approved acceptance → electronic approval record + purchase order at quoted prices. */
  async accept(actor: Actor, quotationId: string, input: z.output<typeof acceptQuotationSchema>): Promise<AcceptQuotationResult> {
    const companyId = actor.contextId as string;
    const q = await this.loadQuotation({ id: quotationId, rfq: { companyId } });
    const v = q.versions.find((x) => x.id === input.versionId);
    if (!v || q.status !== 'SUBMITTED' || v.status !== 'SUBMITTED' || !['OPEN', 'QUOTED'].includes(q.rfq.status)) throw AppError.conflict(ErrorCode.QUOTATION_NOT_ACCEPTABLE);
    if (v.validUntil < new Date()) throw AppError.conflict(ErrorCode.QUOTATION_EXPIRED);
    if (!v.paymentMethods.includes(input.paymentMethod)) throw new AppError(ErrorCode.PAYMENT_METHOD_UNAVAILABLE, HttpStatus.UNPROCESSABLE_ENTITY);
    const company = await this.prisma.buyerCompany.findUniqueOrThrow({ where: { id: companyId } });
    if (company.verificationStatus !== 'VERIFIED') throw AppError.forbidden(ErrorCode.COMPANY_NOT_VERIFIED);
    const option = (await this.checkout.paymentOptions(companyId, dec(v.total))).find((o) => o.method === input.paymentMethod);
    if (!option?.available) throw new AppError(ErrorCode.PAYMENT_METHOD_UNAVAILABLE, HttpStatus.UNPROCESSABLE_ENTITY);
    const address = await this.prisma.buyerAddress.findFirst({ where: { id: input.addressId, companyId, deletedAt: null }, include: { city: true } });
    if (!address) throw AppError.notFound();

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.userId } });
    await this.otp.verify('quote-accept', `quote:${quotationId}:${actor.userId}`, input.otp);
    const terms = await this.settings.get('terms');
    const orderSettings = await this.settings.get('orders');
    const prepaid = input.paymentMethod === 'CARD' || input.paymentMethod === 'BANK_TRANSFER';
    const snapshotHash = createHash('sha256').update(JSON.stringify({ v: v.id, total: v.total.toString(), items: v.items.map((i) => [i.rfqItemId, i.qty.toString(), i.unitPrice.toString()]) })).digest('hex');

    const { orderId, approvalId } = await this.prisma.tx(async (tx) => {
      const approval = await tx.electronicApproval.create({
        data: {
          quotationVersionId: v.id,
          userId: user.id,
          companyId,
          otpVerifiedAt: new Date(),
          ip: RequestContext.get()?.ip ?? null,
          userAgent: RequestContext.get()?.userAgent?.slice(0, 300) ?? null,
          deviceId: RequestContext.get()?.deviceId ?? null,
          approvalText: terms.quotationApprovalText,
          termsVersion: terms.version,
          snapshotHash,
        },
      });
      await tx.quotationVersion.update({ where: { id: v.id }, data: { status: 'ACCEPTED', snapshotHash } });
      await tx.quotation.update({ where: { id: q.id }, data: { status: 'ACCEPTED', acceptedVersionId: v.id } });
      await tx.quotation.updateMany({ where: { rfqId: q.rfqId, id: { not: q.id }, status: { in: ['SUBMITTED', 'REVISION_REQUESTED'] } }, data: { status: 'REJECTED' } });
      await tx.rfq.update({ where: { id: q.rfqId }, data: { status: 'AWARDED', awardedQuotationId: q.id, closedAt: new Date() } });

      const number = await this.sequences.next(tx, 'TW');
      const lines = v.items.map((i) => ({ item: i, amounts: computeLine(i.unitPrice, i.qty, i.vatRate) }));
      const subtotal = sum(lines.map((l) => l.amounts.lineSubtotal));
      const delivery = dec(v.deliveryFee);
      const vat = dec(v.vatTotal);
      const total = dec(v.total);
      const addr = { label: address.label, recipientName: address.recipientName, recipientPhone: address.recipientPhone, city: loc(address.city.nameAr, address.city.nameEn), cityId: address.cityId, district: address.district, street: address.street, buildingNumber: address.buildingNumber, postalCode: address.postalCode, shortAddress: address.shortAddress, lat: address.lat, lng: address.lng, notes: address.notes, formatted: [address.street, address.district, address.city.nameAr].filter(Boolean).join('، ') };
      const order = await tx.order.create({
        data: {
          number,
          companyId,
          placedById: actor.userId,
          source: 'RFQ',
          rfqId: q.rfqId,
          quotationId: q.id,
          status: prepaid ? 'PENDING_PAYMENT' : 'PLACED',
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentMethod === 'CREDIT' ? 'DEFERRED' : 'UNPAID',
          addressId: address.id,
          addressSnapshot: addr,
          subtotal: money(subtotal),
          deliveryTotal: money(delivery),
          vatTotal: money(vat),
          grandTotal: money(total),
          placedAt: prepaid ? null : new Date(),
        },
      });
      const offers = await tx.offer.findMany({ where: { id: { in: v.items.map((i) => i.offerId).filter((x): x is string => !!x) } }, include: { unit: true } });
      const rfqItems = q.rfq.items;
      await tx.supplierOrder.create({
        data: {
          orderId: order.id,
          supplierId: q.supplierId,
          number: `${number}-1`,
          status: prepaid ? 'AWAITING_PAYMENT' : 'PENDING',
          subtotal: money(subtotal),
          deliveryFee: money(delivery),
          vatTotal: money(vat),
          total: money(total),
          commissionRate: q.supplier.commissionRate.toString(),
          commissionAmount: money(commission(subtotal, q.supplier.commissionRate)),
          deliveryDate: input.deliveryDate ? new Date(`${input.deliveryDate}T00:00:00Z`) : new Date(Date.now() + v.leadTimeDays * 86_400_000),
          deliveryWindow: input.deliveryWindow ?? 'MORNING',
          storageType: q.rfq.storageType ?? 'AMBIENT',
          acceptDeadlineAt: prepaid ? null : new Date(Date.now() + orderSettings.supplierAcceptHours * 3_600_000),
          items: {
            create: lines.map(({ item, amounts }) => {
              const offer = offers.find((o) => o.id === item.offerId);
              const rfqItem = rfqItems.find((r) => r.id === item.rfqItemId);
              return {
                offerId: offer?.id ?? null,
                productId: offer?.productId ?? rfqItem?.productId ?? null,
                productUnitId: offer?.productUnitId ?? rfqItem?.productUnitId ?? null,
                productNameAr: item.description,
                productNameEn: item.description,
                unitNameAr: offer?.unit.nameAr ?? rfqItem?.unitLabelAr ?? '',
                unitNameEn: offer?.unit.nameEn ?? rfqItem?.unitLabelEn ?? '',
                qty: item.qty,
                unitPrice: item.unitPrice,
                listUnitPrice: item.unitPrice,
                priceSource: 'QUOTE' as const,
                vatRate: item.vatRate,
                vatAmount: money(amounts.vatAmount),
                lineSubtotal: money(amounts.lineSubtotal),
                lineTotal: money(amounts.lineTotal),
              };
            }),
          },
        },
      });
      if (input.paymentMethod === 'CREDIT') await this.credit.charge(tx, companyId, total, { orderId: order.id, note: number, actorId: actor.userId });
      await this.events.add(tx, { orderId: order.id, type: 'order.placed', actorType: 'BUYER', actorId: actor.userId, meta: { rfq: q.rfq.number, quotation: q.number } });
      await this.audit.record(tx, { action: 'quotation.accepted', entityType: 'Quotation', entityId: q.id, meta: { approvalId: approval.id, orderId: order.id, snapshotHash } });
      await this.outbox.publish(tx, 'quotation.accepted', { quotationId: q.id, supplierId: q.supplierId, orderId: order.id });
      await this.outbox.publish(tx, 'order.placed', { orderId: order.id, companyId, prepaid });
      return { orderId: order.id, approvalId: approval.id };
    });

    let checkoutUrl: string | null = null;
    if (input.paymentMethod === 'CARD' && input.returnUrl) checkoutUrl = (await this.payments.initCard(actor, { purpose: 'ORDER', orderId, returnUrl: input.returnUrl, source: 'src_all' })).checkoutUrl;
    const row = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderSummaryInclude });
    const [summary] = await this.presenter.summaries([row]);
    const bank = await this.settings.get('payments');
    return {
      approvalId,
      order: summary as AcceptQuotationResult['order'],
      payment: { method: input.paymentMethod, status: row.paymentStatus, amount: money(row.grandTotal), checkoutUrl, bankAccounts: input.paymentMethod === 'BANK_TRANSFER' ? bank.bankAccounts : null },
    };
  }

  /* ---------------------------------------------------------------- supplier */

  async inbox(supplierId: string, q: z.output<typeof supplierRfqQuery>) {
    const invitationStatus = q.status === 'NEW' ? { in: ['INVITED' as const, 'VIEWED' as const] } : q.status === 'QUOTED' ? { equals: 'QUOTED' as const } : undefined;
    const where: Prisma.RfqInvitationWhereInput = {
      supplierId,
      ...(invitationStatus ? { status: invitationStatus } : {}),
      rfq: q.status === 'CLOSED' ? { status: { in: ['AWARDED', 'CLOSED', 'CANCELLED', 'EXPIRED'] } } : q.status ? { status: { in: ['OPEN', 'QUOTED'] } } : {},
      ...(q.q ? { rfq: { title: { contains: q.q, mode: 'insensitive' } } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.rfqInvitation.count({ where }),
      this.prisma.rfqInvitation.findMany({
        where,
        include: {
          rfq: {
            include: {
              city: { select: citySelect },
              company: { select: { name: true, businessType: true, verificationStatus: true } },
              _count: { select: { items: true, quotations: true } },
              quotations: { where: { supplierId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    const data: SupplierRfqInboxItemDto[] = rows.map((inv) => {
      const mine = inv.rfq.quotations[0];
      return {
        rfqId: inv.rfq.id,
        number: inv.rfq.number,
        title: inv.rfq.title,
        buyer: { name: inv.rfq.company.name, businessType: inv.rfq.company.businessType, verified: inv.rfq.company.verificationStatus === 'VERIFIED' },
        city: cityRef(inv.rfq.city) as SupplierRfqInboxItemDto['city'],
        itemsCount: inv.rfq._count.items,
        neededBy: inv.rfq.neededBy?.toISOString().slice(0, 10) ?? null,
        expiresAt: inv.rfq.expiresAt?.toISOString() ?? null,
        invitationStatus: inv.status,
        myQuotation: mine?.versions[0] ? { id: mine.id, status: mine.status, total: money(mine.versions[0].total), version: mine.currentVersion } : null,
        competitorsCount: Math.max(0, inv.rfq._count.quotations - (mine ? 1 : 0)),
        createdAt: inv.createdAt.toISOString(),
      };
    });
    return { data, meta: pageMeta(q.page, q.pageSize, total) };
  }

  async supplierRfq(actor: Actor, rfqId: string): Promise<RfqDetailDto> {
    const supplierId = actor.contextId as string;
    const inv = await this.prisma.rfqInvitation.findUnique({ where: { rfqId_supplierId: { rfqId, supplierId } } });
    const r = await this.prisma.rfq.findUnique({ where: { id: rfqId }, include: rfqInclude });
    if (!r || (!inv && r.visibility === 'TARGETED')) throw new AppError(ErrorCode.RFQ_NOT_INVITED, HttpStatus.NOT_FOUND);
    if (inv?.status === 'INVITED') await this.prisma.rfqInvitation.update({ where: { id: inv.id }, data: { status: 'VIEWED', viewedAt: new Date() } });
    return this.rfqDetail(r, actor);
  }

  async decline(actor: Actor, rfqId: string, reason: string) {
    const supplierId = actor.contextId as string;
    await this.prisma.rfqInvitation.upsert({
      where: { rfqId_supplierId: { rfqId, supplierId } },
      create: { rfqId, supplierId, status: 'DECLINED', declineReason: reason, respondedAt: new Date() },
      update: { status: 'DECLINED', declineReason: reason, respondedAt: new Date() },
    });
    return { ok: true };
  }

  /** Submits the first quotation or a new revision (previous version is superseded). */
  async submitQuotation(actor: Actor, rfqId: string, input: z.output<typeof submitQuotationSchema>): Promise<QuotationDetailDto> {
    const supplierId = actor.contextId as string;
    const r = await this.prisma.rfq.findUnique({ where: { id: rfqId }, include: { items: true } });
    if (!r || !['OPEN', 'QUOTED'].includes(r.status)) throw AppError.conflict(ErrorCode.RFQ_CLOSED);
    const inv = await this.prisma.rfqInvitation.findUnique({ where: { rfqId_supplierId: { rfqId, supplierId } } });
    if (!inv && r.visibility === 'TARGETED') throw new AppError(ErrorCode.RFQ_NOT_INVITED, HttpStatus.FORBIDDEN);
    const lines = input.items.map((i) => {
      const item = r.items.find((x) => x.id === i.rfqItemId);
      if (!item) throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED);
      const qty = i.qty ?? item.qty.toString();
      return { input: i, item, qty, amounts: computeLine(i.unitPrice, qty, '0.15') };
    });
    const subtotal = sum(lines.map((l) => l.amounts.lineSubtotal));
    const delivery = dec(input.deliveryFee);
    const vat = sum(lines.map((l) => l.amounts.vatAmount)).plus(delivery.times('0.15').toDecimalPlaces(2));
    const total = subtotal.plus(delivery).plus(vat);

    const quotationId = await this.prisma.tx(async (tx) => {
      const existing = await tx.quotation.findUnique({ where: { rfqId_supplierId: { rfqId, supplierId } } });
      if (existing && !['SUBMITTED', 'REVISION_REQUESTED'].includes(existing.status)) throw AppError.conflict(ErrorCode.QUOTATION_NOT_ACCEPTABLE);
      const quotation = existing ?? (await tx.quotation.create({ data: { number: await this.sequences.next(tx, 'QT'), rfqId, supplierId, currentVersion: 0 } }));
      const version = quotation.currentVersion + 1;
      await tx.quotationVersion.updateMany({ where: { quotationId: quotation.id, status: 'SUBMITTED' }, data: { status: 'SUPERSEDED' } });
      await tx.quotationVersion.create({
        data: {
          quotationId: quotation.id,
          version,
          subtotal: money(subtotal),
          deliveryFee: money(delivery),
          vatTotal: money(vat),
          total: money(total),
          validUntil: new Date(`${input.validUntil}T23:59:59+03:00`),
          leadTimeDays: input.leadTimeDays,
          paymentMethods: input.paymentMethods,
          notes: input.notes ?? null,
          changeSummary: input.changeSummary ?? null,
          createdById: actor.userId,
          items: { create: lines.map((l) => ({ rfqItemId: l.item.id, offerId: l.input.offerId ?? null, description: l.item.name, qty: l.qty, unitPrice: l.input.unitPrice, vatRate: '0.15', lineTotal: money(l.amounts.lineTotal), notes: l.input.notes ?? null })) },
        },
      });
      await tx.quotation.update({ where: { id: quotation.id }, data: { currentVersion: version, status: 'SUBMITTED' } });
      await tx.rfqInvitation.upsert({ where: { rfqId_supplierId: { rfqId, supplierId } }, create: { rfqId, supplierId, status: 'QUOTED', respondedAt: new Date() }, update: { status: 'QUOTED', respondedAt: new Date() } });
      if (!existing) await tx.rfq.update({ where: { id: rfqId }, data: { quotesCount: { increment: 1 }, status: 'QUOTED' } });
      await this.outbox.publish(tx, version === 1 ? 'quotation.submitted' : 'quotation.revised', { quotationId: quotation.id, rfqId, companyId: r.companyId, supplierId });
      return quotation.id;
    });
    return this.quotationDetail(actor, quotationId);
  }

  async withdraw(actor: Actor, quotationId: string) {
    const q = await this.loadQuotation({ id: quotationId, supplierId: actor.contextId as string });
    if (!['SUBMITTED', 'REVISION_REQUESTED'].includes(q.status)) throw AppError.conflict(ErrorCode.QUOTATION_NOT_ACCEPTABLE);
    await this.prisma.quotation.update({ where: { id: quotationId }, data: { status: 'WITHDRAWN' } });
    return this.quotationDetail(actor, quotationId);
  }

  /* ---------------------------------------------------------------- admin & jobs */

  async adminList(q: z.output<typeof rfqListQuery>) {
    const where: Prisma.RfqWhereInput = { ...(q.status ? { status: q.status } : {}), ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { number: { contains: q.q, mode: 'insensitive' } }, { company: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}) };
    const [total, rows] = await Promise.all([
      this.prisma.rfq.count({ where }),
      this.prisma.rfq.findMany({
        where,
        include: { city: { select: citySelect }, company: { select: { id: true, name: true } }, items: { select: { id: true } }, quotations: { select: { status: true, versions: { select: { total: true }, orderBy: { version: 'desc' }, take: 1 } } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { data: rows.map((r) => this.rfqSummary(r)), meta: pageMeta(q.page, q.pageSize, total) };
  }

  async adminDetail(actor: Actor, id: string): Promise<RfqDetailDto> {
    const r = await this.prisma.rfq.findUnique({ where: { id }, include: rfqInclude });
    if (!r) throw AppError.notFound();
    return this.rfqDetail(r, actor);
  }

  async expireRfq(rfqId: string): Promise<void> {
    const r = await this.prisma.rfq.findUnique({ where: { id: rfqId } });
    if (!r || !['OPEN', 'QUOTED'].includes(r.status) || !r.expiresAt || r.expiresAt > new Date()) return;
    await this.prisma.$transaction([
      this.prisma.rfq.update({ where: { id: rfqId }, data: { status: 'EXPIRED', closedAt: new Date() } }),
      this.prisma.quotation.updateMany({ where: { rfqId, status: { in: ['SUBMITTED', 'REVISION_REQUESTED'] } }, data: { status: 'EXPIRED' } }),
    ]);
  }

  private isUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  }
}
