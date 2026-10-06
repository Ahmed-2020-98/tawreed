'use client';

import { ApiError } from '@tawreed/api-client';
import type { CategoryDto, CityDto } from '@tawreed/contracts';
import { Button, Checkbox, Field, Input, NativeSelect, Textarea } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toastError, useApi } from '@/lib/hooks/use-api';

function useCities() {
  const api = useApi();
  return useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity }).data ?? [];
}

function Done({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <CheckCircle2 className="size-14 text-brand-600" />
      <p className="text-lg font-bold text-gray-900">{text}</p>
    </div>
  );
}

export function SupplierApplicationForm() {
  const t = useTranslations('pages.sell');
  const api = useApi();
  const cities = useCities();
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: () => api.get<CategoryDto[]>('/public/categories'), staleTime: 300_000 });
  const [f, setF] = useState({ companyName: '', contactName: '', phone: '', email: '', cityId: '', crNumber: '', message: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  if (done) return <Done text={t('sent')} />;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
          await api.post('/public/supplier-applications', { ...f, email: f.email || undefined, cityId: f.cityId || undefined, crNumber: f.crNumber || undefined, message: f.message || undefined, categories });
          setDone(true);
        } catch (err) {
          if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
          else toastError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label={t('companyName')} htmlFor="s-c" required error={errors.companyName}>
        <Input id="s-c" value={f.companyName} onChange={set('companyName')} required />
      </Field>
      <Field label={t('contactName')} htmlFor="s-n" required error={errors.contactName}>
        <Input id="s-n" value={f.contactName} onChange={set('contactName')} required />
      </Field>
      <Field label={t('phone')} htmlFor="s-p" required error={errors.phone}>
        <Input id="s-p" dir="ltr" inputMode="tel" className="num" placeholder="05XXXXXXXX" value={f.phone} onChange={set('phone')} required />
      </Field>
      <Field label={t('email')} htmlFor="s-e" error={errors.email}>
        <Input id="s-e" type="email" dir="ltr" value={f.email} onChange={set('email')} />
      </Field>
      <Field label={t('city')} htmlFor="s-ci">
        <NativeSelect id="s-ci" value={f.cityId} onChange={set('cityId')}>
          <option value="">—</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t('cr')} htmlFor="s-cr" error={errors.crNumber}>
        <Input id="s-cr" dir="ltr" inputMode="numeric" maxLength={10} className="num" value={f.crNumber} onChange={set('crNumber')} />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-semibold text-gray-800">{t('categories')}</legend>
        <div className="flex flex-wrap gap-2">
          {cats.filter((c) => !c.parentId).map((c) => (
            <label key={c.slug} className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm has-[button[data-state=checked]]:border-brand-500 has-[button[data-state=checked]]:bg-brand-50">
              <Checkbox checked={categories.includes(c.slug)} onCheckedChange={(on) => setCategories((s) => (on ? [...s, c.slug] : s.filter((x) => x !== c.slug)))} />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t('message')} htmlFor="s-m" className="sm:col-span-2">
        <Textarea id="s-m" rows={4} value={f.message} onChange={set('message')} />
      </Field>
      <Button type="submit" size="lg" className="sm:col-span-2" loading={busy}>
        {t('submit')}
      </Button>
    </form>
  );
}

export function ContactForm() {
  const t = useTranslations('pages.contact');
  const api = useApi();
  const [f, setF] = useState({ type: 'BUYER', name: '', companyName: '', phone: '', email: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  if (done) return <Done text={t('sent')} />;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
          await api.post('/public/leads', { ...f, companyName: f.companyName || undefined, email: f.email || undefined, message: f.message || undefined, source: 'website-contact' });
          setDone(true);
        } catch (err) {
          if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
          else toastError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label={t('type')} htmlFor="c-t" className="sm:col-span-2">
        <NativeSelect id="c-t" value={f.type} onChange={set('type')}>
          {(['BUYER', 'SUPPLIER', 'PARTNERSHIP', 'SUPPORT', 'OTHER'] as const).map((k) => (
            <option key={k} value={k}>
              {t(`types.${k}`)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t('name')} htmlFor="c-n" required error={errors.name}>
        <Input id="c-n" value={f.name} onChange={set('name')} required />
      </Field>
      <Field label={t('company')} htmlFor="c-c">
        <Input id="c-c" value={f.companyName} onChange={set('companyName')} />
      </Field>
      <Field label={t('phone')} htmlFor="c-p" required error={errors.phone}>
        <Input id="c-p" dir="ltr" inputMode="tel" className="num" value={f.phone} onChange={set('phone')} required />
      </Field>
      <Field label={t('email')} htmlFor="c-e" error={errors.email}>
        <Input id="c-e" type="email" dir="ltr" value={f.email} onChange={set('email')} />
      </Field>
      <Field label={t('message')} htmlFor="c-m" className="sm:col-span-2">
        <Textarea id="c-m" rows={5} value={f.message} onChange={set('message')} />
      </Field>
      <Button type="submit" size="lg" className="sm:col-span-2" loading={busy}>
        {t('send')}
      </Button>
    </form>
  );
}
