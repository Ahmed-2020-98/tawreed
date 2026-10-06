'use client';

import { cn } from '@tawreed/ui';
import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations('header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button
      type="button"
      onClick={() => router.replace(pathname + window.location.search, { locale: locale === 'ar' ? 'en' : 'ar' })}
      className={cn('inline-flex items-center gap-1.5 font-semibold transition hover:opacity-80', className)}
    >
      <Globe className="size-4" />
      <span className={locale === 'ar' ? 'font-display' : ''}>{t('language')}</span>
    </button>
  );
}
