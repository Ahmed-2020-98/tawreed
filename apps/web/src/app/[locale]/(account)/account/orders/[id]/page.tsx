import type { OrderDetailDto, PublicSettingsDto, SupplierOrderDto } from '@tawreed/contracts';
import { Card, CardHeader, cn } from '@tawreed/ui';
import { Check, FileText, MapPin, Package, Receipt } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { StatusBadge } from '@/components/account/status-badge';
import { InvoiceButton, OrderHeaderActions, PaymentPanel, RateSupplier } from '@/components/orders/order-actions';
import { ShipmentTracker } from '@/components/orders/shipment-tracker';
import { Link } from '@/i18n/navigation';
import { serverApi } from '@/lib/api';
import { formatters } from '@/lib/format';

async function SupplierOrderCard({ so, locale }: { so: SupplierOrderDto; locale: string }) {
  const t = await getTranslations('account.orders.detail');
  const f = formatters(locale);
  const steps = so.progress.steps;
  // The last step (delivered) is terminal: once reached, every step renders as completed.
  const step = so.progress.step >= steps.length - 1 ? steps.length : so.progress.step;
  const live = so.shipments.find((s) => s.trackable);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="size-11 overflow-hidden rounded-xl bg-gray-100">{so.supplier.logoUrl && <img src={so.supplier.logoUrl} alt="" className="size-full object-cover" />}</span>
          <div>
            <p className="font-extrabold text-gray-900">{so.supplier.name}</p>
            <p className="num text-xs text-gray-500">
              {so.number}
              {so.deliveryDate && ` · ${f.date(so.deliveryDate)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="SupplierOrderStatus" value={so.status} />
          <RateSupplier so={so} />
        </div>
      </div>

      {steps.length > 1 && (
        <ol className="flex items-start px-5 pt-6">
          {steps.map((st, i) => {
            const done = i < step;
            const cur = i === step;
            return (
              <li key={st} className="relative flex flex-1 flex-col items-center text-center">
                {i > 0 && <span className={cn('absolute top-4 h-0.5 w-full -translate-y-1/2 ltr:right-1/2 rtl:left-1/2', i <= step ? 'bg-brand-600' : 'bg-gray-200')} />}
                <span className={cn('relative z-10 grid size-8 place-items-center rounded-full border-2 bg-white', done && 'border-brand-600 bg-brand-600 text-white', cur && 'border-brand-600 text-brand-700 ring-4 ring-brand-100', !done && !cur && 'border-gray-200 text-gray-300')}>
                  {done ? <Check className="size-4" strokeWidth={3} /> : <span className="size-2 rounded-full bg-current" />}
                </span>
                <span className={cn('mt-2 px-1 text-[0.6875rem] font-semibold sm:text-xs', cur ? 'text-gray-900' : done ? 'text-brand-800' : 'text-gray-400')}>{t.has(`progressSteps.${st}` as never) ? t(`progressSteps.${st}` as never) : st}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-4 p-5">
        {live && <ShipmentTracker shipmentId={live.id} />}
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100">
          {so.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-3">
              <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">{i.image && <img src={i.image} alt="" className="size-full object-cover" />}</span>
              <div className="min-w-0 flex-1">
                {i.productSlug ? (
                  <Link href={`/product/${i.productSlug}`} className="line-clamp-1 text-sm font-bold text-gray-900 hover:text-brand-800">
                    {i.name}
                  </Link>
                ) : (
                  <p className="line-clamp-1 text-sm font-bold text-gray-900">{i.name}</p>
                )}
                <p className="num text-xs text-gray-500">
                  {f.qty(i.qty)} × {i.unitName} · {f.money(i.unitPrice)}
                  {Number(i.deliveredQty) > 0 && Number(i.deliveredQty) !== Number(i.qty) && ` · ${t('delivered')} ${f.qty(i.deliveredQty)}`}
                </p>
              </div>
              <p className="num text-sm font-extrabold text-navy-900">{f.money(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="num text-sm text-gray-500">
            {t('summary')}: <span className="font-extrabold text-navy-900">{f.money(so.total)}</span>
          </p>
          {so.invoice && (
            <div className="flex items-center gap-2">
              <span className="num text-xs text-gray-500">{so.invoice.number}</span>
              <StatusBadge kind="InvoiceStatus" value={so.invoice.status} size="sm" />
              <InvoiceButton invoiceId={so.invoice.id} label={t('downloadPdf')} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default async function OrderDetailPage({ params }: PageProps<'/[locale]/account/orders/[id]'>) {
  const { locale, id } = await params;
  const api = await serverApi(locale);
  const order = await api.get<OrderDetailDto>(`/buyer/orders/${id}`, { cache: 'no-store' }).catch(() => null);
  if (!order) notFound();
  const [t, te, settings] = await Promise.all([getTranslations('account.orders.detail'), getTranslations('enums'), api.get<PublicSettingsDto>('/public/settings')]);
  const tCart = await getTranslations('cart');
  const f = formatters(locale);
  const pending = order.paymentStatus !== 'PAID' && order.status === 'PENDING_PAYMENT';
  const bankAccounts = settings.bankAccounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="num text-2xl font-black text-navy-900 sm:text-3xl">{order.number}</h1>
            <StatusBadge kind="OrderStatus" value={order.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">{t('placedAt', { date: f.dateTime(order.placedAt ?? order.createdAt) })}</p>
        </div>
        <div className="flex gap-2">
          <OrderHeaderActions order={order} />
        </div>
      </div>

      {pending && (order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'CARD') && <PaymentPanel order={order} bankAccounts={bankAccounts} />}

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {order.supplierOrders.map((so) => (
            <SupplierOrderCard key={so.id} so={so} locale={locale} />
          ))}
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader title={t('address')} action={<MapPin className="size-5 text-gray-300" />} />
            <div className="p-5 text-sm leading-7 text-gray-700">
              <p className="font-bold text-gray-900">{order.address.label}</p>
              <p>{order.address.formatted}</p>
              <p className="num text-gray-500" dir="ltr">
                {order.address.recipientName} · {order.address.recipientPhone.replace('+966', '0')}
              </p>
            </div>
          </Card>
          <Card>
            <CardHeader title={t('summary')} action={<Receipt className="size-5 text-gray-300" />} />
            <dl className="space-y-2.5 p-5 text-sm">
              {(
                [
                  ['subtotal', order.subtotal],
                  ['discount', order.discountTotal],
                  ['delivery', order.deliveryTotal],
                  ['vat', order.vatTotal],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-gray-500">{tCart(k)}</dt>
                  <dd className="num font-semibold">{f.money(v)}</dd>
                </div>
              ))}
              <div className="rule-dashed !my-4" />
              <div className="flex justify-between text-base">
                <dt className="font-extrabold">{tCart('grandTotal')}</dt>
                <dd className="num font-black text-navy-900">{f.money(order.grandTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('payment')}</dt>
                <dd className="font-semibold">{te(`PaymentMethod.${order.paymentMethod}` as never)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">{t('paid')}</dt>
                <dd className="num font-semibold">{f.money(order.amountPaid)}</dd>
              </div>
            </dl>
          </Card>
          {order.documents.length > 0 && (
            <Card>
              <CardHeader title={t('documents')} action={<FileText className="size-5 text-gray-300" />} />
              <ul className="divide-y divide-gray-100">
                {order.documents.map((d) => (
                  <li key={d.id}>
                    <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50">
                      <span className="font-semibold text-gray-800">{d.title}</span>
                      <span className="num text-xs text-gray-400">{d.number}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader title={t('timeline')} action={<Package className="size-5 text-gray-300" />} />
            <ol className="relative space-y-5 p-5 before:absolute before:inset-y-6 before:start-[1.6rem] before:w-px before:bg-gray-200">
              {[...order.timeline].reverse().map((e, i) => (
                <li key={e.id} className="relative flex gap-3 ps-0">
                  <span className={cn('relative z-10 mt-1 size-3 shrink-0 rounded-full ring-4 ring-white', i === 0 ? 'bg-brand-600' : 'bg-gray-300')} />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{e.title}</p>
                    {e.note && <p className="text-xs text-gray-500">{e.note}</p>}
                    <p className="num text-xs text-gray-400">{f.dateTime(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}
