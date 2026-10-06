import type { CategoryDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { publicApi } from '@/lib/api';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('store'))('categoriesTitle') };
}

export default async function CategoriesPage() {
  const locale = await getLocale();
  const t = await getTranslations('store');
  const tc = await getTranslations('common');
  const categories = (await publicApi(locale).get<CategoryDto[]>('/public/categories', { next: { revalidate: 300 } })).filter((c) => !c.parentId);
  return (
    <div className="container-page py-8">
      <h1 className="mb-8 text-3xl font-black text-navy-900">{t('categoriesTitle')}</h1>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => (
          <section key={c.slug} className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
            <Link href={`/c/${c.slug}`} className="group relative block h-36 overflow-hidden">
              {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
              <div className="absolute bottom-3 start-4">
                <h2 className="text-xl font-extrabold text-white">{c.name}</h2>
                <p className="num text-xs text-white/70">{tc('productsCount', { count: c.productCount })}</p>
              </div>
            </Link>
            <ul className="flex flex-wrap gap-2 p-4">
              {c.children.map((s) => (
                <li key={s.slug}>
                  <Link href={`/c/${s.slug}`} className="block rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-brand-50 hover:text-brand-800">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
