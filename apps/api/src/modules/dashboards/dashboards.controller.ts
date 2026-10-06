import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { DashboardsService } from './dashboards.service.js';

@ApiTags('dashboards')
@ApiBearerAuth()
@Controller()
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Auth('BUYER')
  @Get('buyer/dashboard')
  buyer(@CurrentActor() actor: Actor) {
    return this.dashboards.buyer(actor);
  }

  @Auth('SUPPLIER', 'supplier.dashboard.view')
  @Get('supplier/dashboard')
  supplier(@CurrentActor() actor: Actor) {
    return this.dashboards.supplier(actor);
  }

  @Auth('STAFF', 'admin.dashboard.view')
  @Get('admin/dashboard')
  admin() {
    return this.dashboards.admin();
  }
}
