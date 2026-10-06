/**
 * Manual curation helper for seed photos.
 *   tsx pick-media.ts candidates <queries.json> [commons]
 *                                                 → downloads up to 6 Openverse (or Wikimedia Commons) candidates per key into .candidates/
 *                                                   and renders numbered contact sheets (.candidates/sheet-N.png)
 *   tsx pick-media.ts apply key=3 other=src-key:2 … → copies the chosen candidate into files/ and updates manifest.json
 * queries.json: { "<media key>": "<search query>", … }
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp, { type OverlayOptions } from 'sharp';
import type { MediaEntry } from './fetch-media.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(here, 'manifest.json');
const filesDir = path.join(here, 'files');
const candDir = path.join(here, '.candidates');
const UA = { 'User-Agent': 'TawreedSeed/1.0 (development seed data)' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PER_KEY = 6;
const THUMB = 220;

interface OvResult {
  id: string;
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
type Candidate = Omit<MediaEntry, 'file'>;

async function search(query: string): Promise<OvResult[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0,pdm,by&category=photograph&page_size=14&mature=false`,
      { headers: UA },
    );
    if (res.status === 429) {
      await sleep(30_000);
      continue;
    }
    if (!res.ok) return [];
    return ((await res.json()) as { results?: OvResult[] }).results ?? [];
  }
  return [];
}

const OPEN_LICENSE = /^(cc0|public domain|pd|pdm|cc by(-sa)? \d)/i;

/** Wikimedia Commons file search (CC0 / PD / CC BY / CC BY-SA only), mapped to the Openverse shape. */
async function searchCommons(query: string): Promise<OvResult[]> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20&gsrsearch=${encodeURIComponent(`${query} filetype:bitmap`)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return [];
  const json = (await res.json()) as { query?: { pages?: Record<string, { title: string; index: number; imageinfo?: any[] }> } };
  const strip = (v?: string) => (v ? v.replace(/<[^>]+>/g, '').trim() : undefined);
  return Object.values(json.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .flatMap((p) => {
      const ii = p.imageinfo?.[0];
      const meta = ii?.extmetadata ?? {};
      const license = strip(meta.LicenseShortName?.value) ?? '';
      if (!ii || !OPEN_LICENSE.test(license)) return [];
      return [{ id: p.title, url: ii.thumburl ?? ii.url, title: strip(meta.ObjectName?.value) ?? p.title.replace(/^File:/, ''), creator: strip(meta.Artist?.value), license: license.toLowerCase(), license_url: meta.LicenseUrl?.value, source: 'wikimedia', foreign_landing_url: ii.descriptionurl, width: ii.width, height: ii.height }];
    });
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

async function candidates(queriesFile: string, source: 'openverse' | 'commons' = 'openverse') {
  const queries: Record<string, string> = JSON.parse(readFileSync(queriesFile, 'utf8'));
  mkdirSync(candDir, { recursive: true });
  const keys = Object.keys(queries);
  for (const [i, key] of keys.entries()) {
    const dir = path.join(candDir, key);
    const metaPath = path.join(dir, 'meta.json');
    if (existsSync(metaPath)) continue;
    mkdirSync(dir, { recursive: true });
    const results = (await (source === 'commons' ? searchCommons : search)(queries[key]!)).filter((r) => (r.width ?? 800) >= 500 && (r.height ?? 600) >= 400);
    const meta: Candidate[] = [];
    for (const r of results) {
      if (meta.length >= PER_KEY) break;
      const buf = await download(r.url);
      if (!buf) continue;
      try {
        await sharp(buf, { failOn: 'none' }).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(path.join(dir, `${meta.length + 1}.jpg`));
        meta.push({ query: queries[key]!, title: r.title ?? null, creator: r.creator ?? null, license: r.license, licenseUrl: r.license_url ?? null, source: r.source ?? null, landingUrl: r.foreign_landing_url ?? null });
      } catch {
        continue;
      }
    }
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    console.log(`[${i + 1}/${keys.length}] ${key}: ${meta.length} candidates`);
    await sleep(source === 'commons' ? 300 : 3_300);
  }
  await sheets(keys);
}

async function sheets(keys: string[]) {
  const ROWS = 10;
  const labelW = 260;
  for (let s = 0; s * ROWS < keys.length; s++) {
    const chunk = keys.slice(s * ROWS, (s + 1) * ROWS);
    const width = labelW + PER_KEY * (THUMB + 6);
    const height = chunk.length * (THUMB + 6);
    const layers: OverlayOptions[] = [];
    for (const [row, key] of chunk.entries()) {
      const top = row * (THUMB + 6);
      const label = `<svg width="${labelW}" height="${THUMB}"><text x="8" y="${THUMB / 2}" font-family="Helvetica" font-size="17" fill="#111">${key.replace(/^product-/, '')}</text></svg>`;
      layers.push({ input: Buffer.from(label), top, left: 0 });
      for (let n = 1; n <= PER_KEY; n++) {
        const file = path.join(candDir, key, `${n}.jpg`);
        if (!existsSync(file)) continue;
        const left = labelW + (n - 1) * (THUMB + 6);
        layers.push({ input: await sharp(file).resize(THUMB, THUMB, { fit: 'cover' }).toBuffer(), top, left });
        const badge = `<svg width="30" height="30"><rect width="30" height="30" rx="6" fill="#000" fill-opacity="0.75"/><text x="15" y="21" text-anchor="middle" font-family="Helvetica" font-size="18" font-weight="bold" fill="#fff">${n}</text></svg>`;
        layers.push({ input: Buffer.from(badge), top: top + 4, left: left + 4 });
      }
    }
    const out = path.join(candDir, `sheet-${s + 1}.png`);
    await sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).composite(layers).png().toFile(out);
    console.log(`sheet → ${out}`);
  }
}

async function apply(picks: string[]) {
  const manifest: Record<string, MediaEntry> = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const pick of picks) {
    // key=n picks from the key's own candidates; key=otherKey:n borrows another key's candidate.
    const [key, spec] = pick.split('=');
    if (!key || !spec) continue;
    const [srcKey, n] = spec.includes(':') ? (spec.split(':') as [string, string]) : [key, spec];
    const meta: Candidate[] = JSON.parse(readFileSync(path.join(candDir, srcKey, 'meta.json'), 'utf8'));
    const chosen = meta[Number(n) - 1];
    if (!chosen) throw new Error(`No candidate ${n} for ${srcKey}`);
    const square = key.startsWith('product-') || key.startsWith('category-');
    const img = sharp(path.join(candDir, srcKey, `${n}.jpg`));
    const out = square ? img.resize(900, 900, { fit: 'cover', position: 'attention' }) : img.resize(1600, 900, { fit: 'cover', position: 'attention' });
    const file = `${key}.webp`;
    await out.webp({ quality: 82 }).toFile(path.join(filesDir, file));
    manifest[key] = { file, ...chosen };
    console.log(`✓ ${key} ← #${n} (${chosen.title ?? 'untitled'} · ${chosen.creator ?? 'unknown'})`);
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'candidates' && args[0]) await candidates(args[0], args[1] === 'commons' ? 'commons' : 'openverse');
else if (cmd === 'sheets' && args[0]) await sheets(Object.keys(JSON.parse(readFileSync(args[0], 'utf8'))));
else if (cmd === 'apply') await apply(args);
else console.log('usage: pick-media.ts candidates <queries.json> | sheets <queries.json> | apply key=n …');
