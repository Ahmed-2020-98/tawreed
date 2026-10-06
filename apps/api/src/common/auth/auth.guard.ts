import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '@tawreed/contracts';
import type { Request } from 'express';
import { type Actor, RequestContext } from '../context/request-context.js';
import { AppError } from '../http/app-error.js';
import { AccessTokenService } from './access-token.service.js';
import { AUTH_REQUIREMENT, type AuthRequirement, IS_PUBLIC } from './decorators.js';

/**
 * Global guard: parses the bearer token, attaches the actor to the request + context, and enforces
 * @Auth(contexts, ...permissions). Routes without @Public() or @Auth() still require authentication.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<Request & { actor?: Actor }>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    const requirement = this.reflector.getAllAndOverride<AuthRequirement | undefined>(AUTH_REQUIREMENT, [
      context.getHandler(),
      context.getClass(),
    ]);

    const token = this.extractToken(req);
    const actor = token ? await this.tokens.verify(token) : null;
    if (actor) {
      req.actor = actor;
      RequestContext.setActor(actor);
    }

    if (isPublic && !requirement) return true;
    if (!actor) throw AppError.unauthenticated(token ? ErrorCode.SESSION_EXPIRED : ErrorCode.UNAUTHENTICATED);
    if (requirement) {
      if (requirement.contexts.length && !requirement.contexts.includes(actor.contextType)) throw AppError.forbidden();
      if (requirement.permissions.some((p) => !actor.permissions.has(p))) throw AppError.forbidden();
    }
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    return token.length > 20 ? token : null;
  }
}
