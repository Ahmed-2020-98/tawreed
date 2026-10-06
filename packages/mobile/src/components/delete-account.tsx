import type { AccountDeletionResult } from '@tawreed/contracts';
import { Alert } from 'react-native';
import { useTranslations } from 'use-intl';
import { api } from '../api/client';
import { colors } from '../theme';
import { Button } from './button';
import { T } from './text';
import { useErrorToast } from './toast';

/** In-app account deletion request (required by Google Play for apps with sign-up). */
export function DeleteAccountButton() {
  const t = useTranslations('mobile');
  const tc = useTranslations('common');
  const showError = useErrorToast();
  const request = async () => {
    try {
      const r = await api.post<AccountDeletionResult>('/auth/me/deletion-request', {});
      Alert.alert(t('deleteAccount'), t('deleteAccountDone', { ref: r.reference }));
    } catch (e) {
      showError(e);
    }
  };
  const confirm = () =>
    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: tc('cancel'), style: 'cancel' },
      { text: t('deleteAccount'), style: 'destructive', onPress: () => void request() },
    ]);
  return (
    <Button variant="ghost" style={{ alignSelf: 'center' }} onPress={confirm}>
      <T weight="bold" color={colors.red[600]}>
        {t('deleteAccount')}
      </T>
    </Button>
  );
}
