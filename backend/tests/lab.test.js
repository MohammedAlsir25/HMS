import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Lab API - /api/lab', () => {
  it('GET /tests - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/lab/tests');
    expect(res.status).toBe(401);
  });

  it('POST /tests - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/lab/tests').send({ code: 'TST', name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('PUT /tests/:id - should reject unauthenticated', async () => {
    const res = await request(app).put('/api/lab/tests/fake-id').send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('DELETE /tests/:id - should reject unauthenticated', async () => {
    const res = await request(app).delete('/api/lab/tests/fake-id');
    expect(res.status).toBe(401);
  });

  it('GET /orders - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/lab/orders');
    expect(res.status).toBe(401);
  });

  it('POST /orders - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/lab/orders').send({ patientId: 'fake', fromClinicId: 'c1', testIds: ['t1'] });
    expect(res.status).toBe(401);
  });

  it('PATCH /orders/:id/claim - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/lab/orders/fake/claim');
    expect(res.status).toBe(401);
  });

  it('PATCH /orders/:id/unclaim - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/lab/orders/fake/unclaim');
    expect(res.status).toBe(401);
  });

  it('PATCH /orders/:id/status - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/lab/orders/fake/status').send({ status: 'COMPLETED' });
    expect(res.status).toBe(401);
  });

  it('PUT /orders/:id/results - should reject unauthenticated', async () => {
    const res = await request(app).put('/api/lab/orders/fake/results').send({ results: [] });
    expect(res.status).toBe(401);
  });

  it('GET /orders/:id/report - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/lab/orders/fake/report');
    expect(res.status).toBe(401);
  });

  it('GET /stats - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/lab/stats');
    expect(res.status).toBe(401);
  });
});
