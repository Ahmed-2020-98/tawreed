import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  type AccountDeletionResult,
  type AuthResult,
  type MeResponse,
  type OtpRequestResult,
  type SessionDto,
  accountDeletionSchema,
  buyerRegisterSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  staffLoginSchema,
  switchContextSchema,
  updateMeSchema,
} from '@tawreed/contracts';
import type { z } from 'zod';
import { CurrentActor, Public } from '../../common/auth/decorators.js';
import { Throttle } from '../../common/http/throttle.js';
import type { Actor } from '../../common/context/request-context.js';
import { ZBody } from '../../common/http/zod.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@ZBody(otpRequestSchema) body: z.output<typeof otpRequestSchema>): Promise<OtpRequestResult> {
    return this.auth.requestOtp(body);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@ZBody(otpVerifySchema) body: z.output<typeof otpVerifySchema>): Promise<AuthResult> {
    return this.auth.verifyOtp(body);
  }

  @Public()
  @Post('register/buyer')
  registerBuyer(@ZBody(buyerRegisterSchema) body: z.output<typeof buyerRegisterSchema>): Promise<AuthResult> {
    return this.auth.registerBuyer(body);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('staff/login')
  @HttpCode(200)
  staffLogin(@ZBody(staffLoginSchema) body: z.output<typeof staffLoginSchema>): Promise<AuthResult> {
    return this.auth.staffLogin(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@ZBody(refreshSchema) body: z.output<typeof refreshSchema>): Promise<AuthResult> {
    return this.auth.refresh(body.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentActor() actor: Actor): Promise<{ ok: true }> {
    await this.auth.logout(actor);
    return { ok: true };
  }

  @ApiBearerAuth()
  @Post('switch-context')
  @HttpCode(200)
  switchContext(@CurrentActor() actor: Actor, @ZBody(switchContextSchema) body: z.output<typeof switchContextSchema>): Promise<AuthResult> {
    return this.auth.switchContext(actor, body.contextId);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentActor() actor: Actor): Promise<MeResponse> {
    return this.auth.me(actor);
  }

  @ApiBearerAuth()
  @Post('me/deletion-request')
  @HttpCode(200)
  requestDeletion(@CurrentActor() actor: Actor, @ZBody(accountDeletionSchema) body: z.output<typeof accountDeletionSchema>): Promise<AccountDeletionResult> {
    return this.auth.requestDeletion(actor, body.reason);
  }

  @ApiBearerAuth()
  @Patch('me')
  updateMe(@CurrentActor() actor: Actor, @ZBody(updateMeSchema) body: z.output<typeof updateMeSchema>): Promise<MeResponse> {
    return this.auth.updateMe(actor, body);
  }

  @ApiBearerAuth()
  @Get('sessions')
  sessions(@CurrentActor() actor: Actor): Promise<SessionDto[]> {
    return this.auth.listSessions(actor);
  }

  @ApiBearerAuth()
  @Delete('sessions/:id')
  async revokeSession(@CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string): Promise<{ ok: true }> {
    await this.auth.revokeSession(actor, id);
    return { ok: true };
  }
}
