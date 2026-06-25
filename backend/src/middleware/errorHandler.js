import { AppError } from '../utils/errors.js';

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'Duplicate entry', details: err.meta });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Resource not found' });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
}
