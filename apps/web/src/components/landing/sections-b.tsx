import type { BlogPostSummaryDto, FaqDto, PublicSettingsDto, SupplierPublicDto, TestimonialDto } from '@tawreed/contracts';
import { Accordion, Avatar, Button } from '@tawreed/ui';
import { ArrowLeft, Quote, Star } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { AppBadges } from '../site/app-badges';
import { SectionHeading } from './section-heading';

export async function PayLaterSection() {
  const t = await getTranslations('landing.payLater');
  return (
    <section className="container-page py-20">
      <div className="grain relative overflow-hidden rounded-[2rem] bg-brand-950 px-6 py-12 sm:px-12 lg:py-16">
        <div aria-hidden className="absolute -top-32 end-[-10%] size-[30rem] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow={t('eyebrow')} title={t('title')} tone="dark" className="mb-5" />
            <p className="text-lg leading-8 text-white/75">{t('body')}</p>
            <Button asChild size="lg" variant="accent" className="mt-8">
              <Link href="/pay-later">
                {t('cta')}
                <ArrowLeft className="ltr:rotate-180" />
              </Link>
            </Button>
          </div>
          <div className="mx-auto w-full max-w-md rounded-3xl bg-white/[0.07] p-6 ring-1 ring-white/15 backdrop-blur">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-white/60">{t('limit')}</p>
                <p className="num mt-1 text-4xl font-black text-white">157,300</p>
              </div>
              <p className="num text-sm text-white/50">/ 250,000</p>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[37%] rounded-full bg-gradient-to-l from-mint to-brand-500 rtl:bg-gradient-to-r" />
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                [t('used'), '92,700'],
                [t('terms'), t('termsValue')],
                [t('invoices'), '6'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/[0.06] p-3">
                  <dt className="text-[0.6875rem] text-white/55">{k}</dt>
                  <dd className="num mt-1 font-extrabold text-white">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-mint/15 px-4 py-3 text-sm">
              <span className="text-white/75">{t('due')}</span>
              <span className="num font-bold text-mint">14,820 · 12/10</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function SuppliersSection({ suppliers }: { suppliers: SupplierPublicDto[] }) {
  const t = await getTranslations('landing.suppliers');
  const dir = (await getLocale()) === 'ar' ? 'rtl' : 'ltr';
  const loop = [...suppliers, ...suppliers];
  return (
    <section className="overflow-hidden bg-white py-20">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          action={
            <Button asChild variant="outline">
              <Link href="/sell">{t('cta')}</Link>
            </Button>
          }
        />
      </div>
      {/* The track always scrolls LTR (translateX); each card keeps the page direction. */}
      <div dir="ltr" className="relative [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex w-max gap-4 hover:[animation-play-state:paused]">
          {loop.map((s, i) => (
            <Link key={`${s.slug}-${i}`} dir={dir} href={`/suppliers/${s.slug}`} className="flex w-72 shrink-0 items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-md">
              <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">{s.logoUrl && <img src={s.logoUrl} alt="" className="size-full object-cover" />}</span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-gray-900">{s.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <Star className="size-3.5 fill-amber-500 text-amber-500" />
                  <span className="num font-semibold text-gray-700">{s.ratingAvg}</span>
                  <span>· {s.city}</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function AppsSection({ settings }: { settings: PublicSettingsDto }) {
  const t = await getTranslations('landing.apps');
  const apps = [
    { img: '/brand/apps/buyer-icon.png', label: t('buyer') },
    { img: '/brand/apps/supplier-icon.png', label: t('supplier') },
    { img: '/brand/apps/driver-icon.png', label: t('driver') },
  ];
  return (
    <section className="container-page py-20">
      <div className="grid items-center gap-12 rounded-[2rem] bg-sand-100 px-6 py-12 sm:px-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-5" />
          <p className="text-lg leading-8 text-gray-700">{t('body')}</p>
          <AppBadges ios={settings.appLinks.buyerIos} android={settings.appLinks.buyerAndroid} className="mt-8" />
        </div>
        <div className="flex items-end justify-center gap-5">
          {apps.map((a, i) => (
            <div key={a.label} className="animate-float text-center" style={{ animationDelay: `${i * -2}s` }}>
              <img src={a.img} alt={a.label} className={`rounded-[22%] shadow-xl ring-1 ring-black/5 ${i === 0 ? 'size-32' : 'size-24'}`} />
              <p className="mt-3 text-sm font-bold text-navy-900">{a.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function TestimonialsSection({ items }: { items: TestimonialDto[] }) {
  const t = await getTranslations('landing.testimonials');
  return (
    <section className="bg-white py-20">
      <div className="container-page">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} align="center" />
        <div className="grid gap-5 md:grid-cols-3">
          {items.slice(0, 3).map((x, i) => (
            <figure key={x.id} className={`relative rounded-3xl p-7 ${i === 1 ? 'bg-navy-900 text-white md:-translate-y-4' : 'border border-gray-200 bg-white'}`}>
              <Quote className={`size-9 ${i === 1 ? 'text-mint' : 'text-brand-200'}`} />
              <blockquote className={`mt-4 leading-8 ${i === 1 ? 'text-white/85' : 'text-gray-700'}`}>{x.quote}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <Avatar name={x.name} src={x.avatarUrl} size={44} className={i === 1 ? 'bg-white/15 text-white' : ''} />
                <div>
                  <p className="font-bold">{x.name}</p>
                  <p className={`text-sm ${i === 1 ? 'text-white/60' : 'text-gray-500'}`}>
                    {x.role} · {x.company}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function FaqSection({ faqs }: { faqs: FaqDto[] }) {
  const t = await getTranslations('landing.faq');
  return (
    <section className="container-page grid gap-10 py-20 lg:grid-cols-[1fr_1.6fr]">
      <div>
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} className="mb-6" />
        <Button asChild variant="outline">
          <Link href="/faq">{t('more')}</Link>
        </Button>
      </div>
      <Accordion items={faqs.slice(0, 6).map((f) => ({ id: f.id, title: f.question, content: f.answer }))} defaultValue={faqs[0]?.id} />
    </section>
  );
}

export async function BlogSection({ posts }: { posts: BlogPostSummaryDto[] }) {
  const t = await getTranslations('landing.blog');
  const tc = await getTranslations('common');
  return (
    <section className="container-page pb-4 pt-8">
      <SectionHeading
        eyebrow={t('eyebrow')}
        title={t('title')}
        action={
          <Link href="/blog" className="text-sm font-bold text-brand-700 hover:underline">
            {tc('viewAll')}
          </Link>
        }
      />
      <div className="grid gap-6 md:grid-cols-3">
        {posts.slice(0, 3).map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
            <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-gray-100">{p.coverUrl && <img src={p.coverUrl} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />}</div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-500">
              {p.tags[0] && <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-brand-800">{p.tags[0]}</span>}
              <span>{t('minutes', { count: p.readingMinutes })}</span>
            </div>
            <h3 className="mt-2 text-lg font-extrabold leading-8 text-navy-900 group-hover:text-brand-800">{p.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function FinalCta() {
  const t = await getTranslations('landing.cta');
  return (
    <section className="container-page pt-16">
      <div className="grain relative overflow-hidden rounded-[2rem] bg-brand-700 px-6 py-14 text-center sm:px-12">
        <img src="/brand/logo-mark-white.svg" alt="" aria-hidden className="pointer-events-none absolute -bottom-16 end-[-4%] w-80 opacity-10" />
        <h2 className="text-balance text-3xl font-black text-white sm:text-4xl">{t('title')}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">{t('body')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="inverse">
            <Link href="/register">{t('primary')}</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
            <Link href="/contact">{t('secondary')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
