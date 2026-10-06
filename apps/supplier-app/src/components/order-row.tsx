import type { SupplierOrderListItemDto } from '@tawreed/contracts';
import { colors, PressableCard, Row, StatusBadge, T, useFormat } from '@tawreed/mobile';
import { router } from 'expo-router';
import { Clock, Snowflake } from 'lucide-react-native';
import { useTranslations } from 'use-intl';

export function SupplierOrderRow({ o }: { o: SupplierOrderListItemDto }) {
  const t = useTranslations('supplier');
  const tb = useTranslations('enums.BusinessType');
  const f = useFormat();
  return (
    <PressableCard pad={14} onPress={() => router.push(`/orders/${o.id}`)} style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T num weight="extrabold">
          {o.number}
        </T>
        <StatusBadge kind="SupplierOrderStatus" value={o.status} />
      </Row>
      <T weight="bold">{o.buyer.name}</T>
      <T size={12} color={colors.textMuted}>
        {tb(o.buyer.businessType as 'RETAIL')} · {o.buyer.city} · {o.itemsCount} × · {o.deliveryDate ? f.date(o.deliveryDate) : '—'}
      </T>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          {o.status === 'PENDING' && o.acceptDeadlineAt && (
            <Row gap={4}>
              <Clock size={14} color={colors.amber[600]} />
              <T size={12} weight="bold" color={colors.amber[700]}>
                {t('acceptBy', { time: f.dateTime(o.acceptDeadlineAt) })}
              </T>
            </Row>
          )}
          {o.storageType !== 'AMBIENT' && <Snowflake size={14} color={colors.blue[600]} />}
        </Row>
        <T num weight="black" color={colors.navy[900]}>
          {f.money(o.total)}
        </T>
      </Row>
    </PressableCard>
  );
}
