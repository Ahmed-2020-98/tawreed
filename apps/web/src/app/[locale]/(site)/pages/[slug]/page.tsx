import type { CmsPageDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/content/markdown';
import { PageHero } from '@/components/content/page-hero';
import { publicApi } from '@/lib/api';

const getPage = (locale: string, slug: string) => publicApi(locale).get<CmsPageDto>(`/public/pages/${slug}`, { next: { revalidate: 300 } }).catch(() => null);

export async function generateMetadata({ params }: PageProps<'/[locale]/pages/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getPage(locale, slug);
  return p ? { title: p.seoTitle ?? p.title, description: p.seoDescription ?? undefined } : {};
}

export default async function CmsPage({ params }: PageProps<'/[locale]/pages/[slug]'>) {
  const { locale, slug } = await params;
  const page = await getPage(locale, slug);
  if (!page) notFound();
  return (
    <>
      <PageHero title={page.title} />
      <section className="container-page max-w-3xl py-14">
        <Markdown source={page.body.replace(/^## .*\n+/, '')} />
      </section>
    </>
  );
}
