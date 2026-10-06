import type { LandingDto } from '@tawreed/contracts';
import { getLocale } from 'next-intl/server';
import { Hero } from '@/components/landing/hero';
import { CategoriesSection, HowItWorks, RfqSection, Segments, StatsBand } from '@/components/landing/sections-a';
import { AppsSection, BlogSection, FaqSection, FinalCta, PayLaterSection, SuppliersSection, TestimonialsSection } from '@/components/landing/sections-b';
import { publicApi } from '@/lib/api';
import { getSettings } from '@/lib/session';

export default async function LandingPage() {
  const locale = await getLocale();
  const [landing, settings] = await Promise.all([publicApi(locale).get<LandingDto>('/public/landing', { next: { revalidate: 300 } }), getSettings(locale)]);
  const hero = landing.banners.find((b) => b.placement === 'HOME_HERO');
  const businesses = landing.stats.find((s) => s.key === 'businesses')?.value ?? 12000;
  return (
    <>
      <Hero banner={hero} businesses={businesses} />
      <StatsBand stats={landing.stats} />
      <CategoriesSection categories={landing.categories} />
      <HowItWorks />
      <Segments />
      <RfqSection />
      <PayLaterSection />
      <SuppliersSection suppliers={landing.suppliers} />
      <AppsSection settings={settings} />
      <TestimonialsSection items={landing.testimonials} />
      <FaqSection faqs={landing.faqs} />
      <BlogSection posts={landing.posts} />
      <FinalCta />
    </>
  );
}
