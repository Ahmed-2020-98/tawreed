import { Global, Module } from '@nestjs/common';
import { AdminPaymentsController, BuyerPaymentsController, WebhooksController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { RefundService } from './refund.service.js';
import { TapClient } from './tap.client.js';

@Global()
@Module({
  controllers: [BuyerPaymentsController, WebhooksController, AdminPaymentsController],
  providers: [PaymentsService, RefundService, TapClient],
  exports: [PaymentsService, RefundService, TapClient],
})
export class PaymentsModule {}
