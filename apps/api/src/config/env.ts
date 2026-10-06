import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  NODE_ENV: z.string().default('development'),
  APP_ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  PORT: z.coerce.number().int().default(8030),
  API_PUBLIC_URL: z.url().default('http://localhost:8030'),
  WEB_URL: z.url().default('http://localhost:3030'),
  ADMIN_URL: z.url().default('http://localhost:3031'),
  SUPPLIER_URL: z.url().default('http://localhost:3032'),
  CORS_ORIGINS: z.string().default('http://localhost:3030,http://localhost:3031,http://localhost:3032'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1),
  DATABASE_URL_TEST: z.string().optional(),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379/3'),
  REDIS_PREFIX: z.string().default('tw:'),
  /** `postgres` keeps OTPs / rate limits / locks in the kv_entries table (serverless deploy without Redis). */
  KV_DRIVER: z.enum(['redis', 'postgres']).default('redis'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().default(30),
  WS_TICKET_SECRET: z.string().min(32),
  SIGNED_URL_SECRET: z.string().min(32),

  OTP_TTL_SECONDS: z.coerce.number().int().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().default(5),
  OTP_RESEND_SECONDS: z.coerce.number().int().default(60),
  DEV_FIXED_OTP: z.string().regex(/^\d{6}$/).optional(),
  SMS_PROVIDER: z.enum(['log', 'unifonic', 'taqnyat']).default('log'),
  UNIFONIC_APP_SID: z.string().optional(),
  TAQNYAT_BEARER_TOKEN: z.string().optional(),
  TAQNYAT_SENDER: z.string().default('Tawreed'),

  SMTP_HOST: z.string().default('127.0.0.1'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Tawreed <no-reply@tawreed.test>'),

  STORAGE_DRIVER: z.enum(['local', 's3', 'blob']).default('local'),
  /** Vercel Blob (STORAGE_DRIVER=blob). The public base URL is derived from the token's store id unless set. */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  BLOB_BASE_URL: z.url().optional(),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET_PUBLIC: z.string().optional(),
  S3_BUCKET_PRIVATE: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),

  TAP_SECRET_KEY: z.string().default('sk_test_XKokBfNWv6FIYuTMg5sLPjhJ'),
  TAP_API_BASE: z.url().default('https://api.tap.company/v2'),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  /** `sparticuz` = the serverless Chromium build (@sparticuz/chromium) used on Vercel. */
  PDF_BROWSER_CHANNEL: z.enum(['chrome', 'chromium', 'sparticuz']).default('chrome'),
  /** Socket.IO gateway; off on serverless hosts (clients fall back to polling). */
  REALTIME_ENABLED: bool.default(true),
  /** Public demo on a non-production host: allows DEV_FIXED_OTP outside development (never in production). */
  DEMO_MODE: bool.default(false),
  /** Bearer secret Vercel Cron sends to /api/v1/internal/cron. */
  CRON_SECRET: z.string().min(16).optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().optional(),
  SWAGGER_ENABLED: bool.default(true),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.APP_ENV === 'production' && (env.DEV_FIXED_OTP || env.DEMO_MODE)) {
    throw new Error('DEV_FIXED_OTP / DEMO_MODE must not be set in production');
  }
  if (env.STORAGE_DRIVER === 'blob' && !env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('STORAGE_DRIVER=blob requires BLOB_READ_WRITE_TOKEN');
  }
  return env;
}
