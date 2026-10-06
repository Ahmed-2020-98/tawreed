import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ProductListing } from '@/components/store/product-listing';

export async function generateMetadata({ searchParams }: PageProps<'/[locale]/search'>): Promise<Metadata> {
  const q = (await searchParams).q;
  const t = await getTranslations('store');
  return { title: t('searchTitle', { q: String(q ?? '') }), robots: { index: false } };
}

export default async function SearchPage({ searchParams }: PageProps<'/[locale]/search'>) {
  const sp = await searchParams;
  const t = await getTranslations('store');
  const q = String(sp.q ?? '');
  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-black text-navy-900 sm:text-3xl">{q ? t('searchTitle', { q }) : t('title')}</h1>
      <ProductListing searchParams={sp} basePath="/search" />
    </div>
  );
}
