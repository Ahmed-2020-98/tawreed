import type { ProductCardDto, ProductFacetsDto } from '@tawreed/contracts';
import { api, Button, Chip, colors, EmptyState, Row, Sheet, T } from '@tawreed/mobile';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { PackageSearch, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslations } from 'use-intl';
import { ProductRow } from './product-card';

const SORTS = ['relevance', 'best_selling', 'price_asc', 'price_desc', 'newest'] as const;
type Filters = { sort: string; brand?: string; origin?: string; inStock?: boolean; onDeal?: boolean };

/** Infinite product list with brand/origin chips and a filter & sort sheet. */
export function ProductList({ base, header }: { base: Record<string, string | boolean>; header?: React.ReactElement }) {
  const t = useTranslations('store');
  const tm = useTranslations('mobile');
  const [f, setF] = useState<Filters>({ sort: 'relevance', ...(base.onDeal ? { onDeal: true } : {}) });
  const [open, setOpen] = useState(false);
  const query = { ...base, ...f, pageSize: 20 };
  const list = useInfiniteQuery({
    queryKey: ['products', query],
    queryFn: ({ pageParam }) => api.page<ProductCardDto>('/public/products', { query: { ...query, page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
  const facets = useQuery({ queryKey: ['facets', base], queryFn: () => api.get<ProductFacetsDto>('/public/products/facets', { query: base }) });
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProductRow p={item} />}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {header}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label={tm('filterSort')} icon={<SlidersHorizontal size={15} color={colors.gray[700]} />} onPress={() => setOpen(true)} />
              {facets.data?.origins.slice(0, 6).map((o) => (
                <Chip key={o.value} label={o.label} active={f.origin === o.value} onPress={() => setF((s) => ({ ...s, origin: s.origin === o.value ? undefined : o.value }))} />
              ))}
            </ScrollView>
            <T size={13} color={colors.textMuted} weight="semibold">
              {t('results', { count: total })}
            </T>
          </View>
        }
        ListEmptyComponent={list.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : <EmptyState icon={<PackageSearch size={32} color={colors.green[700]} />} title={t('searchEmpty')} body={t('searchEmptyBody')} />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={tm('filterSort')} footer={<Button title={t('showResults')} onPress={() => setOpen(false)} />}>
        <T weight="bold">{t('sort')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SORTS.map((s) => (
            <Chip key={s} label={t(`sorts.${s}`)} active={f.sort === s} onPress={() => setF((x) => ({ ...x, sort: s }))} />
          ))}
        </View>
        <T weight="bold">{t('availability')}</T>
        <Row>
          <Chip label={t('inStockOnly')} active={!!f.inStock} onPress={() => setF((x) => ({ ...x, inStock: !x.inStock || undefined }))} />
          <Chip label={t('dealsOnly')} active={!!f.onDeal} onPress={() => setF((x) => ({ ...x, onDeal: !x.onDeal || undefined }))} />
        </Row>
        {!!facets.data?.brands.length && !base.brand && (
          <>
            <T weight="bold">{t('brand')}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {facets.data.brands.map((b) => (
                <Chip key={b.value} label={`${b.label} (${b.count})`} active={f.brand === b.value} onPress={() => setF((x) => ({ ...x, brand: x.brand === b.value ? undefined : b.value }))} />
              ))}
            </View>
          </>
        )}
        <Pressable onPress={() => setF({ sort: 'relevance' })}>
          <T color={colors.red[600]} weight="bold" center>
            {t('clearFilters')}
          </T>
        </Pressable>
      </Sheet>
    </View>
  );
}
