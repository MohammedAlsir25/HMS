import { describe, it, expect, jest } from '@jest/globals';
import { z } from 'zod';
import { validate } from '../src/middleware/validate.js';
import { ValidationError } from '../src/utils/errors.js';

describe('validate middleware', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().int().positive().optional(),
  });

  it('calls next on valid body', () => {
    const middleware = validate(schema);
    const req = { body: { name: 'John', age: 25 } };
    const next = jest.fn();
    middleware(req, {}, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'John', age: 25 });
  });

  it('coerces and calls next with parsed data', () => {
    const middleware = validate(schema);
    const req = { body: { name: 'Jane' } };
    const next = jest.fn();
    middleware(req, {}, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Jane' });
  });

  it('throws ValidationError on missing required field', () => {
    const middleware = validate(schema);
    const req = { body: {} };
    const next = jest.fn();
    expect(() => middleware(req, {}, next)).toThrow(ValidationError);
    expect(() => middleware(req, {}, next)).toThrow('Validation failed');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws ValidationError on type mismatch', () => {
    const middleware = validate(schema);
    const req = { body: { name: 'John', age: 'not-a-number' } };
    const next = jest.fn();
    expect(() => middleware(req, {}, next)).toThrow(ValidationError);
  });

  it('throws ValidationError with field-level details', () => {
    const middleware = validate(schema);
    const req = { body: { name: '' } };
    const next = jest.fn();
    let thrown;
    try {
      middleware(req, {}, next);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ValidationError);
    expect(thrown.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'name', message: 'Name is required' }),
      ]),
    );
  });

  it('reports all validation errors, not just the first', () => {
    const multiSchema = z.object({
      email: z.string().email('Invalid email'),
      password: z.string().min(6, 'Too short'),
    });
    const middleware = validate(multiSchema);
    const req = { body: { email: 'bad', password: 'ab' } };
    const next = jest.fn();
    let thrown;
    try {
      middleware(req, {}, next);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ValidationError);
    expect(thrown.details.length).toBeGreaterThanOrEqual(2);
  });

  it('does not modify req.body or call next when validation fails', () => {
    const middleware = validate(schema);
    const originalBody = { name: 123 };
    const req = { body: originalBody };
    const next = jest.fn();
    try {
      middleware(req, {}, next);
    } catch (_) { /* expected */ }
    expect(req.body).toBe(originalBody);
    expect(next).not.toHaveBeenCalled();
  });
});
