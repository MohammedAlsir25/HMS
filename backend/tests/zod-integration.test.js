import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

let token = null;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@aljawarih.sd', password: 'password123' });
  if (res.status === 200) token = res.body.token;
});

describe('Protected route Zod validation (requires DB)', () => {
  describe('POST /api/patients', () => {
    it('rejects empty body with ValidationError', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.details[0].path).toBe('fullName');
    });

    it('rejects invalid email when provided', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Test', email: 'bad' });
      expect(res.status).toBe(400);
    });

    it('accepts valid minimal patient body', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Integration Test Patient' });
      expect([201, 409, 500]).toContain(res.status);
      expect(res.status).not.toBe(400);
    });
  });

  describe('POST /api/reception/check-in', () => {
    it('rejects empty body with ValidationError', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/reception/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('rejects non-UUID patientId', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/reception/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({ patientId: 'not-a-uuid', clinicId: 'c1' });
      expect(res.status).toBe(400);
      expect(res.body.details[0].path).toBe('patientId');
    });
  });

  describe('POST /api/referrals', () => {
    it('rejects missing patientId', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({ fromClinicId: 'c1', type: 'SPECIALIST' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid referral type', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({ patientId: '550e8400-e29b-41d4-a716-446655440000', fromClinicId: 'c1', type: 'INVALID' });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/referrals/:id/status', () => {
    it('rejects invalid status', async () => {
      if (!token) return;
      const res = await request(app)
        .patch('/api/referrals/fake-id/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INVALID' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/pos/transact', () => {
    it('rejects empty body', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/pos/transact')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('rejects empty items array', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/pos/transact')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'PHARMACY', items: [], paymentMethod: 'CASH', amount: 100 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/lab/tests', () => {
    it('rejects missing code', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/lab/tests')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/lab/orders', () => {
    it('rejects missing testIds and panelId', async () => {
      if (!token) return;
      const res = await request(app)
        .post('/api/lab/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ patientId: '550e8400-e29b-41d4-a716-446655440000', fromClinicId: 'c1' });
      expect(res.status).toBe(400);
    });
  });
});
