'use client';

import type { AddressDto } from '@tawreed/contracts';
import { Badge, Button, Card, Dialog, DialogContent, DialogTrigger, EmptyState } from '@tawreed/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AddressForm } from '@/components/checkout/address-form';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { PageHeader } from '../account/page-header';

export function AddressesView() {
  const t = useTranslations('account.addresses');
  const tc = useTranslations('checkout');
  const api = useApi();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<AddressDto[]>('/buyer/addresses') });
  const [editing, setEditing] = useState<AddressDto | 'new' | null>(null);
  const del = useMutation({ mutationFn: (id: string) => api.delete(`/buyer/addresses/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }), onError: toastError });
  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus />
            {t('add')}
          </Button>
        }
      />
      {data.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((a) => (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-extrabold text-gray-900">
                  <MapPin className="size-4 text-brand-600" />
                  {a.label}
                </p>
                {a.isDefault && <Badge tone="brand" size="sm">{tc('default')}</Badge>}
              </div>
              <p className="mt-2 flex-1 text-sm leading-6 text-gray-600">{a.formatted}</p>
              <p className="num mt-1 text-xs text-gray-400" dir="ltr">
                {a.recipientName} · {a.recipientPhone.replace('+966', '0')}
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                  <Pencil />
                  {tc('editAddress')}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => window.confirm(t('deleteConfirm')) && del.mutate(a.id)}>
                  <Trash2 />
                  {t('delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<MapPin />} title={t('empty')} />
        </Card>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogTrigger className="hidden" />
        <DialogContent title={editing === 'new' ? t('add') : t('edit')} size="lg">
          {editing && (
            <AddressForm
              initial={editing === 'new' ? undefined : editing}
              onSaved={() => {
                setEditing(null);
                void qc.invalidateQueries({ queryKey: ['addresses'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
