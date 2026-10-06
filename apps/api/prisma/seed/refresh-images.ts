/**
 * Re-renders seed images in place on an already-seeded local database (no reset):
 *   tsx prisma/seed/refresh-images.ts [media-key …] [--logos]
 * Media keys are read from media/manifest.json; --logos regenerates every supplier and brand logo.
 */
import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import sharp from 'sharp';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { BRANDS } from './data/catalog.js';
import { SUPPLIERS } from './data/people.js';
import { logo } from './logo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const storageRoot = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? './storage');
const manifest = JSON.parse(await readFile(path.join(here, 'media/manifest.json'), 'utf8')) as Record<string, { file: string }>;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }) });

async function put(key: string, buf: Buffer) {
  const file = path.join(storageRoot, 'public', key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
}

async function replace(key: string, input: Buffer) {
  const base = `seed/${key}`;
  const main = await sharp(input).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  await Promise.all([
    put(`${base}.webp`, main.data),
    put(`${base}_thumb.webp`, await sharp(input).resize({ width: 360, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()),
    put(`${base}_md.webp`, await sharp(input).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()),
  ]);
  const { count } = await prisma.storedFile.updateMany({ where: { key: `${base}.webp` }, data: { sizeBytes: main.data.length, width: main.info.width, height: main.info.height } });
  console.log(`${count ? '✓' : '·'} ${key}${count ? '' : ' (no StoredFile row)'}`);
}

const args = process.argv.slice(2);
for (const key of args.filter((a) => !a.startsWith('--'))) {
  const entry = manifest[key];
  if (!entry) throw new Error(`unknown media key: ${key}`);
  await replace(key, await readFile(path.join(here, 'media/files', entry.file)));
}
if (args.includes('--logos')) {
  for (const s of SUPPLIERS) await replace(`supplier-${s.slug}`, await logo(s.ar, s.color));
  for (const b of BRANDS) await replace(`brand-${b.slug}`, await logo(b.ar, b.color));
}
await prisma.$disconnect();
