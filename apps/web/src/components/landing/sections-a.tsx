import type { CategoryDto, LandingDto } from '@tawreed/contracts';
import { Button } from '@tawreed/ui';
import { ArrowLeft, Building2, CheckCircle2, ClipboardList, CreditCard, PackageCheck, Store, UserPlus, UtensilsCrossed } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { seedImage } from '@/lib/media';
import { CountUp } from './count-up';
import { SectionHeading } from './section-heading';

export function StatsBand({ stats }: { stats: LandingDto['stats'] }) {
  return (
    <section className="relative bg-navy-900">
      <div className="bg-dots absolute inset-0 opacity-20 [--tw:0]" aria-hidden />
      <div className="container-page relative grid grid-cols-2 gap-y-2 py-10 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.key} className="px-4 py-3 text-center">
            <p className="text-3xl font-black text-white sm:text-4xl">
              <CountUp value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-sm font-semibold text-white/65">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function CategoriesSection({ categories }: { categories: CategoryDto[] }) {
  const t = await getTranslations('landing.categories');
  const tc = await getTranslations('common');
  const [first, ...rest] = categories;
  return (
    <section className="container-page py-20">
      <SectionHeading
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Link href="/categories" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:gap-2.5 transition-all">
            {tc('viewAll')}
            <ArrowLeft className="size-4 ltr:rotate-180" />
          </Link>
        }
      />
      <div className="grid auto-rows-[11rem] grid-cols-2 gap-4 lg:grid-cols-5">
        {first && (
          <CategoryTile category={first} className="col-span-2 row-span-2" big label={tc('productsCount', { count: first.productCount })} />
        )}
        {rest.slice(0, 6).map((c) => (
          <CategoryTile key={c.slug} category={c} label={tc('productsCount', { count: c.productCount })} />
        ))}
      </div>
    </section>
  );
}

function CategoryTile({ category, className = '', big, label }: { category: CategoryDto; className?: string; big?: boolean; label: string }) {
  return (
    <Link href={`/c/${category.slug}`} className={`group relative overflow-hidden rounded-2xl bg-navy-900 ${className}`}>
      {category.imageUrl && <img src={category.imageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-90 transition duration-700 group-hover:scale-105 group-hover:opacity-100" />}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className={`font-extrabold text-white ${big ? 'text-3xl' : 'text-lg'}`}>{category.name}</p>
        <p className="num mt-0.5 text-xs font-semibold text-white/70">{label}</p>
      </div>
      <span className="absolute end-3 top-3 grid size-9 translate-y-1 place-items-center rounded-full bg-white/90 text-navy-900 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
        <ArrowLeft className="size-4 ltr:rotate-180" />
      </span>
    </Link>
  );
}

export async function HowItWorks() {
  const t = await getTranslations('landing.how');
  const steps = [
    { icon: UserPlus, title: t('s1'), body: t('s1Body') },
    { icon: ClipboardList, title: t('s2'), body: t('s2Body') },
    { icon: CreditCard, title: t('s3'), body: t('s3Body') },
    { icon: PackageCheck, title: t('s4'), body: t('s4Body') },
  ];
  return (
    <section className="bg-white py-20">
      <div className="container-page">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} align="center" />
        <ol className="relative grid gap-8 md:grid-cols-4">
          <div aria-hidden className="rule-dashed absolute inset-x-[12%] top-8 hidden md:block" />
          {steps.map((s, i) => (
            <li key={s.title} className="relative text-center">
              <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-sand-100 text-brand-700 ring-8 ring-white">
                <s.icon className="size-7" />
                <span className="num absolute -end-2 -top-2 grid size-7 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span>
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-navy-900">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-gray-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export async function Segments() {
  const t = await getTranslations('landing.segments');
  const items = [
    { icon: Store, title: t('retail'), body: t('retailBody'), img: seedImage('hero-market') },
    { icon: UtensilsCrossed, title: t('horeca'), body: t('horecaBody'), img: seedImage('banner-horeca') },
    { icon: Building2, title: t('corporate'), body: t('corporateBody'), img: seedImage('hero-warehouse') },
  ];
  return (
    <section className="container-page py-20">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />
      <div className="grid gap-5 lg:grid-cols-3">
        {items.map((s) => (
          <article key={s.title} className="group overflow-hidden rounded-3xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-xl">
            <div className="relative h-52 overflow-hidden">
              <img src={s.img} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute start-4 top-4 grid size-11 place-items-center rounded-xl bg-white text-brand-700 shadow-md">
                <s.icon className="size-5" />
              </span>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-extrabold text-navy-900">{s.title}</h3>
              <p className="mt-2 leading-7 text-gray-600">{s.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export async function RfqSection() {
  const t = await getTranslations('landing.rfq');
  const quotes = [
    { name: t('demo.q1'), price: '18,150', lead: 5, best: true },
    { name: t('demo.q2'), price: '18,400', lead: 4 },
    { name: t('demo.q3'), price: '18,920', lead: 6 },
  ];
  return (
    <section className="relative overflow-hidden bg-sand-50 py-20">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-6" />
          <p className="text-lg leading-8 text-gray-600">{t('body')}</p>
          <ul className="mt-6 space-y-3">
            {[t('point1'), t('point2'), t('point3')].map((p) => (
              <li key={p} className="flex items-center gap-3 font-semibold text-navy-900">
                <CheckCircle2 className="size-5 text-brand-600" />
                {p}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link href="/rfq/new">
              {t('cta')}
              <ArrowLeft className="ltr:rotate-180" />
            </Link>
          </Button>
        </div>
        {/* Illustrative quote comparison */}
        <div className="relative rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-200/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="num text-xs font-bold text-gray-400">RFQ-2026-000031</p>
              <p className="mt-1 text-lg font-extrabold text-navy-900">{t('demo.title')}</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">{t('demo.count', { count: quotes.length })}</span>
          </div>
          <div className="rule-dashed my-5" />
          <ul className="space-y-3">
            {quotes.map((q) => (
              <li key={q.name} className={`flex items-center justify-between rounded-2xl border p-4 ${q.best ? 'border-brand-500 bg-brand-50/60' : 'border-gray-200'}`}>
                <div>
                  <p className="font-bold text-gray-900">{q.name}</p>
                  <p className="text-xs text-gray-500">{t('demo.lead', { count: q.lead })}</p>
                </div>
                <div className="text-end">
                  <p className="num text-xl font-extrabold text-navy-900">{q.price}</p>
                  <p className="text-xs text-gray-500">{t('demo.unit')}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
