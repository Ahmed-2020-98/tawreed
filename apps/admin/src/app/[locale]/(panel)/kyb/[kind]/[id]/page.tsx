import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { KybReview } from '@/components/pages/kyb';

export async function generateMetadata({ params }: PageProps<'/[locale]/kyb/[kind]/[id]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('kyb') };
}

export default async function Page({ params }: PageProps<'/[locale]/kyb/[kind]/[id]'>) {
  const { kind, id } = await params;
  return <KybReview kind={kind} id={id} />;
}
