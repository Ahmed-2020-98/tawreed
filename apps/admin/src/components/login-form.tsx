'use client';

import { ApiError } from '@tawreed/api-client';
import type { AuthResult } from '@tawreed/contracts';
import { Button, Field, Input, toast } from '@tawreed/ui';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthApi } from '@/lib/hooks/use-api';

export function LoginForm() {
  const t = useTranslations('login');
  const locale = useLocale();
  const auth = useAuthApi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        try {
          const r = await auth<Omit<AuthResult, 'tokens'>>('staff-login', { email: email.trim(), password });
          if (r.status !== 'AUTHENTICATED') throw new Error(t('failed'));
          // Full navigation so the server layout picks up the new session cookie.
          window.location.assign(locale === 'en' ? '/en' : '/');
        } catch (err) {
          if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
          else toast.error(err instanceof Error ? err.message : t('failed'));
          setBusy(false);
        }
      }}
    >
      <Field label={t('email')} htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="username" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} start={<Mail />} required />
      </Field>
      <Field label={t('password')} htmlFor="password" error={errors.password}>
        <Input
          id="password"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          start={<Lock />}
          end={
            <button type="button" onClick={() => setShow((s) => !s)} className="grid size-8 place-items-center rounded-md text-gray-400 hover:bg-gray-100" aria-label={t('togglePassword')}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
          required
        />
      </Field>
      <Button type="submit" block loading={busy} variant="secondary" className="mt-2">
        {t('submit')}
      </Button>
    </form>
  );
}
