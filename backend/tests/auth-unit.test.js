import { jest } from '@jest/globals';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-2026';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-in-production-2026';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

jest.unstable_mockModule('../src/middleware/requestContext.js', () => ({
  getRequestContext: jest.fn(() => ({ hospitalId: null, userId: null, role: null })),
}));

const { describe, it, expect } = await import('@jest/globals');
const jwt = (await import('jsonwebtoken')).default;
const { authenticate, requirePermission } = await import('../src/middleware/auth.js');

const JWT_SECRET = process.env.JWT_SECRET;

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Auth Unit — Token generation & verification', () => {
  it('generates and verifies a valid JWT', () => {
    const payload = { id: 'u1', email: 'test@test.com', role: 'Admin', hospitalId: 'h1', permissions: ['*'] };
    const token = makeToken(payload);
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe('u1');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.role).toBe('Admin');
    expect(decoded.hospitalId).toBe('h1');
  });

  it('fails verification with wrong secret', () => {
    const token = makeToken({ id: 'u1' });
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  it('fails verification for expired token', () => {
    const token = jwt.sign({ id: 'u1' }, JWT_SECRET, { expiresIn: '0s' });
    const start = Date.now();
    while (Date.now() - start < 1100) {}
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });
});

describe('Auth Unit — authenticate middleware', () => {
  it('calls next with valid token', () => {
    const token = makeToken({ id: 'u1', role: 'Admin', hospitalId: 'h1', permissions: [] });
    const req = { headers: { authorization: `Bearer ${token}` }, user: null };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe('u1');
  });

  it('returns 401 for missing header', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalidtoken' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Auth Unit — requirePermission middleware', () => {
  it('calls next when permission matches', () => {
    const req = { user: { permissions: ['patient:read', 'patient:write'] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requirePermission('patient:read')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when permission missing', () => {
    const req = { user: { permissions: ['patient:read'] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requirePermission('admin:write')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when no permissions on user', () => {
    const req = { user: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requirePermission('patient:read')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('checks multiple permissions (all required)', () => {
    const req = { user: { permissions: ['a', 'b', 'c'] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requirePermission('a', 'b')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('fails when one of multiple permissions is missing', () => {
    const req = { user: { permissions: ['a'] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requirePermission('a', 'b')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
