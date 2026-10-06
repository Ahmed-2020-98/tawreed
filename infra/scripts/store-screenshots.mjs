#!/usr/bin/env node
/**
 * Framed Google Play screenshots (1080×1920, ≤ 2:1) from raw simulator captures:
 * docs/store/<app>/raw/<n>.png → docs/store/<app>/screenshots/<n>.png, with an Arabic caption (Cairo).
 *   node infra/scripts/store-screenshots.mjs
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '../..');
const BG = { buyer: 'linear-gradient(160deg,#0A9B69,#067A5B 60%,#0B2D5B)', supplier: 'linear-gradient(160deg,#123C75,#0B2D5B 60%,#071C3A)', driver: 'linear-gradient(160deg,#0B2D5B,#0A4D63 60%,#0A9B69)' };
const CAPTIONS = {
  buyer: { '1-home': 'كل احتياجات منشأتك بأسعار الجملة', '2-product': 'قارن عروض الموردين واختر الأفضل', '3-cart': 'سلة واحدة من عدة موردين', '4-tracking': 'تتبّع شحنتك لحظة بلحظة', '5-rfq': 'اطلب عروض أسعار للكميات الكبيرة' },
  supplier: { '1-dashboard': 'مبيعاتك وطلباتك في لوحة واحدة', '2-orders': 'استقبل الطلبات الجديدة فورًا', '3-order': 'اقبل وجهّز واشحن بضغطة', '4-quote': 'قدّم عروض أسعار تنافسية', '5-offers': 'حدّث الأسعار والمخزون في ثوانٍ' },
  driver: { '1-tasks': 'مهامك اليومية في مكان واحد', '2-shipment': 'الاستلام والملاحة والتسليم', '3-cash': 'تابع النقد المحصّل أولًا بأول', '4-map': 'خريطة المهمة الحالية' },
};

const font = async (w) => (await readFile(path.join(root, `apps/api/assets/fonts/Cairo_${w}.ttf`))).toString('base64');
const black = await font('800ExtraBold');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [app, caps] of Object.entries(CAPTIONS)) {
  const out = path.join(root, 'docs/store', app, 'screenshots');
  await mkdir(out, { recursive: true });
  for (const [name, caption] of Object.entries(caps)) {
    const shot = (await readFile(path.join(root, 'docs/store', app, 'raw', `${name}.png`))).toString('base64');
    await page.setContent(`<style>
      @font-face{font-family:Cairo;font-weight:800;src:url(data:font/ttf;base64,${black})}
      *{margin:0;box-sizing:border-box}
      body{width:1080px;height:1920px;background:${BG[app]};font-family:Cairo;direction:rtl;display:flex;flex-direction:column;align-items:center;overflow:hidden}
      h1{color:#fff;font-weight:800;font-size:68px;line-height:1.25;text-align:center;padding:110px 70px 0;height:390px}
      img{width:700px;border-radius:56px;box-shadow:0 40px 90px rgba(0,0,0,.35);border:10px solid rgba(255,255,255,.14)}
    </style><h1>${caption}</h1><img src="data:image/png;base64,${shot}">`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
  }
  console.log(`✓ ${app}: ${Object.keys(caps).length}`);
}
await browser.close();
