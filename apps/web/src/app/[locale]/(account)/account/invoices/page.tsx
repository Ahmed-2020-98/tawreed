import type { InvoiceSummaryDto } from '@tawreed/contracts';
import { Card, cn, EmptyState, Pagination } from '@tawreed/ui';
import { Receipt } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/account/page-header';
import { InvoiceTable } from '@/components/finance/invoice-table';
import { Link } from '@/i18n/navigation';
import { serverApi } from '@/lib/api';

const TABS = ['all', 'OPEN', 'OVERDUE', 'PAID'] as const;

export default async function InvoicesPage({ params, searchParams }: PageProps<'/[locale]/account/invoices'>) {
  const { locale } = await params;
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const page = Number(sp.page ?? 1) || 1;
  const [api, t, tc] = await Promise.all([serverApi(locale), getTranslations('account.invoices'), getTranslations('common')]);
  const list = await api.page<InvoiceSummaryDto>('/buyer/invoices', { query: { status, page, pageSize: 20 }, cache: 'no-store' });
  return (
    <>
      <PageHeader title={t('title')} />
      <div className="mb-4 inline-flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => {
          const on = (tab === 'all' && !status) || tab === status;
          return (
            <Link key={tab} href={tab === 'all' ? '/account/invoices' : `/account/invoices?status=${tab}`} className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition', on ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800')}>
              {t(`tabs.${tab}`)}
            </Link>
          );
        })}
      </div>
      {list.data.length ? (
        <InvoiceTable invoices={list.data} />
      ) : (
        <Card>
          <EmptyState icon={<Receipt />} title={t('empty')} />
        </Card>
      )}
      <Pagination className="mt-6" page={list.meta.page} totalPages={list.meta.totalPages} href={(p) => `/account/invoices?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`} LinkComponent={Link} labels={{ prev: tc('previous'), next: tc('next') }} />
    </>
  );
}
