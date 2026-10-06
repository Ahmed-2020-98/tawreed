import type { SearchSuggestionsDto } from '@tawreed/contracts';
import { api, colors, Input } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScanLine, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { ProductList } from '@/components/store/product-list';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const t = useTranslations('mobile');
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState(params.q ?? '');
  const [term, setTerm] = useState(params.q ?? '');
  useEffect(() => {
    const id = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);
  useQuery({ queryKey: ['suggest', term], queryFn: () => api.get<SearchSuggestionsDto>('/public/search/suggest', { query: { q: term } }), enabled: term.length >= 2 });
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#fff', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Input containerStyle={{ flex: 1 }} autoFocus value={q} onChangeText={setQ} placeholder={t('searchPlaceholder')} start={<Search size={18} color={colors.gray[400]} />} returnKeyType="search" onSubmitEditing={() => setTerm(q.trim())} />
        <Pressable accessibilityLabel={t('scan')} onPress={() => router.push('/scan')} style={{ width: 50, height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.gray[200], alignItems: 'center', justifyContent: 'center' }}>
          <ScanLine size={22} color={colors.navy[900]} />
        </Pressable>
      </View>
      {term.length >= 2 ? <ProductList key={term} base={{ q: term }} /> : <View style={{ flex: 1 }} />}
    </View>
  );
}
