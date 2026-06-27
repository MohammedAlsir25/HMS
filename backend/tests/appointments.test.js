import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

const TEST_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiU3VwZXIgQWRtaW4iLCJwZXJtaXNzaW9ucyI6W119.TEST';

describe('Appointments API - /api/appointments', () => {
  it('PATCH /:id/status - should reject unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/appointments/fake/status')
      .send({ status: 'CALLED' });
    expect(res.status).toBe(401);
  });

  it('PATCH /:id/status - should reject with invalid token', async () => {
    const res = await request(app)
      .patch('/api/appointments/fake/status')
      .send({ status: 'INVALID' })
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });

  it('PATCH /:id/priority - should reject unauthenticated', async () => {
    const res = await request(app)
      .patch('/api/appointments/fake/priority')
      .send({ priority: 5 });
    expect(res.status).toBe(401);
  });

  it('PATCH /:id/priority - should reject with invalid token', async () => {
    const res = await request(app)
      .patch('/api/appointments/fake/priority')
      .send({ priority: 99 })
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });
});
