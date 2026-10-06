import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode, FILE_LIMITS_MB, type FileDto, type FilePurpose, type ImageRef } from '@tawreed/contracts';
import { fileTypeFromBuffer } from 'file-type';
import { AppError } from '../../common/http/app-error.js';
import type { StoredFile } from '../../generated/prisma/client.js';
import { type Db, PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { StorageService } from '../../infrastructure/storage/storage.service.js';

const PUBLIC_PURPOSES = new Set<FilePurpose>(['PRODUCT_IMAGE', 'CATEGORY_IMAGE', 'BRAND_LOGO', 'SUPPLIER_LOGO', 'BANNER', 'BLOG_COVER', 'AVATAR']);
const IMAGE_ONLY = new Set<FilePurpose>([
  'PRODUCT_IMAGE',
  'CATEGORY_IMAGE',
  'BRAND_LOGO',
  'SUPPLIER_LOGO',
  'BANNER',
  'BLOG_COVER',
  'AVATAR',
  'POD_PHOTO',
  'PICKUP_PHOTO',
  'DISPUTE_PHOTO',
  'POD_SIGNATURE',
]);
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']);
const DOC_MIME = new Set([...IMAGE_MIME, 'application/pdf']);

export interface UrlPair {
  url: string;
  thumbUrl: string | null;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(input: { buffer: Buffer; originalName?: string; purpose: FilePurpose; ownerUserId?: string | null; db?: Db }): Promise<StoredFile> {
    const { buffer, purpose } = input;
    const detected = await fileTypeFromBuffer(buffer);
    const mime = detected?.mime ?? 'application/octet-stream';
    const imageOnly = IMAGE_ONLY.has(purpose);
    const allowed = imageOnly ? IMAGE_MIME : DOC_MIME;
    if (!allowed.has(mime)) throw new AppError(ErrorCode.FILE_TYPE_NOT_ALLOWED, HttpStatus.UNPROCESSABLE_ENTITY);
    const limitMb = imageOnly ? FILE_LIMITS_MB.image : FILE_LIMITS_MB.document;
    if (buffer.length > limitMb * 1024 * 1024) {
      throw new AppError(ErrorCode.FILE_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE, { max: limitMb });
    }

    const visibility = PUBLIC_PURPOSES.has(purpose) ? 'PUBLIC' : 'PRIVATE';
    const folder = purpose.toLowerCase().replace(/_/g, '-');
    const base = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}`;
    const stored = IMAGE_MIME.has(mime) && purpose !== 'POD_SIGNATURE'
      ? await this.storage.putImage(base, buffer, visibility)
      : await this.storage.put(`${base}.${detected?.ext ?? 'bin'}`, buffer, visibility, mime);

    return (input.db ?? this.prisma).storedFile.create({
      data: {
        visibility,
        key: stored.key,
        originalName: input.originalName?.slice(0, 200) ?? null,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        width: stored.width ?? null,
        height: stored.height ?? null,
        purpose,
        variants: stored.variants ?? undefined,
        ownerUserId: input.ownerUserId ?? null,
      },
    });
  }

  /** Stores an already-produced buffer (e.g. generated PDF). */
  async storeGenerated(buffer: Buffer, opts: { key: string; mimeType: string; purpose: FilePurpose; originalName?: string; db?: Db }): Promise<StoredFile> {
    const visibility = PUBLIC_PURPOSES.has(opts.purpose) ? 'PUBLIC' : 'PRIVATE';
    await this.storage.put(opts.key, buffer, visibility, opts.mimeType);
    return (opts.db ?? this.prisma).storedFile.upsert({
      where: { key: opts.key },
      create: { visibility, key: opts.key, mimeType: opts.mimeType, sizeBytes: buffer.length, purpose: opts.purpose, originalName: opts.originalName ?? null },
      update: { sizeBytes: buffer.length, originalName: opts.originalName ?? null },
    });
  }

  urls(file: Pick<StoredFile, 'key' | 'visibility' | 'variants'> | null | undefined, ttlSeconds?: number): UrlPair | null {
    if (!file) return null;
    const variants = (file.variants ?? {}) as Record<string, string>;
    const main = variants.md ?? file.key;
    return {
      url: this.storage.url(main, file.visibility, ttlSeconds),
      thumbUrl: variants.thumb ? this.storage.url(variants.thumb, file.visibility, ttlSeconds) : null,
    };
  }

  imageRef(file: (Pick<StoredFile, 'key' | 'visibility' | 'variants' | 'width' | 'height'> & { alt?: string }) | null | undefined, alt?: string): ImageRef | null {
    const u = this.urls(file);
    if (!u || !file) return null;
    return { url: u.url, thumbUrl: u.thumbUrl ?? undefined, alt, width: file.width, height: file.height };
  }

  /** Resolves many file ids at once (one query) → id → urls. */
  async urlMap(ids: (string | null | undefined)[]): Promise<Map<string, UrlPair>> {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    const map = new Map<string, UrlPair>();
    if (!unique.length) return map;
    const files = await this.prisma.storedFile.findMany({ where: { id: { in: unique } }, select: { id: true, key: true, visibility: true, variants: true } });
    for (const f of files) {
      const u = this.urls(f);
      if (u) map.set(f.id, u);
    }
    return map;
  }

  async url(id: string | null | undefined): Promise<string | null> {
    if (!id) return null;
    return (await this.urlMap([id])).get(id)?.url ?? null;
  }

  toDto(file: StoredFile): FileDto {
    const u = this.urls(file);
    return {
      id: file.id,
      url: u?.url ?? '',
      thumbUrl: u?.thumbUrl ?? null,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      originalName: file.originalName,
      width: file.width,
      height: file.height,
      purpose: file.purpose,
    };
  }

  async findOwned(id: string, userId: string, isStaff: boolean): Promise<StoredFile> {
    const file = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!file || (!isStaff && file.ownerUserId !== userId && file.visibility === 'PRIVATE')) throw AppError.notFound();
    return file;
  }
}
