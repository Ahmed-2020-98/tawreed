import type { SupplierPublicDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { MapPin, Star } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { publicApi } from '@/lib/api';
import { formatters } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('store');
  return { title: t('suppliersTitle'), description: t('suppliersSubtitle') };
}

export default async function SuppliersPage() {
  const locale = await getLocale();
  const [t, tp, tc] = await Promise.all([getTranslations('store'), getTranslations('pages.suppliers'), getTranslations('common')]);
  const res = await publicApi(locale).raw<SupplierPublicDto[]>('GET', '/public/suppliers', { query: { pageSize: 50 }, next: { revalidate: 300 } });
  const f = formatters(locale);
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-black text-navy-900">{t('suppliersTitle')}</h1>
      <p className="mt-2 text-gray-600">{t('suppliersSubtitle')}</p>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {res.data.map((s) => (
          <Link key={s.slug} href={`/suppliers/${s.slug}`} className="group overflow-hidden rounded-3xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="h-20 bg-gradient-to-l from-navy-900 to-brand-800 rtl:bg-gradient-to-r" />
            <div className="-mt-9 px-5 pb-5">
              <span className="block size-16 overflow-hidden rounded-2xl bg-white ring-4 ring-white">{s.logoUrl && <img src={s.logoUrl} alt="" className="size-full object-cover" />}</span>
              <p className="mt-3 text-lg font-extrabold text-navy-900 group-hover:text-brand-800">{s.name}</p>
              <p className="mt-1 line-clamp-2 min-h-12 text-sm leading-6 text-gray-600">{s.description}</p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                  <span className="num font-bold text-gray-800">{s.ratingAvg}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {s.city}
                </span>
                <span className="num">{tp('cities', { count: s.coverage.length })}</span>
                <span className="num">{tc('productsCount', { count: s.productsCount })}</span>
              </div>
              <p className="num mt-3 text-xs font-semibold text-brand-700">{tp('min', { amount: f.money(s.minOrderValue) })}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
