import type { CmsPageDto, LandingDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Markdown } from '@/components/content/markdown';
import { PageHero } from '@/components/content/page-hero';
import { StatsBand } from '@/components/landing/sections-a';
import { SuppliersSection, TestimonialsSection } from '@/components/landing/sections-b';
import { publicApi } from '@/lib/api';
import { seedImage } from '@/lib/media';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('nav'))('about') };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const api = publicApi(locale);
  const [page, landing, tm] = await Promise.all([api.get<CmsPageDto>('/public/pages/about', { next: { revalidate: 300 } }), api.get<LandingDto>('/public/landing', { next: { revalidate: 300 } }), getTranslations('meta')]);
  return (
    <>
      <PageHero eyebrow={tm('tagline')} title={page.title} image={seedImage('hero-truck', 'full')} />
      <section className="container-page max-w-3xl py-14">
        <Markdown source={page.body} />
      </section>
      <StatsBand stats={landing.stats} />
      <SuppliersSection suppliers={landing.suppliers} />
      <TestimonialsSection items={landing.testimonials} />
    </>
  );
}
