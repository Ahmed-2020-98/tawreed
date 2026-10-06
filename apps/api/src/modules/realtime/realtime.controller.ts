import { Controller, Get, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { WsTicketDto } from '@tawreed/contracts';
import { AppConfig } from '../../config/app-config.js';
import { JwtService } from '../../infrastructure/crypto/jwt.service.js';

/** Short-lived websocket tickets for browsers whose tokens live in httpOnly cookies (BFF). */
@ApiTags('realtime')
@ApiBearerAuth()
@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  @Get('ticket')
  async ticket(@Headers('authorization') authorization: string): Promise<WsTicketDto> {
    const access = authorization.replace(/^Bearer\s+/i, '');
    const ticket = await this.jwt.sign({ access }, this.config.env.WS_TICKET_SECRET, 60, 'tawreed-ws');
    return { ticket, url: `${this.config.env.API_PUBLIC_URL}/realtime`, expiresAt: new Date(Date.now() + 60_000).toISOString() };
  }
}
