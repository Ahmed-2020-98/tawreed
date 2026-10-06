#!/usr/bin/env node
/**
 * Dev helper: full-page screenshots with the system Chrome.
 *   node infra/scripts/shot.mjs <url> <out.png> [width=1440] [--cookie=name=value] [--clip=HEIGHT] [--login=05XXXXXXXX] [--add=slug:supplier,…]
 */
import { chromium } from 'playwright-core';

const [url, out, w = '1440', ...rest] = process.argv.slice(2);
const cookies = rest.filter((a) => a.startsWith('--cookie=')).map((a) => a.slice(9).split('='));
const clip = rest.find((a) => a.startsWith('--clip='))?.slice(7);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: Number(w), height: 900 }, deviceScaleFactor: 1 });
if (cookies.length) await ctx.addCookies(cookies.map(([name, value]) => ({ name, value, url })));
const login = rest.find((a) => a.startsWith('--login='))?.slice(8);
const origin = new URL(url).origin;
if (login) {
  // Sign in through the app's BFF (dev OTP) so the context carries the httpOnly session cookies.
  let req = await ctx.request.post(`${origin}/api/auth/otp-request`, { data: { phone: login } });
  if (req.status() === 429) {
    // Resend cooldown from a previous run: wait it out once.
    const secs = (await req.json()).error?.details?.seconds ?? 60;
    await new Promise((r) => setTimeout(r, (secs + 1) * 1000));
    req = await ctx.request.post(`${origin}/api/auth/otp-request`, { data: { phone: login } });
  }
  const r = await ctx.request.post(`${origin}/api/auth/otp-verify`, { data: { phone: login, code: '123456' } });
  if (!r.ok()) throw new Error(`login failed: ${r.status()} ${await r.text()}`);
}
const add = rest.find((a) => a.startsWith('--add='))?.slice(6);
if (add) {
  for (const pair of add.split(',')) {
    const [slug, supplier] = pair.split(':');
    const { data } = await (await ctx.request.get(`${origin}/api/proxy/public/products/${slug}`)).json();
    const offer = data.offers.find((o) => o.supplier.slug === supplier) ?? data.offers[0];
    const qty = Math.max(Number(offer.minOrderQty), Math.ceil(800 / Number(offer.effectivePrice)));
    await ctx.request.post(`${origin}/api/proxy/buyer/cart/items`, { data: { offerId: offer.id, qty: String(Math.ceil(qty / Number(offer.qtyStep)) * Number(offer.qtyStep)) } });
  }
}
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
// Extra pages in the same session: --also=<url>=<out.png>
const shots = [[url, out], ...rest.filter((a) => a.startsWith('--also=')).map((a) => { const v = a.slice(7); const i = v.lastIndexOf('='); return [v.slice(0, i), v.slice(i + 1)]; })];
for (const [u, o] of shots) {
  await page.goto(u, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: o, fullPage: !clip, ...(clip ? { clip: { x: 0, y: 0, width: Number(w), height: Number(clip) } } : {}) });
}
console.log(errors.length ? `console errors:\n${errors.slice(0, 8).join('\n')}` : 'no console errors');
await browser.close();
