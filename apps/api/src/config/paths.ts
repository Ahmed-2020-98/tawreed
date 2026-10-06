import { fileURLToPath } from 'node:url';

/**
 * apps/api root, resolved from this module (src/config or dist/config are both two levels deep) instead of
 * process.cwd(), which differs between local runs, tests and serverless bundles.
 */
export const API_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const ASSETS_DIR = fileURLToPath(new URL('../../assets/', import.meta.url));
