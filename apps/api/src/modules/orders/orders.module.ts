import { Global, Module } from '@nestjs/common';
import { AdminOrdersController, BuyerOrdersController, SupplierOrdersController } from './orders.controller.js';
import { OrderEventsService } from './order-events.service.js';
import { OrderLifecycleService } from './order-lifecycle.service.js';
import { OrderPresenter } from './order.presenter.js';
import { OrdersService } from './orders.service.js';

@Global()
@Module({
  controllers: [BuyerOrdersController, SupplierOrdersController, AdminOrdersController],
  providers: [OrdersService, OrderLifecycleService, OrderEventsService, OrderPresenter],
  exports: [OrdersService, OrderLifecycleService, OrderEventsService, OrderPresenter],
})
export class OrdersModule {}
