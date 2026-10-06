import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SuppliersList } from '@/components/pages/suppliers';

export async function generateMetadata({ params }: PageProps<'/[locale]/suppliers'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('suppliers') };
}

export default function Page() {
  return <SuppliersList />;
}
