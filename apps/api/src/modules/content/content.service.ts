import { Injectable } from '@nestjs/common';
import type { BannerDto, BlogPostDto, BlogPostSummaryDto, CmsPageDto, FaqDto, HomeDto, HomeSectionDto, LandingDto, TestimonialDto } from '@tawreed/contracts';
import { leadSchema } from '@tawreed/contracts';
import type { z } from 'zod';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { loc, locNullable } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { activeDealWhere } from '../catalog/catalog.presenters.js';
import { ViewerService } from '../catalog/viewer.service.js';
import { FilesService } from '../files/files.service.js';
import { GeoService } from '../geo/geo.service.js';
import { OrdersService } from '../orders/orders.service.js';

type BannerRow = Prisma.BannerGetPayload<{ include: { image: true; mobileImage: true } }>;
type PostRow = Prisma.BlogPostGetPayload<{ include: { cover: true } }>;

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly catalog: CatalogService,
    private readonly viewers: ViewerService,
    private readonly orders: OrdersService,
    private readonly geo: GeoService,
    private readonly outbox: OutboxService,
  ) {}

  banner(b: BannerRow): BannerDto {
    return {
      id: b.id,
      placement: b.placement,
      title: loc(b.titleAr, b.titleEn),
      subtitle: locNullable(b.subtitleAr, b.subtitleEn),
      ctaLabel: locNullable(b.ctaLabelAr, b.ctaLabelEn),
      imageUrl: this.files.urls(b.image)?.url ?? '',
      mobileImageUrl: b.mobileImage ? this.files.urls(b.mobileImage)?.url ?? null : null,
      link: { type: b.linkType, value: b.linkValue },
    };
  }

  async banners(placements: string[], businessType?: string | null): Promise<BannerDto[]> {
    const now = new Date();
    const rows = await this.prisma.banner.findMany({
      where: {
        placement: { in: placements as never },
        isActive: true,
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      include: { image: true, mobileImage: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.filter((b) => !b.audience.length || (businessType && b.audience.includes(businessType as never))).map((b) => this.banner(b));
  }

  /** Store/app home: hero banners + admin-configured sections, personalised by city and buy-again history. */
  async home(actor: Actor | undefined, platform: 'WEB' | 'APP', city?: string): Promise<HomeDto> {
    const viewer = await this.viewers.resolve(actor, city);
    const company = viewer.companyId ? await this.prisma.buyerCompany.findUnique({ where: { id: viewer.companyId }, select: { businessType: true } }) : null;
    const [banners, sections] = await Promise.all([
      this.banners(platform === 'APP' ? ['APP_HOME', 'STORE_HERO'] : ['STORE_HERO'], company?.businessType),
      this.prisma.homeSection.findMany({ where: { isActive: true, platform: { in: ['ALL', platform] } }, orderBy: { sortOrder: 'asc' } }),
    ]);
    const now = new Date();
    const out: HomeSectionDto[] = [];
    for (const s of sections) {
      const title = loc(s.titleAr, s.titleEn);
      const cfg = (s.config ?? {}) as { tag?: string; categorySlug?: string; limit?: number; sort?: string; placement?: string; featured?: boolean };
      const take = cfg.limit ?? 12;
      switch (s.type) {
        case 'CATEGORIES':
          out.push({ id: s.id, type: 'CATEGORIES', title, items: (await this.catalog.categoriesTree()).slice(0, take), viewAll: '/categories' });
          break;
        case 'DEALS': {
          const items = await this.catalog.cards({ offers: { some: { status: 'ACTIVE', deals: { some: activeDealWhere(now) } } } }, [{ salesCount: 'desc' }], take, viewer);
          if (items.length) out.push({ id: s.id, type: 'DEALS', title, items, viewAll: '/deals' });
          break;
        }
        case 'PRODUCTS': {
          const scope = cfg.categorySlug ? await this.catalog.categoryScope(cfg.categorySlug) : null;
          const where: Prisma.ProductWhereInput = { ...(scope ? { categoryId: { in: scope } } : {}), ...(cfg.tag ? { tags: { has: cfg.tag } } : {}), ...(cfg.featured ? { isFeatured: true } : {}) };
          const orderBy: Prisma.ProductOrderByWithRelationInput[] = cfg.sort === 'newest' ? [{ createdAt: 'desc' }] : [{ salesCount: 'desc' }];
          const items = await this.catalog.cards(where, orderBy, take, viewer);
          if (items.length) out.push({ id: s.id, type: 'PRODUCTS', title, items, viewAll: cfg.categorySlug ? `/c/${cfg.categorySlug}` : cfg.tag ? `/search?tag=${cfg.tag}` : '/store' });
          break;
        }
        case 'BUY_AGAIN': {
          if (!viewer.companyId) break;
          const ids = await this.orders.buyAgainProductIds(viewer.companyId, take);
          const items = await this.catalog.cardsByIds(ids, viewer);
          if (items.length) out.push({ id: s.id, type: 'BUY_AGAIN', title, items, viewAll: '/account/orders' });
          break;
        }
        case 'BRANDS':
          out.push({ id: s.id, type: 'BRANDS', title, items: (await this.catalog.brands({ featured: true })).slice(0, take), viewAll: '/brands' });
          break;
        case 'SUPPLIERS':
          out.push({ id: s.id, type: 'SUPPLIERS', title, items: await this.catalog.suppliers({ featured: true, take }), viewAll: '/suppliers' });
          break;
        case 'BANNER_STRIP': {
          const items = await this.banners([cfg.placement ?? 'HOME_STRIP'], company?.businessType);
          if (items.length) out.push({ id: s.id, type: 'BANNER_STRIP', title, items, viewAll: null });
          break;
        }
      }
    }
    const cityRow = await this.geo.resolve(viewer.cityId);
    return { banners, sections: out, city: cityRow ? { slug: cityRow.slug, name: loc(cityRow.nameAr, cityRow.nameEn) } : null };
  }

  post(p: PostRow): BlogPostSummaryDto {
    return { id: p.id, slug: p.slug, title: loc(p.titleAr, p.titleEn), excerpt: loc(p.excerptAr, p.excerptEn), coverUrl: this.files.urls(p.cover)?.url ?? null, tags: p.tags, authorName: p.authorName, publishedAt: p.publishedAt?.toISOString() ?? null, readingMinutes: p.readingMinutes };
  }

  async testimonials(): Promise<TestimonialDto[]> {
    const rows = await this.prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const avatars = await this.files.urlMap(rows.map((r) => r.avatarFileId));
    return rows.map((t) => ({ id: t.id, name: loc(t.nameAr, t.nameEn), role: loc(t.roleAr, t.roleEn), company: loc(t.companyAr, t.companyEn), quote: loc(t.quoteAr, t.quoteEn), avatarUrl: t.avatarFileId ? avatars.get(t.avatarFileId)?.url ?? null : null, rating: t.rating }));
  }

  async faqs(audience?: string): Promise<FaqDto[]> {
    const rows = await this.prisma.faq.findMany({ where: { isActive: true, ...(audience ? { audience: { in: ['ALL', audience as never] } } : {}) }, orderBy: [{ sortOrder: 'asc' }] });
    return rows.map((f) => ({ id: f.id, question: loc(f.questionAr, f.questionEn), answer: loc(f.answerAr, f.answerEn), category: f.category }));
  }

  async landing(): Promise<LandingDto> {
    const [stats, testimonials, faqs, categories, posts, suppliers, banners] = await Promise.all([
      this.prisma.landingStat.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.testimonials(),
      this.faqs('BUYER'),
      this.catalog.categoriesTree({ featuredOnly: true }),
      this.prisma.blogPost.findMany({ where: { status: 'PUBLISHED' }, include: { cover: true }, orderBy: { publishedAt: 'desc' }, take: 3 }),
      this.catalog.suppliers({ featured: true, take: 8 }),
      this.banners(['HOME_HERO']),
    ]);
    return {
      stats: stats.map((s) => ({ key: s.key, label: loc(s.labelAr, s.labelEn), value: s.value, suffix: s.suffix })),
      testimonials,
      faqs: faqs.slice(0, 8),
      categories,
      posts: posts.map((p) => this.post(p)),
      suppliers,
      banners,
    };
  }

  async blog(page: number, pageSize: number, tag?: string) {
    const where: Prisma.BlogPostWhereInput = { status: 'PUBLISHED', ...(tag ? { tags: { has: tag } } : {}) };
    const [total, rows] = await Promise.all([this.prisma.blogPost.count({ where }), this.prisma.blogPost.findMany({ where, include: { cover: true }, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize })]);
    return { data: rows.map((p) => this.post(p)), total };
  }

  async blogPost(slug: string): Promise<BlogPostDto> {
    const p = await this.prisma.blogPost.findFirst({ where: { slug, status: 'PUBLISHED' }, include: { cover: true } });
    if (!p) throw AppError.notFound();
    const related = await this.prisma.blogPost.findMany({ where: { status: 'PUBLISHED', id: { not: p.id } }, include: { cover: true }, orderBy: { publishedAt: 'desc' }, take: 3 });
    return { ...this.post(p), body: loc(p.bodyAr, p.bodyEn), related: related.map((r) => this.post(r)) };
  }

  async page(slug: string): Promise<CmsPageDto> {
    const p = await this.prisma.cmsPage.findFirst({ where: { slug, isPublished: true } });
    if (!p) throw AppError.notFound();
    return { slug: p.slug, title: loc(p.titleAr, p.titleEn), body: loc(p.bodyAr, p.bodyEn), seoTitle: p.seoTitle, seoDescription: p.seoDescription, updatedAt: p.updatedAt.toISOString() };
  }

  async createLead(input: z.output<typeof leadSchema>): Promise<{ id: string }> {
    const lead = await this.prisma.lead.create({ data: { type: input.type, name: input.name, companyName: input.companyName ?? null, phone: input.phone, email: input.email ?? null, cityId: input.cityId ?? null, message: input.message ?? null, source: input.source ?? 'web' } });
    await this.outbox.publish(this.prisma, 'lead.created', { leadId: lead.id });
    return { id: lead.id };
  }
}
