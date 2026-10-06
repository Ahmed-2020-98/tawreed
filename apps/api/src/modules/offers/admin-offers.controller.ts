import { Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { dealListQuery, offerListQuery, offerUpdateSchema, reviewDecisionSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { OffersService } from './offers.service.js';

@ApiTags('admin-offers')
@ApiBearerAuth()
@Auth('STAFF', 'admin.catalog.manage')
@Controller('admin')
export class AdminOffersController {
  constructor(private readonly offers: OffersService) {}

  @Get('offers')
  async list(@ZQuery(offerListQuery) query: z.output<typeof offerListQuery>) {
    const { data, meta } = await this.offers.list(null, query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Patch('offers/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @ZBody(offerUpdateSchema) body: z.output<typeof offerUpdateSchema>) {
    return this.offers.update(null, id, body);
  }

  @Patch('offers/:id/review')
  reviewOffer(@Param('id', ParseUUIDPipe) id: string, @ZBody(reviewDecisionSchema) body: z.output<typeof reviewDecisionSchema>) {
    return this.offers.reviewOffer(id, body);
  }

  @Get('deals')
  async deals(@ZQuery(dealListQuery) query: z.output<typeof dealListQuery>) {
    const { data, meta } = await this.offers.listDeals(null, query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Patch('deals/:id/review')
  reviewDeal(@Param('id', ParseUUIDPipe) id: string, @ZBody(reviewDecisionSchema) body: z.output<typeof reviewDecisionSchema>, @CurrentActor() actor: Actor) {
    return this.offers.reviewDeal(id, body, actor.userId);
  }

  @Post('deals/:id/cancel')
  cancelDeal(@Param('id', ParseUUIDPipe) id: string) {
    return this.offers.cancelDeal(null, id);
  }
}
