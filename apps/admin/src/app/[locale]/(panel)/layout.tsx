import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { requireStaff } from '@/lib/session';

export default async function PanelLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  await requireStaff(locale);
  return (
    <div className="flex min-h-dvh bg-gray-50">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="mx-auto max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
