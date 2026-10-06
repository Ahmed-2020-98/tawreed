#!/usr/bin/env node
/**
 * Uploads a local storage dir (apps/api/storage-deploy after seeding the hosted DB) to Vercel Blob with the
 * same layout StorageService (STORAGE_DRIVER=blob) reads:
 *   public/<key>  → p/<key>
 *   private/<key> → s/<hmac32(SIGNED_URL_SECRET, "blob:"+key)>/<key>   (needs the deployment's SIGNED_URL_SECRET)
 *
 *   BLOB_READ_WRITE_TOKEN=… [SIGNED_URL_SECRET=…] node infra/scripts/upload-storage-to-blob.mjs <dir> [--public-only]
 */
import { createHmac } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';

const [dir, flag] = process.argv.slice(2);
const token = process.env.BLOB_READ_WRITE_TOKEN;
const secret = process.env.SIGNED_URL_SECRET;
if (!dir || !token) throw new Error('usage: BLOB_READ_WRITE_TOKEN=… node upload-storage-to-blob.mjs <dir> [--public-only]');
const publicOnly = flag === '--public-only';
if (!publicOnly && !secret) throw new Error('SIGNED_URL_SECRET is required for private files (or pass --public-only)');

const TYPES = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf', '.svg': 'image/svg+xml' };

async function* walk(root) {
  for (const entry of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function uploadAll(sub, toPathname) {
  const root = path.join(dir, sub);
  const files = [];
  for await (const f of walk(root)) files.push(f);
  let done = 0;
  const queue = [...files];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        const key = path.relative(root, f).split(path.sep).join('/');
        await put(toPathname(key), await readFile(f), {
          access: 'public',
          token,
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream',
          cacheControlMaxAge: sub === 'public' ? 60 * 60 * 24 * 30 : 60,
        });
        if (++done % 50 === 0) console.log(`  ${sub}: ${done}/${files.length}`);
      }
    }),
  );
  console.log(`✓ ${sub}: ${done} files`);
}

await uploadAll('public', (key) => `p/${key}`);
if (!publicOnly) await uploadAll('private', (key) => `s/${createHmac('sha256', secret).update(`blob:${key}`).digest('hex').slice(0, 32)}/${key}`);
