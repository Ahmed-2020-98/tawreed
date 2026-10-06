import { execSync } from 'node:child_process';
import { Redis } from 'ioredis';
import { applyTestEnv } from './test-env.js';

/** Once per run: migrate + base-seed the test DB and clear the test Redis namespace. */
export default async function setup(): Promise<void> {
  applyTestEnv();
  const opts = { stdio: 'pipe' as const, env: process.env, cwd: process.cwd() };
  execSync('pnpm exec prisma migrate deploy', opts);
  if (process.env.TEST_SKIP_SEED !== '1') execSync('pnpm exec tsx prisma/seed/index.ts', opts);
  const redis = new Redis(process.env.REDIS_URL as string);
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', 'tw-test*', 'COUNT', 500);
    cursor = next;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== '0');
  await redis.quit();
}
