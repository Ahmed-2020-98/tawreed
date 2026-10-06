import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/** Emits realtime events to rooms (user:, company:, supplier:, driver:, shipment:, staff). */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  emit(rooms: string | string[], event: string, payload: unknown): void {
    if (!this.server) return;
    const list = Array.isArray(rooms) ? rooms : [rooms];
    if (!list.length) return;
    this.server.to(list).emit(event, payload);
  }

  get connected(): number {
    return this.server?.engine?.clientsCount ?? 0;
  }

  log(msg: string): void {
    this.logger.debug(msg);
  }
}
