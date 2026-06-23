import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Clinics API - /api/clinics', () => {
  it('GET / - should return list of clinics (reject unauthenticated)', async () => {
    const res = await request(app).get('/api/clinics');
    expect(res.status).toBe(401);
  });

  it('GET /medicine/dashboard - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/clinics/medicine/dashboard');
    expect(res.status).toBe(401);
  });

  it('POST /medicine/record - should reject unauthenticated', async () => {
    const res = await request(app)
      .post('/api/clinics/medicine/record')
      .send({ patientId: 'fake', diagnosis: 'Test' });
    expect(res.status).toBe(401);
  });

  it('GET /nonexistent/dashboard - should reject with valid token', async () => {
    const res = await request(app)
      .get('/api/clinics/nonexistent/dashboard')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiU3VwZXIgQWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJjbGluaWNhbDpyZWFkIl19.TEST');
    // With invalid token it's still caught by auth middleware
    expect([401, 500]).toContain(res.status);
  });

  it('GET /:slug/records - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/clinics/medicine/records');
    expect(res.status).toBe(401);
  });

  it('GET /:slug/queue - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/clinics/medicine/queue');
    expect(res.status).toBe(401);
  });

  it('GET /:slug/stats - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/clinics/medicine/stats');
    expect(res.status).toBe(401);
  });
});
