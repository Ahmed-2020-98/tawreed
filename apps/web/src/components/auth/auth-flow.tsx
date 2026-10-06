'use client';

import { ApiError } from '@tawreed/api-client';
import type { AuthResult, CityDto, OtpRequestResult } from '@tawreed/contracts';
import { BusinessType } from '@tawreed/contracts';
import { Button, cn, Field, Input, NativeSelect, OtpInput, toast } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, Coffee, Hotel, Package, ShoppingBasket, Store, Truck, UtensilsCrossed } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useApi, useAuthApi } from '@/lib/hooks/use-api';

type Step = 'phone' | 'otp' | 'details';
const TYPE_ICON: Record<string, typeof Store> = { RETAIL: ShoppingBasket, SUPERMARKET: Store, RESTAURANT: UtensilsCrossed, CAFE: Coffee, HOTEL: Hotel, CATERING: Truck, COMPANY: Building2, OTHER: Package };

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, setLeft] as const;
}

export function AuthFlow({ mode }: { mode: 'login' | 'register' }) {
  const t = useTranslations('auth');
  const te = useTranslations('enums.BusinessType');
  const locale = useLocale();
  const auth = useAuthApi();
  const api = useApi();
  const next = useSearchParams().get('next') || '/store';
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [left, setLeft] = useCountdown(0);
  const [form, setForm] = useState({ name: '', email: '', companyName: '', businessType: 'SUPERMARKET', cityId: '', crNumber: '', vatNumber: '' });
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity, enabled: step === 'details' });

  const fail = (e: unknown) => {
    if (e instanceof ApiError) {
      setErrors(e.fieldErrors);
      if (!Object.keys(e.fieldErrors).length) toast.error(e.message);
    } else toast.error(String(e));
  };
  const done = () => {
    // Full navigation so the server layout picks up the new session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the server layout re-reads the session cookie
    window.location.assign(`${locale === 'en' ? '/en' : ''}${next.startsWith('/') ? next : '/store'}`);
  };

  const requestOtp = async () => {
    setBusy(true);
    setErrors({});
    try {
      const r = await auth<OtpRequestResult>('otp-request', { phone });
      setDevCode(r.devCode);
      setLeft(r.resendInSeconds);
      setStep('otp');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    try {
      const r = await auth<AuthResult>('otp-verify', { phone, code: value }); // tokens are stripped by the BFF
      if (r.status === 'REGISTRATION_REQUIRED') {
        setToken(r.registrationToken);
        setStep('details');
      } else {
        toast.success(t('welcome'));
        done();
      }
    } catch (e) {
      setCode('');
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    setBusy(true);
    setErrors({});
    try {
      await auth('register', {
        registrationToken: token,
        name: form.name,
        email: form.email || undefined,
        app: 'WEB',
        company: { name: form.companyName, businessType: form.businessType, cityId: form.cityId, crNumber: form.crNumber || undefined, vatNumber: form.vatNumber || undefined },
      });
      toast.success(t('welcome'));
      done();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      {step === 'phone' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void requestOtp();
          }}
        >
          <h1 className="text-3xl font-black text-navy-900">{mode === 'login' ? t('loginTitle') : t('registerTitle')}</h1>
          <p className="mt-2 text-gray-600">{mode === 'login' ? t('loginSubtitle') : t('registerSubtitle')}</p>
          <Field label={t('phone')} htmlFor="phone" error={errors.phone} className="mt-8">
            <div dir="ltr" className="flex">
              <span className="num flex items-center gap-1.5 whitespace-nowrap rounded-s-lg border border-e-0 border-gray-200 bg-gray-50 px-3.5 text-sm font-bold text-gray-600">🇸🇦 +966</span>
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- single-purpose step: focus the only input */}
              <Input id="phone" inputSize="lg" autoFocus inputMode="tel" autoComplete="tel" placeholder={t('phonePlaceholder')} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ''))} aria-invalid={!!errors.phone} className="num rounded-s-none text-lg tracking-wide" />
            </div>
          </Field>
          <Button type="submit" size="lg" block className="mt-6" loading={busy} disabled={phone.replace(/\D/g, '').length < 9}>
            {t('sendCode')}
          </Button>
          <p className="mt-6 text-center text-xs leading-6 text-gray-500">
            {t.rich('terms', {
              terms: (chunks) => (
                <Link href="/pages/terms" className="font-semibold text-brand-700 underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/pages/privacy" className="font-semibold text-brand-700 underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p className="mt-8 border-t border-gray-100 pt-6 text-center text-sm text-gray-600">
            {t('supplierHint')}{' '}
            <a href="http://localhost:3032/login" className="font-bold text-navy-900 hover:underline">
              {t('supplierLink')}
            </a>
          </p>
        </form>
      )}

      {step === 'otp' && (
        <div>
          <button type="button" onClick={() => setStep('phone')} className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900">
            <ArrowRight className="size-4 ltr:rotate-180" />
            {t('changePhone')}
          </button>
          <h1 className="text-3xl font-black text-navy-900">{t('otpTitle')}</h1>
          <p className="mt-2 text-gray-600">
            {t.rich('otpSubtitle', {
              phone,
              b: (chunks) => (
                <span className="num font-bold text-gray-900" dir="ltr">
                  {chunks}
                </span>
              ),
            })}
          </p>
          <div className="mt-8">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- single-purpose step: focus the only input */}
            <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} autoFocus />
          </div>
          {devCode && <p className="num mt-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">{t('devCode', { code: devCode })}</p>}
          <Button size="lg" block className="mt-6" loading={busy} disabled={code.length !== 6} onClick={() => void verify()}>
            {t('verify')}
          </Button>
          <p className="mt-5 text-center text-sm">
            {left > 0 ? (
              <span className="num text-gray-500">{t('resendIn', { seconds: left })}</span>
            ) : (
              <button type="button" onClick={() => void requestOtp()} className="font-bold text-brand-700 hover:underline">
                {t('resend')}
              </button>
            )}
          </p>
        </div>
      )}

      {step === 'details' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void register();
          }}
          className="space-y-5"
        >
          <div>
            <h1 className="text-3xl font-black text-navy-900">{t('detailsTitle')}</h1>
            <p className="mt-2 text-gray-600">{t('detailsSubtitle')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('yourName')} htmlFor="name" required error={errors.name}>
              <Input id="name" autoComplete="name" value={form.name} onChange={set('name')} required />
            </Field>
            <Field label={t('email')} htmlFor="email" error={errors.email}>
              <Input id="email" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set('email')} />
            </Field>
          </div>
          <Field label={t('companyName')} htmlFor="company" required error={errors['company.name']}>
            <Input id="company" autoComplete="organization" value={form.companyName} onChange={set('companyName')} required />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">{t('businessType')}</legend>
            <div className="grid grid-cols-4 gap-2">
              {BusinessType.map((b) => {
                const Icon = TYPE_ICON[b] ?? Package;
                const on = form.businessType === b;
                return (
                  <button key={b} type="button" onClick={() => setForm((f) => ({ ...f, businessType: b }))} className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center text-xs font-bold transition', on ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                    <Icon className="size-5" />
                    {te(b)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Field label={t('city')} htmlFor="city" required error={errors['company.cityId']}>
            <NativeSelect id="city" value={form.cityId} onChange={set('cityId')} required>
              <option value="" disabled>
                —
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('cr')} htmlFor="cr" hint={t('crHint')} error={errors['company.crNumber']}>
              <Input id="cr" dir="ltr" inputMode="numeric" maxLength={10} value={form.crNumber} onChange={set('crNumber')} className="num" />
            </Field>
            <Field label={t('vat')} htmlFor="vat" hint={t('vatHint')} error={errors['company.vatNumber']}>
              <Input id="vat" dir="ltr" inputMode="numeric" maxLength={15} value={form.vatNumber} onChange={set('vatNumber')} className="num" />
            </Field>
          </div>
          <Button type="submit" size="lg" block loading={busy}>
            {t('createAccount')}
          </Button>
        </form>
      )}
    </div>
  );
}
