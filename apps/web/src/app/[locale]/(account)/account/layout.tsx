import { Avatar } from '@tawreed/ui';
import { AccountMobileNav, AccountSidebar } from '@/components/account/account-nav';
import { NotificationBell } from '@/components/account/notification-bell';
import { StatusBadge } from '@/components/account/status-badge';
import { SearchBox } from '@/components/site/search-box';
import { CartButton } from '@/components/site/header-actions';
import { requireBuyer } from '@/lib/session';

export default async function AccountLayout({ children, params }: LayoutProps<'/[locale]/account'>) {
  const { locale } = await params;
  const me = await requireBuyer(locale, '/account');
  return (
    <div className="flex min-h-dvh bg-gray-50">
      <AccountSidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <AccountMobileNav />
            <SearchBox className="hidden max-w-md flex-1 md:block" />
            <div className="ms-auto flex items-center gap-1.5">
              <CartButton />
              <NotificationBell />
              <div className="ms-2 flex items-center gap-2.5 border-s border-gray-200 ps-4">
                <div className="hidden text-end leading-tight sm:block">
                  <p className="text-sm font-bold text-gray-900">{me.context.name}</p>
                  <div className="mt-0.5 flex justify-end">{me.context.verificationStatus && <StatusBadge kind="VerificationStatus" value={me.context.verificationStatus} size="sm" />}</div>
                </div>
                <Avatar name={me.user.name} src={me.user.avatarUrl} size={38} />
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
