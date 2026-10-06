import { ar as sharedAr, en as sharedEn } from '@tawreed/i18n';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const own = (await import(`../messages/${locale}.json`)) as { default: Record<string, unknown> };
  const shared = locale === 'ar' ? sharedAr : sharedEn;
  return {
    locale,
    timeZone: 'Asia/Riyadh',
    messages: { ...own.default, enums: shared.enums, errors: shared.errors },
  };
});
