import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { adminPaymentQuery, bankTransferSchema, cardPaymentSchema, paginationQuery, paymentDecisionSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor, Public } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate, RawResponse } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service.js';
import { PaymentsService } from './payments.service.js';
import type { TapCharge } from './tap.client.js';

@ApiTags('buyer-payments')
@ApiBearerAuth()
@Auth('BUYER', 'buyer.orders.view')
@Controller('buyer/payments')
export class BuyerPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly idem: IdempotencyService,
  ) {}

  @Get()
  async list(@CurrentActor() actor: Actor, @ZQuery(paginationQuery) q: z.output<typeof paginationQuery>) {
    const { data, meta } = await this.payments.buyerList(actor.contextId as string, q.page, q.pageSize);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Post('card')
  card(@CurrentActor() actor: Actor, @ZBody(cardPaymentSchema) body: z.output<typeof cardPaymentSchema>, @Headers('idempotency-key') key?: string) {
    return this.idem.run(`card:${actor.contextId}`, key, () => this.payments.initCard(actor, body));
  }

  @Get(':id/verify')
  verify(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.verify(actor.contextId, id);
  }

  @Post('bank-transfer')
  bank(@CurrentActor() actor: Actor, @ZBody(bankTransferSchema) body: z.output<typeof bankTransferSchema>, @Headers('idempotency-key') key?: string) {
    return this.idem.run(`bank:${actor.contextId}`, key, () => this.payments.submitBankTransfer(actor, body));
  }
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('tap')
  @HttpCode(200)
  async tap(@Body() body: TapCharge, @Headers('hashstring') hash?: string) {
    if (body?.id) await this.payments.webhook(body, hash);
    return new RawResponse({ received: true });
  }
}

@ApiTags('admin-payments')
@ApiBearerAuth()
@Auth('STAFF', 'admin.finance.view')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  async list(@ZQuery(adminPaymentQuery) q: z.output<typeof adminPaymentQuery>) {
    const { data, meta } = await this.payments.adminList(q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.adminGet(id);
  }

  @Auth('STAFF', 'admin.payments.verify')
  @Patch(':id/decision')
  decide(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(paymentDecisionSchema) body: z.output<typeof paymentDecisionSchema>) {
    return this.payments.decide(actor.userId, id, body);
  }
}
