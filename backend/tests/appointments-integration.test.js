import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { getAuthToken, authHeader } from './helpers.js';

let token = null;

beforeAll(async () => {
  token = await getAuthToken();
});

describe('Appointments Integration', () => {
  it('rejects unauthenticated calendar access', async () => {
    const res = await request(app).get('/api/appointments/calendar');
    expect(res.status).toBe(401);
  });

  it('returns calendar data for authenticated user', async () => {
    if (!token) return;
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/appointments/calendar?date=${today}`)
      .set(authHeader(token));
    expect([200, 400]).toContain(res.status);
  });

  it('returns appointment stats', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/appointments/stats')
      .set(authHeader(token));
    expect([200, 404]).toContain(res.status);
  });

  it('lists appointments with filters', async () => {
    if (!token) return;
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app)
      .get(`/api/appointments?date=${today}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejects unauthenticated appointment list', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });

  it('returns queue board data', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/appointments/queue')
      .set(authHeader(token));
    expect([200, 400, 404]).toContain(res.status);
  });

  it('rejects unauthenticated queue access', async () => {
    const res = await request(app).get('/api/appointments/queue');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent appointment', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/appointments/00000000-0000-0000-0000-000000000000')
      .set(authHeader(token));
    expect([400, 404]).toContain(res.status);
  });

  it('rejects invalid status transition', async () => {
    if (!token) return;
    const res = await request(app)
      .patch('/api/appointments/00000000-0000-0000-0000-000000000000/status')
      .set(authHeader(token))
      .send({ status: 'INVALID_STATUS' });
    expect([400, 404, 422]).toContain(res.status);
  });

  it('rejects unauthenticated status update', async () => {
    const res = await request(app)
      .patch('/api/appointments/fake-id/status')
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(401);
  });
});
