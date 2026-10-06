import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type { FileVisibility } from '@tawreed/contracts';
import { del, head, put } from '@vercel/blob';
import sharp from 'sharp';
import { AppConfig } from '../../config/app-config.js';
import { CryptoService } from '../crypto/crypto.service.js';

export interface StoredObject {
  key: string;
  visibility: FileVisibility;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
  variants?: Record<string, string>;
}

export interface ImageVariantSpec {
  name: string;
  width: number;
}

export const PRODUCT_IMAGE_VARIANTS: ImageVariantSpec[] = [
  { name: 'thumb', width: 360 },
  { name: 'md', width: 900 },
];

/**
 * Object storage.
 * - local: files under STORAGE_LOCAL_DIR/{public,private}; public ones served at /files/p/<key>.
 * - blob (Vercel): public files at <blob>/p/<key>; private files at <blob>/s/<hmac>/<key>, a path that can't be
 *   derived without SIGNED_URL_SECRET.
 * Private files are always handed out as short-lived HMAC-signed API URLs (/files/s/<key>), which stream the
 * local file or redirect to the blob object after the signature check.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('Storage');
  private readonly root: string;
  readonly driver: 'local' | 'blob';
  private readonly blobBase: string | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly crypto: CryptoService,
  ) {
    this.root = path.resolve(process.cwd(), config.env.STORAGE_LOCAL_DIR);
    this.driver = config.env.STORAGE_DRIVER === 'blob' ? 'blob' : 'local';
    if (config.env.STORAGE_DRIVER === 's3') this.logger.warn('S3 driver not configured in this build; using local disk.');
    if (this.driver === 'blob') this.blobBase = (config.env.BLOB_BASE_URL ?? blobBaseFromToken(config.env.BLOB_READ_WRITE_TOKEN ?? '')).replace(/\/$/, '');
  }

  /** Object path inside the blob store. */
  blobPathname(key: string, visibility: FileVisibility): string {
    const safeKey = key.replace(/\.\.+/g, '').replace(/^\/+/, '');
    if (visibility === 'PUBLIC') return `p/${safeKey}`;
    return `s/${this.crypto.hmac(`blob:${safeKey}`, this.config.env.SIGNED_URL_SECRET).slice(0, 32)}/${safeKey}`;
  }

  /** Direct blob URL (for private files only hand this out after a signature check). */
  blobUrl(key: string, visibility: FileVisibility): string {
    return `${this.blobBase}/${this.blobPathname(key, visibility)}`;
  }

  private get blobToken(): string {
    return this.config.env.BLOB_READ_WRITE_TOKEN as string;
  }

  private filePath(visibility: FileVisibility, key: string): string {
    const safeKey = key.replace(/\.\.+/g, '').replace(/^\/+/, '');
    return path.join(this.root, visibility === 'PUBLIC' ? 'public' : 'private', safeKey);
  }

  async put(key: string, body: Buffer, visibility: FileVisibility, mimeType: string): Promise<StoredObject> {
    if (this.driver === 'blob') {
      await put(this.blobPathname(key, visibility), body, {
        access: 'public',
        token: this.blobToken,
        contentType: mimeType,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: visibility === 'PUBLIC' ? 60 * 60 * 24 * 30 : 60,
      });
      return { key, visibility, sizeBytes: body.length, mimeType };
    }
    const file = this.filePath(visibility, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return { key, visibility, sizeBytes: body.length, mimeType };
  }

  /** Stores an image re-encoded as webp (EXIF stripped) plus resized variants. */
  async putImage(keyBase: string, body: Buffer, visibility: FileVisibility, variants: ImageVariantSpec[] = PRODUCT_IMAGE_VARIANTS): Promise<StoredObject> {
    const image = sharp(body, { failOn: 'none' }).rotate();
    const meta = await image.metadata();
    const main = await image.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    const key = `${keyBase}.webp`;
    await this.put(key, main.data, visibility, 'image/webp');
    const variantKeys: Record<string, string> = {};
    for (const v of variants) {
      const buf = await sharp(body, { failOn: 'none' }).rotate().resize({ width: v.width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      const vKey = `${keyBase}_${v.name}.webp`;
      await this.put(vKey, buf, visibility, 'image/webp');
      variantKeys[v.name] = vKey;
    }
    return {
      key,
      visibility,
      sizeBytes: main.data.length,
      mimeType: 'image/webp',
      width: main.info.width ?? meta.width,
      height: main.info.height ?? meta.height,
      variants: variantKeys,
    };
  }

  async read(key: string, visibility: FileVisibility): Promise<Buffer> {
    if (this.driver === 'blob') {
      const res = await fetch(this.blobUrl(key, visibility), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Blob ${key} → ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }
    return readFile(this.filePath(visibility, key));
  }

  async exists(key: string, visibility: FileVisibility): Promise<boolean> {
    if (this.driver === 'blob') {
      return head(this.blobUrl(key, visibility), { token: this.blobToken }).then(
        () => true,
        () => false,
      );
    }
    try {
      await stat(this.filePath(visibility, key));
      return true;
    } catch {
      return false;
    }
  }

  async remove(key: string, visibility: FileVisibility): Promise<void> {
    if (this.driver === 'blob') {
      await del(this.blobUrl(key, visibility), { token: this.blobToken });
      return;
    }
    await rm(this.filePath(visibility, key), { force: true });
  }

  localPath(key: string, visibility: FileVisibility): string {
    return this.filePath(visibility, key);
  }

  publicUrl(key: string): string {
    if (this.driver === 'blob') return this.blobUrl(key, 'PUBLIC');
    return `${this.config.env.API_PUBLIC_URL}/files/p/${key}`;
  }

  /** Signed URL valid for `ttlSeconds` (default 15 minutes). */
  signedUrl(key: string, ttlSeconds = 900, downloadName?: string): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = this.crypto.hmac(`${key}:${exp}`, this.config.env.SIGNED_URL_SECRET);
    const dn = downloadName ? `&dn=${encodeURIComponent(downloadName)}` : '';
    return `${this.config.env.API_PUBLIC_URL}/files/s/${key}?e=${exp}&s=${sig}${dn}`;
  }

  verifySignature(key: string, exp: number, sig: string): boolean {
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    return this.crypto.safeEqual(this.crypto.hmac(`${key}:${exp}`, this.config.env.SIGNED_URL_SECRET), sig);
  }

  url(key: string, visibility: FileVisibility, ttlSeconds?: number): string {
    return visibility === 'PUBLIC' ? this.publicUrl(key) : this.signedUrl(key, ttlSeconds);
  }
}

/** Vercel Blob tokens look like `vercel_blob_rw_<storeId>_<secret>`; objects live at https://<storeid>.public.blob.vercel-storage.com. */
export function blobBaseFromToken(token: string): string {
  const storeId = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(token)?.[1];
  if (!storeId) throw new Error('Cannot derive the Blob URL from BLOB_READ_WRITE_TOKEN; set BLOB_BASE_URL');
  return `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
}
