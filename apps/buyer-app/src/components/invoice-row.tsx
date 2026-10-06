import type { InvoiceSummaryDto } from '@tawreed/contracts';
import { api, colors, deviceUrl, PressableCard, Row, StatusBadge, T, useErrorToast, useFormat } from '@tawreed/mobile';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

/** Invoice card; tapping opens the signed PDF. */
export function InvoiceRow({ i }: { i: InvoiceSummaryDto }) {
  const t = useTranslations('account.invoices');
  const f = useFormat();
  const showError = useErrorToast();
  return (
    <PressableCard
      pad={14}
      onPress={async () => {
        try {
          const r = await api.get<{ url: string }>(`/buyer/invoices/${i.id}/pdf`);
          await WebBrowser.openBrowserAsync(deviceUrl(r.url));
        } catch (e) {
          showError(e);
        }
      }}
      style={{ gap: 6 }}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <T num weight="extrabold">
          {i.number}
        </T>
        <StatusBadge kind="InvoiceStatus" value={i.status} />
      </Row>
      <T size={13} color={colors.textMuted}>
        {i.supplier.name} · {f.date(i.issueDate)}
      </T>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T size={11} color={colors.textMuted}>
            {t('dueDate')}
          </T>
          <T num size={13} weight="semibold" color={i.isOverdue ? colors.red[600] : colors.text}>
            {f.date(i.dueDate)}
          </T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T size={11} color={colors.textMuted}>
            {t('balance')}
          </T>
          <T num weight="black" color={colors.navy[900]}>
            {f.money(i.balanceDue)}
          </T>
        </View>
      </Row>
    </PressableCard>
  );
}
