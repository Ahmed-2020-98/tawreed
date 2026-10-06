import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { buyerOrderQuery, cancelOrderSchema, rejectSupplierOrderSchema, reviewSchema, supplierOrderQuery } from '@tawreed/contracts';
import { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate, Paginated } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { adminOrderQuery, OrdersService } from './orders.service.js';

@ApiTags('buyer-orders')
@ApiBearerAuth()
@Auth('BUYER', 'buyer.orders.view')
@Controller('buyer/orders')
export class BuyerOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  async list(@CurrentActor() actor: Actor, @ZQuery(buyerOrderQuery) query: z.output<typeof buyerOrderQuery>) {
    const { data, meta } = await this.orders.buyerList(actor.contextId as string, query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get(':id')
  detail(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.orders.buyerDetail(actor.contextId as string, id);
  }

  @Auth('BUYER', 'buyer.orders.cancel')
  @Post(':id/cancel')
  cancel(@CurrentActor() actor: Actor, @Param('id') id: string, @ZBody(cancelOrderSchema) body: z.output<typeof cancelOrderSchema>) {
    return this.orders.buyerCancel(actor, id, body.reason);
  }

  @Auth('BUYER', 'buyer.orders.place')
  @Post('supplier-orders/:id/review')
  review(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(reviewSchema) body: z.output<typeof reviewSchema>) {
    return this.orders.review(actor, id, body);
  }

  @Auth('BUYER', 'buyer.cart.manage')
  @Post(':id/reorder')
  reorder(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.orders.reorder(actor, id);
  }
}

@ApiTags('supplier-orders')
@ApiBearerAuth()
@Auth('SUPPLIER', 'supplier.orders.view')
@Controller('supplier/orders')
export class SupplierOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  async list(@CurrentActor() actor: Actor, @ZQuery(supplierOrderQuery) query: z.output<typeof supplierOrderQuery>) {
    const { data, meta } = await this.orders.supplierList(actor.contextId as string, query);
    return new Paginated(data, meta);
  }

  @Get(':id')
  detail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.supplierDetail(actor.contextId, id);
  }

  @Auth('SUPPLIER', 'supplier.orders.manage')
  @Post(':id/accept')
  accept(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.supplierAction(actor, id, 'accept');
  }

  @Auth('SUPPLIER', 'supplier.orders.manage')
  @Post(':id/reject')
  reject(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(rejectSupplierOrderSchema) body: z.output<typeof rejectSupplierOrderSchema>) {
    return this.orders.supplierAction(actor, id, 'reject', body.reason);
  }

  @Auth('SUPPLIER', 'supplier.orders.manage')
  @Post(':id/start-preparing')
  prepare(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.supplierAction(actor, id, 'start_preparing');
  }

  @Auth('SUPPLIER', 'supplier.orders.manage')
  @Post(':id/ready')
  ready(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.supplierAction(actor, id, 'mark_ready');
  }
}

const adminActionSchema = z.object({
  action: z.enum(['accept', 'reject', 'start_preparing', 'mark_ready', 'cancel', 'complete', 'return']),
  reason: z.string().trim().max(300).optional(),
});

@ApiTags('admin-orders')
@ApiBearerAuth()
@Auth('STAFF', 'admin.orders.view')
@Controller('admin')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders')
  async list(@ZQuery(adminOrderQuery) query: z.output<typeof adminOrderQuery>) {
    const { data, meta } = await this.orders.adminList(query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get('orders/:id')
  detail(@Param('id') id: string) {
    return this.orders.adminDetail(id);
  }

  @Auth('STAFF', 'admin.orders.manage')
  @Post('orders/:id/cancel')
  cancel(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(cancelOrderSchema) body: z.output<typeof cancelOrderSchema>) {
    return this.orders.adminCancel(actor, id, body.reason);
  }

  @Get('supplier-orders/:id')
  supplierOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.supplierDetail(null, id, 'STAFF');
  }

  @Auth('STAFF', 'admin.orders.manage')
  @Post('supplier-orders/:id/action')
  action(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(adminActionSchema) body: z.output<typeof adminActionSchema>) {
    return this.orders.adminSupplierOrderAction(actor, id, body.action, body.reason);
  }
}
