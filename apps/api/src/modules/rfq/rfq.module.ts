import { Module } from '@nestjs/common';
import { AdminRfqController, BuyerRfqController, SupplierRfqController } from './rfq.controller.js';
import { RfqService } from './rfq.service.js';

@Module({ controllers: [BuyerRfqController, SupplierRfqController, AdminRfqController], providers: [RfqService], exports: [RfqService] })
export class RfqModule {}
