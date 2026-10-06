#!/usr/bin/env node
/**
 * Builds Tawreed brand assets from code:
 *  - the swoosh mark (navy blade + green road stripes) as hand-fitted Bézier paths,
 *  - wordmarks shaped with HarfBuzz from Cairo Black (Arabic) and Montserrat Bold (Latin),
 *  - SVG lockups (color / white), app icons (buyer / supplier / driver), adaptive icons,
 *    splash marks and favicons as PNG via sharp.
 *
 * Replace with the designer's original vector files when available; outputs keep the same names.
 * Usage: pnpm --filter @tawreed/tokens build:brand
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as hb from 'harfbuzzjs';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../assets');
const iconsOut = path.join(out, 'icons');

const NAVY = '#0B2D5B';
const NAVY_DEEP = '#051A38';
const GREEN = '#0A9B69';
const GREEN_DEEP = '#067A5B';
const GREEN_BRIGHT = '#17AE7C';
const TAGLINE_GRAY = '#515C6B';

/* ------------------------------------------------------------------ mark */
// Local coordinate system: 350 × 290 (traced from the brand board).
const MARK_W = 350;
const MARK_H = 290;
const BLADE =
  'M73 27 C120 12 190 0 255 0 C295 0 325 15 340 40 C352 70 348 115 335 147 ' +
  'C322 112 290 72 245 53 C200 42 130 36 85 35 Q72 34 73 27 Z';
const STRIPE_LEFT = 'M3 285 C90 245 190 160 223 113 C220 160 175 235 115 285 Z';
const STRIPE_RIGHT =
  'M165 285 C212 238 252 168 237 112 C233 100 226 92 217 88 ' +
  'C265 95 322 140 326 205 C328 240 315 268 290 285 Z';

/** Returns SVG markup (no <svg> wrapper) for the mark placed at (x, y) scaled to width w. */
function markGroup({ x = 0, y = 0, w = MARK_W, mono = null, idPrefix = 'm' }) {
  const s = w / MARK_W;
  const bladeFill = mono ?? `url(#${idPrefix}-blade)`;
  const stripeFill = mono ?? `url(#${idPrefix}-road)`;
  const defs = mono
    ? ''
    : `<defs>
    <linearGradient id="${idPrefix}-blade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1B3F74"/><stop offset="0.45" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
    <linearGradient id="${idPrefix}-road" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${GREEN_DEEP}"/><stop offset="0.55" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_BRIGHT}"/>
    </linearGradient>
  </defs>`;
  return `${defs}<g transform="translate(${r(x)} ${r(y)}) scale(${r(s, 5)})">
    <path d="${BLADE}" fill="${bladeFill}"/>
    <path d="${STRIPE_LEFT}" fill="${stripeFill}"/>
    <path d="${STRIPE_RIGHT}" fill="${stripeFill}"/>
  </g>`;
}

/* ------------------------------------------------------------ text shaping */
function loadFont(file) {
  return readFile(file).then((buf) => {
    const blob = new hb.Blob(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const face = new hb.Face(blob, 0);
    const font = new hb.Font(face);
    return { font, upem: face.upem };
  });
}

/**
 * Shapes `text` and returns { d, width, bbox } in font units scaled to `size` (px per em),
 * with y pointing down and the baseline at y = 0. `tracking` is extra advance per glyph (em).
 */
function shapeText({ font, upem }, text, size, tracking = 0) {
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(font, buffer);
  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();
  const scale = size / upem;
  let penX = 0;
  const parts = [];
  infos.forEach((info, i) => {
    const pos = positions[i];
    const raw = font.glyphToPath(info.codepoint);
    if (raw) {
      const gx = penX + (pos.xOffset ?? 0);
      const gy = pos.yOffset ?? 0;
      parts.push(transformPath(raw, (px, py) => [(gx + px) * scale, -(gy + py) * scale]));
    }
    penX += (pos.xAdvance ?? 0) + (i < infos.length - 1 ? tracking * upem : 0);
  });
  const d = parts.join(' ');
  return { d, width: penX * scale, bbox: pathBBox(d) };
}

/** Applies fn(x, y) → [x, y] to every coordinate pair of an absolute SVG path (M/L/Q/C/Z). */
function transformPath(d, fn) {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const outTokens = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (!/[MLQCZ]/i.test(cmd)) continue;
    outTokens.push(cmd.toUpperCase());
    const pairs = { M: 1, L: 1, Q: 2, C: 3, Z: 0 }[cmd.toUpperCase()];
    for (let p = 0; p < pairs; p++) {
      const [x, y] = fn(parseFloat(tokens[i]), parseFloat(tokens[i + 1]));
      i += 2;
      outTokens.push(r(x), r(y));
    }
  }
  return outTokens.join(' ');
}

function pathBBox(d) {
  const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

const r = (n, digits = 2) => Number(n.toFixed(digits));

/* ---------------------------------------------------------------- lockups */
function svg(width, height, body, title = 'Tawreed — توريد') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(width)} ${r(height)}" width="${r(width)}" height="${r(height)}" role="img" aria-label="${title}">
  <title>${title}</title>
  ${body}
</svg>
`;
}

function buildLockup({ ar, en, tagline, variant }) {
  const white = variant === 'white';
  const wordFill = white ? '#FFFFFF' : NAVY;
  const tagFill = white ? 'rgba(255,255,255,0.78)' : TAGLINE_GRAY;
  // Arabic wordmark sits left, the mark overlaps its top-right like the brand board.
  const arW = ar.bbox.width;
  const markW = arW * 0.62;
  const markH = markW * (MARK_H / MARK_W);
  const gap = arW * 0.02;
  const arX = -ar.bbox.minX;
  const arTop = markH * 0.36; // wordmark top relative to lockup top
  const arY = arTop - ar.bbox.minY;
  const markX = arW + gap - markW * 0.12;
  const markY = arY + ar.bbox.maxY - markH; // stripes' bottom aligned with wordmark bottom
  const width = markX + markW;
  const enScale = (arW * 0.92) / en.bbox.width;
  const enY = arY + ar.bbox.maxY + arW * 0.1;
  const enX = (arW - en.bbox.width * enScale) / 2 - en.bbox.minX * enScale;
  let height = enY + en.bbox.maxY * enScale + arW * 0.02;
  let tagMarkup = '';
  if (tagline) {
    const tagScale = (arW * 1.05) / tagline.bbox.width;
    const tagY = height + arW * 0.05 - tagline.bbox.minY * tagScale;
    const tagX = (width - tagline.bbox.width * tagScale) / 2 - tagline.bbox.minX * tagScale;
    tagMarkup = `<path transform="translate(${r(tagX)} ${r(tagY)}) scale(${r(tagScale, 5)})" d="${tagline.d}" fill="${tagFill}"/>`;
    height = tagY + tagline.bbox.maxY * tagScale + arW * 0.02;
  }
  const body = `${markGroup({ x: markX, y: markY, w: markW, mono: white ? '#FFFFFF' : null, idPrefix: `l${variant}` })}
  <path transform="translate(${r(arX)} ${r(arY)})" d="${ar.d}" fill="${wordFill}"/>
  <path transform="translate(${r(enX)} ${r(enY)}) scale(${r(enScale, 5)})" d="${en.d}" fill="${wordFill}"/>
  ${tagMarkup}`;
  return svg(width, height, body);
}

function buildHorizontal({ ar, variant }) {
  const white = variant === 'white';
  const h = ar.bbox.height;
  const markH = h * 1.25;
  const markW = markH * (MARK_W / MARK_H);
  const gap = h * 0.22;
  const markY = 0;
  const arY = markH - ar.bbox.maxY - h * 0.06;
  const arX = markW + gap - ar.bbox.minX;
  const width = markW + gap + ar.bbox.width;
  const body = `${markGroup({ w: markW, x: 0, y: markY, mono: white ? '#FFFFFF' : null, idPrefix: `h${variant}` })}
  <path transform="translate(${r(arX)} ${r(arY)})" d="${ar.d}" fill="${white ? '#FFFFFF' : NAVY}"/>`;
  return svg(width, markH, body);
}

/* ------------------------------------------------------------------ icons */
function iconSvg({ size = 1024, background, mono, radius = 0, markScale = 0.66 }) {
  const markW = size * markScale;
  const markH = markW * (MARK_H / MARK_W);
  const x = (size - markW) / 2;
  const y = (size - markH) / 2 + size * 0.01;
  const bg = background
    ? background.startsWith('url')
      ? `<defs><linearGradient id="bg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${GREEN_DEEP}"/><stop offset="1" stop-color="${GREEN_BRIGHT}"/></linearGradient></defs><rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>`
      : `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>`
    : '';
  return svg(size, size, `${bg}${markGroup({ x, y, w: markW, mono, idPrefix: 'i' })}`);
}

async function png(svgString, file, size) {
  await sharp(Buffer.from(svgString), { density: 384 }).resize(size, size).png().toFile(file);
}

/* ------------------------------------------------------------------- main */
async function main() {
  await mkdir(iconsOut, { recursive: true });
  const cairoBlack = await loadFont(require.resolve('@expo-google-fonts/cairo/900Black/Cairo_900Black.ttf'));
  const cairoMedium = await loadFont(require.resolve('@expo-google-fonts/cairo/500Medium/Cairo_500Medium.ttf'));
  const montserrat = await loadFont(require.resolve('@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf'));

  const ar = shapeText(cairoBlack, 'توريد', 400);
  const en = shapeText(montserrat, 'TAWREED', 100, 0.42);
  const tagline = shapeText(cairoMedium, 'توريد أكبر .. لفرص أوسع', 100);

  const files = {
    'logo-mark.svg': svg(MARK_W, MARK_H, markGroup({ idPrefix: 'mk' })),
    'logo-mark-white.svg': svg(MARK_W, MARK_H, markGroup({ mono: '#FFFFFF' })),
    'logo-mark-navy.svg': svg(MARK_W, MARK_H, markGroup({ mono: NAVY })),
    'logo.svg': buildLockup({ ar, en, variant: 'color' }),
    'logo-white.svg': buildLockup({ ar, en, variant: 'white' }),
    'logo-tagline.svg': buildLockup({ ar, en, tagline, variant: 'color' }),
    'logo-tagline-white.svg': buildLockup({ ar, en, tagline, variant: 'white' }),
    'logo-horizontal.svg': buildHorizontal({ ar, variant: 'color' }),
    'logo-horizontal-white.svg': buildHorizontal({ ar, variant: 'white' }),
    'wordmark-ar.svg': svg(ar.bbox.width, ar.bbox.height, `<path transform="translate(${r(-ar.bbox.minX)} ${r(-ar.bbox.minY)})" d="${ar.d}" fill="${NAVY}"/>`),
    'favicon.svg': iconSvg({ size: 64, background: 'url(#bg)', mono: '#FFFFFF', radius: 14, markScale: 0.7 }),
  };
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(out, name), content);
  }

  // App icons (iOS/Expo 1024², no transparency) + Android adaptive foregrounds (transparent, safe zone).
  const apps = {
    buyer: { background: 'url(#bg)', mono: '#FFFFFF', adaptiveBg: GREEN_DEEP },
    supplier: { background: NAVY, mono: '#FFFFFF', adaptiveBg: NAVY },
    driver: { background: '#FFFFFF', mono: null, adaptiveBg: '#FFFFFF' },
  };
  for (const [app, cfg] of Object.entries(apps)) {
    await png(iconSvg({ background: cfg.background, mono: cfg.mono }), path.join(iconsOut, `${app}-icon.png`), 1024);
    await png(iconSvg({ mono: cfg.mono, markScale: 0.5 }), path.join(iconsOut, `${app}-adaptive-foreground.png`), 1024);
    await png(iconSvg({ mono: cfg.mono ?? null, markScale: 0.9 }), path.join(iconsOut, `${app}-splash.png`), 512);
    await writeFile(path.join(iconsOut, `${app}-adaptive-background.txt`), `${cfg.adaptiveBg}\n`);
  }
  // Web favicons / PWA.
  const fav = iconSvg({ size: 512, background: 'url(#bg)', mono: '#FFFFFF', radius: 112, markScale: 0.68 });
  for (const size of [32, 180, 192, 512]) {
    await png(fav, path.join(iconsOut, `favicon-${size}.png`), size);
  }
  await sharp(Buffer.from(files['logo-tagline.svg']), { density: 300 }).resize({ width: 1200 }).png().toFile(path.join(out, 'logo-tagline.png'));
  await sharp(Buffer.from(files['logo.svg']), { density: 300 }).resize({ width: 800 }).png().toFile(path.join(out, 'logo.png'));
  console.log(`Brand assets written to ${path.relative(process.cwd(), out)}`);
}

await main();
