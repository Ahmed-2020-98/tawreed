'use client';

import { Button, Dialog, DialogContent, DialogTrigger, Field, Input, Select, Textarea, toast } from '@tawreed/ui';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toastError, useApi } from '@/lib/hooks/use-api';

export function CreditApplyButton({ variant = 'primary' }: { variant?: 'primary' | 'accent' }) {
  const t = useTranslations('account.credit');
  const api = useApi();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ requestedLimit: '50000', requestedTermsDays: '30', monthlyPurchases: '', yearsInBusiness: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/buyer/credit/applications', {
        requestedLimit: f.requestedLimit,
        requestedTermsDays: Number(f.requestedTermsDays),
        monthlyPurchases: f.monthlyPurchases || undefined,
        yearsInBusiness: f.yearsInBusiness ? Number(f.yearsInBusiness) : undefined,
        notes: f.notes || undefined,
        documentFileIds: [],
      });
      toast.success(t('applicationSent'));
      setOpen(false);
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>{t('apply')}</Button>
      </DialogTrigger>
      <DialogContent title={t('applyTitle')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('requestedLimit')} htmlFor="lim">
            <Input id="lim" dir="ltr" inputMode="numeric" className="num" value={f.requestedLimit} onChange={(e) => setF({ ...f, requestedLimit: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label={t('requestedTerms')}>
            <Select aria-label={t('requestedTerms')} value={f.requestedTermsDays} onValueChange={(v) => setF({ ...f, requestedTermsDays: v })} options={[15, 30, 45, 60].map((d) => ({ value: String(d), label: t('termsValue', { count: d }) }))} />
          </Field>
          <Field label={t('monthlyPurchases')} htmlFor="mp">
            <Input id="mp" dir="ltr" inputMode="numeric" className="num" value={f.monthlyPurchases} onChange={(e) => setF({ ...f, monthlyPurchases: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label={t('years')} htmlFor="yrs">
            <Input id="yrs" dir="ltr" inputMode="numeric" className="num" value={f.yearsInBusiness} onChange={(e) => setF({ ...f, yearsInBusiness: e.target.value.replace(/\D/g, '') })} />
          </Field>
        </div>
        <Field label={t('notes')} htmlFor="n" className="mt-4">
          <Textarea id="n" rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
        <Button block className="mt-5" loading={busy} onClick={() => void submit()}>
          {t('submitApplication')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
