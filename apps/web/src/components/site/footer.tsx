import type { PublicSettingsDto } from '@tawreed/contracts';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { AppBadges } from './app-badges';

const SOCIAL_LABEL: Record<string, string> = { x: 'X', instagram: 'Instagram', linkedin: 'LinkedIn', snapchat: 'Snapchat', tiktok: 'TikTok', youtube: 'YouTube' };

export async function SiteFooter({ settings }: { settings: PublicSettingsDto }) {
  const t = await getTranslations('footer');
  const tn = await getTranslations('nav');
  const tm = await getTranslations('meta');
  const cols: { title: string; links: [string, string][] }[] = [
    { title: t('company'), links: [['/about', tn('about')], ['/blog', tn('blog')], ['/contact', tn('contact')], ['/pages/careers', t('careers')]] },
    { title: t('buyers'), links: [['/store', tn('store')], ['/rfq/new', tn('rfq')], ['/pay-later', tn('payLater')], ['/deals', tn('deals')], ['/suppliers', tn('suppliers')]] },
    { title: t('suppliers'), links: [['/sell', t('joinSupplier')], ['http://localhost:3032', t('supplierLogin')], ['/pages/driver-app', t('driverApp')]] },
    { title: t('help'), links: [['/faq', tn('faq')], ['/pages/terms', t('terms')], ['/pages/privacy', t('privacy')], ['/pages/returns', t('returns')]] },
  ];
  return (
    <footer className="grain relative mt-20 overflow-hidden bg-navy-950 text-white/70">
      <div aria-hidden className="pointer-events-none absolute -top-40 end-[-10%] size-[36rem] rounded-full bg-brand-600/20 blur-3xl" />
      <div className="container-page relative py-14">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Logo variant="white" className="h-11" />
            <p className="mt-2 text-sm font-semibold text-mint">{tm('tagline')}</p>
            <p className="mt-4 text-sm leading-7">{t('about')}</p>
            <div className="mt-6 space-y-2.5 text-sm">
              <a href={`tel:${settings.supportPhone}`} className="flex items-center gap-2.5 hover:text-white">
                <Phone className="size-4 text-mint" />
                <span className="num" dir="ltr">{settings.supportPhone.replace('+966', '0')}</span>
              </a>
              <a href={`https://wa.me/${settings.supportWhatsapp.replace('+', '')}`} className="flex items-center gap-2.5 hover:text-white">
                <MessageCircle className="size-4 text-mint" />
                <span className="num" dir="ltr">{settings.supportWhatsapp.replace('+966', '0')}</span>
              </a>
              <a href={`mailto:${settings.supportEmail}`} className="flex items-center gap-2.5 hover:text-white">
                <Mail className="size-4 text-mint" />
                {settings.supportEmail}
              </a>
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-mint" />
                {settings.address}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="mb-4 text-sm font-extrabold text-white">{c.title}</p>
                <ul className="space-y-2.5 text-sm">
                  {c.links.map(([href, label]) => (
                    <li key={href}>
                      {href.startsWith('http') ? (
                        <a href={href} className="transition hover:text-mint">
                          {label}
                        </a>
                      ) : (
                        <Link href={href} className="transition hover:text-mint">
                          {label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-3 text-sm font-bold text-white">{t('downloadApp')}</p>
            <AppBadges ios={settings.appLinks.buyerIos} android={settings.appLinks.buyerAndroid} tone="light" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(settings.social).map(([k, href]) => (
              <a key={k} href={href} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold transition hover:border-mint hover:text-white">
                {SOCIAL_LABEL[k] ?? k}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2" dir="ltr">
            {['mada', 'VISA', 'Mastercard', ' Pay', 'SADAD'].map((m) => (
              <span key={m} className="grid h-8 min-w-12 place-items-center rounded-md bg-white px-2 font-display text-[0.6875rem] font-extrabold text-navy-900">
                {m}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('rights', { year: new Date().getFullYear(), name: settings.legalName })}</p>
          <p className="flex gap-4">
            <span>
              {t('vat')}: <span className="num">{settings.vatNumber}</span>
            </span>
            <span>
              {t('cr')}: <span className="num">{settings.crNumber}</span>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
