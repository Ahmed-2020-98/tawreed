/**
 * Demo activity generator — runs the REAL services (cart, checkout, supplier actions, shipments, driver POD,
 * invoices, payments, RFQs) to create realistic history, then back-dates it across the last 30 days.
 * Doubles as an end-to-end smoke test of the core flows.
 *   pnpm --filter @tawreed/api build && node dist/seed/demo-activity.js
 */
process.env.APP_ROLE = 'api';
process.env.SWAGGER_ENABLED = 'false';

import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import sharp from 'sharp';
import { AppModule } from '../app.module.js';
import { permissionsFor } from '../common/auth/access-token.service.js';
import type { Actor } from '../common/context/request-context.js';
import { RequestContext } from '../common/context/request-context.js';
import { OutboxDispatcher } from '../infrastructure/outbox/outbox.dispatcher.js';
import { PrismaService } from '../infrastructure/prisma/prisma.service.js';
import { CartService } from '../modules/cart/cart.service.js';
import { CheckoutService } from '../modules/checkout/checkout.service.js';
import { FilesService } from '../modules/files/files.service.js';
import { KybService } from '../modules/kyb/kyb.service.js';
import { OrdersService } from '../modules/orders/orders.service.js';
import { PaymentsService } from '../modules/payments/payments.service.js';
import { CreditService } from '../modules/credit/credit.service.js';
import { RfqService } from '../modules/rfq/rfq.service.js';
import { ShipmentsService } from '../modules/shipments/shipments.service.js';
import { dec } from '../modules/pricing/domain/money.js';

const log = new Logger('DemoActivity');

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260928);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] as T;

function actor(userId: string, contextType: Actor['contextType'], contextId: string | null, role: string | null, app: Actor['app'] = 'WEB', staffRoles: string[] = []): Actor {
  return { userId, sessionId: randomUUID(), app, contextType, contextId, role, staffRoles, permissions: permissionsFor(contextType, role, staffRoles as never) };
}

const run = <T>(a: Actor, fn: () => Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => RequestContext.run({ requestId: randomUUID(), locale: 'ar', actor: a, ip: '127.0.0.1', userAgent: 'demo-seed' }, () => void fn().then(resolve, reject)));

type Target = 'COMPLETED' | 'DELIVERED' | 'IN_TRANSIT' | 'READY' | 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'CANCELLED';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const cart = app.get(CartService);
  const checkout = app.get(CheckoutService);
  const orders = app.get(OrdersService);
  const shipments = app.get(ShipmentsService);
  const payments = app.get(PaymentsService);
  const credit = app.get(CreditService);
  const rfq = app.get(RfqService);
  const files = app.get(FilesService);
  const kyb = app.get(KybService);
  const outbox = app.get(OutboxDispatcher);
  const drain = async () => {
    let n = 0;
    while ((n = await outbox.drainInline(500)) > 0) void n;
  };

  const staff = await prisma.user.findFirstOrThrow({ where: { email: 'admin@tawreed.test' } });
  const admin = actor(staff.id, 'STAFF', null, null, 'ADMIN', ['SUPER_ADMIN']);
  const buyers = await prisma.buyerCompany.findMany({ include: { members: { where: { role: 'OWNER' }, include: { user: true } }, addresses: true, city: true, creditAccount: true } });
  const byName = (n: string) => buyers.find((b) => b.name === n) as (typeof buyers)[number];
  const plan: { company: (typeof buyers)[number]; methods: ('CREDIT' | 'COD' | 'BANK_TRANSFER' | 'CARD')[]; count: number }[] = [
    { company: byName('أسواق الريحان المركزية'), methods: ['CREDIT', 'CREDIT', 'COD', 'BANK_TRANSFER'], count: 14 },
    { company: byName('شركة الإعاشة المتحدة'), methods: ['CREDIT', 'CREDIT', 'CREDIT', 'BANK_TRANSFER'], count: 11 },
    { company: byName('مطاعم سفرة الخير'), methods: ['COD', 'BANK_TRANSFER', 'COD', 'CARD'], count: 9 },
    { company: byName('مقهى نسمة الصباح'), methods: ['COD'], count: 4 },
  ];
  const targets: Target[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'IN_TRANSIT', 'IN_TRANSIT', 'READY', 'ACCEPTED', 'PENDING', 'PENDING', 'REJECTED', 'CANCELLED'];

  const proofPng = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#F4F6F8' } }).png().toBuffer();
  const created: { orderId: string; daysAgo: number; target: Target; companyId: string; method: string }[] = [];

  let orderIndex = 0;
  for (const p of plan) {
    const owner = p.company.members[0]?.user;
    const address = p.company.addresses[0];
    if (!owner || !address) continue;
    const buyer = actor(owner.id, 'BUYER', p.company.id, 'OWNER');
    const offers = await prisma.offer.findMany({
      where: { status: 'ACTIVE', stockMode: { not: 'ON_REQUEST' }, supplier: { status: 'ACTIVE', coverage: { some: { cityId: address.cityId, isActive: true } } } },
      include: { supplier: { include: { coverage: { where: { cityId: address.cityId } } } }, unit: true },
    });
    if (!offers.length) continue;
    for (let i = 0; i < p.count; i++) {
      const target = targets[(orderIndex * 5 + i) % targets.length] as Target;
      const method = p.methods[i % p.methods.length] as 'CREDIT' | 'COD' | 'BANK_TRANSFER' | 'CARD';
      orderIndex++;
      try {
        await run(buyer, () => cart.clear(buyer));
        const suppliersInOrder = new Set<string>();
        const lines = 1 + Math.floor(rand() * 4);
        for (let l = 0; l < lines; l++) {
          const o = pick(offers);
          if (suppliersInOrder.size >= 2 && !suppliersInOrder.has(o.supplierId)) continue;
          suppliersInOrder.add(o.supplierId);
          const qty = dec(o.minOrderQty).times(1 + Math.floor(rand() * 4)).toString();
          await run(buyer, () => cart.add(buyer, o.id, qty));
        }
        let dto = await run(buyer, () => cart.get(buyer, { addressId: address.id }));
        // Top up groups below the supplier minimum order.
        for (const g of dto.groups) {
          const gap = dec(g.amountToMinOrder);
          if (gap.greaterThan(0) && g.items[0]) {
            const item = g.items[0];
            const extra = gap.dividedBy(dec(item.unitPrice)).ceil().plus(1);
            await run(buyer, () => cart.update(buyer, item.id, dec(item.qty).plus(extra.times(dec(item.qtyStep))).toString()));
          }
        }
        dto = await run(buyer, () => cart.get(buyer, { addressId: address.id }));
        if (!dto.canCheckout) {
          log.warn(`Skipping order (cart issues): ${JSON.stringify(dto.groups.flatMap((g) => g.issues.concat(g.items.flatMap((it) => it.issues))).map((x) => x.code))}`);
          continue;
        }
        const options = await run(buyer, () => checkout.options(buyer, address.id));
        const chosen = options.paymentMethods.find((m) => m.method === method && m.available) ?? options.paymentMethods.find((m) => m.method === 'COD' && m.available);
        if (!chosen) continue;
        const deliveries = options.deliverySlots.map((s) => ({ supplierId: s.supplierId, date: s.slots[0]?.date ?? '', window: s.slots[0]?.windows[0] ?? 'MORNING' })) as { supplierId: string; date: string; window: 'MORNING' }[];
        const placed = await run(buyer, () => checkout.place(buyer, { addressId: address.id, paymentMethod: chosen.method, deliveries, expectedTotal: options.cart.totals.grandTotal, notes: rand() < 0.3 ? 'يرجى التنسيق مع أمين المستودع قبل الوصول' : undefined }));
        const orderId = placed.order.id;
        await drain();

        if (chosen.method === 'BANK_TRANSFER') {
          const proof = await files.upload({ buffer: proofPng, originalName: 'transfer-receipt.png', purpose: 'PAYMENT_PROOF', ownerUserId: owner.id });
          const pay = await run(buyer, () => payments.submitBankTransfer(buyer, { purpose: 'ORDER', orderId, amount: placed.payment.amount, bankReference: `TRX${Math.floor(rand() * 1e9)}`, transferDate: new Date().toISOString().slice(0, 10), proofFileId: proof.id }));
          if (target !== 'PENDING') await run(admin, () => payments.decide(staff.id, pay.id, { decision: 'CONFIRM' }));
          await drain();
        }
        if (chosen.method === 'CARD') {
          created.push({ orderId, daysAgo: 0, target: 'PENDING', companyId: p.company.id, method: chosen.method });
          continue;
        }
        await progress(orderId, target);
        created.push({ orderId, daysAgo: 0, target, companyId: p.company.id, method: chosen.method });
      } catch (err) {
        log.warn(`Order ${orderIndex} failed: ${(err as Error).message}`);
      }
    }
  }

  async function progress(orderId: string, target: Target) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { supplierOrders: true, company: { include: { members: { where: { role: 'OWNER' } } } } } });
    const buyerOwner = order.company.members[0];
    if (target === 'CANCELLED' && buyerOwner) {
      const b = actor(buyerOwner.userId, 'BUYER', order.companyId, 'OWNER');
      await run(b, () => orders.buyerCancel(b, orderId, 'تم تغيير خطة الشراء'));
      await drain();
      return;
    }
    for (const so of order.supplierOrders) {
      if (so.status !== 'PENDING') continue;
      const member = await prisma.supplierMember.findFirstOrThrow({ where: { supplierId: so.supplierId, role: 'OWNER' } });
      const sup = actor(member.userId, 'SUPPLIER', so.supplierId, 'OWNER');
      if (target === 'PENDING') continue;
      if (target === 'REJECTED') {
        await run(sup, () => orders.supplierAction(sup, so.id, 'reject', 'نفاد الكمية المطلوبة من المستودع'));
        continue;
      }
      await run(sup, () => orders.supplierAction(sup, so.id, 'accept'));
      if (target === 'ACCEPTED') continue;
      await run(sup, () => orders.supplierAction(sup, so.id, 'mark_ready'));
      if (target === 'READY') continue;
      const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: so.supplierId } });
      const ownDriver = await prisma.driver.findFirst({ where: { supplierId: so.supplierId, status: 'ACTIVE' } });
      const platformDriver = await prisma.driver.findFirst({ where: { ownerType: 'PLATFORM', status: 'ACTIVE' }, orderBy: { deliveriesCount: 'asc' } });
      const usePlatform = !ownDriver || supplier.fleetMode === 'PLATFORM';
      let shipment = usePlatform
        ? await run(sup, () => shipments.create(sup, so.id, { dispatchMode: 'PLATFORM_FLEET' }))
        : await run(sup, () => shipments.create(sup, so.id, { dispatchMode: 'SUPPLIER_FLEET', driverId: ownDriver.id }));
      if (usePlatform && platformDriver) shipment = await run(admin, () => shipments.assign(admin, shipment.id, platformDriver.id));
      const driverRow = await prisma.driver.findUniqueOrThrow({ where: { id: (usePlatform ? platformDriver?.id : ownDriver?.id) as string } });
      const drv = actor(driverRow.userId, 'DRIVER', driverRow.id, driverRow.ownerType, 'DRIVER_APP');
      await run(drv, () => shipments.accept(drv, shipment.id));
      await run(drv, () => shipments.pickup(drv, shipment.id, { photoFileIds: [] }));
      await run(drv, () => shipments.start(drv, shipment.id, {}));
      // GPS breadcrumbs from pickup towards the customer.
      const s = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
      const from = s.pickupSnapshot as { lat: number; lng: number };
      const to = s.dropoffSnapshot as { lat: number; lng: number };
      const steps = target === 'IN_TRANSIT' ? 7 : 12;
      const points = Array.from({ length: steps }, (_, k) => {
        const t = (k + 1) / 13;
        return { lat: from.lat + (to.lat - from.lat) * t + (rand() - 0.5) * 0.004, lng: from.lng + (to.lng - from.lng) * t + (rand() - 0.5) * 0.004, recordedAt: new Date(Date.now() - (steps - k) * 120_000).toISOString(), shipmentId: shipment.id };
      });
      await run(drv, () => shipments.locations(drv, { points }));
      if (target === 'IN_TRANSIT') continue;
      await run(drv, () => shipments.arrive(drv, shipment.id, to));
      await run(drv, () => shipments.deliver(drv, shipment.id, { receiverName: 'أمين المستودع', otp: '123456', photoFileIds: [], lat: to.lat, lng: to.lng }));
      await drain();
    }
    await drain();
  }

  // Back-date orders so dashboards/charts show a month of activity (completed ones are older).
  const ageFor: Record<Target, [number, number]> = { COMPLETED: [12, 29], DELIVERED: [4, 11], IN_TRANSIT: [0, 0], READY: [0, 1], ACCEPTED: [0, 1], PENDING: [0, 0], REJECTED: [2, 20], CANCELLED: [3, 25] };
  for (const c of created) {
    const [min, max] = ageFor[c.target];
    const days = min + Math.floor(rand() * (max - min + 1));
    if (days <= 0) continue;
    const i = `${days} days`;
    await prisma.$executeRawUnsafe(`UPDATE orders SET "createdAt" = "createdAt" - interval '${i}', "placedAt" = "placedAt" - interval '${i}', "completedAt" = "completedAt" - interval '${i}', "cancelledAt" = "cancelledAt" - interval '${i}' WHERE id = $1::uuid`, c.orderId);
    await prisma.$executeRawUnsafe(`UPDATE supplier_orders SET "createdAt" = "createdAt" - interval '${i}', "acceptedAt" = "acceptedAt" - interval '${i}', "readyAt" = "readyAt" - interval '${i}', "preparingAt" = "preparingAt" - interval '${i}', "dispatchedAt" = "dispatchedAt" - interval '${i}', "deliveredAt" = "deliveredAt" - interval '${i}', "rejectedAt" = "rejectedAt" - interval '${i}', "cancelledAt" = "cancelledAt" - interval '${i}', "deliveryDate" = "deliveryDate" - interval '${i}', "acceptDeadlineAt" = "acceptDeadlineAt" - interval '${i}' WHERE "orderId" = $1::uuid`, c.orderId);
    for (const t of ['order_events', 'shipments', 'payments', 'documents']) {
      await prisma.$executeRawUnsafe(`UPDATE ${t} SET "createdAt" = "createdAt" - interval '${i}' WHERE "orderId" = $1::uuid`, c.orderId);
    }
    await prisma.$executeRawUnsafe(`UPDATE shipments SET "assignedAt" = "assignedAt" - interval '${i}', "acceptedAt" = "acceptedAt" - interval '${i}', "pickedUpAt" = "pickedUpAt" - interval '${i}', "inTransitAt" = "inTransitAt" - interval '${i}', "arrivedAt" = "arrivedAt" - interval '${i}', "deliveredAt" = "deliveredAt" - interval '${i}', "scheduledDate" = "scheduledDate" - interval '${i}' WHERE "orderId" = $1::uuid`, c.orderId);
    await prisma.$executeRawUnsafe(`UPDATE shipment_events SET "createdAt" = "createdAt" - interval '${i}' WHERE "shipmentId" IN (SELECT id FROM shipments WHERE "orderId" = $1::uuid)`, c.orderId);
    await prisma.$executeRawUnsafe(`UPDATE shipment_locations SET "recordedAt" = "recordedAt" - interval '${i}' WHERE "shipmentId" IN (SELECT id FROM shipments WHERE "orderId" = $1::uuid)`, c.orderId);
    await prisma.$executeRawUnsafe(`UPDATE proofs_of_delivery SET "deliveredAt" = "deliveredAt" - interval '${i}' WHERE "shipmentId" IN (SELECT id FROM shipments WHERE "orderId" = $1::uuid)`, c.orderId);
    await prisma.$executeRawUnsafe(`UPDATE invoices SET "issueDate" = "issueDate" - interval '${i}', "supplyDate" = "supplyDate" - interval '${i}', "dueDate" = "dueDate" - interval '${i}', "createdAt" = "createdAt" - interval '${i}' WHERE "orderId" = $1::uuid`, c.orderId);
    await prisma.$executeRawUnsafe(`UPDATE payments SET "paidAt" = "paidAt" - interval '${i}' WHERE "orderId" = $1::uuid`, c.orderId);
    c.daysAgo = days;
  }

  // Completed orders: auto-complete now that they are old enough.
  for (const c of created.filter((x) => x.target === 'COMPLETED')) {
    const sos = await prisma.supplierOrder.findMany({ where: { orderId: c.orderId, status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] } } });
    for (const so of sos) {
      await run(admin, () => orders.adminSupplierOrderAction(admin, so.id, 'complete'));
      const member = await prisma.buyerMember.findFirst({ where: { companyId: c.companyId, role: 'OWNER' } });
      if (member) {
        await prisma.review.create({ data: { supplierOrderId: so.id, companyId: c.companyId, supplierId: so.supplierId, userId: member.userId, rating: 4 + Math.round(rand()), qualityRating: 5, deliveryRating: 4 + Math.round(rand()), comment: pick(['خدمة ممتازة وتوصيل في الموعد', 'المنتجات مطابقة للوصف والتغليف ممتاز', 'تعامل راقٍ وسرعة في التجهيز', 'جودة عالية وسعر منافس']) } });
      }
    }
  }
  await drain();

  // Credit: repay older credit invoices (keep recent ones due + one slightly overdue).
  for (const company of [byName('أسواق الريحان المركزية'), byName('شركة الإعاشة المتحدة')]) {
    const owner = company.members[0]?.user;
    if (!owner) continue;
    const buyer = actor(owner.id, 'BUYER', company.id, 'OWNER');
    const old = await prisma.invoice.findMany({ where: { companyId: company.id, paymentMethod: 'CREDIT', status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, issueDate: { lt: new Date(Date.now() - 18 * 86_400_000) } } });
    if (old.length) {
      const amount = old.reduce((a, i) => a.plus(dec(i.balanceDue)), dec(0)).toFixed(2);
      const proof = await files.upload({ buffer: proofPng, originalName: 'repayment.png', purpose: 'PAYMENT_PROOF', ownerUserId: owner.id });
      const pay = await run(buyer, () => payments.submitBankTransfer(buyer, { purpose: 'CREDIT_REPAYMENT', invoiceIds: old.map((i) => i.id), amount, bankReference: `REPAY${Math.floor(rand() * 1e8)}`, transferDate: new Date().toISOString().slice(0, 10), proofFileId: proof.id }));
      await run(admin, () => payments.decide(staff.id, pay.id, { decision: 'CONFIRM' }));
    }
    const recent = await prisma.invoice.findFirst({ where: { companyId: company.id, paymentMethod: 'CREDIT', status: 'ISSUED' }, orderBy: { issueDate: 'asc' } });
    if (recent && company.name === 'شركة الإعاشة المتحدة') await prisma.invoice.update({ where: { id: recent.id }, data: { dueDate: new Date(Date.now() - 2 * 86_400_000), status: 'OVERDUE' } });
  }
  await drain();

  // RFQs.
  const cityOf = (b: (typeof buyers)[number]) => b.addresses[0]?.cityId as string;
  const productBySlug = async (slug: string) => prisma.product.findUniqueOrThrow({ where: { slug }, include: { units: true } });
  const supplierOwner = async (slug: string) => {
    const s = await prisma.supplier.findUniqueOrThrow({ where: { slug }, include: { members: { where: { role: 'OWNER' } } } });
    return actor(s.members[0]?.userId as string, 'SUPPLIER', s.id, 'OWNER');
  };
  const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

  const sufra = byName('مطاعم سفرة الخير');
  const sufraOwner = actor(sufra.members[0]?.user.id as string, 'BUYER', sufra.id, 'OWNER');
  const rice = await productBySlug('basmati-1121-sella');
  const riceRfq = await run(sufraOwner, () =>
    rfq.create(sufraOwner, { title: 'توريد أرز بسمتي 1121 لمدة 3 أشهر', cityId: cityOf(sufra), neededBy: inDays(10), paymentPreference: 'ANY', notes: 'نرغب بتوريد شهري على 3 دفعات، مع شهادة منشأ.', attachmentFileIds: [], visibility: 'OPEN', supplierIds: [], expiresInDays: 7, items: [{ productId: rice.id, productUnitId: rice.units[1]?.id, name: rice.nameAr, qty: '20', unitLabelAr: 'طن', unitLabelEn: 'Ton', targetUnitPrice: '6900' }, { name: 'زيت دوار الشمس تنكة 18 لتر', qty: '300', unitLabelAr: 'تنكة', unitLabelEn: 'Tin' }] }),
  );
  await drain();
  for (const [slug, price, lead] of [['al-waha-foods', '7250', 4], ['golden-grain-group', '7040', 6], ['tawreed-direct', '7180', 3]] as const) {
    const sup = await supplierOwner(slug);
    const invited = await prisma.rfqInvitation.findUnique({ where: { rfqId_supplierId: { rfqId: riceRfq.id, supplierId: sup.contextId as string } } });
    if (!invited && slug !== 'tawreed-direct') continue;
    await run(sup, () =>
      rfq.submitQuotation(sup, riceRfq.id, { items: riceRfq.items.map((it, idx) => ({ rfqItemId: it.id, unitPrice: idx === 0 ? price : String(110 + Math.floor(rand() * 12)) })), deliveryFee: '0', validUntil: inDays(10), leadTimeDays: lead, paymentMethods: ['BANK_TRANSFER', 'COD', 'CREDIT'], notes: 'السعر شامل التوصيل للمطبخ المركزي على 3 دفعات.' }),
    ).catch((e: Error) => log.warn(`quote ${slug}: ${e.message}`));
  }

  const united = byName('شركة الإعاشة المتحدة');
  const unitedOwner = actor(united.members[0]?.user.id as string, 'BUYER', united.id, 'OWNER');
  const coffee = await productBySlug('green-coffee-brazil-17-18');
  const coffeeRfq = await run(unitedOwner, () =>
    rfq.create(unitedOwner, { title: 'بن أخضر برازيلي 5 طن للمحمصة', cityId: cityOf(united), neededBy: inDays(14), paymentPreference: 'CREDIT', attachmentFileIds: [], visibility: 'OPEN', supplierIds: [], expiresInDays: 10, items: [{ productId: coffee.id, productUnitId: coffee.units[1]?.id, name: coffee.nameAr, qty: '5', unitLabelAr: 'طن', unitLabelEn: 'Ton' }] }),
  );
  await drain();
  const jazeera = await supplierOwner('jazeera-coffee-trading');
  const coffeeQuote = await run(jazeera, () => rfq.submitQuotation(jazeera, coffeeRfq.id, { items: [{ rfqItemId: coffeeRfq.items[0]?.id as string, unitPrice: '18150' }], deliveryFee: '1200', validUntil: inDays(7), leadTimeDays: 5, paymentMethods: ['CREDIT', 'BANK_TRANSFER'], notes: 'محصول 2026، عينة مجانية قبل الشحن.' }));
  const direct = await supplierOwner('tawreed-direct');
  await run(direct, () => rfq.submitQuotation(direct, coffeeRfq.id, { items: [{ rfqItemId: coffeeRfq.items[0]?.id as string, unitPrice: '18400' }], deliveryFee: '0', validUntil: inDays(7), leadTimeDays: 4, paymentMethods: ['CREDIT', 'BANK_TRANSFER', 'COD'] })).catch(() => undefined);
  await drain();
  // Accept the Jazeera quote with OTP e-approval (dev OTP 123456).
  await run(unitedOwner, async () => {
    await rfq.requestAcceptOtp(unitedOwner, coffeeQuote.id);
    await rfq.accept(unitedOwner, coffeeQuote.id, { versionId: coffeeQuote.current.id, otp: '123456', paymentMethod: 'CREDIT', addressId: united.addresses[0]?.id as string, termsAccepted: true });
  }).catch((e: Error) => log.warn(`accept quote: ${e.message}`));
  await drain();

  const rayhan = byName('أسواق الريحان المركزية');
  const rayhanOwner = actor(rayhan.members[0]?.user.id as string, 'BUYER', rayhan.id, 'OWNER');
  const dates = await productBySlug('sukkari-dates-premium');
  await run(rayhanOwner, () => rfq.create(rayhanOwner, { title: 'تمور سكري لموسم رمضان — 2 طن', cityId: cityOf(rayhan), neededBy: inDays(20), paymentPreference: 'CREDIT', attachmentFileIds: [], visibility: 'OPEN', supplierIds: [], expiresInDays: 14, items: [{ productId: dates.id, name: dates.nameAr, qty: '2000', unitLabelAr: 'كجم', unitLabelEn: 'kg', targetUnitPrice: '25' }] }));
  await drain();

  // Pending KYB & credit application examples.
  const nasmat = byName('مقهى نسمة الصباح');
  const nasmatOwner = nasmat.members[0]?.user;
  if (nasmatOwner) {
    for (const type of ['COMMERCIAL_REGISTRATION', 'NATIONAL_ADDRESS'] as const) {
      const f = await files.upload({ buffer: proofPng, originalName: `${type.toLowerCase()}.png`, purpose: 'KYB_DOCUMENT', ownerUserId: nasmatOwner.id });
      await kyb.addDocument({ kind: 'BUYER', id: nasmat.id }, nasmatOwner.id, { type, fileId: f.id });
    }
  }
  await credit.apply(sufra.id, sufra.members[0]?.user.id as string, { requestedLimit: '75000', requestedTermsDays: 30, monthlyPurchases: '60000', yearsInBusiness: 6, documentFileIds: [], notes: 'نطلب حدًا ائتمانيًا لتغطية مشتريات فروعنا الثلاثة.' });
  await drain();

  const summary = {
    orders: await prisma.order.count(),
    supplierOrders: await prisma.supplierOrder.count(),
    shipments: await prisma.shipment.count(),
    invoices: await prisma.invoice.count(),
    payments: await prisma.payment.count(),
    rfqs: await prisma.rfq.count(),
    quotations: await prisma.quotation.count(),
    notifications: await prisma.notification.count(),
    documents: await prisma.document.count(),
  };
  log.log(`Demo activity done: ${JSON.stringify(summary)}`);
  await app.close();
}

await main().catch((err) => {
  console.error(err);
  process.exit(1);
});
