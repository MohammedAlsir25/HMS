import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

let token = null;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@aljawarih.sd', password: 'password123' });
  if (res.status === 200) token = res.body.token;
});

describe('Patients API v2 - /api/patients (requires DB)', () => {
  describe('GET /search', () => {
    it('rejects unauthenticated', async () => {
      const res = await request(app).get('/api/patients/search?q=test');
      expect(res.status).toBe(401);
    });

    it('returns empty results with valid auth and no match', async () => {
      if (!token) return;
      const res = await request(app)
        .get('/api/patients/search?q=zzzxxxyyy')
        .set('Authorization', `Bearer ${token}`);
      expect([200, 404]).toContain(res.status);
    });

    it('handles missing query parameter gracefully', async () => {
      if (!token) return;
      const res = await request(app)
        .get('/api/patients/search')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /', () => {
    it('rejects empty body', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('rejects body without fullName', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '0912345678' });
      expect(res.status).toBe(400);
      expect(res.body.details[0].path).toBe('fullName');
    });
  });

  describe('GET /', () => {
    it('rejects unauthenticated', async () => {
      const res = await request(app).get('/api/patients');
      expect(res.status).toBe(401);
    });

    it('returns paginated list with valid auth', async () => {
      if (!token) return;
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.patients)).toBe(true);
    });
  });

  describe('GET /:id', () => {
    it('rejects unauthenticated', async () => {
      const res = await request(app).get('/api/patients/fake-id');
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent UUID', async () => {
      if (!token) return;
      const res = await request(app)
        .get('/api/patients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('PATCH /:id', () => {
    it('rejects unauthenticated', async () => {
      const res = await request(app).patch('/api/patients/fake-id').send({});
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid email in body', async () => {
      if (!token) return;
      const res = await request(app)
        .patch('/api/patients/fake-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });
  });
});
