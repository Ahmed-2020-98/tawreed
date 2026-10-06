import { Controller, Get, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  acceptQuotationSchema,
  createRfqSchema,
  declineRfqSchema,
  quotationMessageSchema,
  requestRevisionSchema,
  rfqListQuery,
  submitQuotationSchema,
  supplierRfqQuery,
} from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { IdempotencyService } from '../../infrastructure/idempotency/idempotency.service.js';
import { RfqService } from './rfq.service.js';

@ApiTags('buyer-rfq')
@ApiBearerAuth()
@Auth('BUYER', 'buyer.rfq.manage')
@Controller('buyer')
export class BuyerRfqController {
  constructor(
    private readonly rfq: RfqService,
    private readonly idem: IdempotencyService,
  ) {}

  @Get('rfqs')
  async list(@CurrentActor() actor: Actor, @ZQuery(rfqListQuery) q: z.output<typeof rfqListQuery>) {
    const { data, meta } = await this.rfq.buyerList(actor.contextId as string, q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Post('rfqs')
  create(@CurrentActor() actor: Actor, @ZBody(createRfqSchema) body: z.output<typeof createRfqSchema>) {
    return this.rfq.create(actor, body);
  }

  @Get('rfqs/:id')
  detail(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.rfq.buyerDetail(actor, id);
  }

  @Post('rfqs/:id/cancel')
  cancel(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.cancel(actor, id);
  }

  @Get('quotations/:id')
  quotation(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.quotationDetail(actor, id);
  }

  @Post('quotations/:id/messages')
  message(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(quotationMessageSchema) body: z.output<typeof quotationMessageSchema>) {
    return this.rfq.message(actor, id, body);
  }

  @Post('quotations/:id/request-revision')
  revise(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(requestRevisionSchema) body: z.output<typeof requestRevisionSchema>) {
    return this.rfq.requestRevision(actor, id, body.message);
  }

  @Post('quotations/:id/reject')
  reject(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.reject(actor, id);
  }

  @Auth('BUYER', 'buyer.quotations.accept')
  @Post('quotations/:id/accept/otp')
  acceptOtp(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.requestAcceptOtp(actor, id);
  }

  @Auth('BUYER', 'buyer.quotations.accept')
  @Post('quotations/:id/accept')
  accept(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(acceptQuotationSchema) body: z.output<typeof acceptQuotationSchema>, @Headers('idempotency-key') key?: string) {
    return this.idem.run(`quote-accept:${id}`, key, () => this.rfq.accept(actor, id, body));
  }
}

@ApiTags('supplier-rfq')
@ApiBearerAuth()
@Auth('SUPPLIER', 'supplier.rfq.manage')
@Controller('supplier')
export class SupplierRfqController {
  constructor(private readonly rfq: RfqService) {}

  @Get('rfqs')
  async inbox(@CurrentActor() actor: Actor, @ZQuery(supplierRfqQuery) q: z.output<typeof supplierRfqQuery>) {
    const { data, meta } = await this.rfq.inbox(actor.contextId as string, q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get('rfqs/:id')
  detail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.supplierRfq(actor, id);
  }

  @Post('rfqs/:id/decline')
  decline(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(declineRfqSchema) body: z.output<typeof declineRfqSchema>) {
    return this.rfq.decline(actor, id, body.reason);
  }

  @Post('rfqs/:id/quotations')
  submit(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(submitQuotationSchema) body: z.output<typeof submitQuotationSchema>) {
    return this.rfq.submitQuotation(actor, id, body);
  }

  @Get('quotations/:id')
  quotation(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.quotationDetail(actor, id);
  }

  @Post('quotations/:id/messages')
  message(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(quotationMessageSchema) body: z.output<typeof quotationMessageSchema>) {
    return this.rfq.message(actor, id, body);
  }

  @Post('quotations/:id/withdraw')
  withdraw(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.withdraw(actor, id);
  }
}

@ApiTags('admin-rfq')
@ApiBearerAuth()
@Auth('STAFF', 'admin.rfq.view')
@Controller('admin/rfqs')
export class AdminRfqController {
  constructor(private readonly rfq: RfqService) {}

  @Get()
  async list(@ZQuery(rfqListQuery) q: z.output<typeof rfqListQuery>) {
    const { data, meta } = await this.rfq.adminList(q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get(':id')
  detail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.adminDetail(actor, id);
  }

  @Get('quotations/:id')
  quotation(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfq.quotationDetail(actor, id);
  }
}
