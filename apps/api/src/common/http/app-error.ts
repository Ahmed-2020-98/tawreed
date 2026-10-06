import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@tawreed/contracts';

/**
 * Domain/application error with a stable code. The filter localizes `code` using @tawreed/i18n
 * (errors.<code>) and interpolates `params`.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number = HttpStatus.BAD_REQUEST,
    readonly params: Record<string, string | number> = {},
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'AppError';
  }

  static notFound(details?: Record<string, unknown>) {
    return new AppError(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, {}, details);
  }
  static forbidden(code: ErrorCode = ErrorCode.FORBIDDEN) {
    return new AppError(code, HttpStatus.FORBIDDEN);
  }
  static unauthenticated(code: ErrorCode = ErrorCode.UNAUTHENTICATED) {
    return new AppError(code, HttpStatus.UNAUTHORIZED);
  }
  static conflict(code: ErrorCode, params: Record<string, string | number> = {}, details?: Record<string, unknown>) {
    return new AppError(code, HttpStatus.CONFLICT, params, details);
  }
  static unprocessable(code: ErrorCode, params: Record<string, string | number> = {}, details?: Record<string, unknown>) {
    return new AppError(code, HttpStatus.UNPROCESSABLE_ENTITY, params, details);
  }
  static invalidTransition(from: string, action: string) {
    return new AppError(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, {}, { from, action });
  }
}
