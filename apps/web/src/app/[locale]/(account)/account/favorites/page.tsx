import type { ProductCardDto } from '@tawreed/contracts';
import { Button, Card, EmptyState } from '@tawreed/ui';
import { Heart } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/account/page-header';
import { ProductCard, ProductGrid } from '@/components/store/product-card';
import { Link } from '@/i18n/navigation';
import { serverApi } from '@/lib/api';

export default async function FavoritesPage({ params }: PageProps<'/[locale]/account/favorites'>) {
  const { locale } = await params;
  const [api, t, tc] = await Promise.all([serverApi(locale), getTranslations('account.favorites'), getTranslations('store')]);
  const res = await api.raw<ProductCardDto[]>('GET', '/buyer/favorites', { cache: 'no-store' });
  const items = res.data;
  return (
    <>
      <PageHeader title={t('title')} />
      {items.length ? (
        <ProductGrid className="xl:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ProductGrid>
      ) : (
        <Card>
          <EmptyState
            icon={<Heart />}
            title={t('empty')}
            description={t('emptyBody')}
            action={
              <Button asChild>
                <Link href="/store">{tc('title')}</Link>
              </Button>
            }
          />
        </Card>
      )}
    </>
  );
}
