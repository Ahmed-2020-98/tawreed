import type { BuyerDashboardDto } from '@tawreed/contracts';
import { Button, Card, CardHeader } from '@tawreed/ui';
import { AlertTriangle, ArrowLeft, FileText, Package, PiggyBank, Receipt, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { OrderRow } from '@/components/account/order-row';
import { SpendChart } from '@/components/account/spend-chart';
import { ProductCard, ProductGrid } from '@/components/store/product-card';
import { Link } from '@/i18n/navigation';
import { serverApi } from '@/lib/api';
import { formatters } from '@/lib/format';
import { getSession } from '@/lib/session';

export default async function AccountOverview({ params }: PageProps<'/[locale]/account'>) {
  const { locale } = await params;
  const [api, me, t, tcs] = await Promise.all([serverApi(locale), getSession(locale), getTranslations('account.overview'), getTranslations('enums.CreditStatus')]);
  const d = await api.get<BuyerDashboardDto>('/buyer/dashboard', { cache: 'no-store' });
  const f = formatters(locale);
  const kpis = [
    { label: t('activeOrders'), value: d.activeOrders, icon: Package, href: '/account/orders?status=ACTIVE', tone: 'bg-blue-50 text-blue-600' },
    { label: t('pendingPayment'), value: d.pendingPaymentOrders, icon: Receipt, href: '/account/orders', tone: 'bg-amber-50 text-amber-600' },
    { label: t('quotesAwaiting'), value: d.quotesAwaiting, icon: FileText, href: '/account/rfqs', tone: 'bg-navy-50 text-navy-700' },
    { label: t('monthSavings'), value: f.money(d.monthSavings), icon: PiggyBank, href: '/account/orders', tone: 'bg-brand-50 text-brand-700' },
  ];
  const c = d.credit;
  const usedPct = c && Number(c.limit) > 0 ? (Number(c.used) / Number(c.limit)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 sm:text-3xl">{t('greeting', { name: me?.user.name.split(' ')[0] ?? '' })}</h1>
          <p className="mt-1 text-gray-500">{t('subtitle', { company: me?.context.name ?? '' })}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/rfq/new">
            <FileText />
            {t('quickRfq')}
          </Link>
        </Button>
      </div>

      {d.verificationStatus !== 'VERIFIED' && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <ShieldCheck className="size-8 text-amber-600" />
          <div className="flex-1">
            <p className="font-extrabold text-amber-900">{t('verifyTitle')}</p>
            <p className="text-sm text-amber-800">{t('verifyBody')}</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/account/company">{t('verifyCta')}</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="group rounded-2xl border border-gray-200/80 bg-white p-5 transition hover:border-gray-300 hover:shadow-md">
            <span className={`grid size-10 place-items-center rounded-xl ${k.tone}`}>
              <k.icon className="size-5" />
            </span>
            <p className="num mt-4 text-2xl font-black text-navy-900">{k.value}</p>
            <p className="mt-0.5 text-sm text-gray-500">{k.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title={t('spend')}
            action={
              <span className="flex items-center gap-1.5 text-sm font-bold text-brand-700">
                <TrendingUp className="size-4" />
                <span className="num">{f.money(d.monthSpend)}</span>
              </span>
            }
          />
          <div className="p-4">
            <SpendChart data={d.spendSeries} />
          </div>
        </Card>

        <Card className="grain relative overflow-hidden border-0 bg-brand-950 text-white">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-bold">
                <Wallet className="size-5 text-mint" />
                {t('credit')}
              </p>
              {c && <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">{tcs(c.status as 'ACTIVE')}</span>}
            </div>
            {c ? (
              <>
                <p className="mt-5 text-sm text-white/60">{t('available')}</p>
                <p className="num text-4xl font-black">{f.money(c.available)}</p>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-mint" style={{ width: `${Math.min(100, usedPct)}%` }} />
                </div>
                <div className="num mt-2 flex justify-between text-xs text-white/60">
                  <span>
                    {t('used')} {f.money(c.used)}
                  </span>
                  <span>
                    {t('limit')} {f.money(c.limit)}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.07] p-3">
                    <p className="text-xs text-white/60">{t('due')}</p>
                    <p className="num mt-0.5 font-extrabold">{f.money(d.dueAmount)}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${Number(d.overdueAmount) > 0 ? 'bg-red-500/20' : 'bg-white/[0.07]'}`}>
                    <p className="flex items-center gap-1 text-xs text-white/60">
                      {Number(d.overdueAmount) > 0 && <AlertTriangle className="size-3.5 text-red-300" />}
                      {t('overdue')}
                    </p>
                    <p className="num mt-0.5 font-extrabold">{f.money(d.overdueAmount)}</p>
                  </div>
                </div>
                <Button asChild variant="accent" block className="mt-5">
                  <Link href="/account/credit">{t('payNow')}</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="mt-6 text-lg font-bold">{t('noCredit')}</p>
                <Button asChild variant="accent" className="mt-4">
                  <Link href="/account/credit">{t('applyCredit')}</Link>
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t('recentOrders')}
          action={
            <Link href="/account/orders" className="flex items-center gap-1 text-sm font-bold text-brand-700">
              <ArrowLeft className="size-4 ltr:rotate-180" />
            </Link>
          }
        />
        <div className="divide-y divide-gray-100">
          {d.recentOrders.map((o) => (
            <OrderRow key={o.id} o={o} />
          ))}
        </div>
      </Card>

      {d.buyAgain.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-black text-navy-900">{t('buyAgain')}</h2>
          <ProductGrid className="xl:grid-cols-5">
            {d.buyAgain.slice(0, 5).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductGrid>
        </section>
      )}
    </div>
  );
}
