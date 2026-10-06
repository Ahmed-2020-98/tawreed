import type { Metadata } from 'next';
import { BarChart3, HandCoins, ShoppingBag, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button, Card } from '@tawreed/ui';
import { SupplierApplicationForm } from '@/components/content/forms';
import { PageHero } from '@/components/content/page-hero';
import { seedImage } from '@/lib/media';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.sell');
  return { title: t('title'), description: t('subtitle') };
}

export default async function SellPage() {
  const t = await getTranslations('pages.sell');
  const benefits = [
    { icon: ShoppingBag, t: t('benefits.b1'), b: t('benefits.b1Body') },
    { icon: HandCoins, t: t('benefits.b2'), b: t('benefits.b2Body') },
    { icon: Truck, t: t('benefits.b3'), b: t('benefits.b3Body') },
    { icon: BarChart3, t: t('benefits.b4'), b: t('benefits.b4Body') },
  ];
  return (
    <>
      <PageHero tone="navy" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} image={seedImage('hero-warehouse', 'full')}>
        <Button asChild size="lg" variant="accent">
          <a href="#apply">{t('cta')}</a>
        </Button>
        <span className="self-center text-sm font-semibold text-white/70">{t('commission')}</span>
      </PageHero>
      <section className="container-page grid gap-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <Card key={b.t} className="p-6">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <b.icon className="size-6" />
            </span>
            <h3 className="mt-4 text-lg font-extrabold text-navy-900">{b.t}</h3>
            <p className="mt-2 text-sm leading-7 text-gray-600">{b.b}</p>
          </Card>
        ))}
      </section>
      <section className="bg-white py-16">
        <div className="container-page">
          <h2 className="mb-10 text-center text-3xl font-black text-navy-900">{t('steps.title')}</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {(['s1', 's2', 's3'] as const).map((s, i) => (
              <li key={s} className="rounded-3xl bg-sand-50 p-6">
                <span className="num text-5xl font-black text-sand-300">0{i + 1}</span>
                <h3 className="mt-3 text-xl font-extrabold text-navy-900">{t(`steps.${s}`)}</h3>
                <p className="mt-2 leading-7 text-gray-600">{t(`steps.${s}Body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section id="apply" className="container-page scroll-mt-40 py-16">
        <Card className="mx-auto max-w-3xl p-6 sm:p-10">
          <h2 className="mb-6 text-2xl font-black text-navy-900">{t('formTitle')}</h2>
          <SupplierApplicationForm />
        </Card>
      </section>
    </>
  );
}
