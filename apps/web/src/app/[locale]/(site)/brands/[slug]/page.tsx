import type { BrandDto } from '@tawreed/contracts';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ProductListing } from '@/components/store/product-listing';
import { publicApi } from '@/lib/api';

export default async function BrandPage({ params, searchParams }: PageProps<'/[locale]/brands/[slug]'>) {
  const { locale, slug } = await params;
  const t = await getTranslations('store');
  const brands = await publicApi(locale).get<BrandDto[]>('/public/brands', { next: { revalidate: 300 } });
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) notFound();
  return (
    <div className="container-page py-8">
      <header className="mb-8 flex items-center gap-5 rounded-3xl border border-gray-200 bg-white p-6">
        {brand.logoUrl && <img src={brand.logoUrl} alt="" className="size-20 rounded-2xl object-cover" />}
        <div>
          <h1 className="text-2xl font-black text-navy-900 sm:text-3xl">{t('brandTitle', { name: brand.name })}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('results', { count: brand.productCount })}</p>
        </div>
      </header>
      <ProductListing searchParams={await searchParams} base={{ brand: slug }} basePath={`/brands/${slug}`} hideFilters={['brand']} />
    </div>
  );
}
