'use client';

import type { CityDto, CompanyDto, KybOverviewDto } from '@tawreed/contracts';
import { BusinessType, KybDocType } from '@tawreed/contracts';
import { Button, Card, CardHeader, Field, Input, NativeSelect, toast } from '@tawreed/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck2, FileUp, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { PageHeader } from '../account/page-header';
import { StatusBadge } from '../account/status-badge';

export function CompanyView() {
  const t = useTranslations('account.company');
  const te = useTranslations('enums');
  const tc = useTranslations('common');
  const f = useFormat();
  const api = useApi();
  const qc = useQueryClient();
  const { data: company } = useQuery({ queryKey: ['company'], queryFn: () => api.get<CompanyDto>('/buyer/company') });
  const { data: kyb } = useQuery({ queryKey: ['kyb'], queryFn: () => api.get<KybOverviewDto>('/buyer/kyb') });
  const [busy, setBusy] = useState<string>();
  const [docType, setDocType] = useState<string>('CR');
  const [file, setFile] = useState<File | null>(null);
  const upload = async () => {
    if (!file) return;
    setBusy('upload');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', 'KYB_DOCUMENT');
      const up = await api.post<{ id: string }>('/files', fd);
      await api.post('/buyer/kyb/documents', { type: docType, fileId: up.id });
      setFile(null);
      void qc.invalidateQueries({ queryKey: ['kyb'] });
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <>
      <PageHeader title={t('title')} actions={company && <StatusBadge kind="VerificationStatus" value={company.verificationStatus} />} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {company ? <ProfileCard key={company.id} company={company} /> : <Card className="h-96 animate-pulse" />}
        <Card>
          <CardHeader title={t('kyb')} description={t('kybHint')} />
          <div className="space-y-4 p-5">
            {kyb?.missingTypes.length ? (
              <div className="flex flex-wrap gap-2">
                {kyb.missingTypes.map((m) => (
                  <span key={m} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {te(`KybDocType.${m}` as never)}
                  </span>
                ))}
              </div>
            ) : null}
            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100">
              {kyb?.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3">
                  <FileCheck2 className="size-5 text-brand-600" />
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{te(`KybDocType.${d.type}` as never)}</p>
                    <p className="num truncate text-xs text-gray-400">
                      {d.fileName} · {f.date(d.createdAt)}
                    </p>
                  </a>
                  <StatusBadge kind="DocReviewStatus" value={d.status} size="sm" />
                  {d.status !== 'ACCEPTED' && (
                    <button type="button" aria-label="delete" onClick={() => void api.delete(`/buyer/kyb/documents/${d.id}`).then(() => qc.invalidateQueries({ queryKey: ['kyb'] }))} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label={t('docType')} htmlFor="dt">
                <NativeSelect id="dt" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {KybDocType.map((k) => (
                    <option key={k} value={k}>
                      {te(`KybDocType.${k}` as never)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label={t('file')} htmlFor="kf">
                <label htmlFor="kf" className="flex h-11 cursor-pointer items-center gap-2 truncate rounded-lg border border-dashed border-gray-300 bg-white px-3 text-sm text-gray-600">
                  <FileUp className="size-4 shrink-0" />
                  <span className="truncate">{file?.name ?? t('upload')}</span>
                </label>
                <input id="kf" type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </Field>
              <Button disabled={!file} loading={busy === 'upload'} onClick={() => void upload()}>
                {t('upload')}
              </Button>
            </div>
            {kyb?.canSubmit && (
              <Button block variant="secondary" onClick={() => void api.post('/buyer/kyb/submit').then(() => { toast.success(t('saved')); void qc.invalidateQueries({ queryKey: ['kyb'] }); }).catch(toastError)}>
                {tc('confirm')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function ProfileCard({ company }: { company: CompanyDto }) {
  const t = useTranslations('account.company');
  const ta = useTranslations('auth');
  const te = useTranslations('enums');
  const tc = useTranslations('common');
  const api = useApi();
  const qc = useQueryClient();
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity });
  const [form, setForm] = useState<Partial<CompanyDto> & { cityId?: string }>(() => ({ ...company, cityId: company.city?.id }));
  const [busy, setBusy] = useState<string>();
  const save = async () => {
    setBusy('save');
    try {
      await api.patch('/buyer/company', { name: form.name, legalName: form.legalName || undefined, businessType: form.businessType, crNumber: form.crNumber || null, vatNumber: form.vatNumber || null, cityId: form.cityId, email: form.email || null });
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['company'] });
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(undefined);
    }
  };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Card>
      <CardHeader title={t('profile')} />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label={ta('companyName')} htmlFor="cn">
          <Input id="cn" value={form.name ?? ''} onChange={set('name')} />
        </Field>
        <Field label={ta('legalName')} htmlFor="ln">
          <Input id="ln" value={form.legalName ?? ''} onChange={set('legalName')} />
        </Field>
        <Field label={ta('businessType')} htmlFor="bt">
          <NativeSelect id="bt" value={form.businessType ?? ''} onChange={set('businessType')}>
            {BusinessType.map((b) => (
              <option key={b} value={b}>
                {te(`BusinessType.${b}` as never)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={ta('city')} htmlFor="ct">
          <NativeSelect id="ct" value={form.cityId ?? ''} onChange={set('cityId')}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={ta('cr')} htmlFor="cr">
          <Input id="cr" dir="ltr" className="num" value={form.crNumber ?? ''} onChange={set('crNumber')} />
        </Field>
        <Field label={ta('vat')} htmlFor="vat">
          <Input id="vat" dir="ltr" className="num" value={form.vatNumber ?? ''} onChange={set('vatNumber')} />
        </Field>
        <Field label={ta('email')} htmlFor="em" className="sm:col-span-2">
          <Input id="em" dir="ltr" type="email" value={form.email ?? ''} onChange={set('email')} />
        </Field>
        <Button className="sm:col-span-2" loading={busy === 'save'} onClick={() => void save()}>
          {tc('save')}
        </Button>
      </div>
    </Card>
  );
}
