import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { addCartItemSchema, applyCouponSchema, type CartDto, cartQuery, updateCartItemSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { CartService } from './cart.service.js';

@ApiTags('cart')
@ApiBearerAuth()
@Auth('BUYER')
@Controller('buyer/cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentActor() actor: Actor, @ZQuery(cartQuery) query: z.output<typeof cartQuery>): Promise<CartDto> {
    return this.cart.get(actor, query);
  }

  @Get('count')
  count(@CurrentActor() actor: Actor) {
    return this.cart.count(actor);
  }

  @Auth('BUYER', 'buyer.cart.manage')
  @Post('items')
  add(@CurrentActor() actor: Actor, @ZBody(addCartItemSchema) body: z.output<typeof addCartItemSchema>): Promise<CartDto> {
    return this.cart.add(actor, body.offerId, body.qty);
  }

  @Auth('BUYER', 'buyer.cart.manage')
  @Patch('items/:id')
  update(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(updateCartItemSchema) body: z.output<typeof updateCartItemSchema>): Promise<CartDto> {
    return this.cart.update(actor, id, body.qty);
  }

  @Auth('BUYER', 'buyer.cart.manage')
  @Delete('items/:id')
  remove(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string): Promise<CartDto> {
    return this.cart.remove(actor, id);
  }

  @Auth('BUYER', 'buyer.cart.manage')
  @Delete()
  clear(@CurrentActor() actor: Actor): Promise<CartDto> {
    return this.cart.clear(actor);
  }

  @Auth('BUYER', 'buyer.cart.manage')
  @Post('coupon')
  applyCoupon(@CurrentActor() actor: Actor, @ZBody(applyCouponSchema) body: z.output<typeof applyCouponSchema>): Promise<CartDto> {
    return this.cart.applyCoupon(actor, body.code);
  }

  @Auth('BUYER', 'buyer.cart.manage')
  @Delete('coupon')
  removeCoupon(@CurrentActor() actor: Actor): Promise<CartDto> {
    return this.cart.removeCoupon(actor);
  }
}
