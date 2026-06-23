import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Admin API - /api/admin', () => {
  it('GET /users - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('GET /users/:id - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/admin/users/fake-id');
    expect(res.status).toBe(401);
  });

  it('POST /users - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/admin/users').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /users/:id - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/admin/users/fake-id').send({});
    expect(res.status).toBe(401);
  });

  it('GET /roles - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/admin/roles');
    expect(res.status).toBe(401);
  });

  it('POST /roles - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/admin/roles').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /roles/:id - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/admin/roles/fake-id').send({});
    expect(res.status).toBe(401);
  });

  it('DELETE /roles/:id - should reject unauthenticated', async () => {
    const res = await request(app).delete('/api/admin/roles/fake-id');
    expect(res.status).toBe(401);
  });

  it('POST /roles/seed - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/admin/roles/seed');
    expect(res.status).toBe(401);
  });
});
