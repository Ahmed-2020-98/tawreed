'use client';

import { ApiError } from '@tawreed/api-client';
import type { AddressDto, CityDto } from '@tawreed/contracts';
import { Button, Checkbox, Field, Input, NativeSelect, Textarea } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toastError, useApi } from '@/lib/hooks/use-api';

const MapPicker = dynamic(() => import('../map/map-picker').then((m) => m.MapPicker), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-gray-100" /> });

export function AddressForm({ initial, onSaved }: { initial?: AddressDto; onSaved: (a: AddressDto) => void }) {
  const t = useTranslations('checkout.address_form');
  const api = useApi();
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity });
  const [f, setF] = useState({
    label: initial?.label ?? '',
    recipientName: initial?.recipientName ?? '',
    recipientPhone: initial?.recipientPhone?.replace('+966', '0') ?? '',
    cityId: initial?.city.id ?? '',
    district: initial?.district ?? '',
    street: initial?.street ?? '',
    buildingNumber: initial?.buildingNumber ?? '',
    postalCode: initial?.postalCode ?? '',
    shortAddress: initial?.shortAddress ?? '',
    notes: initial?.notes ?? '',
    lat: initial?.lat ?? 24.7136,
    lng: initial?.lng ?? 46.6753,
    isDefault: initial?.isDefault ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const body = { ...f, street: f.street || undefined, buildingNumber: f.buildingNumber || undefined, postalCode: f.postalCode || undefined, shortAddress: f.shortAddress || undefined, notes: f.notes || undefined };
      const saved = initial ? await api.put<AddressDto>(`/buyer/addresses/${initial.id}`, body) : await api.post<AddressDto>('/buyer/addresses', body);
      onSaved(saved);
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label={t('pin')} hint={t('pinHint')}>
        <MapPicker lat={f.lat} lng={f.lng} onChange={(p) => setF((s) => ({ ...s, ...p }))} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('label')} htmlFor="a-label" required error={errors.label}>
          <Input id="a-label" placeholder={t('labelPlaceholder')} value={f.label} onChange={set('label')} required />
        </Field>
        <Field label={t('city')} htmlFor="a-city" required error={errors.cityId}>
          <NativeSelect
            id="a-city"
            value={f.cityId}
            required
            onChange={(e) => {
              const c = cities.find((x) => x.id === e.target.value);
              setF((s) => ({ ...s, cityId: e.target.value, ...(c ? { lat: c.lat, lng: c.lng } : {}) }));
            }}
          >
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
        <Field label={t('recipient')} htmlFor="a-rec" required error={errors.recipientName}>
          <Input id="a-rec" value={f.recipientName} onChange={set('recipientName')} required />
        </Field>
        <Field label={t('phone')} htmlFor="a-phone" required error={errors.recipientPhone}>
          <Input id="a-phone" dir="ltr" inputMode="tel" className="num" value={f.recipientPhone} onChange={set('recipientPhone')} required />
        </Field>
        <Field label={t('district')} htmlFor="a-dist" required error={errors.district}>
          <Input id="a-dist" value={f.district} onChange={set('district')} required />
        </Field>
        <Field label={t('street')} htmlFor="a-street">
          <Input id="a-street" value={f.street} onChange={set('street')} />
        </Field>
        <Field label={t('building')} htmlFor="a-b">
          <Input id="a-b" dir="ltr" className="num" value={f.buildingNumber} onChange={set('buildingNumber')} />
        </Field>
        <Field label={t('short')} htmlFor="a-short">
          <Input id="a-short" dir="ltr" className="num uppercase" maxLength={12} value={f.shortAddress} onChange={set('shortAddress')} />
        </Field>
      </div>
      <Field label={t('notes')} htmlFor="a-notes">
        <Textarea id="a-notes" rows={2} value={f.notes} onChange={set('notes')} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
        <Checkbox checked={f.isDefault} onCheckedChange={(c) => setF((s) => ({ ...s, isDefault: c === true }))} />
        {t('setDefault')}
      </label>
      <Button type="submit" block loading={busy}>
        {t('save')}
      </Button>
    </form>
  );
}
