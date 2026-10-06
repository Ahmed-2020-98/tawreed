'use client';

import type * as Maplibre from 'maplibre-gl';

let loaded: Promise<typeof Maplibre> | null = null;

/** Lazy-loads MapLibre once and points it at the worker served from /public/maplibre. */
export function loadMaplibre() {
  loaded ??= import('maplibre-gl').then((m) => {
    m.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
    return m;
  });
  return loaded;
}
