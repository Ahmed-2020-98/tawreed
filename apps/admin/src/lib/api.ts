import 'server-only';
import { createServerApi, hasSession } from '@tawreed/next-kit/server';
import { bff } from './config';

/** Session-aware API client for Server Components. */
export const serverApi = createServerApi(bff);
export const isSignedIn = () => hasSession(bff);
