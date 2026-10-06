import type { CompanyDto, KybOverviewDto } from '@tawreed/contracts';
import { KybDocType } from '@tawreed/contracts';
import { api, Badge, Button, Card, Chip, colors, KeyValue, Row, Screen, StatusBadge, T, useErrorToast, useFormat, useToast } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { FileCheck2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

export default function Company() {
  const t = useTranslations('account.company');
  const ta = useTranslations('auth');
  const te = useTranslations('enums');
  const f = useFormat();
  const toast = useToast();
  const showError = useErrorToast();
  const company = useQuery({ queryKey: ['company'], queryFn: () => api.get<CompanyDto>('/buyer/company') });
  const kyb = useQuery({ queryKey: ['kyb'], queryFn: () => api.get<KybOverviewDto>('/buyer/kyb') });
  const [type, setType] = useState<string>('CR');
  const [busy, setBusy] = useState(false);
  const c = company.data;
  const upload = async (fromCamera: boolean) => {
    const pick = fromCamera ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (pick.canceled || !pick.assets[0]) return;
    setBusy(true);
    try {
      const a = pick.assets[0];
      const fd = new FormData();
      fd.append('file', { uri: a.uri, name: a.fileName ?? 'document.jpg', type: a.mimeType ?? 'image/jpeg' } as unknown as Blob);
      fd.append('purpose', 'KYB_DOCUMENT');
      const file = await api.post<{ id: string }>('/files', fd);
      await api.post('/buyer/kyb/documents', { type, fileId: file.id });
      toast(t('saved'));
      void kyb.refetch();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={t('title')} right={c && <StatusBadge kind="VerificationStatus" value={c.verificationStatus} />}>
      {c && (
        <Card pad={14}>
          <T weight="extrabold" size={16} style={{ marginBottom: 6 }}>
            {c.name}
          </T>
          <KeyValue k={ta('businessType')} v={te(`BusinessType.${c.businessType}` as never)} />
          <KeyValue k={ta('city')} v={f.pick(c.city?.name)} />
          <KeyValue k={ta('cr')} v={c.crNumber ?? '—'} num />
          <KeyValue k={ta('vat')} v={c.vatNumber ?? '—'} num />
        </Card>
      )}
      <T weight="extrabold" size={16}>
        {t('kyb')}
      </T>
      {kyb.data?.missingTypes.length ? (
        <Row style={{ flexWrap: 'wrap' }}>
          {kyb.data.missingTypes.map((m) => (
            <Badge key={m} tone="amber" label={te(`KybDocType.${m}` as never)} />
          ))}
        </Row>
      ) : null}
      {kyb.data?.documents.map((d) => (
        <Card key={d.id} pad={12}>
          <Row>
            <FileCheck2 size={20} color={colors.green[700]} />
            <View style={{ flex: 1 }}>
              <T weight="bold" size={13}>
                {te(`KybDocType.${d.type}` as never)}
              </T>
              <T num size={11} color={colors.textMuted}>
                {f.date(d.createdAt)}
              </T>
            </View>
            <StatusBadge kind="DocReviewStatus" value={d.status} />
          </Row>
        </Card>
      ))}
      <Card pad={14} style={{ gap: 10 }}>
        <T weight="bold">{t('upload')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {KybDocType.map((k) => (
            <Chip key={k} label={te(`KybDocType.${k}` as never)} active={type === k} onPress={() => setType(k)} />
          ))}
        </View>
        <Row>
          <Button style={{ flex: 1 }} title="📷" variant="outline" loading={busy} onPress={() => void upload(true)} />
          <Button style={{ flex: 3 }} title={t('upload')} loading={busy} onPress={() => void upload(false)} />
        </Row>
      </Card>
    </Screen>
  );
}
