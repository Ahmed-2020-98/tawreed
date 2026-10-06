'use client';

import type { StaffPermission } from '@tawreed/contracts';
import { Card, cn, Skeleton } from '@tawreed/ui';
import { AlertTriangle, ArrowUpRight, Banknote, Building2, Coins, Gauge, Package, Percent, ShoppingCart, Store, TrendingUp, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AreaChart, BarList, Donut } from '@/components/kit/charts';
import { EnumLabel, KpiCard, Section } from '@/components/kit/misc';
import { useCan, useStaff } from '@/components/providers';
import { NAV, type QueueKey, READY } from '@/components/shell/nav';
import { useDashboard } from '@/components/shell/sidebar';
import { Link } from '@/i18n/navigation';
import { useFormat } from '@/lib/hooks/use-format';

const QUEUES: { key: QueueKey; perm: StaffPermission }[] = [
  { key: 'kyb', perm: 'admin.kyb.review' },
  { key: 'payments', perm: 'admin.payments.verify' },
  { key: 'creditApplications', perm: 'admin.credit.manage' },
  { key: 'supplierApplications', perm: 'admin.suppliers.manage' },
  { key: 'dispatch', perm: 'admin.logistics.manage' },
  { key: 'productReviews', perm: 'admin.catalog.manage' },
  { key: 'deals', perm: 'admin.catalog.manage' },
];
/** Only link to pages that exist yet. */
const live = (href: string) => (READY.has(href.split('?')[0]!) ? href : undefined);
const QUEUE_HREF = Object.fromEntries(NAV.flatMap((s) => s.items).filter((i) => i.queue).map((i) => [i.queue, i.href])) as Record<QueueKey, string>;

function QueueCard({ href, className, children }: { href?: string; className: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

export function Dashboard() {
  const t = useTranslations('dashboard');
  const { me } = useStaff();
  const can = useCan();
  const f = useFormat();
  const { data, isLoading } = useDashboard();
  const hour = Number(new Intl.DateTimeFormat('en', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Riyadh' }).format(new Date()));
  const queues = QUEUES.filter((q) => can(q.perm));
  const pending = data ? queues.reduce((s, q) => s + data.queues[q.key], 0) : 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">{new Intl.DateTimeFormat(f.locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Riyadh' }).format(new Date())}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-navy-900 sm:text-3xl">{t(hour < 12 ? 'morning' : 'evening', { name: me?.user.name.split(' ')[0] ?? '' })}</h1>
        </div>
        {data && <p className="text-sm text-gray-500">{pending ? t('pendingSummary', { count: pending }) : t('allClear')}</p>}
      </div>

      {/* Work queues */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {queues.map((q) => {
          const n = data?.queues[q.key] ?? 0;
          return (
            <QueueCard key={q.key} href={live(QUEUE_HREF[q.key])} className={cn('group relative overflow-hidden rounded-xl border p-4 transition', n ? 'border-amber-200 bg-amber-50/60 hover:border-amber-300' : 'border-gray-200/80 bg-white hover:border-gray-300')}>
              <p className="text-xs font-bold text-gray-500">{t(`queues.${q.key}`)}</p>
              <div className="mt-2 flex items-end justify-between">
                {isLoading ? <Skeleton className="h-7 w-8" /> : <span className={cn('num text-2xl font-extrabold', n ? 'text-amber-700' : 'text-gray-300')}>{n}</span>}
                <ArrowUpRight className="size-4 text-gray-300 transition group-hover:text-gray-500 rtl:-scale-x-100" />
              </div>
            </QueueCard>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <KpiCard label={t('kpi.gmvMonth')} value={f.money(data.kpis.gmvMonth)} hint={t('kpi.today', { value: f.money(data.kpis.gmvToday) })} icon={<TrendingUp />} tone="brand" href={live('/orders')} />
            <KpiCard label={t('kpi.ordersMonth')} value={data.kpis.ordersMonth} hint={t('kpi.ordersToday', { count: data.kpis.ordersToday })} icon={<ShoppingCart />} href={live('/orders')} />
            <KpiCard label={t('kpi.aov')} value={f.money(data.kpis.aov)} icon={<Gauge />} />
            <KpiCard label={t('kpi.commission')} value={f.money(data.kpis.commissionMonth)} icon={<Percent />} tone="brand" />
            <KpiCard label={t('kpi.buyers')} value={data.kpis.activeBuyers} hint={t('kpi.newBuyers', { count: data.kpis.newBuyersMonth })} icon={<Building2 />} href={live('/buyers')} />
            <KpiCard label={t('kpi.suppliers')} value={data.kpis.activeSuppliers} icon={<Store />} href={live('/suppliers')} />
            <KpiCard label={t('kpi.creditExposure')} value={f.money(data.kpis.creditExposure)} icon={<Wallet />} tone="amber" href={live('/credit')} />
            <KpiCard label={t('kpi.overdue')} value={f.money(data.kpis.overdueAmount)} icon={<AlertTriangle />} tone="red" href={live('/invoices?status=OVERDUE')} />
          </>
        )}
      </div>

      {data && (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <Section title={t('gmvChart')} className="xl:col-span-2" action={<span className="num text-sm font-bold text-brand-700">{f.money(data.gmvSeries.reduce((s, p) => s + Number(p.value), 0))}</span>}>
              <AreaChart data={data.gmvSeries} />
            </Section>
            <Section title={t('paymentMix')}>
              <Donut
                items={data.paymentMix.map((p) => ({ label: <EnumLabel kind="PaymentMethod" value={p.method} />, value: Number(p.total) }))}
                centerLabel={
                  <div>
                    <Coins className="mx-auto size-5 text-gray-300" />
                    <p className="num mt-1 text-sm font-extrabold text-navy-900">{data.paymentMix.reduce((s, p) => s + p.count, 0)}</p>
                  </div>
                }
              />
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <Section title={t('ordersByStatus')}>
              <BarList money={false} color="bg-navy-700" items={data.ordersByStatus.map((s) => ({ label: <EnumLabel kind="OrderStatus" value={s.status} />, value: s.count }))} />
            </Section>
            <Section title={t('topSuppliers')}>
              <BarList items={data.topSuppliers.slice(0, 6).map((s) => ({ label: s.name, value: s.total }))} />
            </Section>
            <Section title={t('topCategories')}>
              <BarList color="bg-mint" items={data.topCategories.slice(0, 6).map((c) => ({ label: c.name, value: c.total }))} />
            </Section>
            <Section title={t('topCities')}>
              <BarList color="bg-sky-500" items={data.topCities.slice(0, 6).map((c) => ({ label: c.name, value: c.total }))} />
            </Section>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-[0.9375rem] font-bold text-gray-900">
                <Banknote className="size-4 text-gray-400" />
                {t('aging')}
              </h2>
              {live('/invoices') && (
                <Link href="/invoices?status=OVERDUE" className="text-sm font-semibold text-brand-700 hover:underline">
                  {t('viewOverdue')}
                </Link>
              )}
            </div>
            <div className="grid divide-y divide-gray-100 sm:grid-cols-5 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
              {data.agingBuckets.map((b, i) => (
                <div key={b.bucket} className="p-5">
                  <p className="text-xs font-bold text-gray-500">{t(`agingBucket.${b.bucket}` as never)}</p>
                  <p className={cn('num mt-2 text-xl font-extrabold', i === 0 ? 'text-navy-900' : i < 2 ? 'text-amber-700' : 'text-red-600')}>{f.money(b.amount)}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
      {!data && !isLoading && (
        <Card className="p-10 text-center text-sm text-gray-500">
          <Package className="mx-auto mb-3 size-8 text-gray-300" />
          {t('noAccess')}
        </Card>
      )}
    </div>
  );
}
