import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Surgery API - /api/surgeries', () => {
  it('GET / - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/surgeries');
    expect(res.status).toBe(401);
  });

  it('POST / - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/surgeries').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /:id/status - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/surgeries/fake/status').send({ status: 'PREP' });
    expect(res.status).toBe(401);
  });

  it('PATCH /:id - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/surgeries/fake').send({ notes: 'test' });
    expect(res.status).toBe(401);
  });
});

describe('Referral API - /api/referrals', () => {
  it('GET / - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/referrals');
    expect(res.status).toBe(401);
  });

  it('POST / - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/referrals').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /:id/status - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/referrals/fake/status').send({ status: 'DISPATCHED' });
    expect(res.status).toBe(401);
  });
});
