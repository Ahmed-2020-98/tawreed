import { ApiError } from '@tawreed/api-client';
import type { AuthResult, CityDto } from '@tawreed/contracts';
import { BusinessType } from '@tawreed/contracts';
import { acceptAuthResult, api, Button, Chip, colors, Input, Screen, T, useErrorToast, useSession, useToast } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

export default function Register() {
  const { token, phone } = useLocalSearchParams<{ token: string; phone: string }>();
  const t = useTranslations('auth');
  const te = useTranslations('enums.BusinessType');
  const toast = useToast();
  const showError = useErrorToast();
  const { reload } = useSession();
  const { data: cities = [] } = useQuery({ queryKey: ['cities'], queryFn: () => api.get<CityDto[]>('/public/cities'), staleTime: Infinity });
  const [f, setF] = useState({ name: '', email: '', companyName: '', businessType: 'SUPERMARKET', cityId: '', crNumber: '', vatNumber: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const r = await api.post<AuthResult>('/auth/register/buyer', { registrationToken: token, name: f.name, email: f.email || undefined, app: 'BUYER_APP', company: { name: f.companyName, businessType: f.businessType, cityId: f.cityId, crNumber: f.crNumber || undefined, vatNumber: f.vatNumber || undefined } });
      await acceptAuthResult(r);
      await reload();
      toast(t('welcome'));
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else showError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={t('detailsTitle')} subtitle={phone} footer={<Button title={t('createAccount')} size="lg" loading={busy} disabled={!f.name || !f.companyName || !f.cityId} onPress={() => void submit()} />}>
      <T color={colors.textMuted}>{t('detailsSubtitle')}</T>
      <Input label={t('yourName')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} error={errors.name} />
      <Input label={t('email')} ltr keyboardType="email-address" autoCapitalize="none" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} error={errors.email} />
      <Input label={t('companyName')} value={f.companyName} onChangeText={(v) => setF({ ...f, companyName: v })} error={errors['company.name']} />
      <T weight="semibold" size={13} color={colors.gray[700]}>
        {t('businessType')}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BusinessType.map((b) => (
          <Chip key={b} label={te(b)} active={f.businessType === b} onPress={() => setF({ ...f, businessType: b })} />
        ))}
      </View>
      <T weight="semibold" size={13} color={colors.gray[700]}>
        {t('city')}
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {cities.map((c) => (
          <Chip key={c.id} label={c.name} active={f.cityId === c.id} onPress={() => setF({ ...f, cityId: c.id })} />
        ))}
      </View>
      {errors['company.cityId'] && <T color={colors.red[600]}>{errors['company.cityId']}</T>}
      <Input label={t('cr')} ltr keyboardType="number-pad" maxLength={10} hint={t('crHint')} value={f.crNumber} onChangeText={(v) => setF({ ...f, crNumber: v })} error={errors['company.crNumber']} />
      <Input label={t('vat')} ltr keyboardType="number-pad" maxLength={15} hint={t('vatHint')} value={f.vatNumber} onChangeText={(v) => setF({ ...f, vatNumber: v })} error={errors['company.vatNumber']} />
    </Screen>
  );
}
