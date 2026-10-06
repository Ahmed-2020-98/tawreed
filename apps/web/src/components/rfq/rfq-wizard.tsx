'use client';

import type { CityDto, ProductDetailDto, RfqDetailDto, SearchSuggestionsDto } from '@tawreed/contracts';
import { Button, Card, Field, Input, NativeSelect, Steps, Textarea, toast } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { Package, Plus, Search, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { toastError, useApi } from '@/lib/hooks/use-api';

interface Item {
  key: string;
  productId?: string;
  productUnitId?: string;
  name: string;
  image?: string | null;
  qty: string;
  unitLabelAr: string;
  unitLabelEn: string;
  units?: { id: string; name: string }[];
  targetUnitPrice?: string;
}

export type RfqWizardItem = Item;

export function RfqWizard({ initialItems = [] }: { initialItems?: Item[] }) {
  const t = useTranslations('account.rfqNew');
  const tc = useTranslations('common');
  const te = useTranslations('enums.PaymentMethod');
  const locale = useLocale();
  const api = useApi();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(initialItems[0]?.name ?? '');
  const [items, setItems] = useState<Item[]>(initialItems);
  const [q, setQ] = useState('');
  const [d, setD] = useState({ cityId: '', neededBy: '', paymentPreference: 'ANY', expiresInDays: '7', notes: '' });
  const [busy, setBusy] = useState(false);
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity });
  const { data: sugg } = useQuery({ queryKey: ['suggest', q], queryFn: () => api.get<SearchSuggestionsDto>('/public/search/suggest', { query: { q } }), enabled: q.trim().length >= 2 });

  const addProduct = async (slug: string, unitId?: string | null, qty?: string | null) => {
    const p = await api.get<ProductDetailDto>(`/public/products/${slug}`);
    const unit = p.units.find((u) => u.id === unitId) ?? p.units.find((u) => u.isDefault) ?? p.units[0];
    setItems((s) => [...s, { key: crypto.randomUUID(), productId: p.id, productUnitId: unit?.id, name: p.name, image: p.image?.thumbUrl, qty: qty ?? '1', unitLabelAr: unit?.name ?? 'وحدة', unitLabelEn: unit?.name ?? 'Unit', units: p.units.map((u) => ({ id: u.id, name: u.name })) }]);
    setTitle((cur) => cur || p.name);
    setQ('');
  };

  const update = (key: string, patch: Partial<Item>) => setItems((s) => s.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<RfqDetailDto>('/buyer/rfqs', {
        title,
        cityId: d.cityId,
        neededBy: d.neededBy || undefined,
        paymentPreference: d.paymentPreference,
        notes: d.notes || undefined,
        visibility: 'OPEN',
        supplierIds: [],
        attachmentFileIds: [],
        expiresInDays: Number(d.expiresInDays),
        items: items.map((i) => ({ productId: i.productId, productUnitId: i.productUnitId, name: i.name, qty: i.qty, unitLabelAr: i.unitLabelAr, unitLabelEn: i.unitLabelEn, targetUnitPrice: i.targetUnitPrice || undefined })),
      });
      toast.success(t('submitted'));
      router.push(`/account/rfqs/${r.id}`);
    } catch (e) {
      toastError(e);
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 0 && !items.length) {
      toast.error(t('needItems'));
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-black text-navy-900">{t('title')}</h1>
      <p className="mt-2 text-gray-600">{t('subtitle')}</p>
      <Steps className="my-8" current={step} steps={[t('steps.items'), t('steps.details'), t('steps.review')]} />

      <Card className="p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-5">
            <Field label={t('rfqTitle')} htmlFor="title" required>
              <Input id="title" placeholder={t('rfqTitlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <div className="relative">
              <Input start={<Search />} placeholder={t('searchProduct')} aria-label={t('searchProduct')} value={q} onChange={(e) => setQ(e.target.value)} />
              {q.trim().length >= 2 && (
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                  {sugg?.products.map((p) => (
                    <button key={p.slug} type="button" onClick={() => void addProduct(p.slug)} className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-gray-50">
                      <span className="size-10 overflow-hidden rounded-lg bg-gray-100">{p.imageUrl && <img src={p.imageUrl} alt="" className="size-full object-cover" />}</span>
                      <span className="text-sm font-semibold text-gray-800">{p.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setItems((s) => [...s, { key: crypto.randomUUID(), name: q.trim(), qty: '1', unitLabelAr: 'وحدة', unitLabelEn: 'Unit' }]);
                      setQ('');
                    }}
                    className="flex w-full items-center gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2.5 text-sm font-bold text-brand-800 hover:bg-brand-50"
                  >
                    <Plus className="size-4" />
                    {t('addFreeText', { q: q.trim() })}
                  </button>
                </div>
              )}
            </div>
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.key} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gray-100 text-gray-400">{i.image ? <img src={i.image} alt="" className="size-full object-cover" /> : <Package className="size-5" />}</span>
                    <Input className="flex-1" value={i.name} onChange={(e) => update(i.key, { name: e.target.value })} aria-label={t('steps.items')} />
                    <button type="button" aria-label={t('remove')} onClick={() => setItems((s) => s.filter((x) => x.key !== i.key))} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <Field label={t('qty')} htmlFor={`q-${i.key}`}>
                      <Input id={`q-${i.key}`} dir="ltr" inputMode="decimal" className="num" value={i.qty} onChange={(e) => update(i.key, { qty: e.target.value.replace(/[^\d.]/g, '') })} />
                    </Field>
                    <Field label={t('unit')} htmlFor={`u-${i.key}`}>
                      {i.units ? (
                        <NativeSelect id={`u-${i.key}`} value={i.productUnitId} onChange={(e) => { const u = i.units!.find((x) => x.id === e.target.value)!; update(i.key, { productUnitId: u.id, unitLabelAr: u.name, unitLabelEn: u.name }); }}>
                          {i.units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </NativeSelect>
                      ) : (
                        <Input id={`u-${i.key}`} value={locale === 'en' ? i.unitLabelEn : i.unitLabelAr} onChange={(e) => update(i.key, { unitLabelAr: e.target.value, unitLabelEn: e.target.value })} />
                      )}
                    </Field>
                    <Field label={t('target')} htmlFor={`t-${i.key}`}>
                      <Input id={`t-${i.key}`} dir="ltr" inputMode="decimal" className="num" value={i.targetUnitPrice ?? ''} onChange={(e) => update(i.key, { targetUnitPrice: e.target.value.replace(/[^\d.]/g, '') })} />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('city')} htmlFor="city" required>
              <NativeSelect id="city" value={d.cityId} onChange={(e) => setD({ ...d, cityId: e.target.value })}>
                <option value="" disabled>
                  —
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={t('neededBy')} htmlFor="nb">
              <Input id="nb" type="date" value={d.neededBy} onChange={(e) => setD({ ...d, neededBy: e.target.value })} />
            </Field>
            <Field label={t('payment')} htmlFor="pp">
              <NativeSelect id="pp" value={d.paymentPreference} onChange={(e) => setD({ ...d, paymentPreference: e.target.value })}>
                <option value="ANY">{t('paymentAny')}</option>
                {(['CREDIT', 'BANK_TRANSFER', 'CARD', 'COD'] as const).map((m) => (
                  <option key={m} value={m}>
                    {te(m)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={t('expires')} htmlFor="ex">
              <NativeSelect id="ex" value={d.expiresInDays} onChange={(e) => setD({ ...d, expiresInDays: e.target.value })}>
                {[3, 5, 7, 10, 14].map((n) => (
                  <option key={n} value={n}>
                    {t('days', { count: n })}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="rounded-2xl bg-brand-50/60 p-4 text-sm sm:col-span-2">
              <p className="font-bold text-brand-900">{t('open')}</p>
              <p className="mt-0.5 text-brand-800/80">{t('openHint')}</p>
            </div>
            <Field label={t('notes')} htmlFor="nt" className="sm:col-span-2">
              <Textarea id="nt" rows={4} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xl font-extrabold text-navy-900">{title}</p>
            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100">
              {items.map((i) => (
                <li key={i.key} className="flex justify-between px-4 py-3 text-sm">
                  <span className="font-semibold text-gray-800">{i.name}</span>
                  <span className="num font-bold text-navy-900">
                    {i.qty} {locale === 'en' ? i.unitLabelEn : i.unitLabelAr}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-gray-600">
              {cities.find((c) => c.id === d.cityId)?.name} {d.neededBy && `· ${d.neededBy}`} · {t('days', { count: Number(d.expiresInDays) })}
            </p>
            {d.notes && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{d.notes}</p>}
          </div>
        )}

        <div className="mt-8 flex justify-between gap-3">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            {tc('back')}
          </Button>
          {step < 2 ? (
            <Button onClick={next} disabled={step === 1 && !d.cityId}>
              {tc('next')}
            </Button>
          ) : (
            <Button loading={busy} disabled={title.trim().length < 3} onClick={() => void submit()}>
              {t('submit')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
