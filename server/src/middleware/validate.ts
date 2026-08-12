import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { errors } from '../utils/AppError';

type Source = 'body' | 'query' | 'params';

/** Validates a request part against a zod schema and mutates it to the parsed value. */
export function validate(schema: ZodType, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(result.error);
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}

export function parsePositiveInt(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw errors.badRequest(`${fieldName} must be a positive integer.`);
  }
  return num;
}

export function parseOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
}
