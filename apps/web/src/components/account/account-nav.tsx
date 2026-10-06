'use client';

import { cn, Sheet, SheetContent, SheetTrigger } from '@tawreed/ui';
import { Bell, FileText, Heart, LayoutDashboard, LogOut, MapPin, Menu, Package, Receipt, Settings, Store, Users, Wallet, CreditCard, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuthApi } from '@/lib/hooks/use-api';

const SECTIONS = [
  { key: 'sectionBuy', items: [['overview', '/account', LayoutDashboard], ['orders', '/account/orders', Package], ['rfqs', '/account/rfqs', FileText], ['favorites', '/account/favorites', Heart]] },
  { key: 'sectionFinance', items: [['invoices', '/account/invoices', Receipt], ['credit', '/account/credit', Wallet], ['payments', '/account/payments', CreditCard]] },
  { key: 'sectionAccount', items: [['company', '/account/company', Building2], ['addresses', '/account/addresses', MapPin], ['team', '/account/team', Users], ['notifications', '/account/notifications', Bell], ['settings', '/account/settings', Settings]] },
] as const;

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('account.nav');
  const pathname = usePathname();
  const auth = useAuthApi();
  const active = (href: string) => (href === '/account' ? pathname === '/account' : pathname.startsWith(href));
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" onClickCapture={(e) => (e.target as HTMLElement).closest('a') && onNavigate?.()}>
        {SECTIONS.map((s) => (
          <div key={s.key}>
            <p className="mb-2 px-3 text-[0.6875rem] font-bold uppercase tracking-wider text-white/40">{t(s.key)}</p>
            <ul className="space-y-0.5">
              {s.items.map(([key, href, Icon]) => (
                <li key={key}>
                  <Link href={href} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', active(href) ? 'bg-white/12 text-white shadow-[inset_3px_0_0_var(--color-mint)] rtl:shadow-[inset_-3px_0_0_var(--color-mint)]' : 'text-white/70 hover:bg-white/6 hover:text-white')}>
                    <Icon className="size-[1.1rem]" />
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link href="/store" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/6 hover:text-white">
          <Store className="size-[1.1rem]" />
          {t('backToStore')}
        </Link>
        <button
          type="button"
          onClick={async () => {
            await auth('logout');
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the server layout re-reads the session cookie
            window.location.assign('/');
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/6 hover:text-white"
        >
          <LogOut className="size-[1.1rem]" />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}

export function AccountSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-brand-950 lg:flex">
      <Link href="/" className="flex h-16 items-center px-6">
        <img src="/brand/logo-horizontal-white.svg" alt="Tawreed" className="h-8" />
      </Link>
      <NavBody />
    </aside>
  );
}

export function AccountMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="grid size-10 place-items-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden" aria-label="Menu">
        <Menu className="size-6" />
      </SheetTrigger>
      <SheetContent side="start" title={<img src="/brand/logo-horizontal.svg" alt="Tawreed" className="h-7" />} className="bg-brand-950 [&>div:first-child]:border-white/10 [&>div:first-child]:bg-white">
        <NavBody onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

