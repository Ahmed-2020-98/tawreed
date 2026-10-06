import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/http/app-error.js';
import { pageMeta } from '../../common/http/presenters.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { FilesService } from '../files/files.service.js';

export type ContentModel = 'banner' | 'homeSection' | 'cmsPage' | 'faq' | 'blogPost' | 'testimonial' | 'landingStat' | 'lead';

type Delegate = {
  findMany(args: object): Promise<Record<string, unknown>[]>;
  count(args?: object): Promise<number>;
  findUnique(args: object): Promise<Record<string, unknown> | null>;
  create(args: object): Promise<Record<string, unknown>>;
  update(args: object): Promise<Record<string, unknown>>;
  delete(args: object): Promise<unknown>;
};

const ORDER: Record<ContentModel, object> = {
  banner: [{ placement: 'asc' }, { sortOrder: 'asc' }],
  homeSection: { sortOrder: 'asc' },
  cmsPage: { slug: 'asc' },
  faq: [{ audience: 'asc' }, { sortOrder: 'asc' }],
  blogPost: { createdAt: 'desc' },
  testimonial: { sortOrder: 'asc' },
  landingStat: { sortOrder: 'asc' },
  lead: { createdAt: 'desc' },
};
const FILE_FIELDS: Partial<Record<ContentModel, string[]>> = { banner: ['imageFileId', 'mobileImageFileId'], blogPost: ['coverFileId'], testimonial: ['avatarFileId'] };

/** Generic admin CRUD for CMS/marketing models (validation happens in the controller via zod). */
@Injectable()
export class ContentAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly files: FilesService,
  ) {}

  private delegate(model: ContentModel): Delegate {
    return this.prisma[model];
  }

  private async withUrls(model: ContentModel, rows: Record<string, unknown>[]) {
    const fields = FILE_FIELDS[model] ?? [];
    if (!fields.length) return rows;
    const urls = await this.files.urlMap(rows.flatMap((r) => fields.map((f) => r[f] as string | null)));
    return rows.map((r) => ({ ...r, ...Object.fromEntries(fields.map((f) => [f.replace(/FileId$/, 'Url'), r[f] ? urls.get(r[f] as string)?.url ?? null : null])) }));
  }

  async list(model: ContentModel, page: number, pageSize: number, where: object = {}) {
    const d = this.delegate(model);
    const [total, rows] = await Promise.all([d.count({ where }), d.findMany({ where, orderBy: ORDER[model], skip: (page - 1) * pageSize, take: pageSize })]);
    return { data: await this.withUrls(model, rows), meta: pageMeta(page, pageSize, total) };
  }

  async get(model: ContentModel, id: string) {
    const row = await this.delegate(model).findUnique({ where: { id } });
    if (!row) throw AppError.notFound();
    return (await this.withUrls(model, [row]))[0];
  }

  async create(model: ContentModel, data: Record<string, unknown>) {
    const row = await this.delegate(model).create({ data: this.prepare(model, data) });
    await this.audit.record(this.prisma, { action: `${model}.created`, entityType: model, entityId: row.id as string });
    return row;
  }

  async update(model: ContentModel, id: string, data: Record<string, unknown>) {
    const row = await this.delegate(model).update({ where: { id }, data: this.prepare(model, data) });
    await this.audit.record(this.prisma, { action: `${model}.updated`, entityType: model, entityId: id, after: data });
    return row;
  }

  async remove(model: ContentModel, id: string) {
    await this.delegate(model).delete({ where: { id } });
    await this.audit.record(this.prisma, { action: `${model}.deleted`, entityType: model, entityId: id });
  }

  private prepare(model: ContentModel, data: Record<string, unknown>) {
    const out = { ...data };
    for (const k of ['startsAt', 'endsAt']) if (typeof out[k] === 'string') out[k] = new Date(out[k]);
    if (model === 'blogPost' && out.status === 'PUBLISHED' && !out.publishedAt) out.publishedAt = new Date();
    return out;
  }
}
