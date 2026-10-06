import type { FaqDto } from '@tawreed/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Accordion, Button } from '@tawreed/ui';
import { PageHero } from '@/components/content/page-hero';
import { Link } from '@/i18n/navigation';
import { publicApi } from '@/lib/api';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages.faq'))('title') };
}

export default async function FaqPage() {
  const locale = await getLocale();
  const t = await getTranslations('pages.faq');
  const faqs = await publicApi(locale).get<FaqDto[]>('/public/faqs', { next: { revalidate: 300 } });
  const jsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- JSON-LD structured data, escaped */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <section className="container-page max-w-3xl py-14">
        <Accordion items={faqs.map((f) => ({ id: f.id, title: f.question, content: f.answer }))} defaultValue={faqs[0]?.id} />
        <div className="mt-10 flex items-center justify-between rounded-2xl bg-white p-6 ring-1 ring-gray-200">
          <p className="font-extrabold text-navy-900">{t('stillNeed')}</p>
          <Button asChild>
            <Link href="/contact">{t('contact')}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
