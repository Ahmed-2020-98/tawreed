#!/usr/bin/env node
/**
 * One-time local setup for Tawreed.
 *  1. Verifies Node, PostgreSQL, Redis and Mailpit are reachable.
 *  2. Creates the `tawreed_c3` and `tawreed_c3_test` databases when missing.
 *  3. Writes env files from every app's `.env.example` (never overwrites existing ones),
 *     replacing `__SECRET__` placeholders with fresh random secrets.
 *
 * Usage: pnpm setup:dev
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Suffixed with _c3: the parallel code2-tawreed project already owns tawreed_dev/tawreed_test.
const DATABASES = ['tawreed_c3', 'tawreed_c3_test'];
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ! ${msg}`);
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  process.exitCode = 1;
};

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function portOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host, timeout: 1500 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function checkServices() {
  console.log('\nServices');
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major > 22 || (major === 22 && minor >= 12)) ok(`Node ${process.versions.node}`);
  else fail(`Node ${process.versions.node} — need >= 22.12`);

  try {
    run('psql', ['-d', 'postgres', '-Atc', 'select 1']);
    ok('PostgreSQL reachable (psql)');
  } catch {
    fail('PostgreSQL not reachable — start it (brew services start postgresql@16)');
    return false;
  }
  try {
    const pong = run('redis-cli', ['-n', '3', 'ping']);
    if (pong === 'PONG') ok('Redis reachable (db 3)');
    else fail(`Redis replied: ${pong}`);
  } catch {
    fail('Redis not reachable — start it (brew services start redis)');
  }
  if (await portOpen(1025)) ok('Mailpit SMTP on :1025 (UI http://localhost:8025)');
  else warn('Mailpit not running on :1025 — emails will fail until it is started (brew services start mailpit)');
  return true;
}

function ensureDatabases() {
  console.log('\nDatabases');
  for (const db of DATABASES) {
    const exists = run('psql', ['-d', 'postgres', '-Atc', `select 1 from pg_database where datname='${db}'`]);
    if (exists === '1') ok(`${db} exists`);
    else {
      run('createdb', [db]);
      ok(`${db} created`);
    }
  }
}

function writeEnvFiles() {
  console.log('\nEnv files');
  const appsDir = path.join(root, 'apps');
  if (!existsSync(appsDir)) return;
  const pgUser = run('psql', ['-d', 'postgres', '-Atc', 'select current_user']);
  for (const app of readdirSync(appsDir)) {
    const example = path.join(appsDir, app, '.env.example');
    if (!existsSync(example)) continue;
    const isNext = existsSync(path.join(appsDir, app, 'next.config.ts'));
    const target = path.join(appsDir, app, isNext ? '.env.local' : '.env');
    if (existsSync(target)) {
      ok(`apps/${app}/${path.basename(target)} already exists (kept)`);
      continue;
    }
    const content = readFileSync(example, 'utf8')
      .replaceAll('__SECRET__', () => randomBytes(48).toString('base64url'))
      .replaceAll('__PG_USER__', pgUser);
    writeFileSync(target, content);
    ok(`apps/${app}/${path.basename(target)} written`);
  }
}

console.log('Tawreed — local setup');
if (await checkServices()) {
  ensureDatabases();
  writeEnvFiles();
}
console.log(
  process.exitCode
    ? '\nSetup finished with errors (see above).'
    : '\nDone. Next: pnpm db:migrate && pnpm db:seed && pnpm dev',
);
