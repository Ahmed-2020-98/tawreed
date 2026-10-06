import { colors, TabBar, useRealtime, useSession } from '@tawreed/mobile';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { FileText, LayoutDashboard, Menu, Package, Tags } from 'lucide-react-native';
import type { ColorValue } from 'react-native';
import { useTranslations } from 'use-intl';

function TabIcon({ Icon, color, focused }: { Icon: typeof Package; color: ColorValue; focused: boolean }) {
  return <Icon color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} />;
}

export default function TabsLayout() {
  const t = useTranslations('mobile.tabs');
  const { status } = useSession();
  const qc = useQueryClient();
  // Orders, shipments and new RFQ invitations change server-side; refresh every supplier screen (tabs + pushed details).
  const refresh = () => void qc.invalidateQueries({ queryKey: ['supplier'] });
  useRealtime({ 'order.updated': refresh, 'shipment.updated': refresh, notification: refresh, poll: refresh }, status === 'authed');
  if (status === 'guest') return <Redirect href="/login" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} accent={colors.navy[900]} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('dashboard'), tabBarIcon: (p) => <TabIcon Icon={LayoutDashboard} {...p} /> }} />
      <Tabs.Screen name="orders" options={{ title: t('orders'), tabBarIcon: (p) => <TabIcon Icon={Package} {...p} /> }} />
      <Tabs.Screen name="quotes" options={{ title: t('quotes'), tabBarIcon: (p) => <TabIcon Icon={FileText} {...p} /> }} />
      <Tabs.Screen name="offers" options={{ title: t('offers'), tabBarIcon: (p) => <TabIcon Icon={Tags} {...p} /> }} />
      <Tabs.Screen name="more" options={{ title: t('more'), tabBarIcon: (p) => <TabIcon Icon={Menu} {...p} /> }} />
    </Tabs>
  );
}
