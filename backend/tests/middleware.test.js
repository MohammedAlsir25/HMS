import { describe, it, expect, jest } from '@jest/globals';
import { asyncHandler, errorHandler } from '../src/middleware/errorHandler.js';
import { NotFoundError, ValidationError } from '../src/utils/errors.js';

describe('asyncHandler', () => {
  it('calls next with resolved promise', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ ok: true });
    });
    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();
    await handler(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with rejection', async () => {
    const handler = asyncHandler(async () => {
      throw new Error('boom');
    });
    const req = {};
    const res = {};
    const next = jest.fn();
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
  });
});

describe('errorHandler', () => {
  it('handles AppError with details', () => {
    const err = new ValidationError('Bad input', [{ path: 'name', message: 'Required' }]);
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Bad input',
      details: [{ path: 'name', message: 'Required' }],
    });
  });

  it('handles AppError without details', () => {
    const err = new NotFoundError('Patient not found');
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Patient not found' });
  });

  it('handles Prisma P2002 (unique constraint)', () => {
    const err = { code: 'P2002', meta: { target: ['email'] } };
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Duplicate entry', details: err.meta });
  });

  it('handles Prisma P2025 (not found)', () => {
    const err = { code: 'P2025' };
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Resource not found' });
  });

  it('falls back to 500 for unknown errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('unexpected');
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    consoleSpy.mockRestore();
  });
});
