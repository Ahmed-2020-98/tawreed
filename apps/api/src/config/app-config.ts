import { Injectable } from '@nestjs/common';
import { loadEnv, type Env } from './env.js';

/** Typed, validated configuration. Inject `AppConfig` anywhere. */
@Injectable()
export class AppConfig {
  readonly env: Env;

  constructor() {
    this.env = loadEnv();
  }

  get isDev(): boolean {
    return this.env.APP_ENV === 'development';
  }

  get isTest(): boolean {
    return this.env.APP_ENV === 'test';
  }

  get isProd(): boolean {
    return this.env.APP_ENV === 'production';
  }

  /** Public demo deployment (fixed OTP allowed); impossible in production (see loadEnv). */
  get isDemo(): boolean {
    return this.env.DEMO_MODE && !this.isProd;
  }

  /** Running as a serverless function (Vercel): no long-lived workers, timers or sockets. */
  get isServerless(): boolean {
    return !!process.env.VERCEL;
  }

  get corsOrigins(): string[] {
    return this.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  }

  get runsHttp(): boolean {
    return this.env.APP_ROLE !== 'worker';
  }

  get runsWorkers(): boolean {
    return this.env.APP_ROLE !== 'api' && !this.isServerless;
  }
}
