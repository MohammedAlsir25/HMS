import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('HR API - /api/hr', () => {
  it('GET /employees - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/hr/employees');
    expect(res.status).toBe(401);
  });

  it('POST /employees - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/hr/employees').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /employees/:id - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/hr/employees/fake-id').send({});
    expect(res.status).toBe(401);
  });

  it('GET /payroll - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/hr/payroll');
    expect(res.status).toBe(401);
  });

  it('POST /payroll - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/hr/payroll').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /payroll/:id/status - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/hr/payroll/fake-id/status').send({});
    expect(res.status).toBe(401);
  });

  it('GET /attendance - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/hr/attendance');
    expect(res.status).toBe(401);
  });

  it('POST /attendance - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/hr/attendance').send({});
    expect(res.status).toBe(401);
  });

  it('GET /leaves - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/hr/leaves');
    expect(res.status).toBe(401);
  });

  it('POST /leaves - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/hr/leaves').send({});
    expect(res.status).toBe(401);
  });

  it('PATCH /leaves/:id/status - should reject unauthenticated', async () => {
    const res = await request(app).patch('/api/hr/leaves/fake-id/status').send({});
    expect(res.status).toBe(401);
  });
});
