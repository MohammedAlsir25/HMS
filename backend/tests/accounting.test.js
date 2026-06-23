import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Accounting API - /api/accounting', () => {
  it('GET /summary - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/accounting/summary');
    expect(res.status).toBe(401);
  });

  it('GET /transactions - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/accounting/transactions');
    expect(res.status).toBe(401);
  });

  it('GET /shifts - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/accounting/shifts');
    expect(res.status).toBe(401);
  });

  it('GET /shifts/:id - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/accounting/shifts/fake-id');
    expect(res.status).toBe(401);
  });
});
