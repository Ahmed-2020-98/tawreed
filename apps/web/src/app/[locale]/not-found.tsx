import { Button } from '@tawreed/ui';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('common');
  return (
    <main className="grain grid min-h-dvh place-items-center bg-sand-100 px-6 text-center">
      <div>
        <img src="/brand/logo-mark.svg" alt="" className="mx-auto h-16 opacity-80" />
        <p className="num mt-6 text-8xl font-black text-navy-900">404</p>
        <h1 className="mt-2 text-2xl font-black text-navy-900">{t('notFoundTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('notFoundBody')}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t('goHome')}</Link>
        </Button>
      </div>
    </main>
  );
}
