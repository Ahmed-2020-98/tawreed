import type { BlogPostSummaryDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageHero } from '@/components/content/page-hero';
import { Link } from '@/i18n/navigation';
import { publicApi } from '@/lib/api';
import { formatters } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('pages.blog');
  return { title: t('title'), description: t('subtitle') };
}

export default async function BlogPage() {
  const locale = await getLocale();
  const [t, tl] = await Promise.all([getTranslations('pages.blog'), getTranslations('landing.blog')]);
  const posts = await publicApi(locale).page<BlogPostSummaryDto>('/public/blog', { query: { pageSize: 30 }, next: { revalidate: 300 } });
  const f = formatters(locale);
  const [first, ...rest] = posts.data;
  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <section className="container-page py-14">
        {first && (
          <Link href={`/blog/${first.slug}`} className="group mb-12 grid overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200 lg:grid-cols-2">
            <div className="aspect-[16/10] overflow-hidden lg:aspect-auto">{first.coverUrl && <img src={first.coverUrl} alt="" className="size-full object-cover transition duration-700 group-hover:scale-105" />}</div>
            <div className="flex flex-col justify-center p-8">
              <p className="text-sm font-semibold text-gray-500">
                {f.date(first.publishedAt)} · {tl('minutes', { count: first.readingMinutes })}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-navy-900 group-hover:text-brand-800">{first.title}</h2>
              <p className="mt-3 leading-8 text-gray-600">{first.excerpt}</p>
              <span className="mt-5 text-sm font-bold text-brand-700">{t('readMore')} ←</span>
            </div>
          </Link>
        )}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
              <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-gray-100">{p.coverUrl && <img src={p.coverUrl} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-105" />}</div>
              <p className="mt-4 text-xs font-semibold text-gray-500">
                {f.date(p.publishedAt)} · {tl('minutes', { count: p.readingMinutes })}
              </p>
              <h3 className="mt-2 text-lg font-extrabold leading-8 text-navy-900 group-hover:text-brand-800">{p.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-600">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
