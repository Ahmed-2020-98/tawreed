import type { CategoryDto } from '@tawreed/contracts';
import { api, colors, deviceUrl, Loading, radii, T } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

/** Two-pane categories: top-level rail + subcategory grid. */
export default function Categories() {
  const t = useTranslations('mobile');
  const ts = useTranslations('store');
  const insets = useSafeAreaInsets();
  const { data = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => api.get<CategoryDto[]>('/public/categories'), staleTime: 300_000 });
  const top = data.filter((c) => !c.parentId);
  const [active, setActive] = useState<string>();
  const current = top.find((c) => c.slug === active) ?? top[0];
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <View style={{ padding: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderColor: colors.gray[100] }}>
        <T weight="black" size={22}>
          {t('tabs.categories')}
        </T>
        <Pressable onPress={() => router.push('/search')} style={{ height: 46, borderRadius: radii.lg, backgroundColor: colors.gray[50], borderWidth: 1, borderColor: colors.gray[200], flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
          <Search size={19} color={colors.gray[400]} />
          <T color={colors.gray[400]}>{t('searchPlaceholder')}</T>
        </Pressable>
      </View>
      {isLoading ? (
        <Loading />
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <ScrollView style={{ width: 108, flexGrow: 0, backgroundColor: colors.gray[50] }} contentContainerStyle={{ paddingVertical: 6 }}>
            {top.map((c) => {
              const on = c.slug === current?.slug;
              return (
                <Pressable key={c.slug} onPress={() => setActive(c.slug)} style={{ paddingVertical: 14, paddingHorizontal: 10, backgroundColor: on ? '#fff' : 'transparent', borderStartWidth: 3, borderColor: on ? colors.green[600] : 'transparent' }}>
                  <T size={13} weight={on ? 'extrabold' : 'semibold'} color={on ? colors.green[800] : colors.gray[600]} center>
                    {c.name}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
          {current && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 14 }}>
              <Pressable onPress={() => router.push(`/c/${current.slug}`)} style={{ height: 110, borderRadius: radii.xl, overflow: 'hidden', backgroundColor: colors.navy[900] }}>
                <Image source={deviceUrl(current.imageUrl)} style={{ position: 'absolute', inset: 0, opacity: 0.6 }} contentFit="cover" />
                <View style={{ flex: 1, justifyContent: 'flex-end', padding: 12 }}>
                  <T weight="black" size={18} color="#fff">
                    {current.name}
                  </T>
                  <T size={12} color="rgba(255,255,255,0.85)">
                    {ts('allIn', { name: current.name })}
                  </T>
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
                {current.children.map((s) => (
                  <View key={s.slug} style={{ width: '33.33%', padding: 5 }}>
                    <Pressable onPress={() => router.push(`/c/${s.slug}`)} style={{ alignItems: 'center', gap: 6 }}>
                      <Image source={deviceUrl(s.imageUrl?.replace('_md.', '_thumb.'))} style={{ width: '100%', aspectRatio: 1, borderRadius: radii.lg, backgroundColor: colors.gray[100] }} contentFit="cover" />
                      <T size={12} weight="semibold" center numberOfLines={2}>
                        {s.name}
                      </T>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
