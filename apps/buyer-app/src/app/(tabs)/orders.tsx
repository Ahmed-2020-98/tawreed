import type { OrderSummaryDto } from '@tawreed/contracts';
import { api, colors, deviceUrl, EmptyState, Header, PressableCard, Row, Segmented, StatusBadge, T, useFormat, useSession } from '@tawreed/mobile';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Package } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useTranslations } from 'use-intl';

export function OrderCard({ o }: { o: OrderSummaryDto }) {
  const t = useTranslations('account.orders');
  const te = useTranslations('enums.PaymentMethod');
  const f = useFormat();
  return (
    <PressableCard pad={14} onPress={() => router.push(`/orders/${o.id}`)} style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T num weight="extrabold">
          {o.number}
        </T>
        <StatusBadge kind="OrderStatus" value={o.status} />
      </Row>
      <Row>
        <View style={{ flexDirection: 'row' }}>
          {o.thumbnails.slice(0, 3).map((src, i) => (
            <Image key={src} source={deviceUrl(src)} style={{ width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: '#fff', marginStart: i ? -12 : 0, backgroundColor: colors.gray[100] }} />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <T size={12} color={colors.textMuted} numberOfLines={1}>
            {o.suppliers.map((s) => s.name).join('، ')}
          </T>
          <T size={12} color={colors.textMuted}>
            {f.date(o.placedAt ?? o.createdAt)} · {t('items', { count: o.itemsCount })} · {te(o.paymentMethod)}
          </T>
        </View>
        <T num weight="black" color={colors.navy[900]}>
          {f.money(o.grandTotal)}
        </T>
      </Row>
    </PressableCard>
  );
}

export default function OrdersTab() {
  const t = useTranslations('account.orders');
  const tm = useTranslations('mobile');
  const { status } = useSession();
  const [tab, setTab] = useState<'ACTIVE' | 'PAST' | 'all'>('ACTIVE');
  const list = useInfiniteQuery({
    queryKey: ['orders', tab],
    queryFn: ({ pageParam }) => api.page<OrderSummaryDto>('/buyer/orders', { query: { status: tab === 'all' ? undefined : tab, page: pageParam, pageSize: 15 } }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.meta.page < l.meta.totalPages ? l.meta.page + 1 : undefined),
    enabled: status === 'authed',
  });
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const { refetch } = list;
  useFocusEffect(
    useCallback(() => {
      if (status === 'authed') void refetch();
    }, [status, refetch]),
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header back={false} title={t('title')} />
      {status !== 'authed' ? (
        <EmptyState icon={<Package size={32} color={colors.green[700]} />} title={tm('signInPrompt')} action={tm('signIn')} onAction={() => router.push('/login')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => <OrderCard o={item} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={<Segmented value={tab} onChange={setTab} options={(['ACTIVE', 'PAST', 'all'] as const).map((k) => ({ value: k, label: t(`tabs.${k}`) }))} />}
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.primary} />}
          onEndReached={() => list.hasNextPage && void list.fetchNextPage()}
          ListEmptyComponent={list.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : <EmptyState icon={<Package size={32} color={colors.green[700]} />} title={t('empty')} body={t('emptyBody')} />}
        />
      )}
    </View>
  );
}
