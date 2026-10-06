import type { ProductCardDto } from '@tawreed/contracts';
import { api, colors, EmptyState, Screen } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react-native';
import { useTranslations } from 'use-intl';
import { ProductRow } from '@/components/store/product-card';

export default function Favorites() {
  const t = useTranslations('account.favorites');
  const { data = [], refetch, isRefetching } = useQuery({ queryKey: ['favorites'], queryFn: () => api.get<ProductCardDto[]>('/buyer/favorites') });
  return (
    <Screen title={t('title')} refreshing={isRefetching} onRefresh={() => void refetch()}>
      {data.length === 0 && <EmptyState icon={<Heart size={32} color={colors.green[700]} />} title={t('empty')} body={t('emptyBody')} />}
      {data.map((p) => (
        <ProductRow key={p.id} p={p} />
      ))}
    </Screen>
  );
}
