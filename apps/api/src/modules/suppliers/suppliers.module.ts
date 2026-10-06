import { Global, Module } from '@nestjs/common';
import { AdminSuppliersController, SupplierApplicationsController, SupplierProfileController } from './suppliers.controller.js';
import { SuppliersService } from './suppliers.service.js';

@Global()
@Module({
  controllers: [SupplierProfileController, SupplierApplicationsController, AdminSuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
