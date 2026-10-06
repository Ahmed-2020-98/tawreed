import type { InvoiceSummaryDto } from '@tawreed/contracts';
import { api, colors, EmptyState, Screen } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react-native';
import { useTranslations } from 'use-intl';
import { InvoiceRow } from '@/components/invoice-row';

export default function Invoices() {
  const t = useTranslations('account.invoices');
  const { data, refetch, isRefetching } = useQuery({ queryKey: ['invoices'], queryFn: () => api.page<InvoiceSummaryDto>('/buyer/invoices', { query: { pageSize: 50 } }) });
  return (
    <Screen title={t('title')} refreshing={isRefetching} onRefresh={() => void refetch()}>
      {data?.data.length === 0 && <EmptyState icon={<Receipt size={32} color={colors.green[700]} />} title={t('empty')} />}
      {data?.data.map((i) => (
        <InvoiceRow key={i.id} i={i} />
      ))}
    </Screen>
  );
}
