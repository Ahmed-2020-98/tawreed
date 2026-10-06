import { Global, Module } from '@nestjs/common';
import { CartQuoteService } from './cart-quote.service.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { CouponService } from './coupon.service.js';

@Global()
@Module({ controllers: [CartController], providers: [CartService, CartQuoteService, CouponService], exports: [CartService, CartQuoteService, CouponService] })
export class CartModule {}
