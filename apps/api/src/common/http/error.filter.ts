import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ErrorCode, type ApiErrorBody } from '@tawreed/contracts';
import { translate } from '@tawreed/i18n';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import { RequestContext } from '../context/request-context.js';
import { AppError } from './app-error.js';

const statusCodes: Partial<Record<number, ErrorCode>> = {
  400: ErrorCode.VALIDATION_FAILED,
  401: ErrorCode.UNAUTHENTICATED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  413: ErrorCode.FILE_TOO_LARGE,
  422: ErrorCode.VALIDATION_FAILED,
  429: ErrorCode.RATE_LIMITED,
};

/** Converts every error into `{ error: { code, message, details, requestId } }` with a localized message. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;
    const res = host.switchToHttp().getResponse<Response>();
    const ctx = RequestContext.get();
    const locale = ctx?.locale ?? 'ar';
    const { status, code, params, details } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error({ err: exception, requestId: ctx?.requestId }, 'Unhandled error');
    }

    const body: ApiErrorBody = {
      error: {
        code,
        message: translate(locale, `errors.${code}`, params),
        ...(details ? { details } : {}),
        ...(ctx?.requestId ? { requestId: ctx.requestId } : {}),
      },
    };
    if (!res.headersSent) res.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    code: ErrorCode;
    params: Record<string, string | number>;
    details?: Record<string, unknown>;
  } {
    const locale = RequestContext.locale();
    if (exception instanceof AppError) {
      return { status: exception.status, code: exception.code, params: exception.params, details: exception.details };
    }
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ErrorCode.VALIDATION_FAILED,
        params: {},
        details: {
          fields: exception.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message.startsWith('errors.') ? translate(locale, i.message) : i.message,
          })),
        },
      };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return { status: HttpStatus.CONFLICT, code: ErrorCode.CONFLICT, params: {}, details: { target: exception.meta?.target } };
      }
      if (exception.code === 'P2025') return { status: HttpStatus.NOT_FOUND, code: ErrorCode.NOT_FOUND, params: {} };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { status, code: statusCodes[status] ?? (status >= 500 ? ErrorCode.INTERNAL : ErrorCode.VALIDATION_FAILED), params: {} };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: ErrorCode.INTERNAL, params: {} };
  }
}
