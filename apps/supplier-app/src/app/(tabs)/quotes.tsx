import type { SupplierRfqInboxItemDto } from '@tawreed/contracts';
import { api, Badge, Chip, colors, EmptyState, Header, PressableCard, Row, StatusBadge, T, useFormat } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';

export default function Quotes() {
  const t = useTranslations('supplier');
  const f = useFormat();
  const [tab, setTab] = useState<'NEW' | 'QUOTED' | 'CLOSED'>('NEW');
  const q = useQuery({ queryKey: ['supplier', 'rfqs', tab], queryFn: () => api.page<SupplierRfqInboxItemDto>('/supplier/rfqs', { query: { status: tab, pageSize: 40 } }) });
  const { refetch } = q;
  useFocusEffect(useCallback(() => void refetch(), [refetch]));
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header back={false} title={t('rfqInbox')} />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }}>
          {(['NEW', 'QUOTED', 'CLOSED'] as const).map((k) => (
            <Chip key={k} label={k === 'NEW' ? t('tabs.NEW') : k === 'QUOTED' ? t('myQuote') : t('tabs.DONE')} active={tab === k} onPress={() => setTab(k)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={q.data?.data ?? []}
        keyExtractor={(r) => r.rfqId}
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void refetch()} tintColor={colors.navy[900]} />}
        ListEmptyComponent={<EmptyState icon={<FileText size={30} color={colors.green[700]} />} title={t('rfqEmpty')} />}
        renderItem={({ item: r }) => (
          <PressableCard pad={14} onPress={() => router.push(`/quotes/${r.rfqId}`)} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T num size={11} weight="bold" color={colors.textSubtle}>
                {r.number}
              </T>
              <StatusBadge kind="InvitationStatus" value={r.invitationStatus} />
            </Row>
            <T weight="extrabold" size={15}>
              {r.title}
            </T>
            <T size={12} color={colors.textMuted}>
              {r.buyer.name} · {f.pick(r.city.name)} · {r.itemsCount} ×
            </T>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge tone="gray" label={t('competitors', { count: r.competitorsCount })} />
              {r.myQuotation ? (
                <T num weight="black" color={colors.navy[900]}>
                  {f.money(r.myQuotation.total)}
                </T>
              ) : (
                <T size={12} weight="bold" color={colors.green[700]}>
                  {t('quoteNow')}
                </T>
              )}
            </Row>
          </PressableCard>
        )}
      />
    </View>
  );
}
