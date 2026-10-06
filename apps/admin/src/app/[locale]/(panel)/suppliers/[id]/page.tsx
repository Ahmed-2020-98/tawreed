import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SupplierDetailPage } from '@/components/pages/suppliers';

export async function generateMetadata({ params }: PageProps<'/[locale]/suppliers/[id]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('suppliers') };
}

export default async function Page({ params }: PageProps<'/[locale]/suppliers/[id]'>) {
  const { id } = await params;
  return <SupplierDetailPage id={id} />;
}
