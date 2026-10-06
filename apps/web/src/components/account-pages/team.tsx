'use client';

import type { MemberDto } from '@tawreed/contracts';
import { BuyerRole } from '@tawreed/contracts';
import { Avatar, Button, Card, Dialog, DialogContent, DialogTrigger, Field, Input, NativeSelect, toast } from '@tawreed/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { PageHeader } from '../account/page-header';
import { StatusBadge } from '../account/status-badge';

export function TeamView() {
  const t = useTranslations('account.team');
  const te = useTranslations('enums');
  const api = useApi();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['team'], queryFn: () => api.get<MemberDto[]>('/buyer/team') });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', role: 'PURCHASER' });
  const [busy, setBusy] = useState(false);
  const invite = async () => {
    setBusy(true);
    try {
      await api.post('/buyer/team', f);
      toast.success(t('invited'));
      setOpen(false);
      setF({ name: '', phone: '', role: 'PURCHASER' });
      void qc.invalidateQueries({ queryKey: ['team'] });
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus />
                {t('invite')}
              </Button>
            </DialogTrigger>
            <DialogContent title={t('invite')} size="sm">
              <div className="space-y-4">
                <Field label={t('name')} htmlFor="tn">
                  <Input id="tn" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                </Field>
                <Field label={t('phone')} htmlFor="tp">
                  <Input id="tp" dir="ltr" className="num" inputMode="tel" placeholder="05XXXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                </Field>
                <Field label={t('role')} htmlFor="tr" hint={t(`roleHints.${f.role}` as never)}>
                  <NativeSelect id="tr" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                    {BuyerRole.filter((r) => r !== 'OWNER').map((r) => (
                      <option key={r} value={r}>
                        {te(`BuyerRole.${r}` as never)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Button block loading={busy} onClick={() => void invite()}>
                  {t('invite')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {data.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <Avatar name={m.name} size={42} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900">
                  {m.name} {m.isYou && <span className="text-xs font-medium text-gray-400">(you)</span>}
                </p>
                <p className="num text-xs text-gray-500" dir="ltr">
                  {m.phone?.replace('+966', '0')}
                </p>
              </div>
              <div className="text-end">
                <p className="text-sm font-bold text-navy-900">{te(`BuyerRole.${m.role}` as never)}</p>
                <p className="text-xs text-gray-400">{t(`roleHints.${m.role}` as never)}</p>
              </div>
              <StatusBadge kind="MemberStatus" value={m.status} size="sm" />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
