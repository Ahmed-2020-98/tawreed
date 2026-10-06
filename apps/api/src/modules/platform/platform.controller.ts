import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { auditQuery, favoriteSchema, staffInputSchema } from '@tawreed/contracts';
import { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { Paginated } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { PlatformService } from './platform.service.js';

const userStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });

@ApiTags('platform')
@ApiBearerAuth()
@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Auth('STAFF', 'admin.staff.manage')
  @Get('admin/staff')
  staff() {
    return this.platform.staff();
  }

  @Auth('STAFF', 'admin.staff.manage')
  @Post('admin/staff')
  createStaff(@ZBody(staffInputSchema) body: z.output<typeof staffInputSchema>) {
    return this.platform.saveStaff(body);
  }

  @Auth('STAFF', 'admin.staff.manage')
  @Put('admin/staff/:id')
  updateStaff(@Param('id', ParseUUIDPipe) id: string, @ZBody(staffInputSchema) body: z.output<typeof staffInputSchema>) {
    return this.platform.saveStaff(body, id);
  }

  @Auth('STAFF', 'admin.buyers.manage')
  @Post('admin/users/:id/logout')
  forceLogout(@Param('id', ParseUUIDPipe) id: string) {
    return this.platform.forceLogout(id);
  }

  @Auth('STAFF', 'admin.buyers.manage')
  @Patch('admin/users/:id/status')
  userStatus(@Param('id', ParseUUIDPipe) id: string, @ZBody(userStatusSchema) body: z.output<typeof userStatusSchema>) {
    return this.platform.setUserStatus(id, body.status);
  }

  @Auth('STAFF', 'admin.audit.view')
  @Get('admin/audit-logs')
  async audit(@ZQuery(auditQuery) q: z.output<typeof auditQuery>) {
    const { data, meta } = await this.platform.auditLog(q);
    return new Paginated(data, meta);
  }

  @Auth('STAFF')
  @Get('admin/search')
  search(@Query('q') q = '') {
    return this.platform.search(q.trim().slice(0, 80));
  }

  @Auth('BUYER')
  @Get('buyer/favorites')
  favorites(@CurrentActor() actor: Actor) {
    return this.platform.favorites(actor);
  }

  @Auth('BUYER')
  @Post('buyer/favorites')
  addFavorite(@CurrentActor() actor: Actor, @ZBody(favoriteSchema) body: z.output<typeof favoriteSchema>) {
    return this.platform.toggleFavorite(actor, body.productId, true);
  }

  @Auth('BUYER')
  @Delete('buyer/favorites/:productId')
  removeFavorite(@CurrentActor() actor: Actor, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.platform.toggleFavorite(actor, productId, false);
  }
}
