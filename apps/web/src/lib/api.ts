import 'server-only';
import { createPublicApi, createServerApi, hasSession } from '@tawreed/next-kit/server';
import { bff } from './config';

/** Session-aware API client for Server Components (reads cookies → dynamic rendering). */
export const serverApi = createServerApi(bff);
/** Anonymous API client (cache-friendly). */
export const publicApi = createPublicApi(bff);
export const isSignedIn = () => hasSession(bff);
