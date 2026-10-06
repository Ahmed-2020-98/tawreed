import type { CategoryDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Breadcrumbs, ProductListing } from '@/components/store/product-listing';
import { Link } from '@/i18n/navigation';
import { publicApi } from '@/lib/api';

async function getCategory(locale: string, slug: string) {
  return publicApi(locale)
    .get<CategoryDto & { parent?: { slug: string; name: string } | null; breadcrumbs?: { slug: string; name: string }[] }>(`/public/categories/${slug}`, { next: { revalidate: 300 } })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps<'/[locale]/c/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = await getCategory(locale, slug);
  return c ? { title: c.name, description: c.description ?? undefined, alternates: { canonical: locale === 'ar' ? `/c/${slug}` : `/en/c/${slug}` } } : {};
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/[locale]/c/[slug]'>) {
  const { locale, slug } = await params;
  const [category, sp, t, tp] = await Promise.all([getCategory(locale, slug), searchParams, getTranslations('store'), getTranslations('product')]);
  if (!category) notFound();
  const crumbs = [{ href: '/', label: tp('breadcrumbHome') }, { href: '/categories', label: t('categoriesTitle') }, ...(category.breadcrumbs ?? []).filter((b) => b.slug !== slug).map((b) => ({ href: `/c/${b.slug}`, label: b.name })), { label: category.name }];

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={crumbs} />
      <header className="relative mb-6 overflow-hidden rounded-3xl bg-navy-900 px-6 py-8 sm:px-10">
        {category.imageUrl && <img src={category.imageUrl} alt="" className="absolute inset-y-0 end-0 h-full w-1/2 object-cover opacity-50 [mask-image:linear-gradient(to_left,black,transparent)] rtl:[mask-image:linear-gradient(to_right,black,transparent)]" />}
        <div className="relative">
          <h1 className="text-3xl font-black text-white sm:text-4xl">{category.name}</h1>
          {category.description && <p className="mt-2 max-w-xl text-white/70">{category.description}</p>}
        </div>
      </header>
      {category.children.length > 0 && (
        <div className="scrollbar-none -mx-4 mb-6 flex gap-2.5 overflow-x-auto px-4">
          {category.children.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="group flex shrink-0 items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1.5 pe-4 ps-1.5 transition hover:border-brand-300">
              <span className="size-9 overflow-hidden rounded-full bg-gray-100">{c.imageUrl && <img src={c.imageUrl.replace('_md.', '_thumb.')} alt="" className="size-full object-cover" />}</span>
              <span className="text-sm font-bold text-gray-800 group-hover:text-brand-800">{c.name}</span>
              <span className="num text-xs text-gray-400">{c.productCount}</span>
            </Link>
          ))}
        </div>
      )}
      <ProductListing searchParams={sp} base={{ category: slug }} basePath={`/c/${slug}`} />
    </div>
  );
}
