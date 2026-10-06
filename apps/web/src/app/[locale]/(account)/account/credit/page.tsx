import type { CreditLedgerEntryDto, CreditOverviewDto } from '@tawreed/contracts';
import { Card, CardHeader } from '@tawreed/ui';
import { AlertTriangle, Clock, Wallet } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/account/page-header';
import { StatusBadge } from '@/components/account/status-badge';
import { CreditApplyButton } from '@/components/finance/credit-apply';
import { InvoiceTable } from '@/components/finance/invoice-table';
import { serverApi } from '@/lib/api';
import { formatters } from '@/lib/format';

export default async function CreditPage({ params }: PageProps<'/[locale]/account/credit'>) {
  const { locale } = await params;
  const [api, t] = await Promise.all([serverApi(locale), getTranslations('account.credit')]);
  const [c, ledger] = await Promise.all([
    api.get<CreditOverviewDto>('/buyer/credit', { cache: 'no-store' }),
    api.page<CreditLedgerEntryDto>('/buyer/credit/ledger', { query: { pageSize: 15 }, cache: 'no-store' }).catch(() => ({ data: [] as CreditLedgerEntryDto[] })),
  ]);
  const f = formatters(locale);
  const active = c.status !== 'NO_CREDIT';
  const pct = Number(c.creditLimit) > 0 ? (Number(c.usedAmount) / Number(c.creditLimit)) * 100 : 0;

  if (!active) {
    return (
      <>
        <PageHeader title={t('title')} />
        <div className="grain relative overflow-hidden rounded-3xl bg-brand-950 p-8 text-white sm:p-12">
          <Wallet className="absolute -bottom-6 end-6 size-44 text-white/5" />
          <h2 className="text-3xl font-black">{t('heroTitle')}</h2>
          <p className="mt-3 max-w-xl text-white/75">{t('heroBody')}</p>
          <div className="mt-6">{c.pendingApplication ? <p className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold"><Clock className="size-4 text-mint" />{t('pending')}</p> : c.canApply && <CreditApplyButton variant="accent" />}</div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} actions={<StatusBadge kind="CreditStatus" value={c.status} />} />
      {c.frozenReason && (
        <p className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertTriangle className="size-4" />
          {t('frozen', { reason: c.frozenReason })}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="grain relative overflow-hidden border-0 bg-brand-950 p-6 text-white sm:p-8">
          <p className="text-sm text-white/60">{t('available')}</p>
          <p className="num mt-1 text-5xl font-black">{f.money(c.availableAmount)}</p>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-l from-mint to-brand-500 rtl:bg-gradient-to-r" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="num mt-2 flex justify-between text-sm text-white/65">
            <span>
              {t('used')}: {f.money(c.usedAmount)}
            </span>
            <span>
              {t('limit')}: {f.money(c.creditLimit)}
            </span>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          {[
            [t('terms'), t('termsValue', { count: c.termsDays })],
            [t('nextDue'), f.date(c.nextDueDate)],
            [t('dueSoon'), f.money(c.dueSoonAmount)],
            [t('overdue'), f.money(c.overdueAmount)],
          ].map(([k, v], i) => (
            <Card key={k} className={`p-5 ${i === 3 && Number(c.overdueAmount) > 0 ? 'border-red-200 bg-red-50' : ''}`}>
              <p className="text-sm text-gray-500">{k}</p>
              <p className={`num mt-2 text-xl font-black ${i === 3 && Number(c.overdueAmount) > 0 ? 'text-red-600' : 'text-navy-900'}`}>{v}</p>
            </Card>
          ))}
        </div>
      </div>

      {c.openInvoices.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-navy-900">{t('openInvoices')}</h2>
          <InvoiceTable invoices={c.openInvoices} />
        </section>
      )}

      <Card>
        <CardHeader title={t('ledger')} />
        {ledger.data.length ? (
          <ul className="divide-y divide-gray-100">
            {ledger.data.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{e.note ?? e.type}</p>
                  <p className="num text-xs text-gray-400">
                    {e.reference} · {f.dateTime(e.createdAt)}
                  </p>
                </div>
                <div className="text-end">
                  <p className={`num font-extrabold ${Number(e.amount) < 0 ? 'text-brand-700' : 'text-navy-900'}`}>{f.money(e.amount)}</p>
                  <p className="num text-xs text-gray-400">{f.money(e.balanceAfter)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-sm text-gray-500">{t('noLedger')}</p>
        )}
      </Card>
    </div>
  );
}
