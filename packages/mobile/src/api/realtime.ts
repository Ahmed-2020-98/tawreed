import { useEffect, useEffectEvent } from 'react';
import { AppState } from 'react-native';
import type { Socket } from 'socket.io-client';
import { apiOrigin } from '../config';
import { useSession } from './session';
import { accessToken } from './client';

/** Serverless API (EXPO_PUBLIC_REALTIME=off) has no socket gateway: the `poll` handler runs on an interval instead. */
const SOCKETS = process.env.EXPO_PUBLIC_REALTIME !== 'off';
const POLL_MS = 12_000;

/**
 * Socket.IO connection to the API gateway (bearer token auth); handlers keyed by event name.
 * Without sockets, calls `handlers.poll()` every 12 s while the app is in the foreground.
 */
export function useRealtime(handlers: Record<string, (payload: never) => void>, enabled = true) {
  const { me } = useSession();
  // Reconnect with the new token when the signed-in account (or its context) changes.
  const account = me ? `${me.user.id}:${me.context.id}` : null;
  const onEvent = useEffectEvent((event: string, payload: unknown) => (handlers[event] as ((p: unknown) => void) | undefined)?.(payload));
  useEffect(() => {
    if (!enabled || !account || SOCKETS) return;
    const id = setInterval(() => {
      if (AppState.currentState === 'active') onEvent('poll', undefined);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, account]);
  useEffect(() => {
    const token = accessToken();
    if (!enabled || !token || !account || !SOCKETS) return;
    let socket: Socket | null = null;
    let cancelled = false;
    void import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      socket = io(`${apiOrigin()}/realtime`, { auth: { token }, transports: ['websocket'], reconnectionDelayMax: 10_000 });
      socket.onAny((event: string, payload: unknown) => onEvent(event, payload));
    });
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [enabled, account]);
}
