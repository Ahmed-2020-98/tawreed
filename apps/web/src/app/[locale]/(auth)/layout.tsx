import { CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/logo';
import { LocaleSwitch } from '@/components/site/locale-switch';
import { Link } from '@/i18n/navigation';
import { seedImage } from '@/lib/media';

export default async function AuthLayout({ children }: LayoutProps<'/[locale]'>) {
  const t = await getTranslations('auth');
  const tm = await getTranslations('meta');
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col bg-white">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link href="/">
            <Logo className="h-9" />
          </Link>
          <LocaleSwitch className="text-sm text-gray-600" />
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
      <aside className="grain relative hidden overflow-hidden bg-navy-950 lg:block">
        <img src={seedImage('hero-warehouse', 'full')} alt="" className="absolute inset-0 size-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-navy-950/30" />
        <img src="/brand/logo-mark-white.svg" alt="" aria-hidden className="absolute -top-10 end-[-6%] w-96 opacity-10" />
        <div className="relative flex h-full flex-col justify-end p-14">
          <p className="text-sm font-bold text-mint">{tm('tagline')}</p>
          <h2 className="mt-3 max-w-lg text-balance text-4xl font-black leading-tight text-white">{t('sideTitle')}</h2>
          <ul className="mt-8 grid max-w-lg grid-cols-2 gap-4">
            {[t('side1'), t('side2'), t('side3'), t('side4')].map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-white/85">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-mint" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
