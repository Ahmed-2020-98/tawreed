import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { requireBuyer } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('checkout'))('title'), robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<'/[locale]/checkout'>) {
  const { locale } = await params;
  await requireBuyer(locale, '/checkout');
  return (
    <div className="container-page py-8">
      <CheckoutForm />
    </div>
  );
}
