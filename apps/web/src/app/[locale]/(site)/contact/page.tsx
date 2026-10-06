import type { Metadata } from 'next';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Card } from '@tawreed/ui';
import { ContactForm } from '@/components/content/forms';
import { PageHero } from '@/components/content/page-hero';
import { getSettings } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages.contact'))('title') };
}

export default async function ContactPage() {
  const t = await getTranslations('pages.contact');
  const s = await getSettings(await getLocale());
  const items = [
    { icon: Phone, label: t('call'), value: s.supportPhone.replace('+966', '0'), href: `tel:${s.supportPhone}` },
    { icon: MessageCircle, label: t('whatsapp'), value: s.supportWhatsapp.replace('+966', '0'), href: `https://wa.me/${s.supportWhatsapp.replace('+', '')}` },
    { icon: Mail, label: t('emailUs'), value: s.supportEmail, href: `mailto:${s.supportEmail}` },
    { icon: MapPin, label: t('visit'), value: s.address },
  ];
  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <section className="container-page grid gap-8 py-14 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-4">
          {items.map((i) => {
            const body = (
              <Card className="flex items-center gap-4 p-5 transition hover:border-brand-300">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                  <i.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-gray-500">{i.label}</p>
                  <p className="num font-bold text-gray-900" dir={i.icon === MapPin ? undefined : 'ltr'}>
                    {i.value}
                  </p>
                </div>
              </Card>
            );
            return i.href ? (
              <a key={i.label} href={i.href} className="block">
                {body}
              </a>
            ) : (
              <div key={i.label}>{body}</div>
            );
          })}
        </div>
        <Card className="p-6 sm:p-8">
          <ContactForm />
        </Card>
      </section>
    </>
  );
}
