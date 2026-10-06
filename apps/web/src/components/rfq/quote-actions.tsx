'use client';

import type { AcceptQuotationResult, AddressDto, QuotationSummaryDto } from '@tawreed/contracts';
import { Button, Dialog, DialogContent, DialogTrigger, Field, NativeSelect, OtpInput, Textarea, toast } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, MessageSquareText, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toastError, useApi } from '@/lib/hooks/use-api';
import { pickLocale } from '@/lib/format';
import { useFormat } from '@/lib/hooks/use-format';

export function AcceptQuote({ q }: { q: QuotationSummaryDto }) {
  const t = useTranslations('account.rfqs');
  const tco = useTranslations('checkout');
  const locale = useLocale();
  const te = useTranslations('enums.PaymentMethod');
  const f = useFormat();
  const api = useApi();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: addresses = [] } = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<AddressDto[]>('/buyer/addresses'), enabled: open });
  const [addressId, setAddressId] = useState('');
  const [method, setMethod] = useState(q.current.paymentMethods[0] ?? 'COD');
  const [sent, setSent] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const address = addressId || addresses.find((a) => a.isDefault)?.id || addresses[0]?.id || '';

  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ devCode?: string }>(`/buyer/quotations/${q.id}/accept/otp`);
      setSent(r.devCode ?? '');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  const accept = async (code = otp) => {
    setBusy(true);
    try {
      const r = await api.post<AcceptQuotationResult>(`/buyer/quotations/${q.id}/accept`, { versionId: q.current.id, otp: code, paymentMethod: method, addressId: address, termsAccepted: true, returnUrl: `${window.location.origin}/checkout/result` });
      toast.success(t('accepted'));
      if (r.payment.checkoutUrl) window.location.assign(r.payment.checkoutUrl);
      else router.push(`/account/orders/${r.order.id}`);
    } catch (e) {
      setOtp('');
      toastError(e);
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" block>
          <CheckCircle2 />
          {t('accept')}
        </Button>
      </DialogTrigger>
      <DialogContent title={t('acceptTitle')} description={t('acceptBody', { amount: f.money(q.current.total), supplier: q.supplier.name })}>
        <div className="space-y-4">
          <Field label={t('paymentTerms')} htmlFor="pm">
            <NativeSelect id="pm" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              {q.current.paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {te(m)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={tco('address')} htmlFor="ad">
            <NativeSelect id="ad" value={address} onChange={(e) => setAddressId(e.target.value)}>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} — {pickLocale(a.city.name, locale)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {sent === null ? (
            <Button block loading={busy} disabled={!address} onClick={() => void send()}>
              {t('sendOtp')}
            </Button>
          ) : (
            <>
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- single-purpose step: focus the only input */}
              <OtpInput value={otp} onChange={setOtp} onComplete={(v) => void accept(v)} autoFocus />
              {sent && <p className="num rounded-lg bg-amber-50 py-1.5 text-center text-sm font-semibold text-amber-800">123456 · dev {sent}</p>}
              <Button block loading={busy} disabled={otp.length !== 6} onClick={() => void accept()}>
                {t('confirmAccept')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReviseQuote({ q }: { q: QuotationSummaryDto }) {
  const t = useTranslations('account.rfqs');
  const api = useApi();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" block>
          <MessageSquareText />
          {t('requestRevision')}
        </Button>
      </DialogTrigger>
      <DialogContent title={t('requestRevision')} size="sm">
        <Field label={t('revisionMessage')} htmlFor="rv">
          <Textarea id="rv" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} />
        </Field>
        <Button
          block
          className="mt-4"
          loading={busy}
          disabled={msg.trim().length < 3}
          onClick={async () => {
            setBusy(true);
            try {
              await api.post(`/buyer/quotations/${q.id}/request-revision`, { message: msg });
              setOpen(false);
              router.refresh();
            } catch (e) {
              toastError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('send')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function RejectQuote({ q }: { q: QuotationSummaryDto }) {
  const t = useTranslations('account.rfqs');
  const api = useApi();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="ghost"
      block
      className="text-red-600"
      onClick={async () => {
        try {
          await api.post(`/buyer/quotations/${q.id}/reject`, { reason: 'Not selected' });
          router.refresh();
        } catch (e) {
          toastError(e);
        }
      }}
    >
      <XCircle />
      {t('reject')}
    </Button>
  );
}

