import { colors, TabBar, useSession } from '@tawreed/mobile';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ClipboardList, Map, UserRound, Wallet } from 'lucide-react-native';
import { useTranslations } from 'use-intl';

export default function TabsLayout() {
  const t = useTranslations('mobile.tabs');
  const { status } = useSession();
  if (status === 'guest') return <Redirect href="/login" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} accent={colors.navy[900]} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('tasks'), tabBarIcon: ({ color, focused }) => <ClipboardList color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="map" options={{ title: t('map'), tabBarIcon: ({ color, focused }) => <Map color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="cash" options={{ title: t('cash'), tabBarIcon: ({ color, focused }) => <Wallet color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="account" options={{ title: t('account'), tabBarIcon: ({ color, focused }) => <UserRound color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
    </Tabs>
  );
}
