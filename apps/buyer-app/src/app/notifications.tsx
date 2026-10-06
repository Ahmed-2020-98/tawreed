import type { NotificationDto } from '@tawreed/contracts';
import { api, Button, colors, EmptyState, Screen, T, useFormat } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useTranslations } from 'use-intl';

function routeFor(n: NotificationDto): string | null {
  const d = n.data;
  if (!d) return null;
  if (d.screen === 'order') return d.id ? `/orders/${d.id}` : '/(tabs)/orders';
  if (d.screen === 'rfq' || d.screen === 'quotation') return d.id ? `/rfqs/${d.id}` : '/rfqs';
  if (d.screen === 'invoice' || d.screen === 'invoices') return '/invoices';
  if (d.screen === 'credit') return '/credit';
  if (d.screen === 'kyb') return '/company';
  return null;
}

export default function Notifications() {
  const t = useTranslations('account.notifications');
  const f = useFormat();
  const { data, refetch, isRefetching } = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => api.page<NotificationDto>('/notifications', { query: { pageSize: 50 } }) });
  const items = data?.data ?? [];
  return (
    <Screen
      title={t('title')}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      right={items.some((n) => !n.readAt) ? <Button size="sm" variant="ghost" title="✓✓" onPress={() => void api.post('/notifications/read-all').then(() => refetch())} /> : undefined}
      pad={0}
      contentStyle={{ gap: 0 }}
    >
      {items.length === 0 && <EmptyState icon={<Bell size={32} color={colors.green[700]} />} title={t('empty')} />}
      {items.map((n) => (
        <Pressable
          key={n.id}
          onPress={() => {
            if (!n.readAt) void api.post(`/notifications/${n.id}/read`).then(() => refetch());
            const r = routeFor(n);
            if (r) router.push(r as never);
          }}
          style={{ flexDirection: 'row', gap: 12, padding: 16, backgroundColor: n.readAt ? '#fff' : colors.green[50], borderBottomWidth: 1, borderColor: colors.gray[100] }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 7, backgroundColor: n.readAt ? 'transparent' : colors.green[600] }} />
          <View style={{ flex: 1, gap: 2 }}>
            <T weight="bold">{n.title}</T>
            <T size={13} color={colors.gray[600]}>
              {n.body}
            </T>
            <T size={11} color={colors.textSubtle}>
              {f.relative(n.createdAt)}
            </T>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
