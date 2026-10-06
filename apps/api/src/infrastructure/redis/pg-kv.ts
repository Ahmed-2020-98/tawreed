import pg from 'pg';

/** The Redis commands the API uses — satisfied by ioredis and by PgKv. */
export interface KvClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex: 'EX', seconds: number): Promise<'OK' | null>;
  set(key: string, value: string, ex: 'EX', seconds: number, nx: 'NX'): Promise<'OK' | null>;
  del(...keys: string[]): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  incr(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  ping(): Promise<string>;
  multi(): KvMulti;
  quit(): Promise<unknown>;
}

export interface KvMulti {
  set(key: string, value: string, ex: 'EX', seconds: number): KvMulti;
  exec(): Promise<unknown>;
}

const LIVE = `("expiresAt" IS NULL OR "expiresAt" > now())`;

/**
 * Redis-compatible subset on Postgres (table kv_entries) for serverless deployments without Redis
 * (KV_DRIVER=postgres). Keys get the same prefix ioredis' keyPrefix would add. Expired rows are treated as
 * absent and purged by `purgeExpired()` (maintenance tick).
 */
export class PgKv implements KvClient {
  private readonly pool: pg.Pool;

  constructor(
    connectionString: string,
    private readonly prefix: string,
    max = 3,
  ) {
    this.pool = new pg.Pool({ connectionString, max });
  }

  private k(key: string): string {
    return this.prefix + key;
  }

  private async q<T extends pg.QueryResultRow>(sql: string, params: unknown[]): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async get(key: string): Promise<string | null> {
    const r = await this.q<{ value: string }>(`SELECT value FROM kv_entries WHERE key = $1 AND ${LIVE}`, [this.k(key)]);
    return r.rows[0]?.value ?? null;
  }

  async set(key: string, value: string, _ex: 'EX', seconds: number, nx?: 'NX'): Promise<'OK' | null> {
    // NX only overwrites a row that has already expired.
    const r = await this.q(
      `INSERT INTO kv_entries (key, value, "expiresAt") VALUES ($1, $2, now() + make_interval(secs => $3))
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "expiresAt" = EXCLUDED."expiresAt"
       ${nx ? `WHERE kv_entries."expiresAt" IS NOT NULL AND kv_entries."expiresAt" <= now()` : ''}
       RETURNING key`,
      [this.k(key), value, seconds],
    );
    return r.rowCount ? 'OK' : null;
  }

  async del(...keys: string[]): Promise<number> {
    const r = await this.q(`DELETE FROM kv_entries WHERE key = ANY($1::text[]) AND ${LIVE}`, [keys.map((k) => this.k(k))]);
    return r.rowCount ?? 0;
  }

  async exists(key: string): Promise<number> {
    const r = await this.q(`SELECT 1 FROM kv_entries WHERE key = $1 AND ${LIVE}`, [this.k(key)]);
    return r.rowCount ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const r = await this.q(`UPDATE kv_entries SET "expiresAt" = now() + make_interval(secs => $2) WHERE key = $1 AND ${LIVE}`, [this.k(key), seconds]);
    return r.rowCount ?? 0;
  }

  /** Atomic increment; an expired counter restarts at 1 without expiry (callers then EXPIRE it, like Redis). */
  async incr(key: string): Promise<number> {
    const r = await this.q<{ value: string }>(
      `INSERT INTO kv_entries (key, value, "expiresAt") VALUES ($1, '1', NULL)
       ON CONFLICT (key) DO UPDATE SET
         value = CASE WHEN kv_entries."expiresAt" IS NOT NULL AND kv_entries."expiresAt" <= now() THEN '1' ELSE (kv_entries.value::bigint + 1)::text END,
         "expiresAt" = CASE WHEN kv_entries."expiresAt" IS NOT NULL AND kv_entries."expiresAt" <= now() THEN NULL ELSE kv_entries."expiresAt" END
       RETURNING value`,
      [this.k(key)],
    );
    return Number(r.rows[0]?.value);
  }

  /** Redis semantics: -2 missing, -1 no expiry, else remaining seconds. */
  async ttl(key: string): Promise<number> {
    const r = await this.q<{ secs: number | null }>(`SELECT CEIL(EXTRACT(EPOCH FROM ("expiresAt" - now())))::int AS secs FROM kv_entries WHERE key = $1 AND ${LIVE}`, [this.k(key)]);
    if (!r.rowCount) return -2;
    return r.rows[0]?.secs ?? -1;
  }

  async ping(): Promise<string> {
    await this.q('SELECT 1', []);
    return 'PONG';
  }

  multi(): KvMulti {
    const ops: [string, string, number][] = [];
    const chain: KvMulti = {
      set: (key, value, _ex, seconds) => {
        ops.push([key, value, seconds]);
        return chain;
      },
      exec: async () => {
        for (const [key, value, seconds] of ops) await this.set(key, value, 'EX', seconds);
        return ops.map(() => [null, 'OK']);
      },
    };
    return chain;
  }

  async purgeExpired(): Promise<number> {
    const r = await this.q(`DELETE FROM kv_entries WHERE "expiresAt" IS NOT NULL AND "expiresAt" <= now()`, []);
    return r.rowCount ?? 0;
  }

  async quit(): Promise<void> {
    await this.pool.end();
  }
}
