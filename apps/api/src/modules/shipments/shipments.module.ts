import { Global, Module } from '@nestjs/common';
import { LogisticsService } from '../logistics/logistics.service.js';
import { AdminLogisticsController, BuyerShipmentsController, DriverController, SupplierFleetController } from './shipments.controller.js';
import { ShipmentsService } from './shipments.service.js';

@Global()
@Module({
  controllers: [SupplierFleetController, DriverController, BuyerShipmentsController, AdminLogisticsController],
  providers: [ShipmentsService, LogisticsService],
  exports: [ShipmentsService, LogisticsService],
})
export class ShipmentsModule {}
