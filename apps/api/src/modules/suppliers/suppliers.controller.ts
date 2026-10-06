import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '../../common/http/throttle.js';
import {
  applicationDecisionSchema,
  applicationQuery,
  coverageInputSchema,
  inviteSupplierMemberSchema,
  supplierApplicationSchema,
  updateSupplierMemberSchema,
  updateSupplierProfileSchema,
  warehouseInputSchema,
} from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor, Public } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { adminSupplierQuery, adminSupplierUpdateSchema, SuppliersService } from './suppliers.service.js';

@ApiTags('supplier-profile')
@ApiBearerAuth()
@Auth('SUPPLIER')
@Controller('supplier')
export class SupplierProfileController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get('profile')
  profile(@CurrentActor() actor: Actor) {
    return this.suppliers.profile(actor.contextId as string);
  }

  @Auth('SUPPLIER', 'supplier.profile.manage')
  @Patch('profile')
  update(@CurrentActor() actor: Actor, @ZBody(updateSupplierProfileSchema) body: z.output<typeof updateSupplierProfileSchema>) {
    return this.suppliers.updateProfile(actor.contextId as string, body);
  }

  @Auth('SUPPLIER', 'supplier.profile.manage')
  @Put('coverage')
  coverage(@CurrentActor() actor: Actor, @ZBody(coverageInputSchema) body: z.output<typeof coverageInputSchema>) {
    return this.suppliers.saveCoverage(actor.contextId as string, body);
  }

  @Auth('SUPPLIER', 'supplier.profile.manage')
  @Post('warehouses')
  createWarehouse(@CurrentActor() actor: Actor, @ZBody(warehouseInputSchema) body: z.output<typeof warehouseInputSchema>) {
    return this.suppliers.saveWarehouse(actor.contextId as string, body);
  }

  @Auth('SUPPLIER', 'supplier.profile.manage')
  @Put('warehouses/:id')
  updateWarehouse(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(warehouseInputSchema) body: z.output<typeof warehouseInputSchema>) {
    return this.suppliers.saveWarehouse(actor.contextId as string, body, id);
  }

  @Auth('SUPPLIER', 'supplier.profile.manage')
  @Delete('warehouses/:id')
  deleteWarehouse(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.deleteWarehouse(actor.contextId as string, id);
  }

  @Get('team')
  team(@CurrentActor() actor: Actor) {
    return this.suppliers.listMembers(actor.contextId as string, actor);
  }

  @Auth('SUPPLIER', 'supplier.team.manage')
  @Post('team')
  invite(@CurrentActor() actor: Actor, @ZBody(inviteSupplierMemberSchema) body: z.output<typeof inviteSupplierMemberSchema>) {
    return this.suppliers.inviteMember(actor.contextId as string, actor, body);
  }

  @Auth('SUPPLIER', 'supplier.team.manage')
  @Patch('team/:id')
  updateMember(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(updateSupplierMemberSchema) body: z.output<typeof updateSupplierMemberSchema>) {
    return this.suppliers.updateMember(actor.contextId as string, actor, id, body);
  }
}

@ApiTags('supplier-applications')
@Controller()
export class SupplierApplicationsController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('public/supplier-applications')
  apply(@ZBody(supplierApplicationSchema) body: z.output<typeof supplierApplicationSchema>) {
    return this.suppliers.apply(body);
  }

  @ApiBearerAuth()
  @Auth('STAFF', 'admin.suppliers.manage')
  @Get('admin/supplier-applications')
  async list(@ZQuery(applicationQuery) query: z.output<typeof applicationQuery>) {
    const { data, meta } = await this.suppliers.listApplications(query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @ApiBearerAuth()
  @Auth('STAFF', 'admin.suppliers.manage')
  @Post('admin/supplier-applications/:id/decision')
  decide(@Param('id', ParseUUIDPipe) id: string, @CurrentActor() actor: Actor, @ZBody(applicationDecisionSchema) body: z.output<typeof applicationDecisionSchema>) {
    return this.suppliers.decideApplication(id, actor.userId, body);
  }
}

@ApiTags('admin-suppliers')
@ApiBearerAuth()
@Auth('STAFF', 'admin.suppliers.view')
@Controller('admin/suppliers')
export class AdminSuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  async list(@ZQuery(adminSupplierQuery) query: z.output<typeof adminSupplierQuery>) {
    const { data, meta } = await this.suppliers.adminList(query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.profile(id);
  }

  @Auth('STAFF', 'admin.suppliers.manage')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @ZBody(adminSupplierUpdateSchema) body: z.output<typeof adminSupplierUpdateSchema>) {
    return this.suppliers.adminUpdate(id, body);
  }
}
