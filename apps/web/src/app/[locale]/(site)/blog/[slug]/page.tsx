import type { BlogPostDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Markdown } from '@/components/content/markdown';
import { Link } from '@/i18n/navigation';
import { publicApi } from '@/lib/api';
import { formatters } from '@/lib/format';

const getPost = (locale: string, slug: string) => publicApi(locale).get<BlogPostDto>(`/public/blog/${slug}`, { next: { revalidate: 300 } }).catch(() => null);

export async function generateMetadata({ params }: PageProps<'/[locale]/blog/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getPost(locale, slug);
  return p ? { title: p.title, description: p.excerpt, openGraph: { type: 'article', images: p.coverUrl ? [p.coverUrl] : undefined } } : {};
}

export default async function BlogPostPage({ params }: PageProps<'/[locale]/blog/[slug]'>) {
  const { locale, slug } = await params;
  const post = await getPost(locale, slug);
  if (!post) notFound();
  const [t, tl] = await Promise.all([getTranslations('pages.blog'), getTranslations('landing.blog')]);
  const f = formatters(locale);
  return (
    <article className="pb-10">
      <header className="container-page max-w-3xl pt-12 text-center">
        <div className="flex justify-center gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="mt-4 text-balance text-4xl font-black leading-tight text-navy-900">{post.title}</h1>
        <p className="mt-4 text-sm text-gray-500">
          {t('by', { name: post.authorName })} · {f.date(post.publishedAt)} · {tl('minutes', { count: post.readingMinutes })}
        </p>
      </header>
      {post.coverUrl && <img src={post.coverUrl.replace('_md.', '.')} alt="" className="container-page mt-10 aspect-[21/9] max-w-5xl rounded-3xl object-cover !px-0" />}
      <div className="container-page mt-10 max-w-3xl">
        <p className="mb-6 text-xl leading-9 text-gray-800">{post.excerpt}</p>
        <Markdown source={post.body} />
      </div>
      {post.related.length > 0 && (
        <aside className="container-page mt-16 max-w-5xl">
          <h2 className="mb-6 text-2xl font-black text-navy-900">{t('related')}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {post.related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
                <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-gray-100">{p.coverUrl && <img src={p.coverUrl} alt="" className="size-full object-cover transition group-hover:scale-105" />}</div>
                <h3 className="mt-3 font-extrabold text-navy-900 group-hover:text-brand-800">{p.title}</h3>
              </Link>
            ))}
          </div>
        </aside>
      )}
    </article>
  );
}
