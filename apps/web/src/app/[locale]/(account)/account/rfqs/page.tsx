import type { RfqSummaryDto } from '@tawreed/contracts';
import { Button, Card, EmptyState } from '@tawreed/ui';
import { CalendarClock, FileText, MapPin, Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/account/page-header';
import { StatusBadge } from '@/components/account/status-badge';
import { Link } from '@/i18n/navigation';
import { serverApi } from '@/lib/api';
import { formatters, pickLocale } from '@/lib/format';

export default async function RfqsPage({ params }: PageProps<'/[locale]/account/rfqs'>) {
  const { locale } = await params;
  const [api, t] = await Promise.all([serverApi(locale), getTranslations('account.rfqs')]);
  const list = await api.page<RfqSummaryDto>('/buyer/rfqs', { query: { pageSize: 50 }, cache: 'no-store' });
  const f = formatters(locale);
  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Button asChild>
            <Link href="/rfq/new">
              <Plus />
              {t('new')}
            </Link>
          </Button>
        }
      />
      {list.data.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.data.map((r) => (
            <Link key={r.id} href={`/account/rfqs/${r.id}`} className="group rounded-2xl border border-gray-200/80 bg-white p-5 transition hover:border-brand-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="num text-xs font-bold text-gray-400">{r.number}</p>
                  <p className="mt-1 text-lg font-extrabold text-navy-900 group-hover:text-brand-800">{r.title}</p>
                </div>
                <StatusBadge kind="RfqStatus" value={r.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {pickLocale(r.city.name, locale)}
                </span>
                {r.neededBy && (
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-4" />
                    {t('neededBy', { date: f.date(r.neededBy) })}
                  </span>
                )}
              </div>
              <div className="rule-dashed my-4" />
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-800">{t('quotes', { count: r.quotesCount })}</span>
                {r.bestQuoteTotal && <span className="num text-lg font-black text-navy-900">{f.money(r.bestQuoteTotal)}</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<FileText />}
            title={t('empty')}
            description={t('emptyBody')}
            action={
              <Button asChild>
                <Link href="/rfq/new">{t('new')}</Link>
              </Button>
            }
          />
        </Card>
      )}
    </>
  );
}
