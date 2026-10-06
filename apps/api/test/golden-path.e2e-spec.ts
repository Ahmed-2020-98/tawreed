import { Decimal } from 'decimal.js';
import { bootApi, firstSlot, type TestApi } from './helpers.js';

/**
 * End-to-end over HTTP: a verified Riyadh supermarket buys from two suppliers on Pay Later,
 * both suppliers fulfil (own fleet + platform dispatch), drivers deliver with OTP, invoices are issued.
 */
const RAYHAN_OWNER = '+966500000001';
const WAHA_OWNER = '+966500000101';
const BEVERAGES_OWNER = '+966500000107';
const WAHA_DRIVER = '+966500000211';
const BEVERAGES_DRIVER = '+966500000241';

let api: TestApi;

beforeAll(async () => {
  api = await bootApi();
});
afterAll(async () => {
  await api?.close();
});

/** Quantity that clears `target` SAR at the offer's effective price, honouring MOQ and step. */
function qtyFor(offer: { effectivePrice: string; minOrderQty: string; qtyStep: string }, target: number): string {
  const step = new Decimal(offer.qtyStep);
  let qty = Decimal.max(new Decimal(offer.minOrderQty), new Decimal(target).div(offer.effectivePrice).ceil());
  qty = qty.div(step).ceil().mul(step);
  return qty.toString();
}

async function offerFor(slug: string, supplierSlug: string) {
  const r = await api.get(`/public/products/${slug}?city=riyadh`);
  expect(r.status).toBe(200);
  const offer = r.body.data.offers.find((o: any) => o.supplier.slug === supplierSlug && o.coversCity);
  if (!offer) throw new Error(`no ${supplierSlug} offer for ${slug} in Riyadh`);
  return offer;
}

describe('golden path: multi-supplier Pay Later order → fulfilment → delivery → invoices', () => {
  const ctx: { orderId?: string; supplierOrders?: any[]; creditBefore?: Decimal; total?: string } = {};

  it('browses the public catalog with buy box offers', async () => {
    const list = await api.get('/public/products?city=riyadh&pageSize=12');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    expect(list.body.meta).toMatchObject({ page: 1 });
    const search = await api.get(`/public/products?q=${encodeURIComponent('ارز')}&city=riyadh`);
    expect(search.status).toBe(200);
    expect(search.body.data.length).toBeGreaterThan(0);
  });

  it('logs in by OTP and fills a cart from two suppliers', async () => {
    const token = await api.login(RAYHAN_OWNER);
    await api.req('DELETE', '/buyer/cart', { token });
    const rice = await offerFor('basmati-1121-sella', 'al-waha-foods');
    const water = await offerFor('water-330ml', 'gulf-beverages');
    for (const [offer, target] of [[rice, 2500], [water, 600]] as const) {
      const r = await api.post('/buyer/cart/items', { offerId: offer.id, qty: qtyFor(offer, target) }, token);
      expect(r.status, JSON.stringify(r.body)).toBeLessThan(300);
    }
    const cart = await api.get('/buyer/cart', token);
    expect(cart.body.data.groups).toHaveLength(2);
    expect(cart.body.data.canCheckout, JSON.stringify(cart.body.data.issues)).toBe(true);
    // VAT is 15% of the taxable amount on every group.
    for (const g of cart.body.data.groups) {
      const taxable = new Decimal(g.subtotal).minus(g.discountTotal).plus(g.deliveryFee);
      expect(new Decimal(g.vatTotal).toNumber()).toBeCloseTo(taxable.mul(0.15).toNumber(), 1);
      expect(new Decimal(g.total).toFixed(2)).toBe(taxable.plus(g.vatTotal).toFixed(2));
    }
  });

  it('checks out on Pay Later and reserves credit', async () => {
    const token = await api.login(RAYHAN_OWNER);
    const credit = await api.get('/buyer/credit', token);
    expect(credit.status).toBe(200);
    ctx.creditBefore = new Decimal(credit.body.data.availableAmount);

    const opts = await api.get('/buyer/checkout/options', token);
    expect(opts.status).toBe(200);
    const o = opts.body.data;
    expect(o.paymentMethods.find((m: any) => m.method === 'CREDIT')?.available).toBe(true);
    const placed = await api.post(
      '/buyer/checkout/place',
      {
        addressId: o.selectedAddressId ?? o.addresses[0].id,
        paymentMethod: 'CREDIT',
        deliveries: o.cart.groups.map((g: any) => firstSlot(o, g.supplier.id)),
        expectedTotal: o.cart.totals.grandTotal,
      },
      token,
      { 'idempotency-key': `gp-${Date.now()}` },
    );
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
    ctx.orderId = placed.body.data.order.id;
    ctx.total = placed.body.data.order.grandTotal;
    expect(placed.body.data.order.number).toMatch(/^TW-\d{4}-\d{6}$/);
    await api.drain();

    const detail = await api.get(`/buyer/orders/${ctx.orderId}`, token);
    ctx.supplierOrders = detail.body.data.supplierOrders;
    expect(ctx.supplierOrders).toHaveLength(2);
    const after = await api.get('/buyer/credit', token);
    const available = new Decimal(after.body.data.availableAmount);
    expect(ctx.creditBefore.minus(available).toFixed(2)).toBe(new Decimal(ctx.total as string).toFixed(2));
    expect((await api.get('/buyer/cart', token)).body.data.itemsCount).toBe(0);
    // The "order placed" notification carries the real formatted total (money params are Prisma Decimals).
    const notes = await api.get('/notifications?pageSize=5', token);
    const placedNote = notes.body.data.find((n: any) => n.type === 'orderPlaced');
    const whole = new Decimal(ctx.total as string).toFixed(2).split('.')[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    expect(placedNote?.body).toContain(whole);
  });

  it('keeps tenants isolated (other buyer / other supplier get 404)', async () => {
    const other = await api.login('+966500000011');
    expect((await api.get(`/buyer/orders/${ctx.orderId}`, other)).status).toBe(404);
    const jazeera = await api.login('+966500000103', 'SUPPLIER_WEB');
    expect((await api.get(`/supplier/orders/${ctx.supplierOrders![0].id}`, jazeera)).status).toBe(404);
    // A buyer token cannot call supplier endpoints.
    expect((await api.get('/supplier/orders', await api.login(RAYHAN_OWNER))).status).toBe(403);
  });

  it('supplier (own fleet) accepts, prepares, ships with its driver; driver delivers with OTP', async () => {
    const so = ctx.supplierOrders!.find((s) => s.supplier.slug === 'al-waha-foods');
    const sup = await api.login(WAHA_OWNER, 'SUPPLIER_WEB');
    for (const step of ['accept', 'start-preparing', 'ready']) {
      const r = await api.post(`/supplier/orders/${so.id}/${step}`, {}, sup);
      expect(r.status, `${step}: ${JSON.stringify(r.body)}`).toBeLessThan(300);
    }
    const drivers = await api.get('/supplier/drivers', sup);
    const driver = drivers.body.data.find((d: any) => d.phone === WAHA_DRIVER || d.user?.phone === WAHA_DRIVER) ?? drivers.body.data[0];
    const ship = await api.post(`/supplier/orders/${so.id}/shipments`, { dispatchMode: 'SUPPLIER_FLEET', driverId: driver.id }, sup);
    expect(ship.status, JSON.stringify(ship.body)).toBeLessThan(300);
    await api.drain();
    await deliverAs(WAHA_DRIVER, ship.body.data.id);
  });

  it('supplier (platform fleet) requests dispatch; admin assigns a platform driver who delivers', async () => {
    const so = ctx.supplierOrders!.find((s) => s.supplier.slug === 'gulf-beverages');
    const sup = await api.login(BEVERAGES_OWNER, 'SUPPLIER_WEB');
    for (const step of ['accept', 'start-preparing', 'ready']) {
      const r = await api.post(`/supplier/orders/${so.id}/${step}`, {}, sup);
      expect(r.status, `${step}: ${JSON.stringify(r.body)}`).toBeLessThan(300);
    }
    const ship = await api.post(`/supplier/orders/${so.id}/shipments`, { dispatchMode: 'PLATFORM_FLEET' }, sup);
    expect(ship.status, JSON.stringify(ship.body)).toBeLessThan(300);
    const admin = await api.staffLogin();
    const drivers = await api.get('/admin/logistics/drivers?ownerType=PLATFORM', admin);
    const platform = drivers.body.data.find((d: any) => (d.phone ?? d.user?.phone) === '+966500000202') ?? drivers.body.data.find((d: any) => d.ownerType === 'PLATFORM');
    const assigned = await api.post(`/admin/logistics/shipments/${ship.body.data.id}/assign`, { driverId: platform.id }, admin);
    expect(assigned.status, JSON.stringify(assigned.body)).toBeLessThan(300);
    await api.drain();
    await deliverAs(platform.phone ?? platform.user?.phone ?? BEVERAGES_DRIVER, ship.body.data.id);
  });

  it('issues one ZATCA invoice per supplier order with a PDF, and the order is delivered', async () => {
    const token = await api.login(RAYHAN_OWNER);
    const detail = await api.get(`/buyer/orders/${ctx.orderId}`, token);
    expect(detail.body.data.status).toBe('DELIVERED');
    const invoices = detail.body.data.supplierOrders.map((s: any) => s.invoice);
    expect(invoices.every(Boolean)).toBe(true);
    const sum = invoices.reduce((acc: Decimal, i: any) => acc.plus(i.total), new Decimal(0));
    expect(sum.toFixed(2)).toBe(new Decimal(ctx.total as string).toFixed(2));
    for (const inv of invoices) {
      expect(inv.dueDate).toBeTruthy(); // credit invoices carry a due date
      const full = await api.get(`/buyer/invoices/${inv.id}`, token);
      expect(full.status).toBe(200);
      expect(full.body.data.zatcaQr ?? full.body.data.qr ?? full.body.data.qrCode).toBeTruthy();
    }
    const pdf = await fetch(`${api.baseUrl}/api/v1/buyer/invoices/${invoices[0].id}/pdf`, { headers: { authorization: `Bearer ${token}` }, redirect: 'manual' });
    expect([200, 302]).toContain(pdf.status);
    if (pdf.status === 200) {
      const ct = pdf.headers.get('content-type') ?? '';
      if (ct.includes('pdf')) expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString()).toBe('%PDF');
    }
  }, 60_000);
});

async function deliverAs(driverPhone: string, shipmentId: string) {
  const drv = await api.login(driverPhone, 'DRIVER_APP');
  const steps: [string, unknown][] = [
    ['accept', {}],
    ['pickup', { photoFileIds: [] }],
    ['start', { lat: 24.7, lng: 46.7 }],
    ['arrive', { lat: 24.8, lng: 46.6 }],
    ['deliver', { receiverName: 'أمين المستودع', otp: '123456', photoFileIds: [], lat: 24.8, lng: 46.6 }],
  ];
  for (const [step, body] of steps) {
    const r = await api.post(`/driver/shipments/${shipmentId}/${step}`, body, drv);
    expect(r.status, `driver ${step}: ${JSON.stringify(r.body)}`).toBeLessThan(300);
  }
  await api.drain();
}
