'use client';

import type { WsTicketDto } from '@tawreed/contracts';
import { useEffect, useEffectEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { useApi } from './use-api';

type Handlers = Record<string, (payload: never) => void>;

/** Serverless deployments have no socket gateway (NEXT_PUBLIC_REALTIME=off): the `poll` handler runs on an interval instead. */
const SOCKETS = process.env.NEXT_PUBLIC_REALTIME !== 'off';
const POLL_MS = 12_000;

/**
 * Connects to the API's Socket.IO gateway with a short-lived ticket from the BFF (tokens stay httpOnly).
 * Without sockets, calls `handlers.poll()` every 12 s while the tab is visible.
 */
export function useRealtime(handlers: Handlers, enabled = true) {
  const api = useApi();
  const onEvent = useEffectEvent((event: string, payload: unknown) => (handlers[event] as ((p: unknown) => void) | undefined)?.(payload));
  useEffect(() => {
    if (!enabled || SOCKETS) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') onEvent('poll', undefined);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !SOCKETS) return;
    let socket: Socket | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const [{ io }, t] = await Promise.all([import('socket.io-client'), api.get<WsTicketDto>('/realtime/ticket')]);
        if (cancelled) return;
        socket = io(t.url, { auth: { ticket: t.ticket }, transports: ['websocket'], reconnectionDelayMax: 10_000 });
        socket.onAny((event: string, payload: unknown) => onEvent(event, payload));
      } catch {
        /* realtime is progressive enhancement */
      }
    })();
    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [api, enabled]);
}
