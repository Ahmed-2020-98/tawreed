import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { addressInputSchema, inviteBuyerMemberSchema, updateBuyerMemberSchema, updateCompanySchema } from '@tawreed/contracts';
import { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { adminBuyerQuery, BuyersService } from './buyers.service.js';

@ApiTags('buyer-company')
@ApiBearerAuth()
@Auth('BUYER')
@Controller('buyer')
export class BuyerCompanyController {
  constructor(private readonly buyers: BuyersService) {}

  @Get('company')
  company(@CurrentActor() actor: Actor) {
    return this.buyers.getCompany(actor.contextId as string);
  }

  @Auth('BUYER', 'buyer.company.manage')
  @Patch('company')
  update(@CurrentActor() actor: Actor, @ZBody(updateCompanySchema) body: z.output<typeof updateCompanySchema>) {
    return this.buyers.updateCompany(actor.contextId as string, body);
  }

  @Get('addresses')
  addresses(@CurrentActor() actor: Actor) {
    return this.buyers.listAddresses(actor.contextId as string);
  }

  @Auth('BUYER', 'buyer.addresses.manage')
  @Post('addresses')
  createAddress(@CurrentActor() actor: Actor, @ZBody(addressInputSchema) body: z.output<typeof addressInputSchema>) {
    return this.buyers.saveAddress(actor.contextId as string, body);
  }

  @Auth('BUYER', 'buyer.addresses.manage')
  @Put('addresses/:id')
  updateAddress(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(addressInputSchema) body: z.output<typeof addressInputSchema>) {
    return this.buyers.saveAddress(actor.contextId as string, body, id);
  }

  @Auth('BUYER', 'buyer.addresses.manage')
  @Delete('addresses/:id')
  async deleteAddress(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    await this.buyers.deleteAddress(actor.contextId as string, id);
    return { ok: true };
  }

  @Get('team')
  team(@CurrentActor() actor: Actor) {
    return this.buyers.listMembers(actor.contextId as string, actor);
  }

  @Auth('BUYER', 'buyer.team.manage')
  @Post('team')
  invite(@CurrentActor() actor: Actor, @ZBody(inviteBuyerMemberSchema) body: z.output<typeof inviteBuyerMemberSchema>) {
    return this.buyers.inviteMember(actor.contextId as string, actor, body);
  }

  @Auth('BUYER', 'buyer.team.manage')
  @Patch('team/:id')
  updateMember(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(updateBuyerMemberSchema) body: z.output<typeof updateBuyerMemberSchema>) {
    return this.buyers.updateMember(actor.contextId as string, actor, id, body);
  }
}

@ApiTags('admin-buyers')
@ApiBearerAuth()
@Auth('STAFF', 'admin.buyers.view')
@Controller('admin/buyers')
export class AdminBuyersController {
  constructor(private readonly buyers: BuyersService) {}

  @Get()
  async list(@ZQuery(adminBuyerQuery) query: z.output<typeof adminBuyerQuery>) {
    const { data, meta } = await this.buyers.adminList(query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.buyers.adminDetail(id);
  }

  @Auth('STAFF', 'admin.buyers.manage')
  @Patch(':id/status')
  status(@Param('id', ParseUUIDPipe) id: string, @Body() body: { status: 'ACTIVE' | 'SUSPENDED'; note?: string }) {
    const parsed = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']), note: z.string().max(300).optional() }).parse(body);
    return this.buyers.adminSetStatus(id, parsed.status, parsed.note);
  }

  @Auth('STAFF', 'admin.buyers.manage')
  @Patch(':id/account-manager')
  accountManager(@Param('id', ParseUUIDPipe) id: string, @Body() body: { userId: string | null }) {
    const parsed = z.object({ userId: z.uuid().nullable() }).parse(body);
    return this.buyers.adminSetAccountManager(id, parsed.userId);
  }
}
