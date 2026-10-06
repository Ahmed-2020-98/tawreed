import type { Metadata } from 'next';
import { BadgeCheck, CalendarClock, FileCheck2, Receipt, ShieldCheck, ShoppingCart, Wallet } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@tawreed/ui';
import { PageHero } from '@/components/content/page-hero';
import { PayLaterSection } from '@/components/landing/sections-b';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.payLater');
  return { title: t('title'), description: t('subtitle') };
}

export default async function PayLaterPage() {
  const t = await getTranslations('pages.payLater');
  const steps = [
    { icon: FileCheck2, k: 's1' },
    { icon: BadgeCheck, k: 's2' },
    { icon: ShoppingCart, k: 's3' },
    { icon: Receipt, k: 's4' },
  ] as const;
  return (
    <>
      <PageHero tone="green" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')}>
        <Button asChild size="lg" variant="accent">
          <Link href="/account/credit">{t('cta')}</Link>
        </Button>
      </PageHero>
      <section className="container-page grid grid-cols-2 gap-4 py-12 lg:grid-cols-4">
        {[
          [Wallet, t('features.f1')],
          [CalendarClock, t('features.f2')],
          [ShieldCheck, t('features.f3')],
          [Receipt, t('features.f4')],
        ].map(([Icon, label]) => {
          const I = Icon as typeof Wallet;
          return (
            <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <I className="size-6 text-brand-600" />
              <span className="font-extrabold text-navy-900">{label as string}</span>
            </div>
          );
        })}
      </section>
      <section className="container-page py-8">
        <h2 className="mb-8 text-3xl font-black text-navy-900">{t('how')}</h2>
        <ol className="grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.k} className="relative rounded-3xl bg-white p-6 ring-1 ring-gray-200">
              <span className="num absolute end-5 top-4 text-4xl font-black text-gray-100">{i + 1}</span>
              <s.icon className="size-8 text-brand-600" />
              <h3 className="mt-4 text-lg font-extrabold text-navy-900">{t(s.k)}</h3>
              <p className="mt-1 text-sm leading-7 text-gray-600">{t(`${s.k}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>
      <PayLaterSection />
    </>
  );
}
