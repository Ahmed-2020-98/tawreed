import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BuyerDetailPage } from '@/components/pages/buyers';

export async function generateMetadata({ params }: PageProps<'/[locale]/buyers/[id]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('buyers') };
}

export default async function Page({ params }: PageProps<'/[locale]/buyers/[id]'>) {
  const { id } = await params;
  return <BuyerDetailPage id={id} />;
}
