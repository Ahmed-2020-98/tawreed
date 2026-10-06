import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { ContextType, Permission } from '@tawreed/contracts';
import type { Request } from 'express';
import type { Actor } from '../context/request-context.js';

export const IS_PUBLIC = 'tw:isPublic';
export const AUTH_REQUIREMENT = 'tw:auth';

export interface AuthRequirement {
  contexts: ContextType[];
  permissions: Permission[];
}

/** Route is reachable without a token (a valid token is still parsed for personalization). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Requires an authenticated actor in one of `contexts`, holding every permission listed. */
export const Auth = (contexts: ContextType | ContextType[], ...permissions: Permission[]) =>
  SetMetadata(AUTH_REQUIREMENT, {
    contexts: Array.isArray(contexts) ? contexts : [contexts],
    permissions,
  } satisfies AuthRequirement);

export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor | undefined => {
  return ctx.switchToHttp().getRequest<Request & { actor?: Actor }>().actor;
});
