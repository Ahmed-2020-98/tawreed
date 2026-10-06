// Copies MapLibre's ES-module worker (+ its shared chunk) to /public so the bundler never has to resolve it.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
const out = path.resolve(import.meta.dirname, '../public/maplibre');
mkdirSync(out, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(path.join(dist, f), path.join(out, f));
