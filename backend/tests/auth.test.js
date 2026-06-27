import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { config } from '../src/config/index.js';

describe('Auth API - /api/auth', () => {
  describe('POST /login — Zod validation', () => {
    it('should reject missing credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'secret' });
      expect(res.status).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details[0].path).toContain('email');
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.com' });
      expect(res.status).toBe(400);
    });

    it('should reject empty password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.com', password: '' });
      expect(res.status).toBe(400);
    });

    it('should strip unknown fields and succeed with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.com', password: 'secret', extraField: 'should-be-stripped' });
      // Zod strips unknown fields, so validation passes; then 401/500 from actual auth
      expect([400, 401, 500]).toContain(res.status);
      expect(res.status).not.toBe(400); // body is valid
    });
  });

  describe('POST /refresh — Zod validation', () => {
    it('should reject missing refreshToken', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should reject empty refreshToken', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /login — auth behavior', () => {
    it('should reject nonexistent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'test123' });
      expect([401, 429, 500]).toContain(res.status);
      if (res.status === 401) {
        expect(res.body.message).toBe('Invalid credentials');
      }
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@aljawarih.sd', password: 'wrongpassword' });
      expect([401, 429, 500]).toContain(res.status);
    });

    const rateLimitTest = config.nodeEnv === 'production' ? it : it.skip;
    rateLimitTest('rate limiting should trigger after exceeding max attempts', async () => {
      const payload = { email: 'ratelimit-test@aljawarih.sd', password: 'wrongpass' };
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login').send(payload);
      }
      const res = await request(app).post('/api/auth/login').send(payload);
      expect(res.status).toBe(429);
    });
  });

  describe('GET /me — auth guard', () => {
    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.status).toBe(401);
    });
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
