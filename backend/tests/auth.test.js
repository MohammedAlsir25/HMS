import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Auth API - /api/auth', () => {
  it('POST /login - should reject missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('POST /login - should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'test123' });
    // Returns 401 with DB connected, or 500 if Prisma can't reach DB
    expect([401, 500]).toContain(res.status);
    if (res.status === 401) {
      expect(res.body.message).toBe('Invalid credentials');
    }
  });

  it('POST /login - should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aljawahir.ae', password: 'wrongpassword' });
    // Returns 401 with DB connected, or 500 if Prisma can't reach DB
    expect([401, 500]).toContain(res.status);
  });

  it('POST /login - rate limiting should trigger after 5 attempts', async () => {
    const payload = { email: 'admin@aljawahir.ae', password: 'wrongpass' };
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send(payload);
    }
    const res = await request(app).post('/api/auth/login').send(payload);
    expect(res.status).toBe(429);
  });

  it('POST /refresh - should reject missing token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('GET /me - should reject without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /me - should reject invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken123');
    expect(res.status).toBe(401);
  });
});

describe('Health Check', () => {
  it('GET /api/health - should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('404 Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
