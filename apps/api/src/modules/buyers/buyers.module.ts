import { Global, Module } from '@nestjs/common';
import { AdminBuyersController, BuyerCompanyController } from './buyers.controller.js';
import { BuyersService } from './buyers.service.js';

@Global()
@Module({ controllers: [BuyerCompanyController, AdminBuyersController], providers: [BuyersService], exports: [BuyersService] })
export class BuyersModule {}
