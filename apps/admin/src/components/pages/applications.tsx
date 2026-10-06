'use client';

import { Badge, Button, Dialog, DialogContent, Field, Input } from '@tawreed/ui';
import { Check, Inbox, PhoneCall, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAction } from '@/components/kit/dialogs';
import { TabFilter } from '@/components/kit/filters';
import { DateText, Facts, Ltr, PageHeader, StatusBadge } from '@/components/kit/misc';
import { type Column, DataTable, Pager } from '@/components/kit/table';
import { Link } from '@/i18n/navigation';
import { pickLocale } from '@/lib/format';
import { useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { useList } from '@/lib/hooks/use-list';

type L10n = { ar: string; en: string };

interface ApplicationRow {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string | null;
  city: { name: L10n } | null;
  categories: string[];
  crNumber: string | null;
  vatNumber: string | null;
  message: string | null;
  status: string;
  supplierId: string | null;
  notes: string | null;
  createdAt: string;
}

export function ApplicationsList() {
  const t = useTranslations('applications');
  const te = useTranslations('enums');
  const f = useFormat();
  const api = useApi();
  const { run } = useAction();
  const { rows, meta, isLoading } = useList<ApplicationRow>('/admin/supplier-applications');
  const [open, setOpen] = useState<ApplicationRow | null>(null);
  const [form, setForm] = useState({ commission: '5', slug: '', nameEn: '', notes: '' });
  const columns: Column<ApplicationRow>[] = [
    {
      key: 'company',
      header: t('company'),
      cell: (r) => (
        <div>
          <p className="font-bold text-gray-900">{r.companyName}</p>
          <p className="text-xs text-gray-500">
            {r.contactName} · <Ltr>{r.phone}</Ltr>
          </p>
        </div>
      ),
    },
    { key: 'city', header: t('city'), cell: (r) => (r.city ? pickLocale(r.city.name, f.locale) : '—'), hideBelow: 'md' },
    {
      key: 'cats',
      header: t('categories'),
      hideBelow: 'lg',
      cell: (r) => (
        <div className="flex max-w-64 flex-wrap gap-1">
          {r.categories.map((c) => (
            <Badge key={c} size="sm">
              {c}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: 'status', header: t('status'), cell: (r) => <StatusBadge kind="ApplicationStatus" value={r.status} size="sm" /> },
    { key: 'date', header: t('date'), cell: (r) => <DateText value={r.createdAt} />, hideBelow: 'sm' },
  ];
  const decide = async (decision: 'APPROVE' | 'REJECT' | 'CONTACTED', body: Record<string, unknown> = {}) => {
    const ok = await run(() => api.post(`/admin/supplier-applications/${open!.id}/decision`, { decision, notes: form.notes || undefined, ...body }), t(`decided.${decision}`));
    if (ok) setOpen(null);
  };
  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} back={{ href: '/suppliers', label: t('back') }} />
      <TabFilter param="status" options={[{ value: '', label: t('all') }, ...['NEW', 'CONTACTED', 'APPROVED', 'REJECTED'].map((s) => ({ value: s, label: te(`ApplicationStatus.${s}` as never) }))]} />
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        rowKey={(r) => r.id}
        onRowClick={(r) => {
          setOpen(r);
          setForm({ commission: '5', slug: '', nameEn: '', notes: '' });
        }}
        empty={{ icon: <Inbox />, title: t('empty') }}
      />
      <Pager meta={meta} />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <DialogContent title={open.companyName} description={<StatusBadge kind="ApplicationStatus" value={open.status} size="sm" />} size="lg">
            <div className="space-y-5">
              <Facts
                items={[
                  [t('contact'), open.contactName],
                  [t('phone'), <Ltr key="p">{open.phone}</Ltr>],
                  [t('email'), open.email && <Ltr>{open.email}</Ltr>],
                  [t('city'), open.city && pickLocale(open.city.name, f.locale)],
                  [t('cr'), open.crNumber && <Ltr>{open.crNumber}</Ltr>],
                  [t('vat'), open.vatNumber && <Ltr>{open.vatNumber}</Ltr>],
                ]}
              />
              {open.message && <p className="rounded-lg bg-gray-50 p-4 text-sm leading-7 text-gray-700">{open.message}</p>}
              {open.status === 'APPROVED' && open.supplierId ? (
                <Button asChild size="sm">
                  <Link href={`/suppliers/${open.supplierId}`}>{t('openSupplier')}</Link>
                </Button>
              ) : open.status !== 'REJECTED' ? (
                <div className="space-y-4 rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-bold text-gray-900">{t('approveAs')}</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label={t('commissionPct')}>
                      <Input inputSize="sm" type="number" min={0} max={50} dir="ltr" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />
                    </Field>
                    <Field label={t('slug')} hint={t('slugHint')}>
                      <Input inputSize="sm" dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
                    </Field>
                    <Field label={t('nameEn')}>
                      <Input inputSize="sm" dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
                    </Field>
                  </div>
                  <Field label={t('notes')}>
                    <Input inputSize="sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    {open.status === 'NEW' && (
                      <Button size="sm" variant="outline" onClick={() => decide('CONTACTED')}>
                        <PhoneCall />
                        {t('markContacted')}
                      </Button>
                    )}
                    <Button size="sm" variant="danger-soft" onClick={() => decide('REJECT')}>
                      <X />
                      {t('reject')}
                    </Button>
                    <Button size="sm" onClick={() => decide('APPROVE', { commissionRate: Number(form.commission) / 100, slug: form.slug || undefined, nameEn: form.nameEn || undefined })}>
                      <Check />
                      {t('approve')}
                    </Button>
                  </div>
                </div>
              ) : (
                open.notes && <p className="text-sm text-gray-500">{open.notes}</p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
