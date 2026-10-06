/**
 * Downloads openly-licensed photos (CC0 / Public Domain / CC BY) from Openverse for every seed product,
 * category and banner, re-encodes them to webp and records attribution in manifest.json.
 * Resumable: existing entries are skipped. Swap to AI images later by replacing files + manifest entries.
 *   pnpm seed:media
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CATEGORIES, MEDIA_EXTRA, PRODUCTS } from '../data/catalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(here, 'manifest.json');
const filesDir = path.join(here, 'files');

export interface MediaEntry {
  file: string;
  query: string;
  title: string | null;
  creator: string | null;
  license: string;
  licenseUrl: string | null;
  source: string | null;
  landingUrl: string | null;
}

const manifest: Record<string, MediaEntry> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'TawreedSeed/1.0 (development seed data)' };

interface OvResult {
  url: string;
  title?: string;
  creator?: string;
  license: string;
  license_url?: string;
  source?: string;
  foreign_landing_url?: string;
  width?: number;
  height?: number;
}

async function search(query: string): Promise<OvResult[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0,pdm,by&page_size=12&mature=false`, { headers: UA });
    if (res.status === 429) {
      await sleep(20_000);
      continue;
    }
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: OvResult[] };
    return json.results ?? [];
  }
  return [];
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25_000), redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 8_000 ? buf : null;
  } catch {
    return null;
  }
}

async function fetchOne(key: string, query: string, square: boolean): Promise<boolean> {
  if (manifest[key] && existsSync(path.join(filesDir, manifest[key].file))) return true;
  const results = (await search(query)).filter((r) => (r.width ?? 800) >= 500 && (r.height ?? 600) >= 400);
  for (const r of results.slice(0, 6)) {
    const buf = await download(r.url);
    if (!buf) continue;
    try {
      const file = `${key}.webp`;
      const img = sharp(buf, { failOn: 'none' }).rotate();
      const out = square ? img.resize(900, 900, { fit: 'cover', position: 'attention' }) : img.resize(1600, 900, { fit: 'cover', position: 'attention' });
      await out.webp({ quality: 82 }).toFile(path.join(filesDir, file));
      manifest[key] = { file, query, title: r.title ?? null, creator: r.creator ?? null, license: r.license, licenseUrl: r.license_url ?? null, source: r.source ?? null, landingUrl: r.foreign_landing_url ?? null };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

async function main() {
  const jobs: { key: string; query: string; square: boolean }[] = [
    ...CATEGORIES.map((c) => ({ key: `category-${c.slug}`, query: c.image, square: true })),
    ...PRODUCTS.map((p) => ({ key: `product-${p.slug}`, query: p.img, square: true })),
    ...MEDIA_EXTRA.map((m) => ({ key: m.key, query: m.query, square: false })),
  ];
  let ok = 0;
  const failed: string[] = [];
  for (const [i, job] of jobs.entries()) {
    const had = !!manifest[job.key];
    const success = await fetchOne(job.key, job.query, job.square);
    if (success) ok++;
    else failed.push(job.key);
    console.log(`[${i + 1}/${jobs.length}] ${success ? '✓' : '✗'} ${job.key}`);
    if (!had) await sleep(3_300);
  }
  console.log(`Done: ${ok}/${jobs.length} images. Missing: ${failed.join(', ') || 'none'}`);
}

await main();
