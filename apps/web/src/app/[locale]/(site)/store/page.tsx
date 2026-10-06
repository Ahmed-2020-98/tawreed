import type { HomeDto, HomeSectionDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { ArrowLeft, BadgePercent, FileText, Star, Truck, Wallet } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { BannerCarousel } from '@/components/store/banner-carousel';
import { ProductCard, ProductGrid } from '@/components/store/product-card';
import { Link } from '@/i18n/navigation';
import { catalogContext } from '@/lib/catalog';
import { bannerHref } from '@/lib/links';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('store');
  return { title: t('title'), description: t('subtitle') };
}

function SectionTitle({ title, href, label }: { title: string; href?: string | null; label: string }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <h2 className="text-2xl font-black text-navy-900">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline">
          {label}
          <ArrowLeft className="size-4 ltr:rotate-180" />
        </Link>
      )}
    </div>
  );
}

async function Section({ s }: { s: HomeSectionDto }) {
  const tc = await getTranslations('common');
  if (!s.items.length) return null;
  switch (s.type) {
    case 'CATEGORIES':
      return (
        <section>
          <SectionTitle title={s.title} href={s.viewAll} label={tc('viewAll')} />
          <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {s.items.map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="group w-28 shrink-0 text-center sm:w-32">
                <span className="block aspect-square overflow-hidden rounded-full bg-white p-1.5 ring-1 ring-gray-200 transition group-hover:ring-2 group-hover:ring-brand-500">
                  {c.imageUrl && <img src={c.imageUrl.replace('_md.', '_thumb.')} alt="" className="size-full rounded-full object-cover" />}
                </span>
                <span className="mt-2 block text-sm font-bold text-gray-800 group-hover:text-brand-800">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'PRODUCTS':
    case 'DEALS':
    case 'BUY_AGAIN':
      return (
        <section>
          <SectionTitle title={s.title} href={s.type === 'DEALS' ? '/deals' : s.viewAll} label={tc('viewAll')} />
          <ProductGrid className="xl:grid-cols-5">
            {s.items.slice(0, 10).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductGrid>
        </section>
      );
    case 'BRANDS':
      return (
        <section>
          <SectionTitle title={s.title} href={s.viewAll} label={tc('viewAll')} />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {s.items.map((b) => (
              <Link key={b.slug} href={`/brands/${b.slug}`} className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-md">
                {b.logoUrl ? <img src={b.logoUrl} alt={b.name} className="max-h-full rounded-lg object-contain" /> : <span className="font-bold">{b.name}</span>}
              </Link>
            ))}
          </div>
        </section>
      );
    case 'SUPPLIERS':
      return (
        <section>
          <SectionTitle title={s.title} href="/suppliers" label={tc('viewAll')} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {s.items.slice(0, 8).map((sp) => (
              <Link key={sp.slug} href={`/suppliers/${sp.slug}`} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-md">
                <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">{sp.logoUrl && <img src={sp.logoUrl} alt="" className="size-full object-cover" />}</span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-gray-900">{sp.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                    <span className="num font-semibold text-gray-700">{sp.ratingAvg}</span> · {sp.city}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'BANNER_STRIP':
      return (
        <section className="grid gap-4 md:grid-cols-2">
          {s.items.slice(0, 2).map((b) => (
            <Link key={b.id} href={bannerHref(b)} className="group relative h-44 overflow-hidden rounded-3xl">
              <img src={b.imageUrl} alt="" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-navy-950/85 rtl:bg-gradient-to-r" />
              <div className="relative flex h-full max-w-xs flex-col justify-center gap-1 p-6">
                <p className="text-xl font-black text-white">{b.title}</p>
                {b.subtitle && <p className="text-sm text-white/75">{b.subtitle}</p>}
              </div>
            </Link>
          ))}
        </section>
      );
    default:
      return null;
  }
}

export default async function StoreHome() {
  const t = await getTranslations('header.topbar');
  const tn = await getTranslations('nav');
  const { api, city } = await catalogContext();
  const home = await api.get<HomeDto>('/public/home', { query: { city }, cache: 'no-store' });
  const strip = [
    { icon: Truck, label: t('delivery'), href: '/pages/delivery' },
    { icon: Wallet, label: t('payLater'), href: '/pay-later' },
    { icon: BadgePercent, label: tn('deals'), href: '/deals' },
    { icon: FileText, label: tn('rfq'), href: '/rfq/new' },
  ];
  return (
    <div className="container-page space-y-12 py-6">
      {home.banners.length > 0 && <BannerCarousel banners={home.banners} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {strip.map((s) => (
          <Link key={s.label} href={s.href} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 transition hover:border-brand-300">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <s.icon className="size-5" />
            </span>
            <span className="text-sm font-bold leading-snug text-gray-800">{s.label}</span>
          </Link>
        ))}
      </div>
      {home.sections.map((s) => (
        <Section key={s.id} s={s} />
      ))}
    </div>
  );
}
