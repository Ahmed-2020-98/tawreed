'use client';

import { Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@tawreed/ui';
import { ExternalLink, Languages, LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useStaff } from '@/components/providers';
import { EnumLabel } from '@/components/kit/misc';
import { usePathname, useRouter } from '@/i18n/navigation';
import { STORE_URL } from '@/lib/config';
import { useAuthApi } from '@/lib/hooks/use-api';
import { CommandMenu } from './command-menu';
import { MobileNav } from './sidebar';

export function Topbar() {
  const t = useTranslations('shell');
  const { me } = useStaff();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthApi();
  if (!me) return null;
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileNav />
        <CommandMenu />
        <div className="ms-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => router.replace(pathname, { locale: locale === 'ar' ? 'en' : 'ar' })}
            className="hidden h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 sm:flex"
          >
            <Languages className="size-4" />
            {locale === 'ar' ? 'English' : 'العربية'}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg py-1 pe-1 ps-2 outline-none hover:bg-gray-100">
              <div className="hidden text-end leading-tight sm:block">
                <p className="text-sm font-bold text-gray-900">{me.user.name}</p>
                <p className="text-xs text-gray-500">
                  <EnumLabel kind="StaffRole" value={me.context.role} />
                </p>
              </div>
              <Avatar name={me.user.name} src={me.user.avatarUrl} size={36} className="bg-navy-900 text-white" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <DropdownMenuLabel>
                <span className="block truncate text-sm font-bold text-gray-900">{me.user.name}</span>
                <span className="block truncate font-normal" dir="ltr">
                  {me.user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => window.open(STORE_URL, '_blank', 'noopener')}>
                <ExternalLink />
                {t('openStore')}
              </DropdownMenuItem>
              <DropdownMenuItem className="sm:hidden" onSelect={() => router.replace(pathname, { locale: locale === 'ar' ? 'en' : 'ar' })}>
                <Languages />
                {locale === 'ar' ? 'English' : 'العربية'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                danger
                onSelect={async () => {
                  await auth('logout');
                  window.location.assign(locale === 'en' ? '/en/login' : '/login');
                }}
              >
                <LogOut />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
