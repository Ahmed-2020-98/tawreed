'use client';

import type { MeResponse, SessionDto } from '@tawreed/contracts';
import { Button, Card, CardHeader, Field, Input, Select, toast } from '@tawreed/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { PageHeader } from '../account/page-header';

export function SettingsView() {
  const t = useTranslations('account.settings');
  const f = useFormat();
  const api = useApi();
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get<MeResponse>('/auth/me') });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<SessionDto[]>('/auth/sessions') });
  return (
    <>
      <PageHeader title={t('title')} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {me ? <ProfileForm key={me.user.id} me={me} /> : <Card className="h-80 animate-pulse" />}
        <Card>
          <CardHeader title={t('sessions')} />
          <ul className="divide-y divide-gray-100">
            {sessions.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                {s.app.includes('APP') ? <Smartphone className="size-5 text-gray-400" /> : <Laptop className="size-5 text-gray-400" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{s.deviceName ?? s.userAgent?.slice(0, 40) ?? s.app}</p>
                  <p className="num text-xs text-gray-400">
                    {s.ip} · {f.relative(s.lastUsedAt)}
                  </p>
                </div>
                {i === 0 ? (
                  <span className="text-xs font-bold text-brand-700">{t('current')}</span>
                ) : (
                  <Button size="xs" variant="ghost" className="text-red-600" onClick={() => void api.delete(`/auth/sessions/${s.id}`).then(() => qc.invalidateQueries({ queryKey: ['sessions'] }))}>
                    {t('revoke')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function ProfileForm({ me }: { me: MeResponse }) {
  const t = useTranslations('account.settings');
  const tc = useTranslations('common');
  const api = useApi();
  const qc = useQueryClient();
  const [form, setForm] = useState<{ name: string; email: string; locale: string }>({ name: me.user.name, email: me.user.email ?? '', locale: me.user.locale });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/auth/me', { name: form.name, email: form.email || null, locale: form.locale });
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader title={t('profile')} />
      <div className="space-y-4 p-5">
        <Field label={t('name')} htmlFor="sn">
          <Input id="sn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={t('email')} htmlFor="se">
          <Input id="se" type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={t('language')}>
          <Select aria-label={t('language')} value={form.locale} onValueChange={(v) => setForm({ ...form, locale: v })} options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} />
        </Field>
        <Button loading={busy} onClick={() => void save()}>
          {tc('save')}
        </Button>
      </div>
    </Card>
  );
}
