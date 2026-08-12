import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/** 404 handler for unknown routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
    code: 'NOT_FOUND',
  });
}

/** Central error handler — always returns clean, user-friendly messages. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    res.status(422).json({
      success: false,
      message: 'Validation failed. Please check the highlighted fields.',
      code: 'VALIDATION_ERROR',
      details,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  // Prisma known errors (duplicate unique key, missing record).
  const prismaErr = err as { code?: string; meta?: { target?: string[]; modelName?: string } };
  if (prismaErr && prismaErr.code) {
    if (prismaErr.code === 'P2002') {
      const field = prismaErr.meta?.target?.[0] ?? 'field';
      res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists.`,
        code: 'DUPLICATE_RECORD',
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'The requested record does not exist or was already removed.',
        code: 'NOT_FOUND',
      });
      return;
    }
    if (prismaErr.code === 'P2003') {
      res.status(409).json({
        success: false,
        message: 'This record is in use by other records and cannot be changed.',
        code: 'FOREIGN_KEY_CONSTRAINT',
      });
      return;
    }
  }

  console.error('[Unhandled error]', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
    code: 'INTERNAL_ERROR',
  });
}
