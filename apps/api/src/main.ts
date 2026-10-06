import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap.js';
import { AppConfig } from './config/app-config.js';

const app = await createApp();
const config = app.get(AppConfig);

if (config.runsHttp) {
  await app.listen(config.env.PORT, '0.0.0.0');
  Logger.log(`API ready on ${config.env.API_PUBLIC_URL}/api/v1 (docs: /api/docs, role: ${config.env.APP_ROLE})`, 'Bootstrap');
} else {
  await app.init();
  Logger.log('Worker started', 'Bootstrap');
}
