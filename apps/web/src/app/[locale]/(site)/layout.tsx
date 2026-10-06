import { getLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/site/footer';
import { SiteHeader } from '@/components/site/header';
import { getSettings } from '@/lib/session';

export default async function SiteLayout({ children }: LayoutProps<'/[locale]'>) {
  const settings = await getSettings(await getLocale());
  return (
    <>
      <SiteHeader settings={settings} />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} />
    </>
  );
}
