import { Global, Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';

@Global()
@Module({ controllers: [CheckoutController], providers: [CheckoutService], exports: [CheckoutService] })
export class CheckoutModule {}
