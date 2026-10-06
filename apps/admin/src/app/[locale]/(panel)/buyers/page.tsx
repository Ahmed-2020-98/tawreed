import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BuyersList } from '@/components/pages/buyers';

export async function generateMetadata({ params }: PageProps<'/[locale]/buyers'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('buyers') };
}

export default function Page() {
  return <BuyersList />;
}
