import type { SupplierDashboardDto } from '@tawreed/contracts';
import { api, Card, colors, Row, T, useFormat, useSession } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Clock, FileText, PackageCheck, Star, Truck, TriangleAlert } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { SupplierOrderRow } from '@/components/order-row';

export default function Dashboard() {
  const t = useTranslations('supplier');
  const f = useFormat();
  const insets = useSafeAreaInsets();
  const { me } = useSession();
  const { data: d, refetch, isRefetching } = useQuery({ queryKey: ['supplier', 'dashboard'], queryFn: () => api.get<SupplierDashboardDto>('/supplier/dashboard'), refetchInterval: 60_000 });
  const tiles = d
    ? [
        { icon: Clock, label: t('pending'), value: d.pendingAcceptance, tone: colors.amber[600], href: '/orders?tab=NEW' },
        { icon: PackageCheck, label: t('preparing'), value: d.inPreparation + d.readyForDispatch, tone: colors.blue[600], href: '/orders?tab=IN_PROGRESS' },
        { icon: Truck, label: t('shipping'), value: d.outForDelivery, tone: colors.navy[900], href: '/orders?tab=SHIPPING' },
        { icon: FileText, label: t('openRfqs'), value: d.openRfqs, tone: colors.green[700], href: '/quotes' },
      ]
    : [];
  const max = Math.max(1, ...(d?.salesSeries.map((p) => Number(p.value)) ?? [1]));
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 30, gap: 14 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.navy[900]} />}>
      <View style={{ backgroundColor: colors.navy[900], paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: 64, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <T color="rgba(255,255,255,0.65)" size={12}>
          {me?.context.name}
        </T>
        <T weight="extrabold" size={20} color="#fff">
          {t('hello', { name: me?.user.name.split(' ')[0] ?? '' })}
        </T>
        <Row style={{ marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <T size={12} color="rgba(255,255,255,0.65)">
              {t('todaySales')}
            </T>
            <T num weight="black" size={24} color="#fff">
              {f.money(d?.today.sales ?? 0)}
            </T>
            <T num size={12} color={colors.green[400]}>
              {d?.today.orders ?? 0} {t('orders')}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <T size={12} color="rgba(255,255,255,0.65)">
              {t('monthSales')}
            </T>
            <T num weight="black" size={24} color="#fff">
              {f.money(d?.month.sales ?? 0, { decimals: 0 })}
            </T>
            <T num size={12} color={colors.green[400]}>
              {d?.month.orders ?? 0} {t('orders')}
            </T>
          </View>
        </Row>
      </View>
      <View style={{ marginTop: -46, paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiles.map((x) => (
          <Pressable key={x.label} onPress={() => router.push(x.href as never)} style={{ width: '48%', flexGrow: 1 }}>
            <Card pad={14} style={{ gap: 6 }}>
              <x.icon size={20} color={x.tone} />
              <T num weight="black" size={24} color={colors.navy[900]}>
                {x.value}
              </T>
              <T size={12} color={colors.textMuted}>
                {x.label}
              </T>
            </Card>
          </Pressable>
        ))}
      </View>
      {d && (
        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          <Row>
            <Card pad={12} style={{ flex: 1, gap: 2 }}>
              <Row gap={4}>
                <Star size={14} color={colors.amber[500]} fill={colors.amber[500]} />
                <T num weight="black" size={18}>
                  {d.ratingAvg}
                </T>
              </Row>
              <T size={11} color={colors.textMuted}>
                {t('rating')} · {d.ratingCount}
              </T>
            </Card>
            <Card pad={12} style={{ flex: 1, gap: 2 }}>
              <T num weight="black" size={18}>
                {Math.round(Number(d.acceptanceRate) * 100)}%
              </T>
              <T size={11} color={colors.textMuted}>
                {t('acceptance')}
              </T>
            </Card>
            <Card pad={12} style={{ flex: 1, gap: 2, backgroundColor: d.lowStockOffers ? colors.amber[50] : '#fff' }}>
              <Row gap={4}>
                {d.lowStockOffers > 0 && <TriangleAlert size={14} color={colors.amber[600]} />}
                <T num weight="black" size={18}>
                  {d.lowStockOffers}
                </T>
              </Row>
              <T size={11} color={colors.textMuted}>
                {t('lowStock')}
              </T>
            </Card>
          </Row>
          <Card pad={14} style={{ gap: 10 }}>
            <T weight="extrabold">{t('salesChart')}</T>
            <View style={{ height: 90, flexDirection: 'row', alignItems: 'flex-end', gap: 2, direction: 'ltr' }}>
              {d.salesSeries.map((p) => (
                <View key={p.date} style={{ flex: 1, height: `${Math.max(3, (Number(p.value) / max) * 100)}%`, backgroundColor: Number(p.value) ? colors.navy[700] : colors.gray[200], borderRadius: 3 }} />
              ))}
            </View>
          </Card>
          <Row>
            <Card pad={12} style={{ flex: 1 }}>
              <T size={11} color={colors.textMuted}>
                {t('pendingPayout')}
              </T>
              <T num weight="extrabold">{f.money(d.pendingPayout)}</T>
            </Card>
            <Card pad={12} style={{ flex: 1 }}>
              <T size={11} color={colors.textMuted}>
                {t('cashWithDrivers')}
              </T>
              <T num weight="extrabold">{f.money(d.cashWithDrivers)}</T>
            </Card>
          </Row>
          <T weight="extrabold" size={16}>
            {t('recentOrders')}
          </T>
          {d.recentOrders.slice(0, 5).map((o) => (
            <SupplierOrderRow key={o.id} o={o} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
