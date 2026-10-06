import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { brandInputSchema, catalogAdminQuery, categoryInputSchema, productInputSchema, reviewDecisionSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth } from '../../common/auth/decorators.js';
import { paginate } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { CatalogAdminService } from './catalog-admin.service.js';

@ApiTags('admin-catalog')
@ApiBearerAuth()
@Auth('STAFF', 'admin.catalog.manage')
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly admin: CatalogAdminService) {}

  @Get('categories')
  categories() {
    return this.admin.listCategories();
  }

  @Post('categories')
  createCategory(@ZBody(categoryInputSchema) body: z.output<typeof categoryInputSchema>) {
    return this.admin.saveCategory(body);
  }

  @Put('categories/:id')
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @ZBody(categoryInputSchema) body: z.output<typeof categoryInputSchema>) {
    return this.admin.saveCategory(body, id);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.admin.deleteCategory(id);
    return { ok: true };
  }

  @Get('brands')
  brands() {
    return this.admin.listBrands();
  }

  @Post('brands')
  createBrand(@ZBody(brandInputSchema) body: z.output<typeof brandInputSchema>) {
    return this.admin.saveBrand(body);
  }

  @Put('brands/:id')
  updateBrand(@Param('id', ParseUUIDPipe) id: string, @ZBody(brandInputSchema) body: z.output<typeof brandInputSchema>) {
    return this.admin.saveBrand(body, id);
  }

  @Delete('brands/:id')
  async deleteBrand(@Param('id', ParseUUIDPipe) id: string) {
    await this.admin.deleteBrand(id);
    return { ok: true };
  }

  @Get('products')
  async products(@ZQuery(catalogAdminQuery) query: z.output<typeof catalogAdminQuery>) {
    const { data, meta } = await this.admin.listProducts(query);
    return paginate(data, meta.total, meta.page, meta.pageSize);
  }

  @Get('products/:id')
  product(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.getProduct(id);
  }

  @Post('products')
  createProduct(@ZBody(productInputSchema) body: z.output<typeof productInputSchema>) {
    return this.admin.createProduct(body);
  }

  @Put('products/:id')
  updateProduct(@Param('id', ParseUUIDPipe) id: string, @ZBody(productInputSchema) body: z.output<typeof productInputSchema>) {
    return this.admin.updateProduct(id, body);
  }

  @Patch('products/:id/review')
  review(@Param('id', ParseUUIDPipe) id: string, @ZBody(reviewDecisionSchema) body: z.output<typeof reviewDecisionSchema>) {
    return this.admin.setProductStatus(id, body.decision === 'APPROVE' ? 'ACTIVE' : 'REJECTED', body.note);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    await this.admin.deleteProduct(id);
    return { ok: true };
  }
}
