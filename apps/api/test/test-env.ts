import { config } from 'dotenv';

/** Points the API at the isolated test database / Redis namespace / storage dir. Imported by setup + global setup. */
export function applyTestEnv(): void {
  config({ quiet: true });
  if (!process.env.DATABASE_URL_TEST) throw new Error('DATABASE_URL_TEST is not set (run pnpm setup:dev)');
  Object.assign(process.env, {
    APP_ENV: 'test',
    NODE_ENV: 'test',
    APP_ROLE: 'api',
    DATABASE_URL: process.env.DATABASE_URL_TEST,
    REDIS_PREFIX: 'tw-test:',
    STORAGE_LOCAL_DIR: './storage-test',
    LOG_LEVEL: 'error',
    SWAGGER_ENABLED: 'false',
    DEV_FIXED_OTP: '123456',
    OTP_RESEND_SECONDS: '1',
  });
}
