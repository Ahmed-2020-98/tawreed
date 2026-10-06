import type { OrderSummaryDto } from '@tawreed/contracts';
import { Button, Card, cn, EmptyState, Pagination } from '@tawreed/ui';
import { Package } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { OrderRow } from '@/components/account/order-row';
import { PageHeader } from '@/components/account/page-header';
import { Link } from '@/i18n/navigation';
import { serverApi } from '@/lib/api';

const TABS = ['all', 'ACTIVE', 'PAST'] as const;

export default async function OrdersPage({ params, searchParams }: PageProps<'/[locale]/account/orders'>) {
  const { locale } = await params;
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const page = Number(sp.page ?? 1) || 1;
  const [api, t, tc] = await Promise.all([serverApi(locale), getTranslations('account.orders'), getTranslations('common')]);
  const list = await api.page<OrderSummaryDto>('/buyer/orders', { query: { status, page, pageSize: 15 }, cache: 'no-store' });
  return (
    <>
      <PageHeader title={t('title')} />
      <div className="mb-4 inline-flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => {
          const on = (tab === 'all' && !status) || tab === status;
          return (
            <Link key={tab} href={tab === 'all' ? '/account/orders' : `/account/orders?status=${tab}`} className={cn('rounded-lg px-4 py-1.5 text-sm font-semibold transition', on ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800')}>
              {t(`tabs.${tab}`)}
            </Link>
          );
        })}
      </div>
      <Card>
        {list.data.length ? (
          <div className="divide-y divide-gray-100">
            {list.data.map((o) => (
              <OrderRow key={o.id} o={o} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Package />}
            title={t('empty')}
            description={t('emptyBody')}
            action={
              <Button asChild>
                <Link href="/store">{tc('goHome')}</Link>
              </Button>
            }
          />
        )}
      </Card>
      <Pagination className="mt-6" page={list.meta.page} totalPages={list.meta.totalPages} href={(p) => `/account/orders?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`} LinkComponent={Link} labels={{ prev: tc('previous'), next: tc('next') }} />
    </>
  );
}
