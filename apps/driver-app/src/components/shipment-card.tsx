import type { ShipmentDetailDto } from '@tawreed/contracts';
import { colors, PressableCard, Row, StatusBadge, T, useFormat } from '@tawreed/mobile';
import { router } from 'expo-router';
import { Banknote, MapPin, Store } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

export function ShipmentCard({ s, highlight }: { s: ShipmentDetailDto; highlight?: boolean }) {
  const t = useTranslations('driver');
  const f = useFormat();
  return (
    <PressableCard pad={14} onPress={() => router.push(`/shipment/${s.id}`)} style={{ gap: 10, borderColor: highlight ? colors.navy[900] : colors.gray[100], borderWidth: highlight ? 1.5 : 1 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T num weight="extrabold">
          {s.number}
        </T>
        <StatusBadge kind="ShipmentStatus" value={s.status} />
      </Row>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ alignItems: 'center', paddingTop: 3 }}>
          <Store size={16} color={colors.navy[900]} />
          <View style={{ width: 2, height: 22, backgroundColor: colors.gray[200], marginVertical: 3 }} />
          <MapPin size={16} color={colors.green[700]} />
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          <View>
            <T size={11} color={colors.textMuted}>
              {t('pickupFrom')}
            </T>
            <T weight="bold" size={14} numberOfLines={1}>
              {s.pickup.name}
            </T>
          </View>
          <View>
            <T size={11} color={colors.textMuted}>
              {t('deliverTo')}
            </T>
            <T weight="bold" size={14} numberOfLines={1}>
              {s.buyer.name} · {s.dropoff.city}
            </T>
          </View>
        </View>
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={12} color={colors.textMuted}>
          {s.scheduledDate ? f.date(s.scheduledDate) : ''} {s.distanceKm ? `· ${t('km', { km: Number(s.distanceKm).toFixed(0) })}` : ''}
        </T>
        {Number(s.codAmount) > 0 && (
          <Row gap={4}>
            <Banknote size={15} color={colors.amber[600]} />
            <T num weight="bold" size={13} color={colors.amber[700]}>
              {f.money(s.codAmount)}
            </T>
          </Row>
        )}
      </Row>
    </PressableCard>
  );
}
