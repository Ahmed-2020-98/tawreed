import { Logger } from '@nestjs/common';
import { type OnGatewayConnection, type OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AccessTokenService } from '../../common/auth/access-token.service.js';
import type { Actor } from '../../common/context/request-context.js';
import { AppConfig } from '../../config/app-config.js';
import { JwtService } from '../../infrastructure/crypto/jwt.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { RealtimeService } from './realtime.service.js';

interface AuthedSocket extends Socket {
  data: { actor?: Actor };
}

@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger('RealtimeGateway');

  constructor(
    private readonly realtime: RealtimeService,
    private readonly tokens: AccessTokenService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.attach(server);
  }

  async handleConnection(socket: AuthedSocket): Promise<void> {
    const auth = socket.handshake.auth as { token?: string; ticket?: string } | undefined;
    let actor: Actor | null = null;
    if (auth?.token) actor = await this.tokens.verify(auth.token);
    if (!actor && auth?.ticket) {
      const claims = await this.jwt.verify<{ access: string }>(auth.ticket, this.config.env.WS_TICKET_SECRET, 'tawreed-ws');
      if (claims?.access) actor = await this.tokens.verify(claims.access);
    }
    if (!actor) {
      socket.emit('error', { code: 'UNAUTHENTICATED' });
      socket.disconnect(true);
      return;
    }
    socket.data.actor = actor;
    const rooms = [`user:${actor.userId}`];
    if (actor.contextType === 'BUYER') rooms.push(`company:${actor.contextId}`);
    if (actor.contextType === 'SUPPLIER') rooms.push(`supplier:${actor.contextId}`);
    if (actor.contextType === 'DRIVER') rooms.push(`driver:${actor.contextId}`);
    if (actor.contextType === 'STAFF') rooms.push('staff');
    await socket.join(rooms);
    socket.emit('ready', { rooms });
  }

  @SubscribeMessage('shipment:subscribe')
  async subscribeShipment(socket: AuthedSocket, payload: { shipmentId?: string }): Promise<{ ok: boolean }> {
    const actor = socket.data.actor;
    if (!actor || !payload?.shipmentId) return { ok: false };
    const s = await this.prisma.shipment.findUnique({ where: { id: payload.shipmentId }, select: { supplierId: true, driverId: true, order: { select: { companyId: true } } } });
    const allowed =
      !!s &&
      (actor.contextType === 'STAFF' ||
        (actor.contextType === 'BUYER' && s.order.companyId === actor.contextId) ||
        (actor.contextType === 'SUPPLIER' && s.supplierId === actor.contextId) ||
        (actor.contextType === 'DRIVER' && s.driverId === actor.contextId));
    if (!allowed) return { ok: false };
    await socket.join(`shipment:${payload.shipmentId}`);
    return { ok: true };
  }

  @SubscribeMessage('shipment:unsubscribe')
  async unsubscribeShipment(socket: AuthedSocket, payload: { shipmentId?: string }): Promise<{ ok: boolean }> {
    if (payload?.shipmentId) await socket.leave(`shipment:${payload.shipmentId}`);
    return { ok: true };
  }
}
