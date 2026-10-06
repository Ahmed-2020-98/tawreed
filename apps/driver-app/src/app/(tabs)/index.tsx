import { api, colors, EmptyState, Row, Segmented, T, useFormat, useSession } from '@tawreed/mobile';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { ShipmentCard } from '@/components/shipment-card';
import { useDriverLive, useDriverShipments, useDriverSummary } from '@/lib/driver';
import { useLocationSharing } from '@/lib/location';

export default function Tasks() {
  const t = useTranslations('driver');
  const f = useFormat();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { me } = useSession();
  const summary = useDriverSummary();
  const [tab, setTab] = useState<'ACTIVE' | 'DONE'>('ACTIVE');
  const list = useDriverShipments(tab);
  useDriverLive();
  const online = summary.data?.driver.isOnline ?? false;
  const active = summary.data?.activeShipment;
  useLocationSharing(online, active?.id);

  const toggle = async (next: boolean) => {
    qc.setQueryData(['driver', 'summary'], (d: typeof summary.data) => (d ? { ...d, driver: { ...d.driver, isOnline: next } } : d));
    await api.patch('/driver/status', { isOnline: next }).catch(() => undefined);
    void summary.refetch();
  };
  const stats = [
    [t('assigned'), summary.data?.today.assigned ?? 0],
    [t('delivered'), summary.data?.today.delivered ?? 0],
    [t('failed'), summary.data?.today.failed ?? 0],
  ] as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 30, gap: 14 }} refreshControl={<RefreshControl refreshing={summary.isRefetching || list.isRefetching} onRefresh={() => { void summary.refetch(); void list.refetch(); }} tintColor={colors.navy[900]} />}>
      <View style={{ backgroundColor: colors.navy[900], paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 22, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, gap: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T color="rgba(255,255,255,0.65)" size={12}>
              {t('today')}
            </T>
            <T weight="extrabold" size={19} color="#fff">
              {me?.user.name}
            </T>
          </View>
          <Row gap={6} style={{ backgroundColor: online ? colors.green[400] : 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? colors.navy[950] : colors.gray[400] }} />
            <T size={12} weight="bold" color={online ? colors.navy[950] : '#fff'}>
              {online ? t('online') : t('offline')}
            </T>
          </Row>
        </Row>
        <Pressable onPress={() => void toggle(!online)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14 }}>
          <View style={{ flex: 1 }}>
            <T weight="bold" color="#fff">
              {online ? t('goOffline') : t('goOnline')}
            </T>
            <T size={11} color="rgba(255,255,255,0.6)">
              {t('onlineHint')}
            </T>
          </View>
          <Switch value={online} onValueChange={(v) => void toggle(v)} trackColor={{ true: colors.green[400], false: 'rgba(255,255,255,0.2)' }} thumbColor="#fff" />
        </Pressable>
        <Row>
          {stats.map(([k, v]) => (
            <View key={k} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 10, alignItems: 'center' }}>
              <T num weight="black" size={22} color="#fff">
                {v}
              </T>
              <T size={11} color="rgba(255,255,255,0.7)">
                {k}
              </T>
            </View>
          ))}
        </Row>
        {summary.data && Number(summary.data.cashToHandOver) > 0 && (
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={12} color="rgba(255,255,255,0.7)">
              {t('cashToHandOver')}
            </T>
            <T num weight="extrabold" color={colors.green[400]}>
              {f.money(summary.data.cashToHandOver)}
            </T>
          </Row>
        )}
      </View>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {active && (
          <>
            <T weight="extrabold" size={16}>
              {t('active')}
            </T>
            <ShipmentCard s={active} highlight />
          </>
        )}
        <Segmented value={tab} onChange={setTab} options={[{ value: 'ACTIVE', label: t('tasks') }, { value: 'DONE', label: t('history') }]} />
        {list.isLoading && <ActivityIndicator color={colors.navy[900]} />}
        {list.data?.data.filter((s) => s.id !== active?.id).map((s) => <ShipmentCard key={s.id} s={s} />)}
        {list.data && !list.data.data.length && !active && <EmptyState icon={<ClipboardList size={30} color={colors.green[700]} />} title={t('noTasks')} body={t('noTasksBody')} />}
      </View>
    </ScrollView>
  );
}
