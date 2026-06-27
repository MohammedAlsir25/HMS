import type { Request, Response, NextFunction } from 'express';
import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors.js';

export function asyncHandler(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  const prismaErr = err as { code?: string; meta?: unknown };
  if (prismaErr.code === 'P2002') {
    return res.status(409).json({ message: 'Duplicate entry', details: prismaErr.meta });
  }

  if (prismaErr.code === 'P2025') {
    return res.status(404).json({ message: 'Resource not found' });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
}
