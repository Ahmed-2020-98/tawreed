import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '../../common/http/throttle.js';
import {
  bannerInputSchema,
  blogPostInputSchema,
  cmsPageInputSchema,
  faqInputSchema,
  homeSectionInputSchema,
  landingStatInputSchema,
  leadQuery,
  leadSchema,
  leadUpdateSchema,
  paginationQuery,
  testimonialInputSchema,
} from '@tawreed/contracts';
import type { z } from 'zod';
import { Auth, CurrentActor, Public } from '../../common/auth/decorators.js';
import type { Actor } from '../../common/context/request-context.js';
import { AppError } from '../../common/http/app-error.js';
import { paginate, Paginated } from '../../common/http/envelope.js';
import { ZBody, ZQuery } from '../../common/http/zod.js';
import { ContentAdminService, type ContentModel } from './content-admin.service.js';
import { ContentService } from './content.service.js';

@ApiTags('content')
@Controller('public')
export class PublicContentController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get('home')
  home(@CurrentActor() actor: Actor | undefined, @Query('platform') platform?: string, @Query('city') city?: string) {
    return this.content.home(actor, platform === 'app' ? 'APP' : 'WEB', city);
  }

  @Public()
  @Get('landing')
  landing() {
    return this.content.landing();
  }

  @Public()
  @Get('banners')
  banners(@Query('placement') placement = 'HOME_HERO') {
    return this.content.banners(placement.split(','));
  }

  @Public()
  @Get('faqs')
  faqs(@Query('audience') audience?: string) {
    return this.content.faqs(audience?.toUpperCase());
  }

  @Public()
  @Get('testimonials')
  testimonials() {
    return this.content.testimonials();
  }

  @Public()
  @Get('blog')
  async blog(@ZQuery(paginationQuery) q: z.output<typeof paginationQuery>, @Query('tag') tag?: string) {
    const { data, total } = await this.content.blog(q.page, q.pageSize, tag);
    return paginate(data, total, q.page, q.pageSize);
  }

  @Public()
  @Get('blog/:slug')
  post(@Param('slug') slug: string) {
    return this.content.blogPost(slug);
  }

  @Public()
  @Get('pages/:slug')
  page(@Param('slug') slug: string) {
    return this.content.page(slug);
  }

  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @Post('leads')
  lead(@ZBody(leadSchema) body: z.output<typeof leadSchema>) {
    return this.content.createLead(body);
  }
}

const SCHEMAS: Record<string, { model: ContentModel; schema: z.ZodType; permission: 'admin.marketing.manage' | 'admin.content.manage' }> = {
  banners: { model: 'banner', schema: bannerInputSchema, permission: 'admin.marketing.manage' },
  'home-sections': { model: 'homeSection', schema: homeSectionInputSchema, permission: 'admin.marketing.manage' },
  pages: { model: 'cmsPage', schema: cmsPageInputSchema, permission: 'admin.content.manage' },
  faqs: { model: 'faq', schema: faqInputSchema, permission: 'admin.content.manage' },
  'blog-posts': { model: 'blogPost', schema: blogPostInputSchema, permission: 'admin.content.manage' },
  testimonials: { model: 'testimonial', schema: testimonialInputSchema, permission: 'admin.content.manage' },
  'landing-stats': { model: 'landingStat', schema: landingStatInputSchema, permission: 'admin.content.manage' },
};

@ApiTags('admin-content')
@ApiBearerAuth()
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly admin: ContentAdminService) {}

  private resolve(resource: string, actor: Actor) {
    const r = SCHEMAS[resource];
    if (!r) throw AppError.notFound();
    if (actor.contextType !== 'STAFF' || !actor.permissions.has(r.permission)) throw AppError.forbidden();
    return r;
  }

  @Auth('STAFF')
  @Get('leads')
  async leads(@ZQuery(leadQuery) q: z.output<typeof leadQuery>) {
    const { data, meta } = await this.admin.list('lead', q.page, q.pageSize, { ...(q.status ? { status: q.status } : {}), ...(q.type ? { type: q.type } : {}) });
    return new Paginated(data, meta);
  }

  @Auth('STAFF')
  @Put('leads/:id')
  updateLead(@Param('id', ParseUUIDPipe) id: string, @ZBody(leadUpdateSchema) body: z.output<typeof leadUpdateSchema>) {
    return this.admin.update('lead', id, body);
  }

  @Auth('STAFF')
  @Get(':resource')
  async list(@CurrentActor() actor: Actor, @Param('resource') resource: string, @ZQuery(paginationQuery) q: z.output<typeof paginationQuery>) {
    const { data, meta } = await this.admin.list(this.resolve(resource, actor).model, q.page, Math.max(q.pageSize, 50));
    return new Paginated(data, meta);
  }

  @Auth('STAFF')
  @Get(':resource/:id')
  get(@CurrentActor() actor: Actor, @Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.get(this.resolve(resource, actor).model, id);
  }

  @Auth('STAFF')
  @Post(':resource')
  create(@CurrentActor() actor: Actor, @Param('resource') resource: string, @Body() body: unknown) {
    const r = this.resolve(resource, actor);
    return this.admin.create(r.model, r.schema.parse(body) as Record<string, unknown>);
  }

  @Auth('STAFF')
  @Put(':resource/:id')
  update(@CurrentActor() actor: Actor, @Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const r = this.resolve(resource, actor);
    return this.admin.update(r.model, id, r.schema.parse(body) as Record<string, unknown>);
  }

  @Auth('STAFF')
  @Delete(':resource/:id')
  async remove(@CurrentActor() actor: Actor, @Param('resource') resource: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.admin.remove(this.resolve(resource, actor).model, id);
    return { ok: true };
  }
}
