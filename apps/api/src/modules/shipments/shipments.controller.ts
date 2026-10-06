import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  assignShipmentSchema,
  createShipmentSchema,
  deliverSchema,
  driverInputSchema,
  driverLocationBatchSchema,
  driverStatusSchema,
  failDeliverySchema,
  geoPointSchema,
  pickupSchema,
  shipmentListQuery,
  vehicleInputSchema,
} from '@tawreed/contracts';
import { z } from 'zod';
import { Auth, CurrentActor } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { LogisticsService } from '../logistics/logistics.service.js';
import { ShipmentsService } from './shipments.service.js';

const idsSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) });

@ApiTags('supplier-fleet')
@ApiBearerAuth()
@Auth('SUPPLIER', 'supplier.fleet.manage')
@Controller('supplier')
export class SupplierFleetController {
  constructor(
    private readonly shipments: ShipmentsService,
    private readonly logistics: LogisticsService,
  ) {}

  @Get('shipments')
  async list(@CurrentActor() actor: Actor, @ZQuery(shipmentListQuery) q: z.output<typeof shipmentListQuery>) {
    const { data, meta } = await this.shipments.list(actor, q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get('shipments/:id')
  detail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.detail(id, actor);
  }

  @Auth('SUPPLIER', 'supplier.orders.manage')
  @Post('orders/:id/shipments')
  create(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(createShipmentSchema) body: z.output<typeof createShipmentSchema>) {
    return this.shipments.create(actor, id, body);
  }

  @Post('shipments/:id/assign')
  assign(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(assignShipmentSchema) body: z.output<typeof assignShipmentSchema>) {
    return this.shipments.assign(actor, id, body.driverId, body.vehicleId);
  }

  @Post('shipments/:id/unassign')
  unassign(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.unassign(actor, id);
  }

  @Post('shipments/:id/cancel')
  cancel(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.cancel(actor, id);
  }

  @Get('drivers')
  drivers(@CurrentActor() actor: Actor, @Query('online') online?: string) {
    return this.logistics.drivers({ supplierId: actor.contextId as string }, { onlineOnly: online === 'true' });
  }

  @Post('drivers')
  createDriver(@CurrentActor() actor: Actor, @ZBody(driverInputSchema) body: z.output<typeof driverInputSchema>) {
    return this.logistics.saveDriver({ supplierId: actor.contextId as string }, body);
  }

  @Put('drivers/:id')
  updateDriver(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(driverInputSchema) body: z.output<typeof driverInputSchema>) {
    return this.logistics.saveDriver({ supplierId: actor.contextId as string }, body, id);
  }

  @Get('vehicles')
  vehicles(@CurrentActor() actor: Actor) {
    return this.logistics.vehicles({ supplierId: actor.contextId as string });
  }

  @Post('vehicles')
  createVehicle(@CurrentActor() actor: Actor, @ZBody(vehicleInputSchema) body: z.output<typeof vehicleInputSchema>) {
    return this.logistics.saveVehicle({ supplierId: actor.contextId as string }, body);
  }

  @Put('vehicles/:id')
  updateVehicle(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(vehicleInputSchema) body: z.output<typeof vehicleInputSchema>) {
    return this.logistics.saveVehicle({ supplierId: actor.contextId as string }, body, id);
  }

  @Get('cash-collections')
  cash(@CurrentActor() actor: Actor) {
    return this.logistics.cashCollections({ driver: { supplierId: actor.contextId as string } });
  }

  @Post('cash-collections/confirm')
  confirm(@CurrentActor() actor: Actor, @ZBody(idsSchema) body: z.output<typeof idsSchema>) {
    return this.logistics.confirmHandover({ supplierId: actor.contextId as string }, body.ids, actor.userId);
  }
}

@ApiTags('driver')
@ApiBearerAuth()
@Auth('DRIVER')
@Controller('driver')
export class DriverController {
  constructor(
    private readonly shipments: ShipmentsService,
    private readonly logistics: LogisticsService,
  ) {}

  @Get('summary')
  summary(@CurrentActor() actor: Actor) {
    return this.shipments.driverSummary(actor);
  }

  @Patch('status')
  status(@CurrentActor() actor: Actor, @ZBody(driverStatusSchema) body: z.output<typeof driverStatusSchema>) {
    return this.shipments.setOnline(actor, body.isOnline, body.lat, body.lng);
  }

  @Post('locations')
  locations(@CurrentActor() actor: Actor, @ZBody(driverLocationBatchSchema) body: z.output<typeof driverLocationBatchSchema>) {
    return this.shipments.locations(actor, body);
  }

  @Get('shipments')
  async list(@CurrentActor() actor: Actor, @ZQuery(shipmentListQuery) q: z.output<typeof shipmentListQuery>) {
    const { data, meta } = await this.shipments.list(actor, q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get('shipments/:id')
  detail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.detail(id, actor);
  }

  @Post('shipments/:id/accept')
  accept(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.accept(actor, id);
  }

  @Post('shipments/:id/decline')
  decline(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @Body() body: { note?: string }) {
    return this.shipments.decline(actor, id, typeof body?.note === 'string' ? body.note.slice(0, 300) : undefined);
  }

  @Post('shipments/:id/pickup')
  pickup(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(pickupSchema) body: z.output<typeof pickupSchema>) {
    return this.shipments.pickup(actor, id, body);
  }

  @Post('shipments/:id/start')
  start(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(geoPointSchema) body: z.output<typeof geoPointSchema>) {
    return this.shipments.start(actor, id, body);
  }

  @Post('shipments/:id/arrive')
  arrive(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(geoPointSchema) body: z.output<typeof geoPointSchema>) {
    return this.shipments.arrive(actor, id, body);
  }

  @Post('shipments/:id/resend-otp')
  resend(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.resendDeliveryOtp(actor, id);
  }

  @Post('shipments/:id/deliver')
  deliver(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(deliverSchema) body: z.output<typeof deliverSchema>) {
    return this.shipments.deliver(actor, id, body);
  }

  @Post('shipments/:id/fail')
  fail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(failDeliverySchema) body: z.output<typeof failDeliverySchema>) {
    return this.shipments.fail(actor, id, body);
  }

  @Get('cash')
  cash(@CurrentActor() actor: Actor) {
    return this.logistics.cashCollections({ driverId: actor.contextId as string });
  }
}

@ApiTags('buyer-tracking')
@ApiBearerAuth()
@Auth('BUYER', 'buyer.orders.view')
@Controller('buyer/shipments')
export class BuyerShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get(':id')
  detail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.detail(id, actor);
  }
}

@ApiTags('admin-logistics')
@ApiBearerAuth()
@Auth('STAFF', 'admin.logistics.manage')
@Controller('admin/logistics')
export class AdminLogisticsController {
  constructor(
    private readonly shipments: ShipmentsService,
    private readonly logistics: LogisticsService,
  ) {}

  @Get('shipments')
  async list(@CurrentActor() actor: Actor, @ZQuery(shipmentListQuery) q: z.output<typeof shipmentListQuery>) {
    const { data, meta } = await this.shipments.list(actor, q);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get('shipments/:id')
  detail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.detail(id, actor);
  }

  @Post('supplier-orders/:id/shipments')
  create(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(createShipmentSchema) body: z.output<typeof createShipmentSchema>) {
    return this.shipments.create(actor, id, body);
  }

  @Post('shipments/:id/assign')
  assign(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(assignShipmentSchema) body: z.output<typeof assignShipmentSchema>) {
    return this.shipments.assign(actor, id, body.driverId, body.vehicleId);
  }

  @Post('shipments/:id/unassign')
  unassign(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.unassign(actor, id);
  }

  @Post('shipments/:id/cancel')
  cancel(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.shipments.cancel(actor, id);
  }

  @Post('shipments/:id/fail')
  fail(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string, @ZBody(failDeliverySchema) body: z.output<typeof failDeliverySchema>) {
    return this.shipments.fail(actor, id, body);
  }

  @Get('drivers')
  drivers(@Query('fleet') fleet?: string, @Query('online') online?: string) {
    return this.logistics.drivers(fleet === 'platform' ? { platform: true } : null, { onlineOnly: online === 'true' });
  }

  @Post('drivers')
  createDriver(@ZBody(driverInputSchema) body: z.output<typeof driverInputSchema>) {
    return this.logistics.saveDriver({ platform: true }, body);
  }

  @Put('drivers/:id')
  updateDriver(@Param('id', ParseUUIDPipe) id: string, @ZBody(driverInputSchema) body: z.output<typeof driverInputSchema>) {
    return this.logistics.saveDriver({ platform: true }, body, id);
  }

  @Get('vehicles')
  vehicles(@Query('fleet') fleet?: string) {
    return this.logistics.vehicles(fleet === 'platform' ? { platform: true } : null);
  }

  @Post('vehicles')
  createVehicle(@ZBody(vehicleInputSchema) body: z.output<typeof vehicleInputSchema>) {
    return this.logistics.saveVehicle({ platform: true }, body);
  }

  @Put('vehicles/:id')
  updateVehicle(@Param('id', ParseUUIDPipe) id: string, @ZBody(vehicleInputSchema) body: z.output<typeof vehicleInputSchema>) {
    return this.logistics.saveVehicle({ platform: true }, body, id);
  }

  @Auth('STAFF', 'admin.finance.view')
  @Get('cash-collections')
  cash(@Query('status') status?: string) {
    return this.logistics.cashCollections(status ? { status: status as never } : {});
  }

  @Auth('STAFF', 'admin.finance.view')
  @Post('cash-collections/reconcile')
  reconcile(@CurrentActor() actor: Actor, @ZBody(idsSchema) body: z.output<typeof idsSchema>) {
    return this.logistics.confirmHandover(null, body.ids, actor.userId);
  }
}
