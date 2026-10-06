import { Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { placeOrderSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { ZBody } from '../../common/http/zod.js';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service.js';
import { CheckoutService } from './checkout.service.js';

@ApiTags('checkout')
@ApiBearerAuth()
@Auth('BUYER', 'buyer.orders.place')
@Controller('buyer/checkout')
export class CheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly idem: IdempotencyService,
  ) {}

  @Get('options')
  options(@CurrentActor() actor: Actor, @Query('addressId') addressId?: string) {
    return this.checkout.options(actor, addressId);
  }

  @Post('place')
  place(@CurrentActor() actor: Actor, @ZBody(placeOrderSchema) body: z.output<typeof placeOrderSchema>, @Headers('idempotency-key') key?: string) {
    return this.idem.run(`checkout:${actor.contextId}:${actor.userId}`, key, () => this.checkout.place(actor, body));
  }
}
