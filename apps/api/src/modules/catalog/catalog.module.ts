import { Global, Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { CatalogAdminService } from './catalog-admin.service.js';
import { CatalogService } from './catalog.service.js';
import { ProductStatsService } from './product-stats.service.js';
import { PublicCatalogController } from './public-catalog.controller.js';
import { ViewerService } from './viewer.service.js';

@Global()
@Module({
  controllers: [PublicCatalogController, AdminCatalogController],
  providers: [CatalogService, CatalogAdminService, ProductStatsService, ViewerService],
  exports: [CatalogService, CatalogAdminService, ProductStatsService, ViewerService],
})
export class CatalogModule {}
