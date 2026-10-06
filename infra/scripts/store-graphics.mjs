#!/usr/bin/env node
/**
 * Google Play graphics per app → docs/store/<app>/{icon-512.png, feature-1024x500.png}.
 * Rendered with the installed Chrome so Arabic text is shaped with the Cairo brand font.
 *   node infra/scripts/store-graphics.mjs
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../..');
const font = async (w) => (await readFile(path.join(root, `apps/api/assets/fonts/Cairo_${w}.ttf`))).toString('base64');
const mark = (await readFile(path.join(root, 'packages/tokens/assets/logo-mark-white.svg'))).toString('base64');

const APPS = {
  buyer: { bg: 'linear-gradient(135deg,#0A9B69 0%,#067A5B 55%,#0B2D5B 100%)', title: 'توريد', sub: 'سوق الجملة للمنشآت', line: 'قارن أسعار مئات الموردين · ادفع لاحقًا · تتبّع مباشر' },
  supplier: { bg: 'linear-gradient(135deg,#123C75 0%,#0B2D5B 60%,#071C3A 100%)', title: 'توريد للموردين', sub: 'متجرك بالجملة في جيبك', line: 'استقبل الطلبات وعروض الأسعار وأدِر منتجاتك وأسطولك' },
  driver: { bg: 'linear-gradient(135deg,#0B2D5B 0%,#0A4D63 55%,#0A9B69 100%)', title: 'توريد للسائقين', sub: 'مهام التوصيل في مكان واحد', line: 'الملاحة · إثبات التسليم برمز العميل · تحصيل نقدي' },
};

const [regular, bold, black] = await Promise.all([font('400Regular'), font('700Bold'), font('800ExtraBold')]);
const css = `@font-face{font-family:Cairo;font-weight:400;src:url(data:font/ttf;base64,${regular})}
@font-face{font-family:Cairo;font-weight:700;src:url(data:font/ttf;base64,${bold})}
@font-face{font-family:Cairo;font-weight:800;src:url(data:font/ttf;base64,${black})}
*{margin:0;box-sizing:border-box}body{font-family:Cairo;direction:rtl}`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
for (const [app, a] of Object.entries(APPS)) {
  const out = path.join(root, 'docs/store', app);
  await mkdir(out, { recursive: true });
  await sharp(path.join(root, `packages/tokens/assets/icons/${app}-icon.png`)).resize(512, 512).png().toFile(path.join(out, 'icon-512.png'));
  await page.setContent(`<style>${css}
    .c{width:1024px;height:500px;background:${a.bg};position:relative;overflow:hidden;display:flex;align-items:center;padding:0 72px;gap:48px;color:#fff}
    .c:before{content:'';position:absolute;inset:auto -120px -220px auto;width:560px;height:560px;border-radius:50%;background:rgba(60,195,144,.18)}
    .c:after{content:'';position:absolute;top:-160px;left:-80px;width:420px;height:420px;border-radius:50%;background:rgba(255,255,255,.06)}
    .t{position:relative;z-index:1;flex:1}
    h1{font-weight:800;font-size:76px;line-height:1.05}
    h2{font-weight:700;font-size:38px;color:#B6F0D6;margin-top:10px}
    p{font-weight:400;font-size:24px;opacity:.9;margin-top:22px}
    img{position:relative;z-index:1;width:230px;height:230px;opacity:.95}
  </style><div class="c"><div class="t"><h1>${a.title}</h1><h2>${a.sub}</h2><p>${a.line}</p></div><img src="data:image/svg+xml;base64,${mark}"></div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, 'feature-1024x500.png') });
  console.log(`✓ ${app}`);
}
await browser.close();
