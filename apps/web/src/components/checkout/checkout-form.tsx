'use client';

import type { CheckoutOptionsDto, DeliveryWindow, PaymentMethod, PlaceOrderResult } from '@tawreed/contracts';
import { Button, Card, cn, Dialog, DialogContent, DialogTrigger, RadioCard, RadioGroup, Skeleton, Steps, Textarea } from '@tawreed/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Banknote, Building2, CalendarDays, CreditCard, MapPin, Plus, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { TotalsList } from '@/components/cart/summary';
import { useRouter } from '@/i18n/navigation';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { AddressForm } from './address-form';

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = { CARD: CreditCard, BANK_TRANSFER: Building2, COD: Banknote, CREDIT: Wallet };

export function CheckoutForm() {
  const t = useTranslations('checkout');
  const f = useFormat();
  const locale = useLocale();
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const [pickedAddressId, setAddressId] = useState<string>();
  const { data: o, isLoading } = useQuery({
    queryKey: ['checkout-options', pickedAddressId ?? null],
    queryFn: () => api.get<CheckoutOptionsDto>('/buyer/checkout/options', { query: { addressId: pickedAddressId } }),
    placeholderData: (prev) => prev,
  });
  const [pickedSlots, setSlots] = useState<Record<string, { date: string; window: DeliveryWindow }>>({});
  const [pickedMethod, setMethod] = useState<PaymentMethod>();
  const [notes, setNotes] = useState('');
  const [addrOpen, setAddrOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const idemKey = useMemo(() => crypto.randomUUID(), []);

  if (isLoading || !o) return <Skeleton className="h-[40rem] rounded-2xl" />;

  // Defaults derive from the options (server picks the address; first slot / first available method).
  const addressId = pickedAddressId ?? o.selectedAddressId ?? undefined;
  const slots: Record<string, { date: string; window: DeliveryWindow }> = {};
  for (const d of o.deliverySlots) {
    const cur = pickedSlots[d.supplierId];
    const first = d.slots[0];
    if (cur && d.slots.some((x) => x.date === cur.date)) slots[d.supplierId] = cur;
    else if (first) slots[d.supplierId] = { date: first.date, window: first.windows[0]! };
  }
  const method = pickedMethod && o.paymentMethods.find((m) => m.method === pickedMethod)?.available ? pickedMethod : o.paymentMethods.find((m) => m.available)?.method;

  const selected = o.addresses.find((a) => a.id === addressId);
  const step = !selected ? 0 : !method ? 2 : 3;

  const place = async () => {
    if (!addressId || !method) return;
    setPlacing(true);
    try {
      const r = await api.post<PlaceOrderResult>(
        '/buyer/checkout/place',
        {
          addressId,
          paymentMethod: method,
          deliveries: o.deliverySlots.map((d) => ({ supplierId: d.supplierId, ...slots[d.supplierId]! })),
          notes: notes || undefined,
          expectedTotal: o.cart.totals.grandTotal,
          returnUrl: `${window.location.origin}${locale === 'en' ? '/en' : ''}/checkout/result`,
        },
        { headers: { 'idempotency-key': idemKey } },
      );
      qc.setQueryData(['cart', 'count'], 0);
      void qc.invalidateQueries({ queryKey: ['cart'] });
      if (r.payment.checkoutUrl) window.location.assign(r.payment.checkoutUrl);
      else router.push(`/checkout/success?order=${r.order.id}`);
    } catch (e) {
      toastError(e);
      void qc.invalidateQueries({ queryKey: ['checkout-options'] });
      setPlacing(false);
    }
  };

  const section = (n: number, title: string, icon: React.ReactNode, children: React.ReactNode) => (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-lg font-extrabold text-gray-900">
        <span className="num grid size-8 place-items-center rounded-full bg-navy-900 text-sm text-white">{n}</span>
        {title}
        <span className="ms-auto text-gray-300">{icon}</span>
      </h2>
      {children}
    </Card>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-black text-navy-900">{t('title')}</h1>
          <Steps className="mt-6" current={step} steps={[t('steps.address'), t('steps.schedule'), t('steps.payment'), t('steps.review')]} />
        </div>
        {!o.companyVerified && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {t('unverified')}
          </p>
        )}

        {section(
          1,
          t('address'),
          <MapPin />,
          <>
            <RadioGroup value={addressId} onValueChange={setAddressId} className="sm:grid-cols-2">
              {o.addresses.map((a) => (
                <RadioCard key={a.id} value={a.id}>
                  <span className="flex items-center gap-2 font-bold text-gray-900">
                    {a.label}
                    {a.isDefault && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[0.6875rem] text-gray-600">{t('default')}</span>}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-gray-600">{a.formatted}</span>
                  <span className="num mt-1 block text-xs text-gray-400" dir="ltr">
                    {a.recipientName} · {a.recipientPhone.replace('+966', '0')}
                  </span>
                </RadioCard>
              ))}
            </RadioGroup>
            <Dialog open={addrOpen} onOpenChange={setAddrOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus />
                  {t('addAddress')}
                </Button>
              </DialogTrigger>
              <DialogContent title={t('addAddress')} size="lg">
                <AddressForm
                  onSaved={(a) => {
                    setAddrOpen(false);
                    setAddressId(a.id);
                    void qc.invalidateQueries({ queryKey: ['checkout-options'] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </>,
        )}

        {section(
          2,
          t('schedule'),
          <CalendarDays />,
          <div className="space-y-5">
            {o.deliverySlots.map((d) => {
              const cur = slots[d.supplierId];
              const day = d.slots.find((s) => s.date === cur?.date);
              return (
                <div key={d.supplierId} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                  <p className="mb-3 font-bold text-gray-900">{d.supplierName}</p>
                  <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {d.slots.slice(0, 7).map((s) => {
                      const dt = new Date(`${s.date}T12:00:00`);
                      const on = s.date === cur?.date;
                      return (
                        <button
                          key={s.date}
                          type="button"
                          onClick={() => setSlots((p) => ({ ...p, [d.supplierId]: { date: s.date, window: s.windows.includes(cur?.window as DeliveryWindow) ? (cur!.window) : s.windows[0]! } }))}
                          className={cn('flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 transition', on ? 'border-brand-600 bg-brand-700 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300')}
                        >
                          <span className="text-[0.6875rem] font-semibold opacity-75">{dt.toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-US', { weekday: 'short' })}</span>
                          <span className="num text-lg font-black">{dt.getDate()}</span>
                          <span className="text-[0.625rem] opacity-75">{dt.toLocaleDateString(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-US', { month: 'short' })}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {day?.windows.map((w) => (
                      <button key={w} type="button" onClick={() => setSlots((p) => ({ ...p, [d.supplierId]: { date: cur!.date, window: w } }))} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold transition', cur?.window === w ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300')}>
                        {t(`window.${w}`)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>,
        )}

        {section(
          3,
          t('payment'),
          <CreditCard />,
          <>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              {o.paymentMethods.map((m) => {
                const Icon = METHOD_ICON[m.method];
                return (
                  <RadioCard key={m.method} value={m.method} disabled={!m.available}>
                    <span className="flex items-center justify-between gap-3">
                      <span>
                        <span className="block font-bold text-gray-900">{t(`methods.${m.method}`)}</span>
                        <span className="num mt-0.5 block text-sm text-gray-500">
                          {m.available ? (m.method === 'CREDIT' && m.credit ? t('methodHints.CREDIT', { available: f.money(m.credit.available), days: m.credit.termsDays }) : t(`methodHints.${m.method}`)) : m.reason}
                        </span>
                      </span>
                      <Icon className="size-6 shrink-0 text-gray-400" />
                    </span>
                  </RadioCard>
                );
              })}
            </RadioGroup>
            <label htmlFor="notes" className="mb-1.5 mt-5 block text-sm font-semibold text-gray-800">
              {t('notes')}
            </label>
            <Textarea id="notes" rows={2} placeholder={t('notesPlaceholder')} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </>,
        )}
      </div>

      <aside className="lg:sticky lg:top-44">
        <Card className="p-5">
          <ul className="mb-4 space-y-3">
            {o.cart.groups.map((g) => (
              <li key={g.supplier.id} className="flex items-center gap-3">
                <div className="flex -space-x-3 rtl:space-x-reverse">
                  {g.items.slice(0, 3).map((i) => (
                    <span key={i.id} className="size-10 overflow-hidden rounded-lg bg-gray-100 ring-2 ring-white">
                      {i.product.image && <img src={i.product.image.thumbUrl ?? i.product.image.url} alt="" className="size-full object-cover" />}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{g.supplier.name}</p>
                  <p className="num text-xs text-gray-500">{f.money(g.total)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="rule-dashed mb-4" />
          <TotalsList totals={o.cart.totals} />
          <Button size="lg" block className="mt-5" loading={placing} disabled={!selected || !method || !o.cart.canCheckout} onClick={() => void place()}>
            {t('place')}
          </Button>
          <p className="mt-3 text-center text-xs text-gray-400">{t('agree')}</p>
        </Card>
      </aside>
    </div>
  );
}
