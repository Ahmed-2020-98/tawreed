import type { MeResponse } from '@tawreed/contracts';
import { focusManager, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useLocale } from '../i18n';
import { api, loadTokens, onSessionChange, setApiLocale, signOut as apiSignOut } from './client';

type Status = 'loading' | 'guest' | 'authed';
interface SessionValue {
  status: Status;
  me: MeResponse | null;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<SessionValue>({ status: 'loading', me: null, reload: () => Promise.resolve(), signOut: () => Promise.resolve() });
export const useSession = () => useContext(Ctx);

function SessionInner({ children, expect }: { children: React.ReactNode; expect?: MeResponse['context']['type'] }) {
  const qc = useQueryClient();
  const [state, setState] = useState<{ status: Status; me: MeResponse | null }>({ status: 'loading', me: null });
  // Identity (user + context) of the cached data; switching accounts must not show the previous account's queries.
  const identity = useRef<string | null>(null);
  const reload = useCallback(async () => {
    const t = await loadTokens();
    if (!t) return setState({ status: 'guest', me: null });
    try {
      const me = await api.get<MeResponse>('/auth/me');
      if (expect && me.context.type !== expect) {
        await apiSignOut();
        return setState({ status: 'guest', me: null });
      }
      const id = `${me.user.id}:${me.context.type}:${me.context.id}`;
      if (identity.current && identity.current !== id) void qc.resetQueries();
      identity.current = id;
      setState({ status: 'authed', me });
    } catch {
      setState({ status: 'guest', me: null });
    }
  }, [expect, qc]);
  useEffect(() => {
    // Async session bootstrap: state is only set after awaiting SecureStore / the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    return onSessionChange((signedIn) => {
      if (!signedIn) {
        identity.current = null;
        qc.clear();
        setState({ status: 'guest', me: null });
      }
    });
  }, [reload, qc]);
  const signOut = useCallback(async () => {
    await apiSignOut();
  }, []);
  return <Ctx.Provider value={{ ...state, reload, signOut }}>{children}</Ctx.Provider>;
}

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { retry: 0 } } });

/** Query client + session; refetches on app foreground; forwards the UI locale to the API. */
export function SessionProvider({ children, expect }: { children: React.ReactNode; expect?: MeResponse['context']['type'] }) {
  const { locale } = useLocale();
  setApiLocale(locale);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
    return () => sub.remove();
  }, []);
  return (
    <QueryClientProvider client={client}>
      <SessionInner expect={expect}>{children}</SessionInner>
    </QueryClientProvider>
  );
}
