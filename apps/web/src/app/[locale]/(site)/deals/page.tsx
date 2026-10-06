import type { Metadata } from 'next';
import { BadgePercent } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ProductListing } from '@/components/store/product-listing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('store');
  return { title: t('dealsTitle'), description: t('dealsSubtitle') };
}

export default async function DealsPage({ searchParams }: PageProps<'/[locale]/deals'>) {
  const t = await getTranslations('store');
  return (
    <div className="container-page py-8">
      <header className="grain relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-l from-red-600 to-red-500 px-6 py-8 text-white sm:px-10 rtl:bg-gradient-to-r">
        <BadgePercent className="absolute -bottom-6 end-6 size-40 opacity-15" />
        <h1 className="text-3xl font-black sm:text-4xl">{t('dealsTitle')}</h1>
        <p className="mt-2 text-white/85">{t('dealsSubtitle')}</p>
      </header>
      <ProductListing searchParams={await searchParams} base={{ onDeal: true }} basePath="/deals" />
    </div>
  );
}
