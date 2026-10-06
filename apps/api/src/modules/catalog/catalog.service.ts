import { Injectable } from '@nestjs/common';
import type {
  BrandDto,
  CategoryDto,
  CategoryRefDto,
  OfferSummaryDto,
  PageMeta,
  ProductCardDto,
  ProductDetailDto,
  ProductFacetsDto,
  ProductListQuery,
  SearchSuggestionsDto,
  SupplierPublicDto,
} from '@tawreed/contracts';
import { productListQuery } from '@tawreed/contracts';
import type { z } from 'zod';
import { loc, locNullable } from '../../common/i18n/localize.js';
import { AppError } from '../../common/http/app-error.js';
import { normalizeArabic } from '../../common/text/arabic.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { FilesService } from '../files/files.service.js';
import { dec, money } from '../pricing/domain/money.js';
import { rankOffers } from '../pricing/domain/buy-box.js';
import {
  activeDealWhere,
  activeOfferWhere,
  availableQty,
  offerInclude,
  offerPricing,
  type OfferWithRelations,
  presentOffer,
  presentProductCard,
  productCardInclude,
  type ProductCardRow,
} from './catalog.presenters.js';
import type { Viewer } from './viewer.service.js';
import { ViewerService } from './viewer.service.js';

type ListQuery = z.output<typeof productListQuery>;

interface CategoryNode {
  id: string;
  parentId: string | null;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  icon: string | null;
  imageFileId: string | null;
  sortOrder: number;
  isFeatured: boolean;
}

@Injectable()
export class CatalogService {
  private categoryCache: { at: number; nodes: CategoryNode[]; counts: Map<string, number> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly viewers: ViewerService,
  ) {}

  /* ---------------------------------------------------------------- categories */

  private async categoryData() {
    if (this.categoryCache && Date.now() - this.categoryCache.at < 120_000) return this.categoryCache;
    const [nodes, grouped] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
        select: { id: true, parentId: true, slug: true, nameAr: true, nameEn: true, descriptionAr: true, descriptionEn: true, icon: true, imageFileId: true, sortOrder: true, isFeatured: true },
      }),
      this.prisma.product.groupBy({ by: ['categoryId'], where: { status: 'ACTIVE', deletedAt: null, offersCount: { gt: 0 } }, _count: { _all: true } }),
    ]);
    const direct = new Map(grouped.map((g) => [g.categoryId, g._count._all]));
    const counts = new Map<string, number>();
    const total = (id: string): number => {
      if (counts.has(id)) return counts.get(id) ?? 0;
      const own = direct.get(id) ?? 0;
      const kids = nodes.filter((n) => n.parentId === id).reduce((acc, n) => acc + total(n.id), 0);
      counts.set(id, own + kids);
      return own + kids;
    };
    nodes.forEach((n) => total(n.id));
    this.categoryCache = { at: Date.now(), nodes, counts };
    return this.categoryCache;
  }

  invalidateCategories(): void {
    this.categoryCache = null;
  }

  /** Category id + every descendant id. */
  async categoryScope(slugOrId: string): Promise<string[] | null> {
    const { nodes } = await this.categoryData();
    const root = nodes.find((n) => n.slug === slugOrId || n.id === slugOrId);
    if (!root) return null;
    const ids = [root.id];
    for (let i = 0; i < ids.length; i++) nodes.filter((n) => n.parentId === ids[i]).forEach((n) => ids.push(n.id));
    return ids;
  }

  async categoriesTree(opts: { featuredOnly?: boolean } = {}): Promise<CategoryDto[]> {
    const { nodes, counts } = await this.categoryData();
    const urls = await this.files.urlMap(nodes.map((n) => n.imageFileId));
    const build = (parentId: string | null): CategoryDto[] =>
      nodes
        .filter((n) => n.parentId === parentId && (!opts.featuredOnly || parentId !== null || n.isFeatured))
        .map((n) => ({
          id: n.id,
          slug: n.slug,
          name: loc(n.nameAr, n.nameEn),
          description: locNullable(n.descriptionAr, n.descriptionEn),
          icon: n.icon,
          imageUrl: n.imageFileId ? urls.get(n.imageFileId)?.url ?? null : null,
          parentId: n.parentId,
          productCount: counts.get(n.id) ?? 0,
          children: build(n.id),
        }));
    return build(null);
  }

  async category(slug: string): Promise<CategoryDto & { breadcrumbs: CategoryRefDto[] }> {
    const tree = await this.categoriesTree();
    const flat: CategoryDto[] = [];
    const walk = (list: CategoryDto[]) => list.forEach((c) => (flat.push(c), walk(c.children)));
    walk(tree);
    const found = flat.find((c) => c.slug === slug);
    if (!found) throw AppError.notFound();
    const breadcrumbs: CategoryRefDto[] = [];
    let cur: CategoryDto | undefined = found;
    while (cur) {
      breadcrumbs.unshift({ id: cur.id, slug: cur.slug, name: cur.name });
      cur = flat.find((c) => c.id === cur?.parentId);
    }
    return { ...found, breadcrumbs };
  }

  async brands(opts: { featured?: boolean } = {}): Promise<BrandDto[]> {
    const [brands, grouped] = await Promise.all([
      this.prisma.brand.findMany({ where: { isActive: true, deletedAt: null, ...(opts.featured ? { isFeatured: true } : {}) }, include: { logo: true }, orderBy: { nameAr: 'asc' } }),
      this.prisma.product.groupBy({ by: ['brandId'], where: { status: 'ACTIVE', deletedAt: null, offersCount: { gt: 0 } }, _count: { _all: true } }),
    ]);
    const counts = new Map(grouped.map((g) => [g.brandId, g._count._all]));
    return brands
      .map((b) => ({
        id: b.id,
        slug: b.slug,
        name: loc(b.nameAr, b.nameEn),
        logoUrl: this.files.urls(b.logo)?.url ?? null,
        originCountry: b.originCountry,
        productCount: counts.get(b.id) ?? 0,
      }))
      .filter((b) => b.productCount > 0 || opts.featured);
  }

  /* ---------------------------------------------------------------- products */

  private async searchIds(q: string, limit = 400): Promise<string[]> {
    const term = normalizeArabic(q);
    if (!term) return [];
    const like = `%${term}%`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM products
      WHERE status = 'ACTIVE' AND "deletedAt" IS NULL AND "offersCount" > 0
        AND ("searchText" ILIKE ${like} OR similarity("searchText", ${term}) > 0.2 OR word_similarity(${term}, "searchText") > 0.45)
      ORDER BY ("searchText" ILIKE ${like}) DESC, GREATEST(similarity("searchText", ${term}), word_similarity(${term}, "searchText")) DESC, "salesCount" DESC
      LIMIT ${limit}`;
    return rows.map((r) => r.id);
  }

  private async buildWhere(q: ListQuery, opts: { skip?: 'brand' | 'origin' | 'storage' | 'price' } = {}): Promise<{ where: Prisma.ProductWhereInput; rankedIds: string[] | null }> {
    const now = new Date();
    const and: Prisma.ProductWhereInput[] = [{ status: 'ACTIVE', deletedAt: null, offersCount: { gt: 0 } }];
    let rankedIds: string[] | null = null;
    if (q.q) {
      rankedIds = await this.searchIds(q.q);
      and.push({ id: { in: rankedIds } });
    }
    if (q.ids?.length) and.push({ id: { in: q.ids } });
    if (q.category) {
      const scope = await this.categoryScope(q.category);
      and.push({ categoryId: { in: scope ?? [] } });
    }
    if (q.brand?.length && opts.skip !== 'brand') and.push({ brand: { slug: { in: q.brand } } });
    if (q.origin?.length && opts.skip !== 'origin') and.push({ originCountry: { in: q.origin } });
    if (q.storage && opts.skip !== 'storage') and.push({ storageType: q.storage });
    if (q.featured) and.push({ isFeatured: true });
    if (opts.skip !== 'price') {
      if (q.minPrice !== undefined) and.push({ minPrice: { gte: q.minPrice } });
      if (q.maxPrice !== undefined) and.push({ minPrice: { lte: q.maxPrice } });
    }
    const offerFilter: Prisma.OfferWhereInput[] = [];
    if (q.supplier) offerFilter.push({ supplier: { slug: q.supplier } });
    if (q.onDeal) offerFilter.push({ deals: { some: activeDealWhere(now) } });
    if (q.inStock) offerFilter.push({ OR: [{ stockMode: { in: ['UNLIMITED', 'ON_REQUEST'] } }, { stockMode: 'TRACKED', stockQty: { gt: 0 } }] });
    if (offerFilter.length) and.push({ offers: { some: { ...activeOfferWhere, AND: offerFilter } } });
    return { where: { AND: and }, rankedIds };
  }

  private orderBy(sort: ListQuery['sort']): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ minPrice: { sort: 'asc', nulls: 'last' } }, { salesCount: 'desc' }];
      case 'price_desc':
        return [{ minPrice: { sort: 'desc', nulls: 'last' } }, { salesCount: 'desc' }];
      case 'newest':
        return [{ createdAt: 'desc' }];
      case 'best_selling':
      case 'rating':
        return [{ salesCount: 'desc' }, { createdAt: 'desc' }];
      default:
        return [{ isFeatured: 'desc' }, { salesCount: 'desc' }, { createdAt: 'desc' }];
    }
  }

  async listProducts(query: ListQuery, viewer: Viewer): Promise<{ data: ProductCardDto[]; meta: PageMeta }> {
    const { where, rankedIds } = await this.buildWhere(query);
    const { page, pageSize } = query;
    let rows: ProductCardRow[];
    let total: number;
    if (rankedIds && query.sort === 'relevance') {
      const matching = await this.prisma.product.findMany({ where, select: { id: true } });
      const order = new Map(rankedIds.map((id, i) => [id, i]));
      const ids = matching.map((m) => m.id).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      total = ids.length;
      const pageIds = ids.slice((page - 1) * pageSize, page * pageSize);
      const found = await this.prisma.product.findMany({ where: { id: { in: pageIds } }, include: productCardInclude });
      rows = pageIds.map((id) => found.find((r) => r.id === id)).filter((r): r is ProductCardRow => !!r);
    } else {
      [total, rows] = await Promise.all([
        this.prisma.product.count({ where }),
        this.prisma.product.findMany({ where, include: productCardInclude, orderBy: this.orderBy(query.sort), skip: (page - 1) * pageSize, take: pageSize }),
      ]);
    }
    const data = await this.presentCards(rows, viewer);
    return { data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  /** Cards for arbitrary product ids (home sections, favorites, buy-again) preserving order. */
  async cardsByIds(ids: string[], viewer: Viewer): Promise<ProductCardDto[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.product.findMany({ where: { id: { in: ids }, status: 'ACTIVE', deletedAt: null }, include: productCardInclude });
    const ordered = ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is ProductCardRow => !!r);
    return this.presentCards(ordered, viewer);
  }

  async cards(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput[], take: number, viewer: Viewer): Promise<ProductCardDto[]> {
    const rows = await this.prisma.product.findMany({
      where: { AND: [{ status: 'ACTIVE', deletedAt: null, offersCount: { gt: 0 } }, where] },
      include: productCardInclude,
      orderBy,
      take,
    });
    return this.presentCards(rows, viewer);
  }

  async presentCards(rows: ProductCardRow[], viewer: Viewer): Promise<ProductCardDto[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [offersByProduct, favorites] = await Promise.all([this.rankedOffers(ids, viewer), this.viewers.favorites(viewer, ids)]);
    return rows.map((r) => presentProductCard(r, offersByProduct.get(r.id) ?? [], { files: this.files, favorite: favorites.has(r.id) }));
  }

  /** Active offers per product, ranked: offers covering the viewer's city first (buy-box order), then the rest. */
  async rankedOffers(productIds: string[], viewer: Viewer): Promise<Map<string, OfferSummaryDto[]>> {
    const now = new Date();
    const offers = await this.prisma.offer.findMany({ where: { productId: { in: productIds }, ...activeOfferWhere }, include: offerInclude(viewer.cityId, now) });
    const logos = await this.files.urlMap(offers.map((o) => o.supplier.logoFileId));
    const grouped = new Map<string, OfferWithRelations[]>();
    for (const o of offers) grouped.set(o.productId, [...(grouped.get(o.productId) ?? []), o]);
    const out = new Map<string, OfferSummaryDto[]>();
    for (const [productId, list] of grouped) {
      const rank = (items: OfferWithRelations[]) =>
        rankOffers(
          items.map((o) => ({
            ...offerPricing(o),
            id: o.id,
            minOrderQty: o.minOrderQty,
            baseQuantity: o.unit.baseQuantity,
            leadTimeDays: o.leadTimeDays ?? o.supplier.coverage[0]?.leadTimeDays ?? 1,
            supplierRating: o.supplier.ratingAvg,
            inStock: o.stockMode !== 'TRACKED' || (availableQty(o)?.greaterThanOrEqualTo(dec(o.minOrderQty)) ?? false),
            row: o,
          })),
        ).map((r) => r.row);
      const covering = rank(list.filter((o) => o.supplier.coverage.length > 0));
      const others = rank(list.filter((o) => o.supplier.coverage.length === 0));
      const ranked = [...covering, ...others];
      const bestId = covering[0]?.id ?? null;
      out.set(productId, ranked.map((o) => presentOffer(o, { logos, isBest: o.id === bestId })));
    }
    return out;
  }

  async facets(query: ListQuery): Promise<ProductFacetsDto> {
    const [brandW, originW, storageW, priceW] = await Promise.all([
      this.buildWhere(query, { skip: 'brand' }),
      this.buildWhere(query, { skip: 'origin' }),
      this.buildWhere(query, { skip: 'storage' }),
      this.buildWhere(query, { skip: 'price' }),
    ]);
    const [brands, origins, storage, price] = await Promise.all([
      this.prisma.product.groupBy({ by: ['brandId'], where: brandW.where, _count: { _all: true } }),
      this.prisma.product.groupBy({ by: ['originCountry'], where: originW.where, _count: { _all: true } }),
      this.prisma.product.groupBy({ by: ['storageType'], where: storageW.where, _count: { _all: true } }),
      this.prisma.product.aggregate({ where: priceW.where, _min: { minPrice: true }, _max: { minPrice: true } }),
    ]);
    const brandRows = await this.prisma.brand.findMany({ where: { id: { in: brands.map((b) => b.brandId).filter((id): id is string => !!id) } } });
    const countries = new Intl.DisplayNames([loc('ar', 'en')], { type: 'region' });
    return {
      brands: brands
        .filter((b) => b.brandId)
        .map((b) => {
          const row = brandRows.find((r) => r.id === b.brandId);
          return { value: row?.slug ?? '', label: row ? loc(row.nameAr, row.nameEn) : '', count: b._count._all };
        })
        .filter((b) => b.value)
        .sort((a, b) => b.count - a.count),
      origins: origins
        .filter((o) => o.originCountry)
        .map((o) => ({ value: o.originCountry as string, label: countries.of(o.originCountry as string) ?? (o.originCountry as string), count: o._count._all }))
        .sort((a, b) => b.count - a.count),
      storageTypes: storage.map((s) => ({ value: s.storageType, label: s.storageType, count: s._count._all })),
      priceRange: price._min.minPrice ? { min: money(price._min.minPrice), max: money(price._max.minPrice ?? price._min.minPrice) } : null,
    };
  }

  async product(slug: string, viewer: Viewer): Promise<ProductDetailDto> {
    const p = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null, status: 'ACTIVE' },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, include: { file: true } },
        units: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
        brand: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
      },
    });
    if (!p) throw AppError.notFound();
    const [offersMap, favorites, category] = await Promise.all([
      this.rankedOffers([p.id], viewer),
      this.viewers.favorites(viewer, [p.id]),
      this.category(p.category.slug).catch(() => null),
    ]);
    const offers = offersMap.get(p.id) ?? [];
    const card = presentProductCard({ ...p, images: p.images.slice(0, 1) }, offers, { files: this.files, favorite: favorites.has(p.id) });
    const specs = (Array.isArray(p.specs) ? p.specs : []) as { keyAr: string; keyEn: string; valueAr: string; valueEn: string }[];
    const name = loc(p.nameAr, p.nameEn);
    const description = locNullable(p.descriptionAr, p.descriptionEn);
    return {
      ...card,
      description,
      images: p.images.map((i) => this.files.imageRef(i.file, locNullable(i.altAr, i.altEn) ?? name)).filter((x): x is NonNullable<typeof x> => !!x),
      specs: specs.map((s) => ({ key: loc(s.keyAr, s.keyEn), value: loc(s.valueAr, s.valueEn) })),
      units: p.units.map((u) => ({ id: u.id, code: u.code, name: loc(u.nameAr, u.nameEn), baseQuantity: dec(u.baseQuantity).toString(), baseUnit: loc(u.baseUnitAr, u.baseUnitEn), isDefault: u.isDefault })),
      barcode: p.barcode,
      offers,
      breadcrumbs: category?.breadcrumbs ?? [card.category],
      seo: {
        title: `${name} | ${loc('توريد', 'Tawreed')}`,
        description: (description ?? name).slice(0, 160),
      },
    };
  }

  async related(slug: string, viewer: Viewer, take = 12): Promise<ProductCardDto[]> {
    const p = await this.prisma.product.findFirst({ where: { slug, deletedAt: null }, select: { id: true, categoryId: true, brandId: true } });
    if (!p) throw AppError.notFound();
    return this.cards({ categoryId: p.categoryId, id: { not: p.id } }, [{ salesCount: 'desc' }], take, viewer);
  }

  async suggest(q: string): Promise<SearchSuggestionsDto> {
    const term = normalizeArabic(q);
    const ids = (await this.searchIds(q, 6)).slice(0, 6);
    const [products, categories, brands] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: ids } }, include: { images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { file: true } } } }),
      this.categoryData(),
      this.prisma.brand.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, slug: true, nameAr: true, nameEn: true } }),
    ]);
    const matches = (a: string, b: string) => normalizeArabic(a).includes(term) || normalizeArabic(b).includes(term);
    return {
      products: ids
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({
          slug: p.slug,
          name: loc(p.nameAr, p.nameEn),
          imageUrl: p.images[0] ? this.files.urls(p.images[0].file)?.thumbUrl ?? this.files.urls(p.images[0].file)?.url ?? null : null,
          price: p.minPrice ? money(p.minPrice) : null,
        })),
      categories: categories.nodes
        .filter((c) => matches(c.nameAr, c.nameEn))
        .slice(0, 4)
        .map((c) => ({ id: c.id, slug: c.slug, name: loc(c.nameAr, c.nameEn) })),
      brands: brands
        .filter((b) => matches(b.nameAr, b.nameEn))
        .slice(0, 4)
        .map((b) => ({ id: b.id, slug: b.slug, name: loc(b.nameAr, b.nameEn) })),
    };
  }

  /* ---------------------------------------------------------------- suppliers */

  private readonly supplierPublicInclude = {
    city: { select: { nameAr: true, nameEn: true } },
    coverage: { where: { isActive: true }, include: { city: { select: { slug: true, nameAr: true, nameEn: true } } } },
    _count: { select: { offers: { where: { status: 'ACTIVE', deletedAt: null } } } },
  } satisfies Prisma.SupplierInclude;

  private async presentSupplier(s: Prisma.SupplierGetPayload<{ include: CatalogService['supplierPublicInclude'] }>): Promise<SupplierPublicDto> {
    const urls = await this.files.urlMap([s.logoFileId, s.coverFileId]);
    return {
      id: s.id,
      slug: s.slug,
      name: loc(s.nameAr, s.nameEn),
      logoUrl: s.logoFileId ? urls.get(s.logoFileId)?.url ?? null : null,
      coverUrl: s.coverFileId ? urls.get(s.coverFileId)?.url ?? null : null,
      ratingAvg: dec(s.ratingAvg).toFixed(1),
      ratingCount: s.ratingCount,
      city: s.city ? loc(s.city.nameAr, s.city.nameEn) : null,
      description: locNullable(s.descriptionAr, s.descriptionEn),
      minOrderValue: money(s.minOrderValue),
      productsCount: s._count.offers,
      foundedYear: s.foundedYear,
      isFeatured: s.isFeatured,
      fleetMode: s.fleetMode,
      coverage: s.coverage.map((c) => ({
        citySlug: c.city.slug,
        cityName: loc(c.city.nameAr, c.city.nameEn),
        leadTimeDays: c.leadTimeDays,
        sameDay: c.sameDayAvailable,
        deliveryFee: money(c.deliveryFee),
        freeDeliveryThreshold: c.freeDeliveryThreshold ? money(c.freeDeliveryThreshold) : null,
      })),
    };
  }

  async supplierPublic(slug: string): Promise<SupplierPublicDto> {
    const s = await this.prisma.supplier.findFirst({ where: { slug, status: 'ACTIVE', deletedAt: null }, include: this.supplierPublicInclude });
    if (!s) throw AppError.notFound();
    return this.presentSupplier(s);
  }

  async suppliers(opts: { featured?: boolean; take?: number } = {}): Promise<SupplierPublicDto[]> {
    const rows = await this.prisma.supplier.findMany({
      where: { status: 'ACTIVE', deletedAt: null, ...(opts.featured ? { isFeatured: true } : {}) },
      include: this.supplierPublicInclude,
      orderBy: [{ isFeatured: 'desc' }, { ratingAvg: 'desc' }],
      take: opts.take ?? 50,
    });
    return Promise.all(rows.map((s) => this.presentSupplier(s)));
  }
}

export type { ProductListQuery };
