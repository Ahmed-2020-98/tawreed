import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { addKybDocumentSchema, kybDecisionSchema, kybDocumentDecisionSchema, kybQueueQuery } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { KybService } from './kyb.service.js';

@ApiTags('kyb')
@ApiBearerAuth()
@Controller()
export class KybController {
  constructor(private readonly kyb: KybService) {}

  @Auth('BUYER')
  @Get('buyer/kyb')
  buyerOverview(@CurrentActor() actor: Actor) {
    return this.kyb.overview({ kind: 'BUYER', id: actor.contextId as string });
  }

  @Auth('BUYER', 'buyer.kyb.manage')
  @Post('buyer/kyb/documents')
  buyerAdd(@CurrentActor() actor: Actor, @ZBody(addKybDocumentSchema) body: z.output<typeof addKybDocumentSchema>) {
    return this.kyb.addDocument({ kind: 'BUYER', id: actor.contextId as string }, actor.userId, body);
  }

  @Auth('BUYER', 'buyer.kyb.manage')
  @Delete('buyer/kyb/documents/:id')
  buyerRemove(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.kyb.removeDocument({ kind: 'BUYER', id: actor.contextId as string }, id);
  }

  @Auth('BUYER', 'buyer.kyb.manage')
  @Post('buyer/kyb/submit')
  buyerSubmit(@CurrentActor() actor: Actor) {
    return this.kyb.submit({ kind: 'BUYER', id: actor.contextId as string });
  }

  @Auth('SUPPLIER')
  @Get('supplier/kyb')
  supplierOverview(@CurrentActor() actor: Actor) {
    return this.kyb.overview({ kind: 'SUPPLIER', id: actor.contextId as string });
  }

  @Auth('SUPPLIER', 'supplier.profile.manage')
  @Post('supplier/kyb/documents')
  supplierAdd(@CurrentActor() actor: Actor, @ZBody(addKybDocumentSchema) body: z.output<typeof addKybDocumentSchema>) {
    return this.kyb.addDocument({ kind: 'SUPPLIER', id: actor.contextId as string }, actor.userId, body);
  }

  @Auth('SUPPLIER', 'supplier.profile.manage')
  @Delete('supplier/kyb/documents/:id')
  supplierRemove(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.kyb.removeDocument({ kind: 'SUPPLIER', id: actor.contextId as string }, id);
  }

  @Auth('SUPPLIER', 'supplier.profile.manage')
  @Post('supplier/kyb/submit')
  supplierSubmit(@CurrentActor() actor: Actor) {
    return this.kyb.submit({ kind: 'SUPPLIER', id: actor.contextId as string });
  }

  @Auth('STAFF', 'admin.kyb.review')
  @Get('admin/kyb')
  async queue(@ZQuery(kybQueueQuery) query: z.output<typeof kybQueueQuery>) {
    const { data, meta } = await this.kyb.queue(query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Auth('STAFF', 'admin.kyb.review')
  @Get('admin/kyb/:kind/:id')
  adminOverview(@Param('kind') kind: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.kyb.overview({ kind: kind.toUpperCase() === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER', id });
  }

  @Auth('STAFF', 'admin.kyb.review')
  @Patch('admin/kyb/documents/:id')
  decideDocument(@Param('id', ParseUUIDPipe) id: string, @CurrentActor() actor: Actor, @ZBody(kybDocumentDecisionSchema) body: z.output<typeof kybDocumentDecisionSchema>) {
    return this.kyb.decideDocument(id, actor.userId, body);
  }

  @Auth('STAFF', 'admin.kyb.review')
  @Post('admin/kyb/:kind/:id/decision')
  decide(@Param('kind') kind: string, @Param('id', ParseUUIDPipe) id: string, @CurrentActor() actor: Actor, @ZBody(kybDecisionSchema) body: z.output<typeof kybDecisionSchema>) {
    return this.kyb.decide({ kind: kind.toUpperCase() === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER', id }, actor.userId, body);
  }
}
