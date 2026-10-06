import type { BannerDto } from '@tawreed/contracts';
import { Button } from '@tawreed/ui';
import { ArrowLeft, BadgeCheck, Boxes, CircleDollarSign, FileText, ShieldCheck, Truck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { seedImage } from '@/lib/media';

export async function Hero({ banner, businesses }: { banner?: BannerDto; businesses: number }) {
  const t = await getTranslations('landing');
  const locale = await getLocale();
  const values = [
    { icon: CircleDollarSign, label: t('values.prices') },
    { icon: Truck, label: t('values.shipping') },
    { icon: Boxes, label: t('values.bulk') },
    { icon: ShieldCheck, label: t('values.payment') },
  ];
  const fmt = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');
  return (
    <section className="grain relative overflow-hidden bg-sand-100">
      {/* Oversized brand swoosh */}
      <img src="/brand/logo-mark.svg" alt="" aria-hidden className="pointer-events-none absolute -bottom-24 start-[-8%] w-[34rem] opacity-[0.06]" />
      <div aria-hidden className="absolute inset-y-0 end-0 hidden w-[46%] bg-gradient-to-l from-sand-200/70 to-transparent lg:block rtl:bg-gradient-to-r" />

      <div className="container-page relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white/70 px-3.5 py-1.5 text-sm font-bold text-sand-700 backdrop-blur">
            <BadgeCheck className="size-4 text-brand-600" />
            {t('hero.eyebrow')}
          </p>
          <h1 className="text-balance text-[2.6rem] font-black leading-[1.15] text-navy-900 sm:text-6xl sm:leading-[1.12]">
            {t('hero.title')}
            <span className="relative mt-1 block text-brand-700">
              {t('hero.titleAccent')}
              <svg aria-hidden viewBox="0 0 320 16" className="absolute -bottom-3 start-0 h-3 w-2/3 text-mint" preserveAspectRatio="none">
                <path d="M2 12C80 2 200 2 318 10" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-gray-700">{banner?.subtitle ?? t('hero.subtitle')}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-lg shadow-brand-900/15">
              <Link href="/store">
                {t('hero.ctaPrimary')}
                <ArrowLeft className="ltr:rotate-180" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-sand-300 bg-white/80">
              <Link href="/rfq/new">
                <FileText />
                {t('hero.ctaSecondary')}
              </Link>
            </Button>
          </div>

          <ul className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {values.map((v, i) => (
              <li key={v.label} className="animate-in fade-in slide-in-from-bottom-2 flex flex-col items-start gap-2 fill-mode-both" style={{ animationDelay: `${300 + i * 90}ms` }}>
                <span className="grid size-11 place-items-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-sand-200">
                  <v.icon className="size-5" />
                </span>
                <span className="text-sm font-bold text-navy-900">{v.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Collage */}
        <div className="relative mx-auto w-full max-w-xl animate-in fade-in zoom-in-95 duration-1000 lg:max-w-none">
          <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] shadow-2xl shadow-navy-900/20 ring-8 ring-white/60">
            <img src={banner?.imageUrl ?? seedImage('hero-warehouse')} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/40 via-transparent to-transparent" />
          </div>
          <div className="absolute -bottom-8 start-[-6%] hidden w-44 overflow-hidden rounded-2xl shadow-xl ring-4 ring-white sm:block">
            <img src={seedImage('product-sukkari-dates-premium', 'thumb')} alt="" className="aspect-square w-full object-cover" />
          </div>
          <div className="absolute -top-6 end-[-4%] hidden w-32 overflow-hidden rounded-2xl shadow-xl ring-4 ring-white sm:block">
            <img src={seedImage('product-green-coffee-brazil-17-18', 'thumb')} alt="" className="aspect-square w-full object-cover" />
          </div>

          {/* Floating "waybill" cards */}
          <div className="animate-float absolute start-[-4%] top-[14%] w-56 rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur sm:start-[-10%]">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{t('hero.cardOrder')}</span>
              <span className="num font-bold text-navy-900">TW-2026-000124</span>
            </div>
            <div className="rule-dashed my-3" />
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-700">
                <Truck className="size-4" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-gray-900">{t('hero.cardDelivered')}</p>
                <p className="num text-xs text-gray-500" dir="ltr">3 × 25 kg · 09:40</p>
              </div>
            </div>
          </div>
          <div className="animate-float absolute bottom-[12%] end-[-3%] w-52 rounded-2xl bg-navy-900 p-4 text-white shadow-xl [animation-delay:-3s] sm:end-[-8%]">
            <p className="text-xs text-white/60">{t('hero.cardCredit')}</p>
            <p className="num mt-1 text-2xl font-extrabold">42,500</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-[68%] rounded-full bg-mint" />
            </div>
          </div>
        </div>
      </div>

      <div className="container-page relative pb-8">
        <p className="text-sm font-semibold text-gray-600">
          <span className="me-2 inline-flex -space-x-2 align-middle rtl:space-x-reverse">
            {['bg-brand-600', 'bg-navy-700', 'bg-sand-500', 'bg-mint'].map((c) => (
              <span key={c} className={`inline-block size-7 rounded-full ring-2 ring-sand-100 ${c}`} />
            ))}
          </span>
          {t('hero.trust', { count: fmt.format(businesses) })}
        </p>
      </div>
    </section>
  );
}
