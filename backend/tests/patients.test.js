import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

const TEST_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiU3VwZXIgQWRtaW4iLCJwZXJtaXNzaW9ucyI6W119.TEST';

describe('Patients API - /api/patients', () => {
  it('GET /search - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/patients/search?q=test');
    expect(res.status).toBe(401);
  });

  it('GET /search - should reject with invalid token', async () => {
    const res = await request(app)
      .get('/api/patients/search?q=a')
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });

  it('POST / - should reject unauthenticated', async () => {
    const res = await request(app)
      .post('/api/patients')
      .send({ fullName: 'Test Patient' });
    expect(res.status).toBe(401);
  });

  it('POST / - should reject with invalid token', async () => {
    const res = await request(app)
      .post('/api/patients')
      .send({})
      .set('Authorization', TEST_TOKEN);
    expect(res.status).toBe(401);
  });
});
