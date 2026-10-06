import { Global, Module } from '@nestjs/common';
import { AdminCreditController, BuyerCreditController } from './credit.controller.js';
import { CreditService } from './credit.service.js';

@Global()
@Module({ controllers: [BuyerCreditController, AdminCreditController], providers: [CreditService], exports: [CreditService] })
export class CreditModule {}
