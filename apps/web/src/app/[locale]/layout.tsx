import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { Cairo, Montserrat } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Providers } from '@/components/providers';
import { routing } from '@/i18n/routing';
import { getCitySlug } from '@/lib/city';
import { SITE_URL } from '@/lib/config';
import { getSession } from '@/lib/session';

const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap', weight: ['400', '500', '600', '700', '800', '900'] });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap', weight: ['500', '600', '700', '800'] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: t('titleTemplate') },
    description: t('description'),
    applicationName: locale === 'ar' ? 'توريد' : 'Tawreed',
    icons: { icon: [{ url: '/brand/favicon.svg', type: 'image/svg+xml' }, { url: '/brand/favicon-32.png', sizes: '32x32' }], apple: '/brand/favicon-180.png' },
    alternates: { languages: { ar: '/', en: '/en', 'x-default': '/' } },
    openGraph: { type: 'website', siteName: locale === 'ar' ? 'توريد' : 'Tawreed', locale: locale === 'ar' ? 'ar_SA' : 'en_US', images: ['/brand/favicon-512.png'] },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = { themeColor: '#0B2D5B', width: 'device-width', initialScale: 1 };

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [me, city] = await Promise.all([getSession(locale), getCitySlug()]);
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${cairo.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <Providers me={me} locale={locale} city={city}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
