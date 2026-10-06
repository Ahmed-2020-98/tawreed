import { api } from '@tawreed/mobile';
import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';

type Point = { lat: number; lng: number; speed: number | null; heading: number | null; accuracy: number | null; recordedAt: string; shipmentId?: string };

/**
 * Foreground location sharing while online: watches position and uploads batches every 15 s.
 * (Background tracking needs a dev/EAS build with a task-manager task — Expo Go runs foreground only.)
 */
export function useLocationSharing(online: boolean, shipmentId?: string | null) {
  const buffer = useRef<Point[]>([]);
  const shipment = useRef(shipmentId ?? undefined);
  useEffect(() => {
    shipment.current = shipmentId ?? undefined;
  }, [shipmentId]);
  useEffect(() => {
    if (!online) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    void (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted || cancelled) return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 20 }, (loc) => {
        buffer.current.push({ lat: loc.coords.latitude, lng: loc.coords.longitude, speed: loc.coords.speed, heading: loc.coords.heading, accuracy: loc.coords.accuracy, recordedAt: new Date(loc.timestamp).toISOString(), shipmentId: shipment.current });
      });
    })();
    const flush = setInterval(() => {
      const points = buffer.current.splice(0, 200);
      if (points.length) void api.post('/driver/locations', { points }).catch(() => buffer.current.unshift(...points));
    }, 15_000);
    return () => {
      cancelled = true;
      sub?.remove();
      clearInterval(flush);
    };
  }, [online]);
}
