#!/usr/bin/env node
/**
 * Golden-path smoke test against a running API (default http://localhost:8030, dev OTP 123456).
 *   node infra/scripts/smoke-api.mjs [baseUrl]
 * Buyer (Rayhan, Riyadh) → cart from 2 suppliers → COD checkout → suppliers accept/prepare/ready → shipments →
 * drivers deliver with OTP → invoices + PDF. Mutates the dev database (creates one order).
 */
const BASE = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:8030').replace(/\/$/, '') + '/api/v1';
const OTP = process.env.DEV_OTP ?? '123456';
let step = 0;

async function call(method, path, { token, body, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json.error ?? json)}`);
  return json;
}

async function ok(label, fn) {
  step++;
  const t = Date.now();
  try {
    const out = await fn();
    console.log(`  ✓ ${String(step).padStart(2)}. ${label} (${Date.now() - t}ms)${out ? ` — ${out}` : ''}`);
  } catch (e) {
    console.error(`  ✗ ${String(step).padStart(2)}. ${label}\n      ${e.message}`);
    process.exit(1);
  }
}

const sessions = {};
async function login(phone, app) {
  if (sessions[phone + app]) return sessions[phone + app];
  try {
    await call('POST', '/auth/otp/request', { body: { phone, app } });
  } catch (e) {
    if (!String(e.message).includes('OTP_RESEND_TOO_SOON')) throw e;
    await new Promise((r) => setTimeout(r, 61_000));
    await call('POST', '/auth/otp/request', { body: { phone, app } });
  }
  const { data } = await call('POST', '/auth/otp/verify', { body: { phone, app, code: OTP } });
  if (data.status !== 'AUTHENTICATED') throw new Error(`${phone} is not registered`);
  return (sessions[phone + app] = data.tokens.accessToken);
}

function qtyFor(offer, target) {
  const step = Number(offer.qtyStep);
  const qty = Math.max(Number(offer.minOrderQty), Math.ceil(target / Number(offer.effectivePrice)));
  return String(Math.ceil(qty / step) * step);
}

const ctx = {};
console.log(`Tawreed API smoke → ${BASE}`);

await ok('health', async () => (await call('GET', '/health/ready')).data?.status ?? 'ok');
await ok('public catalog + Arabic search', async () => {
  const list = await call('GET', '/public/products?city=riyadh&pageSize=5');
  const search = await call('GET', `/public/products?q=${encodeURIComponent('بن')}&city=riyadh`);
  return `${list.meta.total} products, ${search.meta.total} match "بن"`;
});
await ok('buyer OTP login', async () => {
  ctx.buyer = await login('+966500000001', 'WEB');
  const me = await call('GET', '/auth/me', { token: ctx.buyer });
  return `${me.data.user.name} @ ${me.data.context.name}`;
});
await ok('cart from 2 suppliers', async () => {
  await call('DELETE', '/buyer/cart', { token: ctx.buyer });
  for (const [slug, supplier, target] of [['basmati-1121-sella', 'al-waha-foods', 1500], ['water-330ml', 'gulf-beverages', 500]]) {
    const { data } = await call('GET', `/public/products/${slug}?city=riyadh`);
    const offer = data.offers.find((o) => o.supplier.slug === supplier && o.coversCity);
    if (!offer) throw new Error(`no ${supplier} offer for ${slug}`);
    await call('POST', '/buyer/cart/items', { token: ctx.buyer, body: { offerId: offer.id, qty: qtyFor(offer, target) } });
  }
  const cart = await call('GET', '/buyer/cart', { token: ctx.buyer });
  if (!cart.data.canCheckout) throw new Error(JSON.stringify(cart.data.issues));
  return `${cart.data.groups.length} supplier groups, total ${cart.data.totals.grandTotal} SAR`;
});
await ok('checkout (cash on delivery)', async () => {
  const { data: o } = await call('GET', '/buyer/checkout/options', { token: ctx.buyer });
  const deliveries = o.deliverySlots.map((d) => ({ supplierId: d.supplierId, date: d.slots[0].date, window: d.slots[0].windows[0] }));
  const { data } = await call('POST', '/buyer/checkout/place', {
    token: ctx.buyer,
    headers: { 'idempotency-key': `smoke-${Date.now()}` },
    body: { addressId: o.selectedAddressId ?? o.addresses[0].id, paymentMethod: 'COD', deliveries, expectedTotal: o.cart.totals.grandTotal },
  });
  ctx.orderId = data.order.id;
  const detail = await call('GET', `/buyer/orders/${ctx.orderId}`, { token: ctx.buyer });
  ctx.supplierOrders = detail.data.supplierOrders;
  return `${data.order.number} · ${data.order.grandTotal} SAR`;
});

const fleets = { 'al-waha-foods': { owner: '+966500000101', driver: '+966500000211' }, 'gulf-beverages': { owner: '+966500000107', driver: '+966500000241' } };
for (const so of ctx.supplierOrders ?? []) {
  const fleet = fleets[so.supplier.slug];
  await ok(`${so.supplier.name}: accept → prepare → ready → ship`, async () => {
    const sup = await login(fleet.owner, 'SUPPLIER_WEB');
    for (const action of ['accept', 'start-preparing', 'ready']) await call('POST', `/supplier/orders/${so.id}/${action}`, { token: sup, body: {} });
    const drivers = await call('GET', '/supplier/drivers', { token: sup });
    const driver = drivers.data.find((d) => (d.phone ?? d.user?.phone) === fleet.driver) ?? drivers.data[0];
    const { data } = await call('POST', `/supplier/orders/${so.id}/shipments`, { token: sup, body: { dispatchMode: 'SUPPLIER_FLEET', driverId: driver.id } });
    so.shipmentId = data.id;
    return `${data.number} → ${driver.name}`;
  });
  await ok(`driver delivers ${so.number} with receiver OTP`, async () => {
    const drv = await login(fleet.driver, 'DRIVER_APP');
    const cod = await call('GET', `/driver/shipments/${so.shipmentId}`, { token: drv });
    for (const [action, body] of [['accept', {}], ['pickup', { photoFileIds: [] }], ['start', {}], ['arrive', {}]]) {
      await call('POST', `/driver/shipments/${so.shipmentId}/${action}`, { token: drv, body });
    }
    await call('POST', `/driver/shipments/${so.shipmentId}/deliver`, { token: drv, body: { receiverName: 'أمين المستودع', otp: OTP, photoFileIds: [], codCollected: cod.data.codAmount } });
    return `COD ${cod.data.codAmount} SAR collected`;
  });
}

await ok('order delivered + invoices issued', async () => {
  await new Promise((r) => setTimeout(r, 1500)); // outbox → worker
  const { data } = await call('GET', `/buyer/orders/${ctx.orderId}`, { token: ctx.buyer });
  const invoices = data.supplierOrders.map((s) => s.invoice).filter(Boolean);
  if (invoices.length !== data.supplierOrders.length) throw new Error(`status ${data.status}, ${invoices.length} invoices`);
  ctx.invoiceId = invoices[0].id;
  return `${data.status} · ${invoices.map((i) => i.number).join(', ')}`;
});
await ok('invoice PDF (Arabic + ZATCA QR)', async () => {
  const res = await fetch(`${BASE}/buyer/invoices/${ctx.invoiceId}/pdf`, { headers: { authorization: `Bearer ${ctx.buyer}` } });
  if (!res.ok) throw new Error(`pdf → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 4).toString() !== '%PDF') {
    const url = JSON.parse(buf.toString()).data?.url;
    if (!url) throw new Error('not a PDF');
    const pdf = await fetch(url);
    return `${(await pdf.arrayBuffer()).byteLength} bytes (signed URL)`;
  }
  return `${buf.length} bytes`;
});

console.log(`\nSmoke passed: ${step} steps.`);
