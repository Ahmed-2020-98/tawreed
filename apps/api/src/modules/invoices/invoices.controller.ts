import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { invoiceQuery } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { Paginated } from '../../common/http/envelope.js';
import { ZQuery } from '../../common/http/zod.js';
import { InvoicesService } from './invoices.service.js';

@ApiTags('buyer-invoices')
@ApiBearerAuth()
@Auth('BUYER', 'buyer.invoices.view')
@Controller('buyer/invoices')
export class BuyerInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  async list(@CurrentActor() actor: Actor, @ZQuery(invoiceQuery) q: z.output<typeof invoiceQuery>) {
    const { data, meta } = await this.invoices.list({ companyId: actor.contextId as string }, q);
    return new Paginated(data, meta);
  }

  @Get(':id')
  detail(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.invoices.detail({ companyId: actor.contextId as string }, id);
  }

  @Get(':id/pdf')
  pdf(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.invoices.pdfUrl({ companyId: actor.contextId as string }, id);
  }
}

@ApiTags('supplier-invoices')
@ApiBearerAuth()
@Auth('SUPPLIER', 'supplier.finance.view')
@Controller('supplier/invoices')
export class SupplierInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  async list(@CurrentActor() actor: Actor, @ZQuery(invoiceQuery) q: z.output<typeof invoiceQuery>) {
    const { data, meta } = await this.invoices.list({ supplierId: actor.contextId as string }, q);
    return new Paginated(data, meta);
  }

  @Get(':id')
  detail(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.invoices.detail({ supplierId: actor.contextId as string }, id);
  }

  @Get(':id/pdf')
  pdf(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.invoices.pdfUrl({ supplierId: actor.contextId as string }, id);
  }
}

@ApiTags('admin-invoices')
@ApiBearerAuth()
@Auth('STAFF', 'admin.finance.view')
@Controller('admin/invoices')
export class AdminInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  async list(@ZQuery(invoiceQuery) q: z.output<typeof invoiceQuery>) {
    const { data, meta } = await this.invoices.list({}, q);
    return new Paginated(data, meta);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.invoices.detail({}, id);
  }

  @Get(':id/pdf')
  pdf(@Param('id') id: string) {
    return this.invoices.pdfUrl({}, id);
  }
}
