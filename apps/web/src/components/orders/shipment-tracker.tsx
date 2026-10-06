'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import type { ShipmentDetailDto } from '@tawreed/contracts';
import { Badge } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { Phone, Truck } from 'lucide-react';
import type { GeoJSONSource, Map as MlMap, Marker } from 'maplibre-gl';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { useRealtime } from '@/lib/hooks/use-realtime';
import { loadMaplibre } from '../map/load-maplibre';
import { MAP_STYLE } from '../map/map-picker';

type Point = { lat: number; lng: number };

function pinEl(color: string, label: string) {
  const el = document.createElement('div');
  el.innerHTML = `<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:${color};color:#fff;font:700 12px var(--font-sans);border:3px solid #fff;box-shadow:0 4px 12px rgba(11,45,91,.3)">${label}</div>`;
  return el;
}

/** Live map for an in-flight shipment: route breadcrumbs + driver pin updated over Socket.IO. */
export function ShipmentTracker({ shipmentId }: { shipmentId: string }) {
  const t = useTranslations('account.orders.detail');
  const f = useFormat();
  const api = useApi();
  const { data: s, refetch } = useQuery({ queryKey: ['shipment', shipmentId], queryFn: () => api.get<ShipmentDetailDto>(`/buyer/shipments/${shipmentId}`) });
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const driver = useRef<Marker | null>(null);
  const [livePoints, setLivePoints] = useState<Point[]>([]);
  const live = livePoints.length > 0;
  const route = useMemo(() => [...(s?.route ?? []).map((p) => ({ lat: p.lat, lng: p.lng })), ...livePoints], [s, livePoints]);

  useRealtime({
    'driver.location': (p: { shipmentId: string; lat: number; lng: number }) => {
      if (p.shipmentId !== shipmentId) return;
      setLivePoints((r) => [...r, { lat: p.lat, lng: p.lng }]);
    },
    'shipment.updated': (p: { shipmentId: string }) => p.shipmentId === shipmentId && void refetch(),
    poll: () => void refetch(),
  });

  useEffect(() => {
    if (!s || !el.current || map.current) return;
    let disposed = false;
    void loadMaplibre().then(({ Map, Marker: M, LngLatBounds }) => {
      if (disposed || !el.current) return;
      const m = new Map({ container: el.current, style: MAP_STYLE, center: [s.dropoff.lng, s.dropoff.lat], zoom: 11, attributionControl: { compact: true } });
      map.current = m;
      m.on('error', (e) => console.error('[map]', e.error?.message));
      new M({ element: pinEl('#0B2D5B', 'A') }).setLngLat([s.pickup.lng, s.pickup.lat]).addTo(m);
      new M({ element: pinEl('#067A5B', 'B') }).setLngLat([s.dropoff.lng, s.dropoff.lat]).addTo(m);
      const truck = document.createElement('div');
      truck.innerHTML = '<div style="width:40px;height:40px;border-radius:12px;background:#3CC390;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 6px 16px rgba(11,45,91,.35)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#051A38" stroke-width="2.2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>';
      const last = s.lastLocation ?? s.route.at(-1);
      if (last) driver.current = new M({ element: truck }).setLngLat([last.lng, last.lat]).addTo(m);
      m.on('load', () => {
        m.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: s.route.map((p) => [p.lng, p.lat]) } } });
        m.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#0A9B69', 'line-width': 4, 'line-opacity': 0.85 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        const b = new LngLatBounds();
        [[s.pickup.lng, s.pickup.lat], [s.dropoff.lng, s.dropoff.lat], ...s.route.map((p) => [p.lng, p.lat])].forEach((c) => b.extend(c as [number, number]));
        m.fitBounds(b, { padding: 50, maxZoom: 14, duration: 0 });
      });
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, [s]);

  useEffect(() => {
    const m = map.current;
    const last = route.at(-1);
    if (!m || !last) return;
    driver.current?.setLngLat([last.lng, last.lat]);
    void m.getSource<GeoJSONSource>('route')?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.map((p) => [p.lng, p.lat]) } });
  }, [route]);

  if (!s) return <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200">
      <div className="relative h-72">
        <div ref={el} className="size-full" />
        <span className="absolute start-3 top-3">
          <Badge tone={live ? 'mint' : 'solid'} className="shadow-md">
            <span className={`size-2 rounded-full ${live ? 'animate-pulse bg-navy-900' : 'bg-mint'}`} />
            {t('live')}
          </Badge>
        </span>
      </div>
      {s.driver && (
        <div className="flex items-center gap-3 bg-white p-4">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Truck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{t('driver')}</p>
            <p className="font-bold text-gray-900">
              {s.driver.name} {s.driver.vehicle && <span className="num text-sm font-medium text-gray-500">· {s.driver.vehicle.plateNumber}</span>}
            </p>
            {s.etaAt && <p className="num text-xs font-semibold text-brand-700">{t('eta', { time: f.dateTime(s.etaAt) })}</p>}
          </div>
          {s.driver.phone && (
            <a href={`tel:${s.driver.phone}`} className="flex items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 py-2 text-sm font-bold text-white hover:bg-navy-800">
              <Phone className="size-4" />
              {t('call')}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
