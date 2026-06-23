import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('POS API - /api/pos', () => {
  it('GET /items - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/pos/items');
    expect(res.status).toBe(401);
  });

  it('GET /items?category=pharmacy - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/pos/items?category=pharmacy');
    expect(res.status).toBe(401);
  });

  it('GET /items?category=optics - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/pos/items?category=optics');
    expect(res.status).toBe(401);
  });

  it('POST /transact - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/pos/transact').send({});
    expect(res.status).toBe(401);
  });

  it('GET /shift/current - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/pos/shift/current');
    expect(res.status).toBe(401);
  });

  it('POST /shift/close - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/pos/shift/close').send({});
    expect(res.status).toBe(401);
  });
});
