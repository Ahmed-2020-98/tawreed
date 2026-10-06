import { Redis } from 'ioredis';

/** Clears OTP resend cooldowns for the demo phones so repeated local runs can sign in immediately (dev only). */
export default async function globalSetup() {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379/3');
  const keys = await redis.keys('tw:otp:login:+96650000*');
  if (keys.length) await redis.del(...keys);
  await redis.quit();
}
