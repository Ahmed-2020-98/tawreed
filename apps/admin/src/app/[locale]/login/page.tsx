import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/login-form';
import { redirect } from '@/i18n/navigation';
import { getStaff } from '@/lib/session';

export async function generateMetadata({ params }: PageProps<'/[locale]/login'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return { title: t('title') };
}

export default async function LoginPage({ params }: PageProps<'/[locale]/login'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getStaff(locale)) redirect({ href: '/', locale });
  const t = await getTranslations('login');
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <img src="/brand/logo-horizontal.svg" alt="Tawreed" className="h-9" />
          <h1 className="mt-10 text-3xl font-black text-navy-900">{t('title')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('subtitle')}</p>
          <LoginForm />
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -end-40 -top-40 size-[34rem] rounded-full bg-brand-600/25 blur-3xl" />
        <div className="absolute -bottom-48 -start-24 size-[30rem] rounded-full bg-mint/15 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-mint">{t('panelKicker')}</p>
          <p className="mt-4 max-w-md text-4xl font-black leading-tight">{t('panelTitle')}</p>
          <ul className="mt-8 grid max-w-md grid-cols-2 gap-3 text-sm text-white/75">
            {(['p1', 'p2', 'p3', 'p4'] as const).map((k) => (
              <li key={k} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
