import { describe, it, expect } from '@jest/globals';
import { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError } from '../src/utils/errors.js';

describe('Error classes', () => {
  it('AppError sets message, statusCode, and details', () => {
    const err = new AppError('test', 418, { foo: 'bar' });
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(418);
    expect(err.details).toEqual({ foo: 'bar' });
    expect(err).toBeInstanceOf(Error);
  });

  it('AppError defaults to 500 and null details', () => {
    const err = new AppError('oops');
    expect(err.statusCode).toBe(500);
    expect(err.details).toBeNull();
  });

  it('NotFoundError defaults to 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
  });

  it('NotFoundError accepts custom message', () => {
    const err = new NotFoundError('Patient not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Patient not found');
  });

  it('ValidationError defaults to 400', () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Validation failed');
  });

  it('ValidationError accepts details', () => {
    const details = [{ path: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Bad input', details);
    expect(err.details).toEqual(details);
  });

  it('UnauthorizedError defaults to 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenError defaults to 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it('ConflictError defaults to 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe('Duplicate entry');
  });
});
