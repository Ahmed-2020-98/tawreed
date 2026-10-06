import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CartView } from '@/components/cart/cart-view';
import { requireBuyer } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('cart'))('title'), robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<'/[locale]/cart'>) {
  const { locale } = await params;
  await requireBuyer(locale, '/cart');
  return (
    <div className="container-page py-8">
      <CartView />
    </div>
  );
}
