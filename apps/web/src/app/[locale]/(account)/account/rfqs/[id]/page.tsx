import type { RfqDetailDto } from '@tawreed/contracts';
import { Card, CardHeader, cn, EmptyState } from '@tawreed/ui';
import { Award, Clock, Hourglass, Zap } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { StatusBadge } from '@/components/account/status-badge';
import { AcceptQuote, RejectQuote, ReviseQuote } from '@/components/rfq/quote-actions';
import { serverApi } from '@/lib/api';
import { formatters, pickLocale } from '@/lib/format';

export default async function RfqDetailPage({ params }: PageProps<'/[locale]/account/rfqs/[id]'>) {
  const { locale, id } = await params;
  const api = await serverApi(locale);
  const rfq = await api.get<RfqDetailDto>(`/buyer/rfqs/${id}`, { cache: 'no-store' }).catch(() => null);
  if (!rfq) notFound();
  const [t, te, tc] = await Promise.all([getTranslations('account.rfqs'), getTranslations('enums'), getTranslations('common')]);
  const f = formatters(locale);
  const quotes = [...rfq.quotations].sort((a, b) => Number(a.current.total) - Number(b.current.total));
  const open = ['OPEN', 'QUOTED'].includes(rfq.status);

  return (
    <div className="space-y-6">
      <div>
        <p className="num text-sm font-bold text-gray-400">{rfq.number}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black text-navy-900 sm:text-3xl">{rfq.title}</h1>
          <StatusBadge kind="RfqStatus" value={rfq.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {pickLocale(rfq.city.name, locale)}
          {rfq.neededBy && ` · ${t('neededBy', { date: f.date(rfq.neededBy) })}`}
          {rfq.expiresAt && ` · ${t('expires', { date: f.date(rfq.expiresAt) })}`}
        </p>
      </div>

      <Card>
        <CardHeader title={t('items')} />
        <ul className="divide-y divide-gray-100">
          {rfq.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-5 py-3">
              <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">{i.image && <img src={i.image} alt="" className="size-full object-cover" />}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900">{i.name}</p>
                {i.specs && <p className="text-xs text-gray-500">{i.specs}</p>}
              </div>
              <p className="num font-extrabold text-navy-900">
                {f.qty(i.qty)} {i.unitLabel}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <section>
        <h2 className="mb-4 text-xl font-black text-navy-900">{t('compare')}</h2>
        {quotes.length === 0 ? (
          <Card>
            <EmptyState icon={<Hourglass />} title={t('noQuotes')} description={t('noQuotesBody', { count: rfq.invitationsCount })} />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quotes.map((q, idx) => (
              <Card key={q.id} className={cn('flex flex-col overflow-hidden', idx === 0 && 'border-brand-500 ring-1 ring-brand-500')}>
                <div className={cn('px-5 py-4', idx === 0 ? 'bg-brand-50/60' : 'bg-gray-50/60')}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-extrabold text-gray-900">{q.supplier.name}</p>
                    <StatusBadge kind="QuotationStatus" value={q.status} size="sm" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.isLowest && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-0.5 text-xs font-bold text-white">
                        <Award className="size-3.5" />
                        {t('best')}
                      </span>
                    )}
                    {q.isFastest && (
                      <span className="flex items-center gap-1 rounded-full bg-navy-900 px-2.5 py-0.5 text-xs font-bold text-white">
                        <Zap className="size-3.5" />
                        {t('leadTime')}
                      </span>
                    )}
                    <span className="num rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">{t('version', { v: q.current.version })}</span>
                  </div>
                  <p className="num mt-3 text-3xl font-black text-navy-900">{f.money(q.current.total)}</p>
                </div>
                <dl className="flex-1 space-y-2 px-5 py-4 text-sm">
                  {q.current.items.map((it) => (
                    <div key={it.id} className="flex justify-between gap-3">
                      <dt className="truncate text-gray-600">{it.description}</dt>
                      <dd className="num shrink-0 font-semibold">{f.money(it.unitPrice)}</dd>
                    </div>
                  ))}
                  <div className="rule-dashed !my-3" />
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t('deliveryFee')}</dt>
                    <dd className="num font-semibold">{f.money(q.current.deliveryFee)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="flex items-center gap-1 text-gray-500">
                      <Clock className="size-3.5" />
                      {t('leadTime')}
                    </dt>
                    <dd className="num font-semibold">{tc('day', { count: q.current.leadTimeDays })}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">{t('validUntil')}</dt>
                    <dd className="num font-semibold">{f.date(q.current.validUntil)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">{t('paymentTerms')}</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {q.current.paymentMethods.map((m) => (
                        <span key={m} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          {te(`PaymentMethod.${m}` as never)}
                        </span>
                      ))}
                    </dd>
                  </div>
                  {q.current.notes && <p className="rounded-xl bg-sand-50 p-3 text-xs leading-6 text-gray-700">{q.current.notes}</p>}
                </dl>
                {open && q.status === 'SUBMITTED' && (
                  <div className="space-y-2 border-t border-gray-100 p-4">
                    <AcceptQuote q={q} />
                    <div className="grid grid-cols-2 gap-2">
                      <ReviseQuote q={q} />
                      <RejectQuote q={q} />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
