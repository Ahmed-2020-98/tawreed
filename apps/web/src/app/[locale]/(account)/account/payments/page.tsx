import type { PaymentDto } from '@tawreed/contracts';
import { Card, EmptyState } from '@tawreed/ui';
import { CreditCard } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/account/page-header';
import { StatusBadge } from '@/components/account/status-badge';
import { serverApi } from '@/lib/api';
import { formatters } from '@/lib/format';

export default async function PaymentsPage({ params }: PageProps<'/[locale]/account/payments'>) {
  const { locale } = await params;
  const [api, t, te] = await Promise.all([serverApi(locale), getTranslations('account.payments'), getTranslations('enums')]);
  const list = await api.page<PaymentDto>('/buyer/payments', { query: { pageSize: 50 }, cache: 'no-store' });
  const f = formatters(locale);
  return (
    <>
      <PageHeader title={t('title')} />
      <Card className="overflow-hidden">
        {list.data.length ? (
          <ul className="divide-y divide-gray-100">
            {list.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="grid size-10 place-items-center rounded-xl bg-gray-100 text-gray-500">
                  <CreditCard className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="num font-bold text-gray-900">
                    {p.number} {p.orderNumber && <span className="font-medium text-gray-400">· {p.orderNumber}</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {te(`PaymentMethod.${p.method}` as never)} · {te(`PaymentPurpose.${p.purpose}` as never)} · <span className="num">{f.dateTime(p.paidAt ?? p.createdAt)}</span>
                  </p>
                  {p.rejectionReason && <p className="text-xs text-red-600">{p.rejectionReason}</p>}
                </div>
                <StatusBadge kind="PaymentRecordStatus" value={p.status} size="sm" />
                <p className="num w-32 text-end font-extrabold text-navy-900">{f.money(p.amount)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CreditCard />} title={t('empty')} />
        )}
      </Card>
    </>
  );
}
