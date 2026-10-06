import type { CashCollectionDto } from '@tawreed/contracts';
import { api, Badge, Card, colors, EmptyState, Row, Screen, T, useFormat } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Banknote } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';
import { useDriverSummary } from '@/lib/driver';

export default function Cash() {
  const t = useTranslations('driver');
  const f = useFormat();
  const summary = useDriverSummary();
  const { data, refetch, isRefetching } = useQuery({ queryKey: ['driver', 'cash'], queryFn: () => api.page<CashCollectionDto>('/driver/cash', { query: { pageSize: 50 } }) });
  return (
    <Screen back={false} title={t('cashTitle')} refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Card style={{ backgroundColor: colors.navy[900], borderColor: colors.navy[900], gap: 4 }}>
        <T color="rgba(255,255,255,0.7)" size={13}>
          {t('cashToHandOver')}
        </T>
        <T num weight="black" size={30} color="#fff">
          {f.money(summary.data?.cashToHandOver ?? 0)}
        </T>
        <T size={12} color="rgba(255,255,255,0.6)">
          {t('cashHint')}
        </T>
      </Card>
      {data?.data.length === 0 && <EmptyState icon={<Banknote size={30} color={colors.green[700]} />} title={t('cashEmpty')} />}
      {data?.data.map((c) => (
        <Card key={c.id} pad={14}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <T num weight="bold">
                {c.shipmentNumber}
              </T>
              <T num size={12} color={colors.textMuted}>
                {c.orderNumber} · {f.dateTime(c.collectedAt)}
              </T>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <T num weight="extrabold" color={colors.navy[900]}>
                {f.money(c.amount)}
              </T>
              <Badge tone={c.status === 'COLLECTED' ? 'amber' : 'brand'} label={c.status === 'COLLECTED' ? t('collected') : t('handedOver')} />
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
