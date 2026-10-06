import type { AppClient } from '@tawreed/contracts';

export interface BffConfig {
  /** API origin, e.g. http://localhost:8030 (no /api/v1). */
  apiOrigin: string;
  /** App client sent to the API on login (WEB, ADMIN, SUPPLIER_WEB). */
  app: AppClient;
  /** Cookie prefix — must differ per app because every localhost port shares cookies. */
  cookiePrefix: string;
  secure?: boolean;
}

export const cookieNames = (c: BffConfig) => ({ access: `${c.cookiePrefix}_at`, refresh: `${c.cookiePrefix}_rt` });
export const apiBase = (c: BffConfig) => `${c.apiOrigin.replace(/\/$/, '')}/api/v1`;
