import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Inventory API - /api/inventory', () => {
  it('GET /items - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/inventory/items');
    expect(res.status).toBe(401);
  });

  it('GET /items/low-stock - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/inventory/items/low-stock');
    expect(res.status).toBe(401);
  });

  it('GET /items/:id - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/inventory/items/fake-id');
    expect(res.status).toBe(401);
  });

  it('POST /items - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/inventory/items').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /items/:id - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/inventory/items/fake-id').send({});
    expect(res.status).toBe(401);
  });

  it('DELETE /items/:id - should reject unauthenticated', async () => {
    const res = await request(app).delete('/api/inventory/items/fake-id');
    expect(res.status).toBe(401);
  });

  it('GET /transactions/:itemId - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/inventory/transactions/fake-id');
    expect(res.status).toBe(401);
  });

  it('POST /transactions - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/inventory/transactions').send({});
    expect(res.status).toBe(401);
  });

  it('GET /locations - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/inventory/locations');
    expect(res.status).toBe(401);
  });
});
