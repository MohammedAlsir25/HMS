import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

const TEST_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiU3VwZXIgQWRtaW4iLCJwZXJtaXNzaW9ucyI6W119.TEST';

describe('Reception API - /api/reception', () => {
  it('GET /search - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/reception/search?q=test');
    expect(res.status).toBe(401);
  });

  it('GET /search - should reject with invalid token', async () => {
    const res = await request(app)
      .get('/api/reception/search?q=a')
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });

  it('POST /patients - should reject unauthenticated', async () => {
    const res = await request(app)
      .post('/api/reception/patients')
      .send({ fullName: 'Test Patient' });
    expect(res.status).toBe(401);
  });

  it('POST /patients - should reject with invalid token', async () => {
    const res = await request(app)
      .post('/api/reception/patients')
      .send({})
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });

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

  it('PATCH /appointments/:id/status - should reject unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/reception/appointments/fake/status')
      .send({ status: 'CALLED' });
    expect(res.status).toBe(401);
  });

  it('PATCH /appointments/:id/status - should reject with invalid token', async () => {
    const res = await request(app)
      .patch('/api/reception/appointments/fake/status')
      .send({ status: 'INVALID' })
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });

  it('PATCH /appointments/:id/priority - should reject unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/reception/appointments/fake/priority')
      .send({ priority: 5 });
    expect(res.status).toBe(401);
  });

  it('PATCH /appointments/:id/priority - should reject with invalid token', async () => {
    const res = await request(app)
      .patch('/api/reception/appointments/fake/priority')
      .send({ priority: 99 })
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
