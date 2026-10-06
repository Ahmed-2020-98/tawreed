import { Injectable } from '@nestjs/common';
import {
  type BrandInput,
  type CategoryInput,
  catalogAdminQuery,
  ErrorCode,
  type PageMeta,
  type ProductInput,
  type ProductManageDto,
  type UnitManageDto,
  brandInputSchema,
  categoryInputSchema,
  productInputSchema,
} from '@tawreed/contracts';
import type { z } from 'zod';
import { AppError } from '../../common/http/app-error.js';
import { buildSearchText, slugify } from '../../common/text/arabic.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { type Db, PrismaService, type Tx } from '../../infrastructure/prisma/prisma.service.js';
import { FilesService } from '../files/files.service.js';
import { money, qtyStr } from '../pricing/domain/money.js';
import { CatalogService } from './catalog.service.js';
import { ProductStatsService } from './product-stats.service.js';

export const productManageInclude = {
  images: { orderBy: { sortOrder: 'asc' }, include: { file: true } },
  units: { orderBy: { sortOrder: 'asc' } },
  category: { select: { id: true, nameAr: true, nameEn: true } },
  brand: { select: { id: true, nameAr: true, nameEn: true } },
  proposedBy: { select: { id: true, nameAr: true, nameEn: true } },
} satisfies Prisma.ProductInclude;
type ProductManageRow = Prisma.ProductGetPayload<{ include: typeof productManageInclude }>;

@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
    private readonly catalog: CatalogService,
    private readonly stats: ProductStatsService,
  ) {}

  /* ---------------------------------------------------------------- categories */

  async listCategories() {
    const rows = await this.prisma.category.findMany({ where: { deletedAt: null }, orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }], include: { image: true, _count: { select: { products: { where: { deletedAt: null } } } } } });
    return rows.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      slug: c.slug,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      descriptionAr: c.descriptionAr,
      descriptionEn: c.descriptionEn,
      icon: c.icon,
      imageFileId: c.imageFileId,
      imageUrl: this.files.urls(c.image)?.url ?? null,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      isFeatured: c.isFeatured,
      commissionRate: c.commissionRate?.toString() ?? null,
      productsCount: c._count.products,
    }));
  }

  async saveCategory(input: z.output<typeof categoryInputSchema>, id?: string) {
    if (input.parentId && input.parentId === id) throw AppError.unprocessable(ErrorCode.VALIDATION_FAILED);
    const data = { ...input, commissionRate: input.commissionRate ?? null, parentId: input.parentId ?? null };
    const saved = await this.prisma.tx(async (tx) => {
      const row = id ? await tx.category.update({ where: { id }, data }) : await tx.category.create({ data });
      await this.audit.record(tx, { action: id ? 'category.updated' : 'category.created', entityType: 'Category', entityId: row.id, after: data });
      return row;
    });
    this.catalog.invalidateCategories();
    return saved;
  }

  async deleteCategory(id: string) {
    const [children, products] = await Promise.all([
      this.prisma.category.count({ where: { parentId: id, deletedAt: null } }),
      this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
    ]);
    if (children || products) throw AppError.conflict(ErrorCode.CONFLICT, {}, { children, products });
    await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.audit.record(this.prisma, { action: 'category.deleted', entityType: 'Category', entityId: id });
    this.catalog.invalidateCategories();
  }

  /* ---------------------------------------------------------------- brands */

  async listBrands() {
    const rows = await this.prisma.brand.findMany({ where: { deletedAt: null }, orderBy: { nameAr: 'asc' }, include: { logo: true, _count: { select: { products: { where: { deletedAt: null } } } } } });
    return rows.map((b) => ({ ...b, logoUrl: this.files.urls(b.logo)?.url ?? null, logo: undefined, productsCount: b._count.products, _count: undefined }));
  }

  async saveBrand(input: z.output<typeof brandInputSchema>, id?: string) {
    const row = id ? await this.prisma.brand.update({ where: { id }, data: input }) : await this.prisma.brand.create({ data: input });
    await this.audit.record(this.prisma, { action: id ? 'brand.updated' : 'brand.created', entityType: 'Brand', entityId: row.id, after: input });
    return row;
  }

  async deleteBrand(id: string) {
    await this.prisma.brand.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.audit.record(this.prisma, { action: 'brand.deleted', entityType: 'Brand', entityId: id });
  }

  /* ---------------------------------------------------------------- products */

  toManageDto(p: ProductManageRow): ProductManageDto {
    return {
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      barcode: p.barcode,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      descriptionAr: p.descriptionAr,
      descriptionEn: p.descriptionEn,
      category: p.category,
      brand: p.brand,
      originCountry: p.originCountry,
      storageType: p.storageType,
      specs: (Array.isArray(p.specs) ? p.specs : []) as ProductManageDto['specs'],
      tags: p.tags,
      images: p.images.map((i) => ({ ...(this.files.imageRef(i.file) ?? { url: '' }), fileId: i.fileId })),
      units: p.units.map((u) => this.unitDto(u)),
      status: p.status,
      isFeatured: p.isFeatured,
      offersCount: p.offersCount,
      minPrice: p.minPrice ? money(p.minPrice) : null,
      maxPrice: p.maxPrice ? money(p.maxPrice) : null,
      salesCount: p.salesCount,
      proposedBy: p.proposedBy ? { id: p.proposedBy.id, name: p.proposedBy.nameAr } : null,
      reviewNote: p.reviewNote,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  unitDto(u: Prisma.ProductUnitGetPayload<object>): UnitManageDto {
    return {
      id: u.id,
      code: u.code,
      nameAr: u.nameAr,
      nameEn: u.nameEn,
      baseQuantity: qtyStr(u.baseQuantity),
      baseUnitAr: u.baseUnitAr,
      baseUnitEn: u.baseUnitEn,
      barcode: u.barcode,
      weightKg: u.weightKg ? qtyStr(u.weightKg) : null,
      isDefault: u.isDefault,
    };
  }

  async listProducts(query: z.output<typeof catalogAdminQuery>): Promise<{ data: ProductManageDto[]; meta: PageMeta }> {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.proposed ? { proposedBySupplierId: { not: null } } : {}),
      ...(query.q ? { searchText: { contains: buildSearchText(query.q) } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, include: productManageInclude, orderBy: { updatedAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    return { data: rows.map((r) => this.toManageDto(r)), meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } };
  }

  async getProduct(id: string): Promise<ProductManageDto> {
    const p = await this.prisma.product.findFirst({ where: { id, deletedAt: null }, include: productManageInclude });
    if (!p) throw AppError.notFound();
    return this.toManageDto(p);
  }

  private async searchTextFor(db: Db, input: z.output<typeof productInputSchema>): Promise<string> {
    const [category, brand] = await Promise.all([
      db.category.findUnique({ where: { id: input.categoryId }, select: { nameAr: true, nameEn: true } }),
      input.brandId ? db.brand.findUnique({ where: { id: input.brandId }, select: { nameAr: true, nameEn: true } }) : null,
    ]);
    return buildSearchText(input.nameAr, input.nameEn, brand?.nameAr, brand?.nameEn, category?.nameAr, category?.nameEn, input.tags.join(' '), input.barcode, input.sku);
  }

  private async uniqueSlug(db: Db, base: string, excludeId?: string): Promise<string> {
    let slug = slugify(base) || `product-${Date.now()}`;
    let n = 1;
    while (await db.product.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) {
      slug = `${slugify(base)}-${++n}`;
    }
    return slug;
  }

  /** Creates/updates a product with units, images and specs (used by admin and supplier proposals). */
  async upsertProduct(tx: Tx, input: z.output<typeof productInputSchema>, opts: { id?: string; status?: ProductManageDto['status']; proposedBySupplierId?: string } = {}) {
    if (!input.units.some((u) => u.isDefault)) {
      const first = input.units[0];
      if (first) first.isDefault = true;
    }
    const searchText = await this.searchTextFor(tx, input);
    const base = {
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      nameAr: input.nameAr,
      nameEn: input.nameEn,
      descriptionAr: input.descriptionAr ?? null,
      descriptionEn: input.descriptionEn ?? null,
      barcode: input.barcode ?? null,
      sku: input.sku ?? null,
      originCountry: input.originCountry ?? null,
      storageType: input.storageType,
      specs: input.specs,
      tags: input.tags,
      isFeatured: input.isFeatured,
      searchText,
      ...(opts.status || input.status ? { status: opts.status ?? input.status } : {}),
    };
    let productId = opts.id;
    if (productId) {
      await tx.product.update({ where: { id: productId }, data: { ...base, ...(input.slug ? { slug: input.slug } : {}) } });
    } else {
      const slug = input.slug ?? (await this.uniqueSlug(tx, input.nameEn));
      const created = await tx.product.create({ data: { ...base, slug, proposedBySupplierId: opts.proposedBySupplierId ?? null } });
      productId = created.id;
    }

    // Units: update by id, create new, delete removed (only when no offers reference them).
    const existing = await tx.productUnit.findMany({ where: { productId }, include: { _count: { select: { offers: true } } } });
    const keep = new Set<string>();
    for (const [i, u] of input.units.entries()) {
      const data = {
        code: u.code,
        nameAr: u.nameAr,
        nameEn: u.nameEn,
        baseQuantity: u.baseQuantity,
        baseUnitAr: u.baseUnitAr,
        baseUnitEn: u.baseUnitEn,
        barcode: u.barcode ?? null,
        weightKg: u.weightKg ?? null,
        isDefault: u.isDefault,
        sortOrder: i,
      };
      if (u.id && existing.some((e) => e.id === u.id)) {
        await tx.productUnit.update({ where: { id: u.id }, data });
        keep.add(u.id);
      } else {
        const created = await tx.productUnit.create({ data: { ...data, productId } });
        keep.add(created.id);
      }
    }
    for (const e of existing) {
      if (keep.has(e.id)) continue;
      if (e._count.offers > 0) throw AppError.conflict(ErrorCode.CONFLICT, {}, { unitInUse: e.id });
      await tx.productUnit.delete({ where: { id: e.id } });
    }

    await tx.productImage.deleteMany({ where: { productId } });
    if (input.imageFileIds.length) {
      await tx.productImage.createMany({ data: input.imageFileIds.map((fileId, i) => ({ productId: productId, fileId, sortOrder: i, altAr: input.nameAr, altEn: input.nameEn })) });
    }
    return productId;
  }

  async createProduct(input: z.output<typeof productInputSchema>): Promise<ProductManageDto> {
    const id = await this.prisma.tx(async (tx) => {
      const productId = await this.upsertProduct(tx, input, { status: input.status ?? 'ACTIVE' });
      await this.audit.record(tx, { action: 'product.created', entityType: 'Product', entityId: productId, after: { nameAr: input.nameAr } });
      return productId;
    });
    this.catalog.invalidateCategories();
    return this.getProduct(id);
  }

  async updateProduct(id: string, input: z.output<typeof productInputSchema>): Promise<ProductManageDto> {
    await this.prisma.tx(async (tx) => {
      await this.upsertProduct(tx, input, { id });
      await this.audit.record(tx, { action: 'product.updated', entityType: 'Product', entityId: id, after: { nameAr: input.nameAr, status: input.status } });
    });
    await this.stats.refresh([id]);
    this.catalog.invalidateCategories();
    return this.getProduct(id);
  }

  async setProductStatus(id: string, status: ProductManageDto['status'], note?: string): Promise<ProductManageDto> {
    await this.prisma.tx(async (tx) => {
      const before = await tx.product.findUnique({ where: { id }, select: { status: true, proposedBySupplierId: true } });
      if (!before) throw AppError.notFound();
      await tx.product.update({ where: { id }, data: { status, reviewNote: note ?? null } });
      if (before.proposedBySupplierId && before.status === 'PENDING_REVIEW') {
        await tx.offer.updateMany({ where: { productId: id, status: 'PENDING_REVIEW' }, data: { status: status === 'ACTIVE' ? 'ACTIVE' : 'REJECTED' } });
      }
      await this.audit.record(tx, { action: 'product.status_changed', entityType: 'Product', entityId: id, before: { status: before.status }, after: { status, note } });
    });
    await this.stats.refresh([id]);
    this.catalog.invalidateCategories();
    return this.getProduct(id);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.prisma.tx(async (tx) => {
      await tx.product.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } });
      await tx.offer.updateMany({ where: { productId: id }, data: { status: 'ARCHIVED' } });
      await this.audit.record(tx, { action: 'product.deleted', entityType: 'Product', entityId: id });
    });
    await this.stats.refresh([id]);
    this.catalog.invalidateCategories();
  }
}

export type { BrandInput, CategoryInput, ProductInput };
