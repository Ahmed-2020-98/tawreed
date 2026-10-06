import { AsyncLocalStorage } from 'node:async_hooks';
import type { AppClient, ContextType } from '@tawreed/contracts';
import type { Locale } from '@tawreed/i18n';

export interface Actor {
  userId: string;
  sessionId: string;
  app: AppClient;
  contextType: ContextType;
  /** Buyer company id, supplier id, driver id — null for staff. */
  contextId: string | null;
  role: string | null;
  staffRoles: string[];
  permissions: Set<string>;
}

export interface RequestStore {
  requestId: string;
  locale: Locale;
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  actor?: Actor;
}

const storage = new AsyncLocalStorage<RequestStore>();

export const RequestContext = {
  run<T>(store: RequestStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  get(): RequestStore | undefined {
    return storage.getStore();
  },
  locale(): Locale {
    return storage.getStore()?.locale ?? 'ar';
  },
  actor(): Actor | undefined {
    return storage.getStore()?.actor;
  },
  setActor(actor: Actor): void {
    const store = storage.getStore();
    if (store) store.actor = actor;
  },
};
