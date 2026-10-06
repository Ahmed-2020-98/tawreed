import type { ShipmentDetailDto } from '@tawreed/contracts';
import { api, colors, MapFallback, nativeMapsAvailable, useRealtime } from '@tawreed/mobile';
import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

/** Live shipment map: route breadcrumbs + driver marker updated over Socket.IO. */
export function TrackingMap({ shipmentId, height = 220 }: { shipmentId: string; height?: number }) {
  const { data: s, refetch } = useQuery({ queryKey: ['shipment', shipmentId], queryFn: () => api.get<ShipmentDetailDto>(`/buyer/shipments/${shipmentId}`) });
  const [live, setLive] = useState<{ latitude: number; longitude: number }[]>([]);
  const map = useRef<MapView>(null);
  useRealtime({
    'driver.location': (p: { shipmentId: string; lat: number; lng: number }) => p.shipmentId === shipmentId && setLive((l) => [...l, { latitude: p.lat, longitude: p.lng }]),
    'shipment.updated': (p: { shipmentId: string }) => p.shipmentId === shipmentId && void refetch(),
    poll: () => void refetch(),
  });
  const route = useMemo(() => [...(s?.route ?? []).map((p) => ({ latitude: p.lat, longitude: p.lng })), ...live], [s, live]);
  if (!s) return <View style={{ height, borderRadius: 16, backgroundColor: colors.gray[100] }} />;
  const pickup = { latitude: s.pickup.lat, longitude: s.pickup.lng };
  const drop = { latitude: s.dropoff.lat, longitude: s.dropoff.lng };
  const driver = route.at(-1);
  if (!nativeMapsAvailable) return <MapFallback height={height} points={[{ lat: drop.latitude, lng: drop.longitude }, ...(driver ? [{ lat: driver.latitude, lng: driver.longitude }] : [])]} />;
  return (
    <View style={{ height, borderRadius: 16, overflow: 'hidden' }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        initialRegion={{ latitude: (pickup.latitude + drop.latitude) / 2, longitude: (pickup.longitude + drop.longitude) / 2, latitudeDelta: Math.abs(pickup.latitude - drop.latitude) * 1.8 + 0.05, longitudeDelta: Math.abs(pickup.longitude - drop.longitude) * 1.8 + 0.05 }}
        onMapReady={() => map.current?.fitToCoordinates([pickup, drop, ...route], { edgePadding: { top: 40, bottom: 40, left: 40, right: 40 }, animated: false })}
      >
        <Marker coordinate={pickup} pinColor={colors.navy[900]} />
        <Marker coordinate={drop} pinColor={colors.green[600]} />
        {route.length > 1 && <Polyline coordinates={route} strokeColor={colors.green[600]} strokeWidth={4} />}
        {driver && (
          <Marker coordinate={driver} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.green[400], alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' }}>
              <Truck size={20} color={colors.navy[950]} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}
