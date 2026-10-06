import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type AddressSnapshot,
  type CheckoutOptionsDto,
  ErrorCode,
  type PaymentMethod,
  type PaymentMethodOption,
  type PlaceOrderResult,
  placeOrderSchema,
} from '@tawreed/contracts';
import { translate } from '@tawreed/i18n';
import type { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { RequestContext } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { loc } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService, type Tx } from '../../infrastructure/prisma/prisma.service.js';
import { SequenceService } from '../../infrastructure/sequences/sequence.service.js';
import { BuyersService } from '../buyers/buyers.service.js';
import type { CartQuote } from '../cart/cart-quote.service.js';
import { CartQuoteService } from '../cart/cart-quote.service.js';
import { CartService } from '../cart/cart.service.js';
import { CreditService } from '../credit/credit.service.js';
import { OrderEventsService } from '../orders/order-events.service.js';
import { OrderPresenter, orderSummaryInclude } from '../orders/order.presenter.js';
import { PaymentsService } from '../payments/payments.service.js';
import { deliverySlots, isValidSlot } from '../pricing/domain/delivery.js';
import { dec, type Dec, money } from '../pricing/domain/money.js';
import { commission } from '../pricing/domain/pricing.js';
import { SettingsService } from '../settings/settings.service.js';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly quotes: CartQuoteService,
    private readonly buyers: BuyersService,
    private readonly credit: CreditService,
    private readonly settings: SettingsService,
    private readonly sequences: SequenceService,
    private readonly events: OrderEventsService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly presenter: OrderPresenter,
    private readonly payments: PaymentsService,
  ) {}

  /** Which payment methods a company may use for an order of `total` (also used by quotation acceptance). */
  async paymentOptions(companyId: string, total: Dec): Promise<PaymentMethodOption[]> {
    const locale = RequestContext.locale();
    const [payments, acc, company, orders] = await Promise.all([
      this.settings.get('payments'),
      this.credit.account(companyId),
      this.prisma.buyerCompany.findUniqueOrThrow({ where: { id: companyId }, select: { verificationStatus: true, status: true } }),
      this.settings.get('orders'),
    ]);
    const verified = company.verificationStatus === 'VERIFIED';
    const blockedByKyb = orders.requireVerification && !verified;
    const reason = (code: string, params?: Record<string, string | number>) => translate(locale, `errors.${code}`, params);
    return payments.enabledMethods.map((method: PaymentMethod): PaymentMethodOption => {
      if (company.status === 'SUSPENDED') return { method, available: false, reason: reason('COMPANY_SUSPENDED') };
      if (blockedByKyb) return { method, available: false, reason: reason('COMPANY_NOT_VERIFIED') };
      switch (method) {
        case 'CREDIT': {
          const available = this.credit.available(acc);
          const credit = { available: money(available), limit: money(acc.creditLimit), termsDays: acc.termsDays, status: acc.status };
          if (!verified) return { method, available: false, reason: reason('COMPANY_NOT_VERIFIED'), credit };
          if (acc.status === 'FROZEN') return { method, available: false, reason: reason('CREDIT_FROZEN'), credit };
          if (acc.status !== 'ACTIVE') return { method, available: false, reason: reason('CREDIT_NOT_AVAILABLE'), credit };
          if (available.lessThan(total)) return { method, available: false, reason: reason('CREDIT_LIMIT_EXCEEDED', { available: money(available) }), credit };
          return { method, available: true, reason: null, credit };
        }
        case 'COD':
          return total.greaterThan(dec(payments.codMaxAmount)) ? { method, available: false, reason: reason('PAYMENT_METHOD_UNAVAILABLE') } : { method, available: true, reason: null };
        case 'BANK_TRANSFER':
          return { method, available: true, reason: null, bankAccounts: payments.bankAccounts };
        default:
          return { method, available: true, reason: null };
      }
    });
  }

  async options(actor: Actor, addressId?: string): Promise<CheckoutOptionsDto> {
    const companyId = actor.contextId as string;
    const addresses = await this.buyers.listAddresses(companyId);
    const selected = addresses.find((a) => a.id === addressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
    const cartRow = await this.cart.cartFor(actor);
    const city = selected ? await this.cart.resolveCity(actor, { addressId: selected.id }) : await this.cart.resolveCity(actor);
    const quote = await this.cart.quote(actor, cartRow, city);
    const company = await this.prisma.buyerCompany.findUniqueOrThrow({ where: { id: companyId }, select: { verificationStatus: true } });
    return {
      addresses,
      selectedAddressId: selected?.id ?? null,
      paymentMethods: await this.paymentOptions(companyId, quote.totals.grandTotal),
      deliverySlots: quote.groups.map((g) => ({
        supplierId: g.supplierId,
        supplierName: loc(g.supplier.nameAr, g.supplier.nameEn),
        slots: g.coverage ? deliverySlots({ leadTimeDays: g.leadTimeDays, sameDayAvailable: g.coverage.sameDayAvailable, cutoffTime: g.coverage.cutoffTime }) : [],
      })),
      cart: await this.quotes.toDto(cartRow.id, quote, city),
      companyVerified: company.verificationStatus === 'VERIFIED',
    };
  }

  async place(actor: Actor, input: z.output<typeof placeOrderSchema>): Promise<PlaceOrderResult> {
    const companyId = actor.contextId as string;
    const address = await this.prisma.buyerAddress.findFirst({ where: { id: input.addressId, companyId, deletedAt: null }, include: { city: true } });
    if (!address) throw AppError.notFound();
    const cartRow = await this.cart.cartFor(actor);
    const quote = await this.cart.quote(actor, cartRow, address.city);
    if (!quote.itemsCount) throw AppError.unprocessable(ErrorCode.CART_EMPTY);
    if (quote.blocking) throw AppError.unprocessable(ErrorCode.CART_HAS_ERRORS);
    if (!quote.totals.grandTotal.equals(dec(input.expectedTotal))) {
      throw AppError.conflict(ErrorCode.CONFLICT, {}, { reason: 'TOTAL_CHANGED', grandTotal: money(quote.totals.grandTotal) });
    }
    const option = (await this.paymentOptions(companyId, quote.totals.grandTotal)).find((o) => o.method === input.paymentMethod);
    if (!option?.available) throw new AppError(ErrorCode.PAYMENT_METHOD_UNAVAILABLE, HttpStatus.UNPROCESSABLE_ENTITY);
    for (const g of quote.groups) {
      const d = input.deliveries.find((x) => x.supplierId === g.supplierId);
      if (!d || !g.coverage || !isValidSlot({ leadTimeDays: g.leadTimeDays, sameDayAvailable: g.coverage.sameDayAvailable, cutoffTime: g.coverage.cutoffTime }, d.date, d.window)) {
        throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED, {}, { fields: [{ path: `deliveries.${g.supplierId}`, message: 'invalid delivery slot' }] });
      }
    }

    const orderSettings = await this.settings.get('orders');
    const prepaid = input.paymentMethod === 'CARD' || input.paymentMethod === 'BANK_TRANSFER';
    const snapshot: AddressSnapshot = {
      label: address.label,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      city: loc(address.city.nameAr, address.city.nameEn),
      cityId: address.cityId,
      district: address.district,
      street: address.street,
      buildingNumber: address.buildingNumber,
      postalCode: address.postalCode,
      shortAddress: address.shortAddress,
      lat: address.lat,
      lng: address.lng,
      notes: address.notes,
      formatted: [address.buildingNumber && address.street ? `${address.buildingNumber} ${address.street}` : address.street, address.district, address.city.nameAr].filter(Boolean).join('، '),
    };
    const source = actor.app === 'BUYER_APP' ? 'BUYER_APP' : 'WEB';

    const orderId = await this.prisma.tx(async (tx) => {
      const number = await this.sequences.next(tx, 'TW');
      const order = await tx.order.create({
        data: {
          number,
          companyId,
          placedById: actor.userId,
          source,
          status: prepaid ? 'PENDING_PAYMENT' : 'PLACED',
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentMethod === 'CREDIT' ? 'DEFERRED' : 'UNPAID',
          addressId: address.id,
          addressSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          subtotal: money(quote.totals.subtotal),
          discountTotal: money(quote.totals.discountTotal),
          deliveryTotal: money(quote.totals.deliveryTotal),
          vatTotal: money(quote.totals.vatTotal),
          grandTotal: money(quote.totals.grandTotal),
          couponId: quote.coupon?.id ?? null,
          couponCode: quote.coupon?.code ?? null,
          notes: input.notes ?? null,
          placedAt: prepaid ? null : new Date(),
        },
      });
      await this.createSupplierOrders(tx, order.id, number, quote, input.deliveries, { prepaid, acceptHours: orderSettings.supplierAcceptHours });

      if (quote.coupon) {
        await tx.couponRedemption.create({ data: { couponId: quote.coupon.id, orderId: order.id, companyId, amount: money(quote.couponDiscount.plus(quote.waivedDelivery)) } });
        await tx.coupon.update({ where: { id: quote.coupon.id }, data: { usedCount: { increment: 1 } } });
      }
      if (input.paymentMethod === 'CREDIT') await this.credit.charge(tx, companyId, quote.totals.grandTotal, { orderId: order.id, note: number, actorId: actor.userId });

      await this.events.add(tx, { orderId: order.id, type: 'order.placed', actorType: 'BUYER', actorId: actor.userId });
      if (prepaid) await this.events.add(tx, { orderId: order.id, type: 'order.payment_pending', actorType: 'SYSTEM' });
      await tx.cartItem.deleteMany({ where: { cartId: cartRow.id } });
      await tx.cart.update({ where: { id: cartRow.id }, data: { couponId: null } });
      await this.audit.record(tx, { action: 'order.placed', entityType: 'Order', entityId: order.id, after: { number, total: money(quote.totals.grandTotal), method: input.paymentMethod } });
      await this.outbox.publish(tx, 'order.placed', { orderId: order.id, companyId, prepaid });
      if (prepaid) await this.outbox.publish(tx, 'order.unpaid_timeout', { orderId: order.id }, { delayMs: orderSettings.unpaidCancelHours * 3_600_000 });
      return order.id;
    });

    let checkoutUrl: string | null = null;
    if (input.paymentMethod === 'CARD' && input.returnUrl) {
      checkoutUrl = (await this.payments.initCard(actor, { purpose: 'ORDER', orderId, returnUrl: input.returnUrl, source: 'src_all' })).checkoutUrl;
    }
    const row = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderSummaryInclude });
    const [summary] = await this.presenter.summaries([row]);
    const bank = await this.settings.get('payments');
    return {
      order: summary as PlaceOrderResult['order'],
      payment: {
        method: input.paymentMethod,
        status: row.paymentStatus,
        amount: money(row.grandTotal),
        checkoutUrl,
        bankAccounts: input.paymentMethod === 'BANK_TRANSFER' ? bank.bankAccounts : null,
      },
    };
  }

  /** Splits the quote into supplier orders, snapshots items, reserves stock and deal capacity. */
  async createSupplierOrders(
    tx: Tx,
    orderId: string,
    number: string,
    quote: CartQuote,
    deliveries: { supplierId: string; date: string; window: 'MORNING' | 'AFTERNOON' | 'EVENING' }[],
    opts: { prepaid: boolean; acceptHours: number },
  ): Promise<void> {
    let i = 0;
    for (const g of quote.groups) {
      i++;
      const d = deliveries.find((x) => x.supplierId === g.supplierId);
      const rate = g.supplier.commissionRate;
      const so = await tx.supplierOrder.create({
        data: {
          orderId,
          supplierId: g.supplierId,
          number: `${number}-${i}`,
          status: opts.prepaid ? 'AWAITING_PAYMENT' : 'PENDING',
          subtotal: money(g.totals.subtotal),
          discountTotal: money(g.totals.discountTotal),
          deliveryFee: money(g.totals.deliveryFee),
          vatTotal: money(g.totals.vatTotal),
          total: money(g.totals.total),
          commissionRate: rate.toString(),
          commissionAmount: money(commission(g.totals.subtotal, rate)),
          deliveryDate: d ? new Date(`${d.date}T00:00:00Z`) : null,
          deliveryWindow: d?.window ?? null,
          storageType: g.storageType,
          acceptDeadlineAt: opts.prepaid ? null : new Date(Date.now() + opts.acceptHours * 3_600_000),
        },
      });
      for (const l of g.lines) {
        const qty = l.qty.toFixed(3);
        if (l.offer.stockMode === 'TRACKED') {
          const reserved = await tx.$executeRaw`UPDATE offers SET "reservedQty" = "reservedQty" + ${qty}::numeric, "updatedAt" = now()
            WHERE id = ${l.offer.id}::uuid AND "stockQty" - "reservedQty" >= ${qty}::numeric`;
          if (reserved === 0) throw new AppError(ErrorCode.OUT_OF_STOCK, HttpStatus.CONFLICT, { available: '0' });
        }
        const deal = l.price.source === 'DEAL' ? l.offer.deals[0] : undefined;
        if (deal) await tx.$executeRaw`UPDATE deals SET "soldQty" = "soldQty" + ${qty}::numeric, "updatedAt" = now() WHERE id = ${deal.id}::uuid`;
        await tx.orderItem.create({
          data: {
            supplierOrderId: so.id,
            offerId: l.offer.id,
            productId: l.product.id,
            productUnitId: l.offer.productUnitId,
            productNameAr: l.product.nameAr,
            productNameEn: l.product.nameEn,
            unitNameAr: l.offer.unit.nameAr,
            unitNameEn: l.offer.unit.nameEn,
            imageKey: (l.product.imageFile?.variants as Record<string, string> | null)?.thumb ?? l.product.imageFile?.key ?? null,
            sku: l.offer.sku,
            qty,
            unitPrice: money(l.price.unitPrice),
            listUnitPrice: money(l.price.listUnitPrice),
            priceSource: l.price.source,
            dealId: deal?.id ?? null,
            discount: money(l.amounts.discount),
            vatRate: l.offer.vatRate.toString(),
            vatAmount: money(l.amounts.vatAmount),
            lineSubtotal: money(l.amounts.lineSubtotal),
            lineTotal: money(l.amounts.lineTotal),
          },
        });
        await tx.product.update({ where: { id: l.product.id }, data: { salesCount: { increment: 1 } } });
      }
    }
  }
}
