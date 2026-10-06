import { HttpStatus, Injectable } from '@nestjs/common';
import { type CartDto, ErrorCode } from '@tawreed/contracts';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import type { Cart } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { ViewerService } from '../catalog/viewer.service.js';
import { GeoService } from '../geo/geo.service.js';
import { dec } from '../pricing/domain/money.js';
import { normalizeQty } from '../pricing/domain/pricing.js';
import { CartQuoteService, type CartQuote } from './cart-quote.service.js';
import { CouponService } from './coupon.service.js';

export interface CartCity {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: CartQuoteService,
    private readonly coupons: CouponService,
    private readonly geo: GeoService,
    private readonly viewers: ViewerService,
  ) {}

  async cartFor(actor: Actor): Promise<Cart> {
    const companyId = actor.contextId as string;
    return this.prisma.cart.upsert({
      where: { companyId_userId: { companyId, userId: actor.userId } },
      create: { companyId, userId: actor.userId },
      update: {},
    });
  }

  async resolveCity(actor: Actor, opts: { addressId?: string; city?: string } = {}): Promise<CartCity | null> {
    if (opts.addressId) {
      const address = await this.prisma.buyerAddress.findFirst({ where: { id: opts.addressId, companyId: actor.contextId as string, deletedAt: null }, include: { city: true } });
      if (!address) throw AppError.notFound();
      return address.city;
    }
    const viewer = await this.viewers.resolve(actor, opts.city);
    return (await this.geo.resolve(viewer.cityId)) ?? null;
  }

  async quote(actor: Actor, cart: Cart, city: CartCity | null): Promise<CartQuote> {
    const [items, coupon] = await Promise.all([
      this.prisma.cartItem.findMany({ where: { cartId: cart.id }, orderBy: { createdAt: 'asc' } }),
      cart.couponId ? this.prisma.coupon.findUnique({ where: { id: cart.couponId } }) : Promise.resolve(null),
    ]);
    return this.quotes.quote(
      items.map((i) => ({ id: i.id, offerId: i.offerId, qty: i.qty.toString() })),
      { cityId: city?.id ?? null, companyId: actor.contextId as string, coupon },
    );
  }

  async get(actor: Actor, opts: { addressId?: string; city?: string } = {}): Promise<CartDto> {
    const [cart, city] = await Promise.all([this.cartFor(actor), this.resolveCity(actor, opts)]);
    return this.quotes.toDto(cart.id, await this.quote(actor, cart, city), city);
  }

  async count(actor: Actor): Promise<{ itemsCount: number }> {
    const cart = await this.cartFor(actor);
    return { itemsCount: await this.prisma.cartItem.count({ where: { cartId: cart.id } }) };
  }

  async add(actor: Actor, offerId: string, qty: string): Promise<CartDto> {
    const offer = await this.prisma.offer.findFirst({ where: { id: offerId, status: 'ACTIVE', deletedAt: null, supplier: { status: 'ACTIVE' } } });
    if (!offer) throw new AppError(ErrorCode.OFFER_UNAVAILABLE, HttpStatus.UNPROCESSABLE_ENTITY);
    const cart = await this.cartFor(actor);
    const existing = await this.prisma.cartItem.findUnique({ where: { cartId_offerId: { cartId: cart.id, offerId } } });
    const next = normalizeQty(offer, existing ? dec(existing.qty).plus(dec(qty)) : dec(qty)).toString();
    await this.prisma.cartItem.upsert({
      where: { cartId_offerId: { cartId: cart.id, offerId } },
      create: { cartId: cart.id, offerId, qty: next },
      update: { qty: next },
    });
    await this.prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    return this.get(actor);
  }

  async update(actor: Actor, itemId: string, qty: string): Promise<CartDto> {
    const cart = await this.cartFor(actor);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { offer: true } });
    if (!item) throw AppError.notFound();
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { qty: normalizeQty(item.offer, qty).toString() } });
    return this.get(actor);
  }

  async remove(actor: Actor, itemId: string): Promise<CartDto> {
    const cart = await this.cartFor(actor);
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    return this.get(actor);
  }

  async clear(actor: Actor): Promise<CartDto> {
    const cart = await this.cartFor(actor);
    await this.prisma.$transaction([this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }), this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } })]);
    return this.get(actor);
  }

  async applyCoupon(actor: Actor, code: string): Promise<CartDto> {
    const coupon = await this.coupons.findByCode(code);
    if (!coupon) throw new AppError(ErrorCode.COUPON_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
    const cart = await this.cartFor(actor);
    const quote = await this.quote(actor, { ...cart, couponId: coupon.id }, await this.resolveCity(actor));
    if (quote.couponIssue) throw new AppError(quote.couponIssue.code, HttpStatus.UNPROCESSABLE_ENTITY, quote.couponIssue.params);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    return this.get(actor);
  }

  async removeCoupon(actor: Actor): Promise<CartDto> {
    const cart = await this.cartFor(actor);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    return this.get(actor);
  }
}
