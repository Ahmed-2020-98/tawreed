import { Module } from '@nestjs/common';
import { AdminOffersController } from './admin-offers.controller.js';
import { OffersService } from './offers.service.js';
import { SupplierOffersController } from './supplier-offers.controller.js';

@Module({ controllers: [SupplierOffersController, AdminOffersController], providers: [OffersService], exports: [OffersService] })
export class OffersModule {}
