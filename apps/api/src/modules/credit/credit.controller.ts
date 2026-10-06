import { Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { creditAdjustSchema, creditApplicationSchema, creditDecisionSchema, paginationQuery } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { creditAccountsQuery, creditApplicationsQuery, CreditService } from './credit.service.js';

@ApiTags('buyer-credit')
@ApiBearerAuth()
@Auth('BUYER', 'buyer.credit.view')
@Controller('buyer/credit')
export class BuyerCreditController {
  constructor(private readonly credit: CreditService) {}

  @Get()
  overview(@CurrentActor() actor: Actor) {
    return this.credit.overview(actor.contextId as string);
  }

  @Get('ledger')
  async ledger(@CurrentActor() actor: Actor, @ZQuery(paginationQuery) q: z.output<typeof paginationQuery>) {
    const { data, meta } = await this.credit.ledger(actor.contextId as string, q.page, q.pageSize);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Auth('BUYER', 'buyer.credit.apply')
  @Post('applications')
  apply(@CurrentActor() actor: Actor, @ZBody(creditApplicationSchema) body: z.output<typeof creditApplicationSchema>) {
    return this.credit.apply(actor.contextId as string, actor.userId, body);
  }
}

@ApiTags('admin-credit')
@ApiBearerAuth()
@Auth('STAFF', 'admin.credit.manage')
@Controller('admin/credit')
export class AdminCreditController {
  constructor(private readonly credit: CreditService) {}

  @Get('accounts')
  async accounts(@ZQuery(creditAccountsQuery) q: z.output<typeof creditAccountsQuery>) {
    const { data, meta } = await this.credit.listAccounts(q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get('companies/:companyId')
  overview(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.credit.overview(companyId);
  }

  @Get('companies/:companyId/ledger')
  async ledger(@Param('companyId', ParseUUIDPipe) companyId: string, @ZQuery(paginationQuery) q: z.output<typeof paginationQuery>) {
    const { data, meta } = await this.credit.ledger(companyId, q.page, q.pageSize);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Patch('companies/:companyId')
  adjust(@Param('companyId', ParseUUIDPipe) companyId: string, @CurrentActor() actor: Actor, @ZBody(creditAdjustSchema) body: z.output<typeof creditAdjustSchema>) {
    return this.credit.adjust(companyId, actor.userId, body);
  }

  @Get('applications')
  async applications(@ZQuery(creditApplicationsQuery) q: z.output<typeof creditApplicationsQuery>) {
    const { data, meta } = await this.credit.listApplications(q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Post('applications/:id/decision')
  decide(@Param('id', ParseUUIDPipe) id: string, @CurrentActor() actor: Actor, @ZBody(creditDecisionSchema) body: z.output<typeof creditDecisionSchema>) {
    return this.credit.decide(id, actor.userId, body);
  }
}
