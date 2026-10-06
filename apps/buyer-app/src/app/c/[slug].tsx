import type { CategoryDto } from '@tawreed/contracts';
import { api, Chip, Header } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { ProductList } from '@/components/store/product-list';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTranslations('store');
  const deals = slug === 'deals';
  const cat = useQuery({ queryKey: ['category', slug], queryFn: () => api.get<CategoryDto>(`/public/categories/${slug}`), enabled: !deals });
  return (
    <View style={{ flex: 1 }}>
      <Header title={deals ? t('dealsTitle') : cat.data?.name} />
      <ProductList
        base={deals ? { onDeal: true } : { category: slug }}
        header={
          cat.data?.children.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {cat.data.children.map((c) => (
                <Chip key={c.slug} label={c.name} onPress={() => router.push(`/c/${c.slug}`)} />
              ))}
            </ScrollView>
          ) : undefined
        }
      />
    </View>
  );
}
