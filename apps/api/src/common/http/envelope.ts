import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor, StreamableFile } from '@nestjs/common';
import type { PageMeta } from '@tawreed/contracts';
import { map, type Observable } from 'rxjs';

/** Return from a handler to produce `{ data, meta }`. */
export class Paginated<T> {
  constructor(
    readonly data: T[],
    readonly meta: PageMeta & { [key: string]: unknown },
  ) {}
}

/** Marker for handlers that must bypass the envelope (e.g. webhooks, redirects). */
export class RawResponse<T> {
  constructor(readonly body: T) {}
}

export function paginate<T>(data: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return new Paginated(data, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}

export function pageArgs(q: { page: number; pageSize: number }) {
  return { skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}

/** Wraps successful responses in `{ data }` (or `{ data, meta }` for Paginated). */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value instanceof StreamableFile) return value;
        if (value instanceof RawResponse) return value.body as unknown;
        if (value instanceof Paginated) return { data: value.data, meta: value.meta };
        if (value === undefined) return { data: null };
        return { data: value };
      }),
    );
  }
}
