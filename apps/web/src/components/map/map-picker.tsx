'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { LocateFixed, MapPin } from 'lucide-react';
import type { Map as MlMap } from 'maplibre-gl';
import { useEffect, useEffectEvent, useRef } from 'react';
import { loadMaplibre } from './load-maplibre';

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Drag-the-map pin picker: the pin stays centred and reports the centre on move end. */
export function MapPicker({ lat, lng, onChange, className = 'h-64' }: { lat: number; lng: number; onChange: (p: { lat: number; lng: number }) => void; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const emit = useEffectEvent((p: { lat: number; lng: number }) => onChange(p));

  useEffect(() => {
    let disposed = false;
    void loadMaplibre().then(({ Map }) => {
      if (disposed || !el.current) return;
      const m = new Map({ container: el.current, style: MAP_STYLE, center: [lng, lat], zoom: 14, attributionControl: { compact: true } });
      m.on('moveend', () => {
        const c = m.getCenter();
        emit({ lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)) });
      });
      map.current = m;
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialise once
  }, []);

  useEffect(() => {
    const m = map.current;
    if (m && (Math.abs(m.getCenter().lat - lat) > 0.01 || Math.abs(m.getCenter().lng - lng) > 0.01)) m.jumpTo({ center: [lng, lat] });
  }, [lat, lng]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-gray-200 ${className}`}>
      <div ref={el} className="size-full" />
      <MapPin className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-full fill-brand-600 text-white drop-shadow-lg" />
      <button
        type="button"
        aria-label="Locate me"
        onClick={() => navigator.geolocation?.getCurrentPosition((p) => map.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 16 }))}
        className="absolute bottom-3 end-3 grid size-10 place-items-center rounded-xl bg-white text-gray-700 shadow-md hover:text-brand-700"
      >
        <LocateFixed className="size-5" />
      </button>
    </div>
  );
}
