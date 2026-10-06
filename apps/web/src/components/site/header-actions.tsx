'use client';

import { Avatar, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { FileText, Heart, LayoutDashboard, LogOut, Package, Receipt, Settings, ShoppingCart, User, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from '@/components/providers';
import { Link } from '@/i18n/navigation';
import { useApi, useAuthApi } from '@/lib/hooks/use-api';

export function useCartCount() {
  const { me } = useSession();
  const api = useApi();
  return useQuery({
    queryKey: ['cart', 'count'],
    // Cached as a plain number (the cart mutations write the same key).
    queryFn: async () => (await api.get<{ itemsCount: number }>('/buyer/cart/count')).itemsCount,
    enabled: me?.context.type === 'BUYER',
  });
}

export function CartButton() {
  const t = useTranslations('header');
  const { data: count = 0 } = useCartCount();
  return (
    <Link href="/cart" className="relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-gray-800 transition hover:bg-gray-100" aria-label={t('cart')}>
      <span className="relative">
        <ShoppingCart className="size-6" />
        {count > 0 && <span className="num absolute -end-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[0.6875rem] font-bold text-white ring-2 ring-white">{count > 99 ? '99+' : count}</span>}
      </span>
      <span className="hidden text-sm font-bold xl:inline">{t('cart')}</span>
    </Link>
  );
}

export function AccountMenu() {
  const t = useTranslations('header');
  const { me } = useSession();
  const auth = useAuthApi();

  if (!me) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/login">
            <User />
            {t('login')}
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">{t('register')}</Link>
        </Button>
      </div>
    );
  }

  const logout = async () => {
    await auth('logout');
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the server layout re-reads the session cookie
    window.location.assign('/');
  };
  const items = [
    { href: '/account', icon: LayoutDashboard, label: t('account') },
    { href: '/account/orders', icon: Package, label: t('myOrders') },
    { href: '/account/rfqs', icon: FileText, label: t('myRfqs') },
    { href: '/account/invoices', icon: Receipt, label: t('invoices') },
    { href: '/account/credit', icon: Wallet, label: t('wallet') },
    { href: '/account/favorites', icon: Heart, label: t('favorites') },
    { href: '/account/settings', icon: Settings, label: t('settings') },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-start transition outline-none hover:bg-gray-100 data-[state=open]:bg-gray-100">
        <Avatar name={me.user.name} src={me.user.avatarUrl} size={36} />
        <span className="hidden leading-tight lg:block">
          <span className="block max-w-36 truncate text-sm font-bold text-gray-900">{me.user.name}</span>
          <span className="block max-w-36 truncate text-xs text-gray-500">{me.context.name}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel>{t('hello', { name: me.user.name.split(' ')[0] ?? '' })}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((i) => (
          <DropdownMenuItem key={i.href} asChild>
            <Link href={i.href}>
              <i.icon />
              {i.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={() => void logout()}>
          <LogOut />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
