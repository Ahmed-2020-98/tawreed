import type { CategoryDto, PublicSettingsDto } from '@tawreed/contracts';
import { BadgePercent, Phone, Receipt, Truck, Wallet } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { publicApi } from '@/lib/api';
import { CategoryMenu } from './category-menu';
import { CityPicker } from './city-picker';
import { AccountMenu, CartButton } from './header-actions';
import { LocaleSwitch } from './locale-switch';
import { MobileNav } from './mobile-nav';
import { SearchBox } from './search-box';

export async function SiteHeader({ settings }: { settings: PublicSettingsDto }) {
  const locale = await getLocale();
  const t = await getTranslations('header');
  const tn = await getTranslations('nav');
  const categories = await publicApi(locale)
    .get<CategoryDto[]>('/public/categories', { next: { revalidate: 300 } })
    .catch(() => [] as CategoryDto[]);
  const top = categories.filter((c) => !c.parentId);

  return (
    <header className="sticky top-0 z-40">
      {/* Utility strip */}
      <div className="bg-navy-950 text-white/85">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-xs">
          <div className="flex min-w-0 items-center gap-6 overflow-hidden">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Truck className="size-3.5 text-mint" />
              {t('topbar.delivery')}
            </span>
            <span className="hidden items-center gap-1.5 whitespace-nowrap md:flex">
              <Wallet className="size-3.5 text-mint" />
              {t('topbar.payLater')}
            </span>
            <span className="hidden items-center gap-1.5 whitespace-nowrap xl:flex">
              <Receipt className="size-3.5 text-mint" />
              {t('topbar.vat')}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <a href={`tel:${settings.supportPhone}`} className="hidden items-center gap-1.5 hover:text-white sm:flex" dir="ltr">
              <Phone className="size-3.5" />
              <span className="num">{settings.supportPhone.replace('+966', '0')}</span>
            </a>
            <Link href="/sell" className="hidden font-semibold text-mint hover:text-white md:block">
              {tn('sell')}
            </Link>
            <LocaleSwitch className="text-xs text-white/85 hover:text-white" />
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-gray-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="container-page flex h-[4.5rem] items-center gap-3 lg:gap-6">
          <MobileNav categories={top.map((c) => ({ slug: c.slug, name: c.name }))} />
          <Link href="/" className="shrink-0" aria-label="Tawreed">
            <Logo className="h-9 lg:h-10" />
          </Link>
          <CityPicker className="hidden shrink-0 lg:flex" />
          <SearchBox className="hidden flex-1 md:block" />
          <div className="ms-auto flex items-center gap-1 md:ms-0">
            <AccountMenu />
            <CartButton />
          </div>
        </div>
        <div className="container-page pb-3 md:hidden">
          <SearchBox />
        </div>
      </div>

      {/* Category rail */}
      <nav className="hidden border-b border-gray-200/80 bg-white lg:block" aria-label={tn('categories')}>
        <div className="container-page flex h-12 items-center gap-1">
          <CategoryMenu categories={top} />
          <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {top.slice(0, 9).map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900">
                {c.name}
              </Link>
            ))}
          </div>
          <Link href="/deals" className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600 transition hover:bg-red-100">
            <BadgePercent className="size-4" />
            {tn('deals')}
          </Link>
          <Link href="/rfq/new" className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold text-navy-900 transition hover:bg-navy-50">
            {tn('rfq')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
