import { Global, Module } from '@nestjs/common';
import { AdminInvoicesController, BuyerInvoicesController, SupplierInvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';

@Global()
@Module({ controllers: [BuyerInvoicesController, SupplierInvoicesController, AdminInvoicesController], providers: [InvoicesService], exports: [InvoicesService] })
export class InvoicesModule {}
