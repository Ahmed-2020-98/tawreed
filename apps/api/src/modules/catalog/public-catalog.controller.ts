import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type BrandDto,
  type CategoryDto,
  type ProductCardDto,
  type ProductDetailDto,
  type ProductFacetsDto,
  productListQuery,
  type SearchSuggestionsDto,
  suggestQuery,
  type SupplierPublicDto,
} from '@tawreed/contracts';
import type { z } from 'zod';
import { CurrentActor, Public } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { paginate } from '../../common/http/envelope.js';
import { ZQuery } from '../../common/http/zod.js';
import { CatalogService } from './catalog.service.js';
import { ViewerService } from './viewer.service.js';

@ApiTags('catalog')
@Controller('public')
export class PublicCatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly viewers: ViewerService,
  ) {}

  @Public()
  @Get('categories')
  categories(@Query('featured') featured?: string): Promise<CategoryDto[]> {
    return this.catalog.categoriesTree({ featuredOnly: featured === 'true' });
  }

  @Public()
  @Get('categories/:slug')
  category(@Param('slug') slug: string) {
    return this.catalog.category(slug);
  }

  @Public()
  @Get('brands')
  brands(@Query('featured') featured?: string): Promise<BrandDto[]> {
    return this.catalog.brands({ featured: featured === 'true' });
  }

  @Public()
  @Get('products')
  async products(@ZQuery(productListQuery) query: z.output<typeof productListQuery>, @CurrentActor() actor?: Actor) {
    const viewer = await this.viewers.resolve(actor, query.city);
    const { data, meta } = await this.catalog.listProducts(query, viewer);
    return paginate<ProductCardDto>(data, meta.total, meta.page, meta.pageSize);
  }

  @Public()
  @Get('products/facets')
  facets(@ZQuery(productListQuery) query: z.output<typeof productListQuery>): Promise<ProductFacetsDto> {
    return this.catalog.facets(query);
  }

  @Public()
  @Get('search/suggest')
  suggest(@ZQuery(suggestQuery) query: z.output<typeof suggestQuery>): Promise<SearchSuggestionsDto> {
    return this.catalog.suggest(query.q);
  }

  @Public()
  @Get('products/:slug')
  async product(@Param('slug') slug: string, @Query('city') city: string | undefined, @CurrentActor() actor?: Actor): Promise<ProductDetailDto> {
    return this.catalog.product(slug, await this.viewers.resolve(actor, city));
  }

  @Public()
  @Get('products/:slug/related')
  async related(@Param('slug') slug: string, @Query('city') city: string | undefined, @CurrentActor() actor?: Actor): Promise<ProductCardDto[]> {
    return this.catalog.related(slug, await this.viewers.resolve(actor, city));
  }

  @Public()
  @Get('suppliers')
  suppliers(@Query('featured') featured?: string): Promise<SupplierPublicDto[]> {
    return this.catalog.suppliers({ featured: featured === 'true' });
  }

  @Public()
  @Get('suppliers/:slug')
  supplier(@Param('slug') slug: string): Promise<SupplierPublicDto> {
    return this.catalog.supplierPublic(slug);
  }
}
