import type { SupplierPublicDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { BadgeCheck, CalendarDays, MapPin, Star, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ProductListing } from '@/components/store/product-listing';
import { publicApi } from '@/lib/api';
import { formatters } from '@/lib/format';

const getSupplier = (locale: string, slug: string) => publicApi(locale).get<SupplierPublicDto>(`/public/suppliers/${slug}`, { next: { revalidate: 300 } }).catch(() => null);

export async function generateMetadata({ params }: PageProps<'/[locale]/suppliers/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const s = await getSupplier(locale, slug);
  return s ? { title: s.name, description: s.description ?? undefined } : {};
}

export default async function SupplierPage({ params, searchParams }: PageProps<'/[locale]/suppliers/[slug]'>) {
  const { locale, slug } = await params;
  const s = await getSupplier(locale, slug);
  if (!s) notFound();
  const [t, tc] = await Promise.all([getTranslations('store'), getTranslations('common')]);
  const f = formatters(locale);
  return (
    <div className="container-page py-8">
      <header className="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
        <div className="grain h-32 bg-gradient-to-l from-navy-950 via-navy-900 to-brand-800 rtl:bg-gradient-to-r" />
        <div className="flex flex-wrap items-end gap-5 px-6 pb-6">
          <span className="-mt-12 block size-24 overflow-hidden rounded-3xl bg-white ring-4 ring-white">{s.logoUrl && <img src={s.logoUrl} alt="" className="size-full object-cover" />}</span>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-black text-navy-900 sm:text-3xl">
              {s.name}
              <BadgeCheck className="size-6 text-brand-600" />
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">{s.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-bold text-amber-700">
              <Star className="size-4 fill-current" />
              <span className="num">{s.ratingAvg}</span> · {t('reviews', { count: s.ratingCount })}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-700">
              <MapPin className="size-4" />
              {s.city}
            </span>
            {s.foundedYear && (
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 font-semibold text-gray-700">
                <CalendarDays className="size-4" />
                <span className="num">{t('founded', { year: s.foundedYear })}</span>
              </span>
            )}
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="mb-2 text-xs font-bold text-gray-500">{t('coverage')}</p>
          <div className="flex flex-wrap gap-2">
            {s.coverage.map((c) => (
              <span key={c.citySlug} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs">
                <Truck className="size-3.5 text-brand-600" />
                <span className="font-bold text-gray-800">{c.cityName}</span>
                <span className="num text-gray-500">
                  · {tc('day', { count: c.leadTimeDays })} · {Number(c.deliveryFee) ? f.money(c.deliveryFee) : tc('free')}
                </span>
              </span>
            ))}
          </div>
          <p className="num mt-3 text-sm font-semibold text-brand-700">
            {t('minOrder')}: {f.money(s.minOrderValue)}
          </p>
        </div>
      </header>
      <h2 className="mb-5 mt-10 text-2xl font-black text-navy-900">{t('supplierProducts')}</h2>
      <ProductListing searchParams={await searchParams} base={{ supplier: slug }} basePath={`/suppliers/${slug}`} />
    </div>
  );
}
