'use client';

import type { NotificationDto } from '@tawreed/contracts';
import { Button, Card, cn, EmptyState } from '@tawreed/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Page } from '@tawreed/api-client';
import { Link } from '@/i18n/navigation';
import { useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { PageHeader } from '../account/page-header';

function hrefFor(n: NotificationDto): string | null {
  const d = n.data;
  if (!d) return null;
  if (d.url) return d.url;
  switch (d.screen) {
    case 'order':
      return d.id ? `/account/orders/${d.id}` : '/account/orders';
    case 'rfq':
    case 'quotation':
      return d.id ? `/account/rfqs/${d.id}` : '/account/rfqs';
    case 'invoice':
    case 'invoices':
      return '/account/invoices';
    case 'credit':
      return '/account/credit';
    case 'payments':
      return '/account/payments';
    case 'kyb':
      return '/account/company';
    default:
      return null;
  }
}

export function NotificationsView() {
  const t = useTranslations('account.notifications');
  const f = useFormat();
  const api = useApi();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => api.page<NotificationDto>('/notifications', { query: { pageSize: 50 } }) });
  const read = async (id?: string) => {
    await (id ? api.post(`/notifications/${id}/read`) : api.post('/notifications/read-all'));
    qc.setQueryData<Page<NotificationDto>>(['notifications', 'list'], (p) => p && { ...p, data: p.data.map((n) => (!id || n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)) });
    void qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
  };
  const items = data?.data ?? [];
  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          items.some((n) => !n.readAt) && (
            <Button variant="outline" size="sm" onClick={() => void read()}>
              <CheckCheck />
              {t('markAll')}
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        {items.length ? (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => {
              const href = hrefFor(n);
              const body = (
                <div className={cn('flex gap-4 px-5 py-4 transition hover:bg-gray-50', !n.readAt && 'bg-brand-50/40')}>
                  <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-brand-600')} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">{n.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                    <p className="num mt-1 text-xs text-gray-400">{f.relative(n.createdAt)}</p>
                  </div>
                </div>
              );
              return (
                <li key={n.id} onClickCapture={() => !n.readAt && void read(n.id)}>
                  {href ? <Link href={href}>{body}</Link> : body}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<Bell />} title={t('empty')} />
        )}
      </Card>
    </>
  );
}
