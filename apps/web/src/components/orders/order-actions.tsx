'use client';

import type { OrderDetailDto, SupplierOrderDto } from '@tawreed/contracts';
import { Button, cn, Dialog, DialogContent, DialogTrigger, Field, Input, Textarea, toast } from '@tawreed/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Download, RotateCcw, Star, Upload, XCircle, CreditCard } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toastError, useApi } from '@/lib/hooks/use-api';

export function OrderHeaderActions({ order }: { order: OrderDetailDto }) {
  const t = useTranslations('account.orders.detail');
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string>();
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast.success(ok);
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(undefined);
    }
  };
  return (
    <>
      <Button variant="outline" size="sm" loading={busy === 'reorder'} onClick={() => void run('reorder', async () => { await api.post(`/buyer/orders/${order.id}/reorder`); await qc.invalidateQueries({ queryKey: ['cart'] }); }, t('reordered'))}>
        <RotateCcw />
        {t('reorder')}
      </Button>
      {order.allowedActions.includes('cancel') && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="danger-soft" size="sm">
              <XCircle />
              {t('cancel')}
            </Button>
          </DialogTrigger>
          <DialogContent title={t('cancel')} size="sm">
            <Field label={t('cancelReason')} htmlFor="reason">
              <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button variant="danger" block className="mt-4" disabled={reason.trim().length < 3} loading={busy === 'cancel'} onClick={() => void run('cancel', async () => { await api.post(`/buyer/orders/${order.id}/cancel`, { reason }); setOpen(false); })}>
              {t('cancelConfirm')}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/** Pending payment: bank-transfer proof upload or card checkout. */
export function PaymentPanel({ order, bankAccounts }: { order: OrderDetailDto; bankAccounts: { bankName: string; accountName: string; iban: string }[] }) {
  const t = useTranslations('account.orders.detail');
  const tc = useTranslations('checkout');
  const locale = useLocale();
  const api = useApi();
  const router = useRouter();
  const [ref, setRef] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingProof = order.payments.some((p) => p.method === 'BANK_TRANSFER' && p.status === 'PENDING_VERIFICATION');

  if (order.paymentMethod === 'CARD') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-bold text-amber-900">{tc('methods.CARD')}</p>
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api.post<{ checkoutUrl: string }>('/buyer/payments/card', { purpose: 'ORDER', orderId: order.id, returnUrl: `${window.location.origin}${locale === 'en' ? '/en' : ''}/checkout/result` });
              window.location.assign(r.checkoutUrl);
            } catch (e) {
              toastError(e);
              setBusy(false);
            }
          }}
        >
          <CreditCard />
          {t('payCard')}
        </Button>
      </div>
    );
  }
  if (pendingProof) return <p className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-800">{t('proofSent')}</p>;

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', 'PAYMENT_PROOF');
      const uploaded = await api.post<{ id: string }>('/files', fd);
      await api.post('/buyer/payments/bank-transfer', { purpose: 'ORDER', orderId: order.id, amount: order.grandTotal, bankReference: ref, transferDate: date, proofFileId: uploaded.id });
      toast.success(t('proofSent'));
      router.refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
      <p className="font-extrabold text-amber-900">{t('bankPending')}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {bankAccounts.map((b) => (
          <div key={b.iban} className="rounded-xl bg-white p-3 text-sm">
            <p className="font-bold text-gray-900">{b.bankName}</p>
            <p className="text-gray-500">{b.accountName}</p>
            <p className="num mt-1 select-all font-semibold tracking-wide text-navy-900" dir="ltr">
              {b.iban}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label={t('bankRef')} htmlFor="ref">
          <Input id="ref" dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} />
        </Field>
        <Field label={t('transferDate')} htmlFor="tdate">
          <Input id="tdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('proof')} htmlFor="proof">
          <label htmlFor="proof" className={cn('flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-sm text-gray-600 hover:border-brand-400', file && 'border-brand-500 text-brand-800')}>
            <Upload className="size-4 shrink-0" />
            <span className="truncate">{file?.name ?? t('bankUpload')}</span>
          </label>
          <input id="proof" type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
      </div>
      <Button className="mt-4" loading={busy} disabled={!file || ref.trim().length < 3} onClick={() => void submit()}>
        {t('submitProof')}
      </Button>
    </div>
  );
}

export function InvoiceButton({ invoiceId, label }: { invoiceId: string; label: string }) {
  const api = useApi();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await api.get<{ url: string }>(`/buyer/invoices/${invoiceId}/pdf`);
          window.open(r.url, '_blank', 'noopener');
        } catch (e) {
          toastError(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download />
      {label}
    </Button>
  );
}

export function RateSupplier({ so }: { so: SupplierOrderDto }) {
  const t = useTranslations('account.orders.detail');
  const api = useApi();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  if (so.review) {
    return (
      <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
        {t('rated')}:
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={cn('size-4', i < so.review!.rating ? 'fill-current' : 'text-gray-300')} />
        ))}
      </span>
    );
  }
  if (!so.allowedActions.includes('rate')) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="soft" size="sm">
          <Star />
          {t('rate')}
        </Button>
      </DialogTrigger>
      <DialogContent title={t('rateTitle', { name: so.supplier.name })} size="sm">
        <div className="flex justify-center gap-2" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n}`} onClick={() => setRating(n)}>
              <Star className={cn('size-10 transition', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
            </button>
          ))}
        </div>
        <Field label={t('comment')} htmlFor="c" className="mt-5">
          <Textarea id="c" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Button
          block
          className="mt-4"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.post(`/buyer/orders/supplier-orders/${so.id}/review`, { rating, comment: comment || undefined });
              toast.success(t('thanks'));
              setOpen(false);
              router.refresh();
            } catch (e) {
              toastError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('submit')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
