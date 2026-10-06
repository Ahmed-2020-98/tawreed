'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useApi } from '@/lib/hooks/use-api';

export function NotificationBell() {
  const api = useApi();
  const { data = 0 } = useQuery({ queryKey: ['notifications', 'unread'], queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).count, refetchInterval: 60_000 });
  return (
    <Link href="/account/notifications" className="relative grid size-10 place-items-center rounded-xl text-gray-600 transition hover:bg-gray-100" aria-label="Notifications">
      <Bell className="size-5" />
      {data > 0 && <span className="num absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[0.625rem] font-bold text-white ring-2 ring-white">{data > 9 ? '9+' : data}</span>}
    </Link>
  );
}
