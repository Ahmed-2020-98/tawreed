import 'reflect-metadata';
import path from 'node:path';
import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AppConfig } from './config/app-config.js';
import { loadEnv } from './config/env.js';
import { StorageService } from './infrastructure/storage/storage.service.js';

const LOG_LEVELS: Record<string, LogLevel[]> = {
  trace: ['log', 'error', 'warn', 'debug', 'verbose'],
  debug: ['log', 'error', 'warn', 'debug'],
  info: ['log', 'error', 'warn'],
  warn: ['error', 'warn'],
  error: ['error'],
  fatal: ['fatal'],
  silent: [],
};

/** Creates the fully configured Nest app (shared by main.ts and the integration tests). */
export async function createApp(): Promise<NestExpressApplication> {
  const env = loadEnv();
  const logger = new ConsoleLogger({ json: env.APP_ENV === 'production', prefix: 'Tawreed', logLevels: LOG_LEVELS[env.LOG_LEVEL] });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger, bodyParser: true, rawBody: true });
  const config = app.get(AppConfig);
  const storage = app.get(StorageService);

  app.set('trust proxy', 1);
  app.set('query parser', 'extended');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.enableCors({ origin: config.corsOrigins, credentials: true, exposedHeaders: ['x-request-id'] });
  app.useBodyParser('json', { limit: '2mb' });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  // Public files (product images, banners…) — immutable, cacheable. On Blob they already live at a CDN URL.
  if (storage.driver === 'blob') {
    app.use('/files/p', (req: Request, res: Response) => res.redirect(301, storage.blobUrl(decodeURIComponent(req.path.replace(/^\/+/, '')), 'PUBLIC')));
  } else {
    app.use('/files/p', express.static(path.resolve(process.cwd(), config.env.STORAGE_LOCAL_DIR, 'public'), { maxAge: '30d', immutable: true }));
  }
  // Private files through HMAC-signed, expiring URLs.
  app.use('/files/s', (req: Request, res: Response) => {
    const key = decodeURIComponent(req.path.replace(/^\/+/, ''));
    const exp = Number(req.query.e);
    const sig = typeof req.query.s === 'string' ? req.query.s : '';
    if (!key || !storage.verifySignature(key, exp, sig)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Link expired or invalid' } });
      return;
    }
    const dn = typeof req.query.dn === 'string' ? req.query.dn : undefined;
    if (storage.driver === 'blob') {
      res.setHeader('Cache-Control', 'private, no-store');
      res.redirect(302, storage.blobUrl(key, 'PRIVATE') + (dn ? '?download=1' : ''));
      return;
    }
    if (dn) res.attachment(dn);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(storage.localPath(key, 'PRIVATE'), (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });

  if (config.env.SWAGGER_ENABLED) {
    const doc = new DocumentBuilder()
      .setTitle('Tawreed API')
      .setDescription('Tawreed B2B marketplace REST API — envelope { data } / { data, meta } / { error }.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, doc), { jsonDocumentUrl: 'api/docs-json' });
  }
  return app;
}
