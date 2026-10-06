import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { colors } from '../theme';
import { T } from './text';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Mockup-style tab bar: white, thin top border, active icon + bold label in the app accent, optional badge. */
export function TabBar({ state, descriptors, navigation, accent = colors.green[700] }: BottomTabBarProps & { accent?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.gray[100], paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10) }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const focused = state.index === index;
        const color = focused ? accent : colors.gray[400];
        const badge = options.tabBarBadge;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={String(options.title ?? route.name)}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}
          >
            <View>
              {options.tabBarIcon?.({ focused, color, size: 24 })}
              {badge != null && badge !== 0 && (
                <View style={{ position: 'absolute', top: -5, end: -10, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.green[600], alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' }}>
                  <T num size={10} weight="bold" color="#fff">
                    {String(badge)}
                  </T>
                </View>
              )}
            </View>
            <T size={11} weight={focused ? 'bold' : 'semibold'} color={focused ? accent : colors.gray[500]}>
              {String(options.title ?? route.name)}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
