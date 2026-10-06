import type { RfqSummaryDto } from '@tawreed/contracts';
import { api, Button, colors, EmptyState, PressableCard, Row, Screen, StatusBadge, T, useFormat } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FileText, Plus } from 'lucide-react-native';
import { useTranslations } from 'use-intl';

export default function Rfqs() {
  const t = useTranslations('account.rfqs');
  const f = useFormat();
  const { data, refetch, isRefetching } = useQuery({ queryKey: ['rfqs'], queryFn: () => api.page<RfqSummaryDto>('/buyer/rfqs', { query: { pageSize: 50 } }) });
  return (
    <Screen title={t('title')} refreshing={isRefetching} onRefresh={() => void refetch()} footer={<Button title={t('new')} icon={<Plus size={18} color="#fff" />} onPress={() => router.push('/rfq/new')} />}>
      {data?.data.length === 0 && <EmptyState icon={<FileText size={32} color={colors.green[700]} />} title={t('empty')} body={t('emptyBody')} />}
      {data?.data.map((r) => (
        <PressableCard key={r.id} pad={14} onPress={() => router.push(`/rfqs/${r.id}`)} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T num size={11} weight="bold" color={colors.textSubtle}>
              {r.number}
            </T>
            <StatusBadge kind="RfqStatus" value={r.status} />
          </Row>
          <T weight="extrabold" size={16}>
            {r.title}
          </T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={12} color={colors.textMuted}>
              {f.pick(r.city.name)}
              {r.neededBy ? ` · ${t('neededBy', { date: f.date(r.neededBy) })}` : ''}
            </T>
            <T size={12} weight="bold" color={colors.green[700]}>
              {t('quotes', { count: r.quotesCount })}
            </T>
          </Row>
          {r.bestQuoteTotal && (
            <T num weight="black" color={colors.navy[900]}>
              {f.money(r.bestQuoteTotal)}
            </T>
          )}
        </PressableCard>
      ))}
    </Screen>
  );
}
