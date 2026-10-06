// Vercel build step: copies @sparticuz/chromium's packed binary to ./chromium-bin, which vercel.json bundles
// with the function (tracing misses the package's own bin/, see PdfService).
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

let dir = process.cwd();
while (!existsSync(path.join(dir, 'node_modules/@sparticuz/chromium/bin'))) {
  const up = path.dirname(dir);
  if (up === dir) throw new Error('@sparticuz/chromium is not installed');
  dir = up;
}
rmSync('chromium-bin', { recursive: true, force: true });
cpSync(path.join(dir, 'node_modules/@sparticuz/chromium/bin'), 'chromium-bin', { recursive: true });
console.log(`chromium-bin ← ${dir}/node_modules/@sparticuz/chromium/bin`);
