'use client';

import type { AdminDashboardDto } from '@tawreed/contracts';
import { cn, Sheet, SheetContent, SheetTrigger } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCan } from '@/components/providers';
import { Link, usePathname } from '@/i18n/navigation';
import { useApi } from '@/lib/hooks/use-api';
import { NAV, READY } from './nav';

/** Dashboard KPIs + work-queue counters, shared by the sidebar badges and the dashboard page. */
export function useDashboard() {
  const api = useApi();
  const can = useCan();
  return useQuery({ queryKey: ['admin-dashboard'], queryFn: () => api.get<AdminDashboardDto>('/admin/dashboard'), refetchInterval: 60_000, enabled: can('admin.dashboard.view') });
}

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const can = useCan();
  const { data } = useDashboard();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-none" onClickCapture={(e) => (e.target as HTMLElement).closest('a') && onNavigate?.()}>
      {NAV.map((section) => {
        const items = section.items.filter((i) => can(i.perm));
        if (!items.length) return null;
        return (
          <div key={section.key}>
            <p className="mb-1.5 px-3 text-[0.6875rem] font-bold uppercase tracking-wider text-white/35">{t(`section.${section.key}`)}</p>
            <ul className="space-y-0.5">
              {items.map((i) => {
                const count = i.queue ? data?.queues[i.queue] : undefined;
                if (!READY.has(i.href))
                  return (
                    <li key={i.key}>
                      <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/30" aria-disabled>
                        <i.icon className="size-[1.05rem] shrink-0" />
                        <span className="flex-1 truncate">{t(i.key)}</span>
                        <span className="rounded bg-white/8 px-1.5 text-[0.625rem] font-bold text-white/40">{t('soon')}</span>
                      </span>
                    </li>
                  );
                return (
                  <li key={i.key}>
                    <Link
                      href={i.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition',
                        active(i.href) ? 'bg-white/12 text-white shadow-[inset_3px_0_0_var(--color-mint)] rtl:shadow-[inset_-3px_0_0_var(--color-mint)]' : 'text-white/65 hover:bg-white/6 hover:text-white',
                      )}
                    >
                      <i.icon className="size-[1.05rem] shrink-0" />
                      <span className="flex-1 truncate">{t(i.key)}</span>
                      {!!count && <span className="num min-w-5 rounded-full bg-amber-400 px-1.5 text-center text-[0.6875rem] font-extrabold leading-5 text-navy-950">{count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  const t = useTranslations('shell');
  return (
    <Link href="/" className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/8 px-5">
      <img src="/brand/logo-horizontal-white.svg" alt="Tawreed" className="h-7" />
      <span className="rounded-md bg-mint/15 px-1.5 py-0.5 text-[0.625rem] font-extrabold uppercase tracking-wider text-mint">{t('badge')}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-navy-950 lg:flex">
      <Brand />
      <NavBody />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="grid size-10 place-items-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden" aria-label="Menu">
        <Menu className="size-6" />
      </SheetTrigger>
      <SheetContent side="start" title={<img src="/brand/logo-horizontal.svg" alt="Tawreed" className="h-7" />} className="bg-navy-950 [&>div:first-child]:border-white/10 [&>div:first-child]:bg-white">
        <NavBody onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
