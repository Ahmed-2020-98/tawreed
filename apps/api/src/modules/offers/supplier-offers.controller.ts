import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { dealInputSchema, dealListQuery, offerBulkUpdateSchema, offerInputSchema, offerListQuery, offerUpdateSchema, productProposalSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { OffersService } from './offers.service.js';

@ApiTags('supplier-offers')
@ApiBearerAuth()
@Auth('SUPPLIER', 'supplier.offers.manage')
@Controller('supplier')
export class SupplierOffersController {
  constructor(private readonly offers: OffersService) {}

  @Get('offers')
  async list(@CurrentActor() actor: Actor, @ZQuery(offerListQuery) query: z.output<typeof offerListQuery>) {
    const { data, meta } = await this.offers.list(actor.contextId, query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get('offers/:id')
  get(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.offers.get(actor.contextId, id);
  }

  @Post('offers')
  create(@CurrentActor() actor: Actor, @ZBody(offerInputSchema) body: z.output<typeof offerInputSchema>) {
    return this.offers.create(actor.contextId as string, body);
  }

  @Patch('offers/:id')
  update(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(offerUpdateSchema) body: z.output<typeof offerUpdateSchema>) {
    return this.offers.update(actor.contextId, id, body);
  }

  @Post('offers/bulk')
  bulk(@CurrentActor() actor: Actor, @ZBody(offerBulkUpdateSchema) body: z.output<typeof offerBulkUpdateSchema>) {
    return this.offers.bulkUpdate(actor.contextId as string, body);
  }

  @Delete('offers/:id')
  async archive(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    await this.offers.archive(actor.contextId, id);
    return { ok: true };
  }

  @Get('catalog/search')
  search(@CurrentActor() actor: Actor, @Query('q') q?: string, @Query('categoryId') categoryId?: string) {
    return this.offers.searchMasterCatalog(actor.contextId as string, q, categoryId);
  }

  @Post('products/proposals')
  propose(@CurrentActor() actor: Actor, @ZBody(productProposalSchema) body: z.output<typeof productProposalSchema>) {
    return this.offers.propose(actor.contextId as string, body);
  }

  @Auth('SUPPLIER', 'supplier.deals.manage')
  @Get('deals')
  async deals(@CurrentActor() actor: Actor, @ZQuery(dealListQuery) query: z.output<typeof dealListQuery>) {
    const { data, meta } = await this.offers.listDeals(actor.contextId, query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Auth('SUPPLIER', 'supplier.deals.manage')
  @Post('deals')
  createDeal(@CurrentActor() actor: Actor, @ZBody(dealInputSchema) body: z.output<typeof dealInputSchema>) {
    return this.offers.createDeal(actor.contextId as string, body);
  }

  @Auth('SUPPLIER', 'supplier.deals.manage')
  @Post('deals/:id/cancel')
  cancelDeal(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.offers.cancelDeal(actor.contextId, id);
  }
}
