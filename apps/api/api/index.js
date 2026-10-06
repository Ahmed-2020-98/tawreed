// Vercel Node function: the whole NestJS API behind one handler (vercel.json rewrites every path here).
// `dist/` is built by the Vercel build command (turbo → nest build).
import 'reflect-metadata';
import { waitUntil } from '@vercel/functions';

let ready;

async function boot() {
  const { createApp } = await import('../dist/bootstrap.js');
  const { MaintenanceService } = await import('../dist/modules/platform/maintenance.service.js');
  const app = await createApp();
  await app.init();
  return { handle: app.getHttpAdapter().getInstance(), maintenance: app.get(MaintenanceService) };
}

export default async function handler(req, res) {
  ready ??= boot().catch((err) => {
    ready = undefined;
    throw err;
  });
  const { handle, maintenance } = await ready;
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? 'GET');
  // After the response: deliver outbox events (invoices, notifications…) and due recurring jobs.
  const done = new Promise((resolve) => {
    res.once('finish', resolve);
    res.once('close', resolve);
  });
  waitUntil(done.then(() => maintenance.tick({ mutation })).catch((err) => console.error('[maintenance]', err)));
  handle(req, res);
}
