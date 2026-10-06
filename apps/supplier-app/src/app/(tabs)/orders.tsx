import type { SupplierOrderListItemDto } from '@tawreed/contracts';
import { api, Chip, colors, EmptyState, Header } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Package } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { SupplierOrderRow } from '@/components/order-row';

const TABS = ['NEW', 'IN_PROGRESS', 'SHIPPING', 'DONE', 'CLOSED'] as const;

export default function Orders() {
  const t = useTranslations('supplier');
  const tm = useTranslations('mobile.tabs');
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]>((TABS as readonly string[]).includes(params.tab ?? '') ? (params.tab as (typeof TABS)[number]) : 'NEW');
  const q = useQuery({ queryKey: ['supplier', 'orders', tab], queryFn: () => api.page<SupplierOrderListItemDto>('/supplier/orders', { query: { status: tab, pageSize: 40 } }) });
  const { refetch } = q;
  useFocusEffect(useCallback(() => void refetch(), [refetch]));
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header back={false} title={tm('orders')} />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }}>
          {TABS.map((k) => (
            <Chip key={k} label={t(`tabs.${k}`)} active={tab === k} onPress={() => setTab(k)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={q.data?.data ?? []}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <SupplierOrderRow o={item} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void refetch()} tintColor={colors.navy[900]} />}
        ListEmptyComponent={q.isLoading ? <ActivityIndicator color={colors.navy[900]} /> : <EmptyState icon={<Package size={30} color={colors.green[700]} />} title={t('ordersEmpty')} />}
      />
    </View>
  );
}
