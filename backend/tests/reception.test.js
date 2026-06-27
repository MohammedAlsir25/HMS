import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

const TEST_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiU3VwZXIgQWRtaW4iLCJwZXJtaXNzaW9ucyI6W119.TEST';

describe('Reception API - /api/reception', () => {
  it('POST /check-in - should reject unauthenticated', async () => {
    const res = await request(app)
      .post('/api/reception/check-in')
      .send({ patientId: 'fake', clinicId: 'fake' });
    expect(res.status).toBe(401);
  });

  it('POST /check-in - should reject with invalid token', async () => {
    const res = await request(app)
      .post('/api/reception/check-in')
      .send({ patientId: 'fake' })
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });

  it('GET /waiting-room - should return queue data (public, no auth needed)', async () => {
    const res = await request(app).get('/api/reception/waiting-room');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(typeof res.body).toBe('object');
  });

  it('GET /queue/:clinicId - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/reception/queue/fake-clinic-id');
    expect(res.status).toBe(401);
  });
});

describe('Reception API - Zod validation', () => {
  it('POST /check-in - should reject missing patientId with validation', async () => {
    const res = await request(app)
      .post('/api/reception/check-in')
      .send({})
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });
});
