import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AuthFlow } from '@/components/auth/auth-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('registerTitle'), robots: { index: false } };
}

export default function Page() {
  return (
    <Suspense>
      <AuthFlow mode="register" />
    </Suspense>
  );
}
