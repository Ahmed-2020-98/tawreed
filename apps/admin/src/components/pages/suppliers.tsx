'use client';

import { Avatar, Badge, Button, Dialog, DialogContent, Field, Input, Skeleton, Switch } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { Check, Inbox, MapPin, Pencil, ShieldCheck, Star, Store, Warehouse, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConfirmAction, useAction } from '@/components/kit/dialogs';
import { SearchFilter, SelectFilter, Toolbar } from '@/components/kit/filters';
import { EnumLabel, Facts, Ltr, Money, PageHeader, Section, StatusBadge } from '@/components/kit/misc';
import { type Column, DataTable, Pager } from '@/components/kit/table';
import { useCan } from '@/components/providers';
import { Link } from '@/i18n/navigation';
import { STORE_URL } from '@/lib/config';
import { pickLocale } from '@/lib/format';
import { useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { useList } from '@/lib/hooks/use-list';

type L10n = { ar: string; en: string };
interface SupplierRow {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  logoUrl: string | null;
  city: { name: L10n } | null;
  commissionRate: string;
  minOrderValue: string;
  fleetMode: string;
  status: string;
  verificationStatus: string;
  ratingAvg: string;
  ratingCount: number;
  isFeatured: boolean;
  activeOffers: number;
  deliveredOrders: number;
  gmv: string;
  createdAt: string;
}

const pct = (v: string | number) => `${Math.round(Number(v) * 1000) / 10}%`;

function Stat({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <div className="mt-2 text-xl font-extrabold text-navy-950">{children}</div>
    </div>
  );
}

export function SuppliersList() {
  const t = useTranslations('suppliers');
  const te = useTranslations('enums');
  const f = useFormat();
  const { rows, meta, isLoading } = useList<SupplierRow>('/admin/suppliers');
  const columns: Column<SupplierRow>[] = [
    {
      key: 'name',
      header: t('supplier'),
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.logoUrl ? <img src={r.logoUrl} alt="" className="size-10 rounded-lg border border-gray-100 object-cover" /> : <Avatar name={r.nameAr} size={40} className="rounded-lg" />}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-bold text-gray-900">
              {f.locale === 'en' ? r.nameEn : r.nameAr}
              {r.isFeatured && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
            </p>
            <p className="truncate text-xs text-gray-500">
              {r.city && pickLocale(r.city.name, f.locale)} · <EnumLabel kind="FleetMode" value={r.fleetMode} />
            </p>
          </div>
        </div>
      ),
    },
    { key: 'status', header: t('status'), cell: (r) => <StatusBadge kind="SupplierStatus" value={r.status} size="sm" /> },
    { key: 'kyb', header: t('verification'), cell: (r) => <StatusBadge kind="VerificationStatus" value={r.verificationStatus} size="sm" />, hideBelow: 'lg' },
    { key: 'gmv', header: t('gmv'), cell: (r) => <Money value={r.gmv} />, hideBelow: 'md' },
    { key: 'offers', header: t('offers'), cell: (r) => <span className="num font-semibold">{r.activeOffers}</span>, align: 'center', hideBelow: 'md' },
    {
      key: 'rating',
      header: t('rating'),
      hideBelow: 'sm',
      cell: (r) => (
        <span className="num inline-flex items-center gap-1 font-bold">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          {r.ratingAvg}
          <span className="text-xs font-medium text-gray-400">({r.ratingCount})</span>
        </span>
      ),
    },
    { key: 'commission', header: t('commission'), cell: (r) => <span className="num font-semibold">{pct(r.commissionRate)}</span>, align: 'center', hideBelow: 'xl' },
  ];
  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={meta ? t('subtitle', { count: meta.total }) : undefined}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/applications">
              <Inbox />
              {t('applications')}
            </Link>
          </Button>
        }
      />
      <Toolbar>
        <SearchFilter placeholder={t('searchPlaceholder')} />
        <SelectFilter param="status" allLabel={t('allStatus')} options={['ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'].map((v) => ({ value: v, label: te(`SupplierStatus.${v}` as never) }))} />
        <SelectFilter param="verificationStatus" allLabel={t('allVerification')} options={['VERIFIED', 'UNDER_REVIEW', 'PENDING', 'NEEDS_INFO', 'REJECTED'].map((v) => ({ value: v, label: te(`VerificationStatus.${v}` as never) }))} />
      </Toolbar>
      <DataTable columns={columns} rows={rows} loading={isLoading} rowKey={(r) => r.id} href={(r) => `/suppliers/${r.id}`} empty={{ icon: <Store />, title: t('empty') }} />
      <Pager meta={meta} />
    </>
  );
}

interface SupplierDetail extends SupplierRow {
  legalName: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  crNumber: string | null;
  vatNumber: string | null;
  iban: string | null;
  bankName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  foundedYear: number | null;
  coverage: { id: string; city: { name: L10n }; deliveryFee: string; freeDeliveryThreshold: string | null; leadTimeDays: number }[];
  warehouses: { id: string; name: string; city: { name: L10n } | null }[];
  onboarding: Record<string, boolean>;
}

export function SupplierDetailPage({ id }: { id: string }) {
  const t = useTranslations('suppliers');
  const api = useApi();
  const can = useCan();
  const f = useFormat();
  const { run } = useAction();
  const { data: s, isLoading } = useQuery({ queryKey: ['admin-supplier', id], queryFn: () => api.get<SupplierDetail>(`/admin/suppliers/${id}`) });
  if (isLoading || !s) return <Skeleton className="h-96 rounded-xl" />;
  const update = (body: Record<string, unknown>) => run(() => api.patch(`/admin/suppliers/${s.id}`, body));
  return (
    <>
      <PageHeader
        back={{ href: '/suppliers', label: t('title') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {s.logoUrl && <img src={s.logoUrl} alt="" className="size-10 rounded-lg border border-gray-200 object-cover" />}
            {f.locale === 'en' ? s.nameEn : s.nameAr}
            <StatusBadge kind="SupplierStatus" value={s.status} />
          </span>
        }
        subtitle={
          <>
            {s.city && pickLocale(s.city.name, f.locale)} · <EnumLabel kind="FleetMode" value={s.fleetMode} /> · {t('since', { date: f.date(s.createdAt) })}
          </>
        }
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <a href={`${STORE_URL}/suppliers/${s.slug}`} target="_blank" rel="noreferrer">
                <Store />
                {t('storefront')}
              </a>
            </Button>
            {can('admin.kyb.review') && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/kyb/SUPPLIER/${s.id}`}>
                  <ShieldCheck />
                  {t('documents')}
                </Link>
              </Button>
            )}
            {can('admin.suppliers.manage') &&
              (s.status === 'ACTIVE' ? (
                <ConfirmAction label={t('suspend')} variant="danger-soft" title={t('suspendTitle')} description={t('suspendHint')} onConfirm={() => update({ status: 'SUSPENDED' })} />
              ) : (
                <ConfirmAction label={t('activate')} title={t('activateTitle')} onConfirm={() => update({ status: 'ACTIVE' })} />
              ))}
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('gmv')}>
          <Money value={s.gmv} />
        </Stat>
        <Stat label={t('delivered')}>
          <span className="num">{s.deliveredOrders}</span>
        </Stat>
        <Stat label={t('offers')}>
          <span className="num">{s.activeOffers}</span>
        </Stat>
        <Stat label={t('rating')}>
          <span className="num inline-flex items-center gap-1.5">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            {s.ratingAvg} <span className="text-sm font-medium text-gray-400">({s.ratingCount})</span>
          </span>
        </Stat>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section title={t('profile')}>
            {(s.descriptionAr || s.descriptionEn) && <p className="mb-5 text-sm leading-7 text-gray-600">{f.locale === 'en' ? s.descriptionEn : s.descriptionAr}</p>}
            <Facts
              items={[
                [t('legalName'), s.legalName],
                [t('cr'), s.crNumber && <Ltr>{s.crNumber}</Ltr>],
                [t('vat'), s.vatNumber && <Ltr>{s.vatNumber}</Ltr>],
                [t('founded'), s.foundedYear],
                [t('phone'), s.contactPhone && <Ltr>{s.contactPhone}</Ltr>],
                [t('email'), s.contactEmail && <Ltr>{s.contactEmail}</Ltr>],
                [t('bank'), s.bankName],
                [t('iban'), s.iban && <Ltr>{s.iban}</Ltr>],
              ]}
            />
          </Section>
          <Section title={t('coverage')} bodyClassName="p-0">
            <DataTable
              className="rounded-none border-0 shadow-none"
              dense
              rows={s.coverage}
              rowKey={(c) => c.id}
              columns={[
                {
                  key: 'c',
                  header: t('city'),
                  cell: (c) => (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                      <MapPin className="size-3.5 text-gray-400" />
                      {pickLocale(c.city.name, f.locale)}
                    </span>
                  ),
                },
                { key: 'fee', header: t('deliveryFee'), cell: (c) => <Money value={c.deliveryFee} /> },
                { key: 'free', header: t('freeFrom'), cell: (c) => (c.freeDeliveryThreshold ? <Money value={c.freeDeliveryThreshold} muted /> : '—'), hideBelow: 'sm' },
                { key: 'lead', header: t('leadTime'), cell: (c) => t('days', { count: c.leadTimeDays }) },
              ]}
            />
          </Section>
        </div>
        <div className="space-y-6">
          <CommercialTerms supplier={s} onSave={update} canEdit={can('admin.suppliers.manage')} />
          <Section title={t('onboarding')}>
            <ul className="space-y-2.5">
              {Object.entries(s.onboarding).map(([k, done]) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{t(`onboardingStep.${k}` as never)}</span>
                  {done ? <Check className="size-4 text-brand-600" /> : <X className="size-4 text-gray-300" />}
                </li>
              ))}
            </ul>
          </Section>
          <Section title={t('warehouses')} bodyClassName="divide-y divide-gray-100 p-0">
            {s.warehouses.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <Warehouse className="size-4 text-gray-400" />
                <div>
                  <p className="font-bold text-gray-900">{w.name}</p>
                  {w.city && <p className="text-xs text-gray-500">{pickLocale(w.city.name, f.locale)}</p>}
                </div>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </>
  );
}

function CommercialTerms({ supplier: s, onSave, canEdit }: { supplier: SupplierDetail; onSave: (b: Record<string, unknown>) => Promise<boolean>; canEdit: boolean }) {
  const t = useTranslations('suppliers');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ commission: '', minOrder: '', featured: false });
  return (
    <Section
      title={t('terms')}
      action={
        canEdit && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setForm({ commission: String(Math.round(Number(s.commissionRate) * 1000) / 10), minOrder: String(Number(s.minOrderValue)), featured: s.isFeatured });
              setOpen(true);
            }}
          >
            <Pencil />
            {tc('edit')}
          </Button>
        )
      }
    >
      <Facts
        cols={1}
        items={[
          [t('commission'), <span key="c" className="num">{pct(s.commissionRate)}</span>],
          [t('minOrder'), <Money key="m" value={s.minOrderValue} />],
          [t('featured'), s.isFeatured ? <Badge key="f" tone="amber" size="sm">★ {tc('yes')}</Badge> : tc('no')],
        ]}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t('editTerms')} size="sm">
          <div className="space-y-4">
            <Field label={t('commissionPct')}>
              <Input type="number" min={0} max={50} step={0.5} dir="ltr" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />
            </Field>
            <Field label={t('minOrder')}>
              <Input type="number" min={0} step={50} dir="ltr" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
            </Field>
            <label className="flex items-center justify-between gap-3 text-sm font-semibold text-gray-800">
              {t('featured')}
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (await onSave({ commissionRate: Number(form.commission) / 100, minOrderValue: form.minOrder, isFeatured: form.featured })) setOpen(false);
                }}
              >
                {tc('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
