import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const CAIRO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts/Cairo_800ExtraBold.ttf');
const GENERIC = new Set(['شركة', 'مؤسسة', 'مجموعة', 'مصنع', 'مصانع', 'مستودعات', 'بيت', 'دار']);

/** First letter of the distinctive word: skips «شركة»-style prefixes and the article «ال». */
export function monogram(nameAr: string): string {
  const words = nameAr.split(/\s+/).filter(Boolean);
  const word = words.find((w) => !GENERIC.has(w)) ?? words[0] ?? '';
  return (word.startsWith('ال') && word.length > 3 ? word[2] : word[0]) ?? '';
}

/** Logo: rounded square in the organisation colour with an Arabic monogram set in Cairo (Pango shapes it). */
export async function logo(nameAr: string, color: string): Promise<Buffer> {
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" rx="88" fill="${color}"/><circle cx="330" cy="70" r="120" fill="#ffffff" opacity="0.08"/></svg>`;
  const raw = await sharp({
    text: { text: `<span foreground="#ffffff">${monogram(nameAr)}</span>`, font: 'Cairo ExtraBold', fontfile: CAIRO, dpi: 1600, rgba: true },
  })
    .png()
    .toBuffer();
  // Trim to the ink box so every letter gets the same visual size, whatever its ascenders or dots.
  const glyph = await sharp(raw).trim().resize({ height: 170, width: 210, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  const { width = 0, height = 0 } = glyph.info;
  return sharp(Buffer.from(bg))
    .composite([{ input: glyph.data, left: Math.round((400 - width) / 2), top: Math.round((400 - height) / 2) }])
    .png()
    .toBuffer();
}
