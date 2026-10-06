import { Tabs } from 'expo-router/js-tabs';
import { House, LayoutGrid, Package, ShoppingCart, UserRound } from 'lucide-react-native';
import { useTranslations } from 'use-intl';
import { TabBar } from '@tawreed/mobile';
import { useCartCount } from '@/lib/cart';

export default function TabsLayout() {
  const t = useTranslations('mobile.tabs');
  const { data: count = 0 } = useCartCount();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: ({ color, focused }) => <House color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="categories" options={{ title: t('categories'), tabBarIcon: ({ color, focused }) => <LayoutGrid color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="cart" options={{ title: t('cart'), tabBarBadge: count || undefined, tabBarIcon: ({ color, focused }) => <ShoppingCart color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="orders" options={{ title: t('orders'), tabBarIcon: ({ color, focused }) => <Package color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="account" options={{ title: t('account'), tabBarIcon: ({ color, focused }) => <UserRound color={color} size={24} strokeWidth={focused ? 2.4 : 1.8} /> }} />
    </Tabs>
  );
}
