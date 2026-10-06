import { colors, MapFallback, nativeMapsAvailable, T } from '@tawreed/mobile';
import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';
import { useDriverSummary } from '@/lib/driver';

export default function DriverMap() {
  const t = useTranslations('driver');
  const insets = useSafeAreaInsets();
  const { data } = useDriverSummary();
  const s = data?.activeShipment;
  const d = data?.driver;
  const center = s ? { latitude: s.dropoff.lat, longitude: s.dropoff.lng } : d?.lastLat ? { latitude: d.lastLat, longitude: d.lastLng ?? 0 } : { latitude: 24.7136, longitude: 46.6753 };
  return (
    <View style={{ flex: 1 }}>
      {nativeMapsAvailable ? (
      <MapView style={{ flex: 1 }} showsUserLocation initialRegion={{ ...center, latitudeDelta: 0.15, longitudeDelta: 0.15 }}>
        {s && (
          <>
            <Marker coordinate={{ latitude: s.pickup.lat, longitude: s.pickup.lng }} pinColor={colors.navy[900]} title={s.pickup.name} />
            <Marker coordinate={{ latitude: s.dropoff.lat, longitude: s.dropoff.lng }} pinColor={colors.green[600]} title={s.buyer.name} />
            {s.route.length > 1 && <Polyline coordinates={s.route.map((p) => ({ latitude: p.lat, longitude: p.lng }))} strokeColor={colors.green[600]} strokeWidth={4} />}
          </>
        )}
      </MapView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
          <MapFallback points={s ? [{ lat: s.pickup.lat, lng: s.pickup.lng, label: s.pickup.name }, { lat: s.dropoff.lat, lng: s.dropoff.lng, label: s.buyer.name }] : []} />
        </View>
      )}
      {s && (
        <Pressable onPress={() => router.push(`/shipment/${s.id}`)} style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16, backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.green[400], alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={20} color={colors.navy[950]} />
          </View>
          <View style={{ flex: 1 }}>
            <T size={11} color={colors.textMuted}>
              {t('active')}
            </T>
            <T weight="extrabold">{s.buyer.name}</T>
          </View>
          <T num weight="bold" color={colors.navy[900]}>
            {s.number}
          </T>
        </Pressable>
      )}
    </View>
  );
}
