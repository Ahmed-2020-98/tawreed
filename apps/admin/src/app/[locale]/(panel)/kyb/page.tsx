import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { KybQueue } from '@/components/pages/kyb';

export async function generateMetadata({ params }: PageProps<'/[locale]/kyb'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('kyb') };
}

export default function Page() {
  return <KybQueue />;
}
