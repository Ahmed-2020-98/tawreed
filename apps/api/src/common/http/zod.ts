import { Body, type PipeTransform, Query, Param } from '@nestjs/common';
import type { z } from 'zod';

/** Validates & transforms input with a zod schema; ZodError is mapped to 422 by the filter. */
export class ZodPipe<S extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    return this.schema.parse(value ?? {});
  }
}

export const ZBody = (schema: z.ZodType) => Body(new ZodPipe(schema));
export const ZQuery = (schema: z.ZodType) => Query(new ZodPipe(schema));
export const ZParam = (name: string, schema: z.ZodType) => Param(name, new ZodPipe(schema));
