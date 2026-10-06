'use client';

import { Avatar, Button, cn, Skeleton } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { Ban, Building2, CheckCircle2, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ConfirmAction, useAction } from '@/components/kit/dialogs';
import { SearchFilter, SelectFilter, Toolbar } from '@/components/kit/filters';
import { DateText, EnumLabel, Facts, Ltr, Money, PageHeader, Section, StatusBadge } from '@/components/kit/misc';
import { type Column, DataTable, Pager } from '@/components/kit/table';
import { useCan } from '@/components/providers';
import { READY } from '@/components/shell/nav';
import { Link } from '@/i18n/navigation';
import { useApi } from '@/lib/hooks/use-api';
import { pickLocale } from '@/lib/format';
import { useFormat } from '@/lib/hooks/use-format';
import { useList } from '@/lib/hooks/use-list';

interface BuyerRow {
  id: string;
  name: string;
  legalName: string | null;
  businessType: string;
  crNumber: string | null;
  city: { name: { ar: string; en: string } } | null;
  phone: string | null;
  verificationStatus: string;
  status: string;
  createdAt: string;
  ordersCount: number;
  totalSpend: string;
  credit: { status: string; limit: string; used: string } | null;
}

const VERIFICATION = ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'NEEDS_INFO', 'REJECTED'];

export function CreditBar({ used, limit }: { used: string; limit: string }) {
  const pct = Number(limit) ? Math.min(100, (Number(used) / Number(limit)) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={cn('h-full rounded-full', pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BuyersList() {
  const t = useTranslations('buyers');
  const te = useTranslations('enums');
  const f = useFormat();
  const { rows, meta, isLoading } = useList<BuyerRow>('/admin/buyers');
  const columns: Column<BuyerRow>[] = [
    {
      key: 'name',
      header: t('company'),
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={38} className="rounded-lg bg-brand-50 text-brand-800" />
          <div className="min-w-0">
            <p className="truncate font-bold text-gray-900">{r.name}</p>
            <p className="truncate text-xs text-gray-500">
              <EnumLabel kind="BusinessType" value={r.businessType} />
              {r.city && ` · ${pickLocale(r.city.name, f.locale)}`}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'verification', header: t('verification'), cell: (r) => <StatusBadge kind="VerificationStatus" value={r.verificationStatus} size="sm" /> },
    { key: 'orders', header: t('orders'), cell: (r) => <span className="num font-semibold">{r.ordersCount}</span>, hideBelow: 'md', align: 'center' },
    { key: 'spend', header: t('spend'), cell: (r) => <Money value={r.totalSpend} />, hideBelow: 'md' },
    {
      key: 'credit',
      header: t('credit'),
      hideBelow: 'lg',
      cell: (r) =>
        r.credit && r.credit.status !== 'NO_CREDIT' ? (
          <div className="w-36 space-y-1">
            <div className="num flex justify-between text-xs text-gray-500">
              <span>{f.money(r.credit.used, { symbol: false, decimals: 0 })}</span>
              <span>{f.money(r.credit.limit, { symbol: false, decimals: 0 })}</span>
            </div>
            <CreditBar used={r.credit.used} limit={r.credit.limit} />
          </div>
        ) : (
          <span className="text-xs text-gray-400">{te('CreditStatus.NO_CREDIT')}</span>
        ),
    },
    { key: 'status', header: t('status'), cell: (r) => <StatusBadge kind="MemberStatus" value={r.status} size="sm" />, hideBelow: 'sm' },
    { key: 'created', header: t('joined'), cell: (r) => <DateText value={r.createdAt} />, hideBelow: 'xl' },
  ];
  return (
    <>
      <PageHeader title={t('title')} subtitle={meta ? t('subtitle', { count: meta.total }) : undefined} />
      <Toolbar>
        <SearchFilter placeholder={t('searchPlaceholder')} />
        <SelectFilter param="verificationStatus" allLabel={t('allVerification')} options={VERIFICATION.map((v) => ({ value: v, label: te(`VerificationStatus.${v}` as never) }))} />
        <SelectFilter param="status" allLabel={t('allStatus')} options={['ACTIVE', 'SUSPENDED'].map((v) => ({ value: v, label: te(`MemberStatus.${v}` as never) }))} />
      </Toolbar>
      <DataTable columns={columns} rows={rows} loading={isLoading} rowKey={(r) => r.id} href={(r) => `/buyers/${r.id}`} empty={{ icon: <Building2 />, title: t('empty') }} />
      <Pager meta={meta} />
    </>
  );
}

interface BuyerDetail {
  company: BuyerRow & { email: string | null; vatNumber: string | null; branchesCount: number | null; monthlyVolume: string | null };
  accountManager: { id: string; name: string } | null;
  members: { id: string; userId: string; name: string; phone: string | null; email: string | null; role: string; status: string; lastLoginAt: string | null }[];
  addresses: { id: string; label: string; formatted: string; recipientName: string; recipientPhone: string; isDefault: boolean }[];
  credit: { status: string; limit: string; used: string; available: string; termsDays: number; riskLevel: string } | null;
  stats: { ordersCount: number; totalSpend: string; openInvoices: number; outstanding: string };
  recentOrders: { id: string; number: string; status: string; paymentMethod: string; grandTotal: string; createdAt: string }[];
}

export function BuyerDetailPage({ id }: { id: string }) {
  const t = useTranslations('buyers');
  const api = useApi();
  const can = useCan();
  const f = useFormat();
  const { run } = useAction();
  const { data, isLoading } = useQuery({ queryKey: ['admin-buyer', id], queryFn: () => api.get<BuyerDetail>(`/admin/buyers/${id}`) });
  if (isLoading || !data) return <Skeleton className="h-96 rounded-xl" />;
  const c = data.company;
  const suspended = c.status === 'SUSPENDED';
  return (
    <>
      <PageHeader
        back={{ href: '/buyers', label: t('title') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.name}
            <StatusBadge kind="VerificationStatus" value={c.verificationStatus} />
            {suspended && <StatusBadge kind="MemberStatus" value="SUSPENDED" />}
          </span>
        }
        subtitle={
          <>
            <EnumLabel kind="BusinessType" value={c.businessType} />
            {c.city && ` · ${pickLocale(c.city.name, f.locale)}`} · {t('joinedOn', { date: f.date(c.createdAt) })}
          </>
        }
        actions={
          <>
            {can('admin.kyb.review') && c.verificationStatus !== 'VERIFIED' && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/kyb/BUYER/${c.id}`}>
                  <ShieldCheck />
                  {t('reviewKyb')}
                </Link>
              </Button>
            )}
            {can('admin.credit.manage') && READY.has('/credit') && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/credit/${c.id}`}>
                  <Wallet />
                  {t('manageCredit')}
                </Link>
              </Button>
            )}
            {can('admin.buyers.manage') && (
              <ConfirmAction
                label={suspended ? t('activate') : t('suspend')}
                icon={suspended ? <CheckCircle2 /> : <Ban />}
                variant={suspended ? 'primary' : 'danger-soft'}
                title={suspended ? t('activateTitle') : t('suspendTitle')}
                description={suspended ? undefined : t('suspendHint')}
                reason={suspended ? undefined : 'required'}
                onConfirm={(note) => run(() => api.patch(`/admin/buyers/${c.id}/status`, { status: suspended ? 'ACTIVE' : 'SUSPENDED', note: note || undefined }))}
              />
            )}
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t('orders'), <span key="o" className="num">{data.stats.ordersCount}</span>],
          [t('spend'), <Money key="s" value={data.stats.totalSpend} />],
          [t('openInvoices'), <span key="i" className="num">{data.stats.openInvoices}</span>],
          [t('outstanding'), <Money key="u" value={data.stats.outstanding} className={Number(data.stats.outstanding) ? 'text-amber-700' : undefined} />],
        ].map(([label, value], i) => (
          <div key={i} className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <p className="text-sm font-semibold text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-extrabold text-navy-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section title={t('companyInfo')}>
            <Facts
              items={[
                [t('legalName'), c.legalName],
                [t('cr'), c.crNumber && <Ltr>{c.crNumber}</Ltr>],
                [t('vat'), c.vatNumber && <Ltr>{c.vatNumber}</Ltr>],
                [t('phone'), c.phone && <Ltr>{c.phone}</Ltr>],
                [t('email'), c.email && <Ltr>{c.email}</Ltr>],
                [t('branches'), c.branchesCount],
                [t('accountManager'), data.accountManager?.name],
              ]}
            />
          </Section>
          <Section title={t('recentOrders')} bodyClassName="p-0" action={READY.has('/orders') && <Link href={`/orders?companyId=${c.id}`} className="text-sm font-semibold text-brand-700 hover:underline">{t('allOrders')}</Link>}>
            <DataTable
              className="rounded-none border-0 shadow-none"
              dense
              rows={data.recentOrders}
              rowKey={(o) => o.id}
              href={READY.has('/orders') ? (o) => `/orders/${o.id}` : undefined}
              columns={[
                { key: 'n', header: t('orderNumber'), cell: (o) => <Ltr className="font-bold text-gray-900">{o.number}</Ltr> },
                { key: 's', header: t('status'), cell: (o) => <StatusBadge kind="OrderStatus" value={o.status} size="sm" /> },
                { key: 'p', header: t('payment'), cell: (o) => <EnumLabel kind="PaymentMethod" value={o.paymentMethod} />, hideBelow: 'sm' },
                { key: 't', header: t('total'), cell: (o) => <Money value={o.grandTotal} /> },
                { key: 'd', header: t('date'), cell: (o) => <DateText value={o.createdAt} />, hideBelow: 'md' },
              ]}
            />
          </Section>
        </div>
        <div className="space-y-6">
          <Section title={t('credit')}>
            {data.credit && data.credit.status !== 'NO_CREDIT' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <StatusBadge kind="CreditStatus" value={data.credit.status} />
                  <StatusBadge kind="RiskLevel" value={data.credit.riskLevel} size="sm" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500">{t('available')}</p>
                  <Money value={data.credit.available} className="text-2xl" />
                </div>
                <CreditBar used={data.credit.used} limit={data.credit.limit} />
                <Facts items={[[t('used'), <Money key="u" value={data.credit.used} />], [t('limit'), <Money key="l" value={data.credit.limit} />], [t('terms'), t('days', { count: data.credit.termsDays })]]} cols={1} />
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('noCredit')}</p>
            )}
          </Section>
          <Section title={t('members')} bodyClassName="divide-y divide-gray-100 p-0">
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={m.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{m.name}</p>
                  <p className="truncate text-xs text-gray-500">{m.phone && <Ltr>{m.phone}</Ltr>}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs font-semibold text-gray-700">
                    <EnumLabel kind="BuyerRole" value={m.role} />
                  </p>
                  {m.status !== 'ACTIVE' && <StatusBadge kind="MemberStatus" value={m.status} size="sm" />}
                </div>
              </div>
            ))}
          </Section>
          <Section title={t('addresses')} bodyClassName="divide-y divide-gray-100 p-0">
            {data.addresses.length ? (
              data.addresses.map((a) => (
                <div key={a.id} className="flex gap-3 px-5 py-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gray-400" />
                  <div className="min-w-0 text-sm">
                    <p className="font-bold text-gray-900">
                      {a.label} {a.isDefault && <span className="ms-1 text-xs font-semibold text-brand-700">· {t('default')}</span>}
                    </p>
                    <p className="text-gray-500">{a.formatted}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-4 text-sm text-gray-500">{t('noAddresses')}</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
