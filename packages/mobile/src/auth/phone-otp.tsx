import { ApiError } from '@tawreed/api-client';
import type { AuthResult, OtpRequestResult } from '@tawreed/contracts';
import { ArrowRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { acceptAuthResult, api } from '../api/client';
import { Button } from '../components/button';
import { OtpInput } from '../components/controls';
import { Input } from '../components/input';
import { useErrorToast } from '../components/toast';
import { T } from '../components/text';
import { appClient } from '../config';
import { useRTL } from '../i18n';
import { colors, mirror } from '../theme';

export interface PhoneOtpFlowProps {
  /** Context type this app accepts (BUYER / SUPPLIER / DRIVER). */
  expect: 'BUYER' | 'SUPPLIER' | 'DRIVER';
  hero: React.ReactNode;
  onAuthenticated: () => void;
  /** Buyer app only: unknown phone → registration. */
  onRegistrationRequired?: (registrationToken: string, phone: string) => void;
  wrongAppMessage: string;
}

export function PhoneOtpFlow({ expect, hero, onAuthenticated, onRegistrationRequired, wrongAppMessage }: PhoneOtpFlowProps) {
  const t = useTranslations('auth');
  const insets = useSafeAreaInsets();
  const rtl = useRTL();
  const showError = useErrorToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [dev, setDev] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const request = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const r = await api.post<OtpRequestResult>('/auth/otp/request', { phone, app: appClient() });
      setDev(r.devCode);
      setLeft(r.resendInSeconds);
      setCode('');
      setStep('otp');
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.phone) setError(e.fieldErrors.phone);
      else showError(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    try {
      const r = await api.post<AuthResult>('/auth/otp/verify', { phone, code: value, app: appClient(), deviceName: `${Platform.OS} app` });
      if (r.status === 'REGISTRATION_REQUIRED') {
        if (onRegistrationRequired) onRegistrationRequired(r.registrationToken, r.phone);
        else setError(wrongAppMessage);
        return;
      }
      if (r.context.type !== expect) {
        setError(wrongAppMessage);
        setStep('phone');
        return;
      }
      await acceptAuthResult(r);
      onAuthenticated();
    } catch (e) {
      setCode('');
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {hero}
        <View style={{ padding: 24, gap: 18, paddingBottom: insets.bottom + 24 }}>
          {step === 'phone' ? (
            <>
              <View style={{ gap: 6 }}>
                <T weight="black" size={26}>
                  {t('loginTitle')}
                </T>
                <T color={colors.textMuted}>{t('loginSubtitle')}</T>
              </View>
              <Input
                label={t('phone')}
                ltr
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/[^\d+]/g, ''))}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                placeholder="05X XXX XXXX"
                error={error}
                start={
                  <T num weight="bold" color={colors.gray[500]}>
                    🇸🇦 +966
                  </T>
                }
                returnKeyType="done"
                onSubmitEditing={() => void request()}
              />
              <Button title={t('sendCode')} size="lg" loading={busy} disabled={phone.replace(/\D/g, '').length < 9} onPress={() => void request()} />
              <T size={12} color={colors.textSubtle} center>
                {t.rich('terms', { terms: (c) => c, privacy: (c) => c }) as string}
              </T>
            </>
          ) : (
            <>
              <Pressable onPress={() => setStep('phone')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ArrowRight size={16} color={colors.textMuted} style={mirror(!rtl)} />
                <T color={colors.textMuted} weight="semibold">
                  {t('changePhone')}
                </T>
              </Pressable>
              <View style={{ gap: 6 }}>
                <T weight="black" size={26}>
                  {t('otpTitle')}
                </T>
                <T color={colors.textMuted}>
                  {t.rich('otpSubtitle', { phone, b: (c) => c }) as string}
                </T>
              </View>
              <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} invalid={!!error} />
              {dev && (
                <View style={{ backgroundColor: colors.amber[50], borderRadius: 10, padding: 10 }}>
                  <T num center weight="bold" color={colors.amber[700]}>
                    {t('devCode', { code: dev })}
                  </T>
                </View>
              )}
              {error && (
                <T center color={colors.red[600]} weight="semibold">
                  {error}
                </T>
              )}
              <Button title={t('verify')} size="lg" loading={busy} disabled={code.length !== 6} onPress={() => void verify()} />
              {left > 0 ? (
                <T num center color={colors.textMuted}>
                  {t('resendIn', { seconds: left })}
                </T>
              ) : (
                <Button title={t('resend')} variant="ghost" onPress={() => void request()} />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
