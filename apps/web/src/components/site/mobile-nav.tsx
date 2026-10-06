'use client';

import { Sheet, SheetContent, SheetTrigger } from '@tawreed/ui';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { LocaleSwitch } from './locale-switch';

export function MobileNav({ categories }: { categories: { slug: string; name: string }[] }) {
  const t = useTranslations('nav');
  const th = useTranslations('header');
  const [open, setOpen] = useState(false);
  const links = [
    ['/', t('home')],
    ['/store', t('store')],
    ['/deals', t('deals')],
    ['/suppliers', t('suppliers')],
    ['/rfq/new', t('rfq')],
    ['/pay-later', t('payLater')],
    ['/sell', t('sell')],
    ['/blog', t('blog')],
    ['/faq', t('faq')],
    ['/contact', t('contact')],
  ] as const;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="grid size-10 place-items-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden" aria-label={th('menu')}>
        <Menu className="size-6" />
      </SheetTrigger>
      <SheetContent side="start" title={th('menu')}>
        <nav className="flex flex-col p-3" onClickCapture={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2.5 font-semibold text-gray-800 hover:bg-gray-50">
              {label}
            </Link>
          ))}
          <p className="mt-4 px-3 pb-2 text-xs font-bold text-gray-400">{t('categories')}</p>
          {categories.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {c.name}
            </Link>
          ))}
          <div className="mt-4 border-t border-gray-100 px-3 pt-4">
            <LocaleSwitch className="text-sm text-gray-700" />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
