import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Insurance API - /api/insurance', () => {
  it('GET /companies - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/companies');
    expect(res.status).toBe(401);
  });

  it('GET /policies - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/policies');
    expect(res.status).toBe(401);
  });

  it('GET /pricing-rules - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/pricing-rules');
    expect(res.status).toBe(401);
  });

  it('GET /pre-authorizations - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/pre-authorizations');
    expect(res.status).toBe(401);
  });

  it('GET /claims - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/claims');
    expect(res.status).toBe(401);
  });

  it('GET /claims/dashboard - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/claims/dashboard');
    expect(res.status).toBe(401);
  });

  it('GET /settlements - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/settlements');
    expect(res.status).toBe(401);
  });

  it('GET /settlements/aging - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/settlements/aging');
    expect(res.status).toBe(401);
  });

  it('GET /reports/claims-by-company - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/reports/claims-by-company');
    expect(res.status).toBe(401);
  });

  it('GET /reports/settlement-rate - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/insurance/reports/settlement-rate');
    expect(res.status).toBe(401);
  });

  it('POST /companies - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/insurance/companies').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('POST /policies - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/insurance/policies').send({ policyNumber: 'P-001' });
    expect(res.status).toBe(401);
  });

  it('POST /pre-authorizations - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/insurance/pre-authorizations').send({ patientId: 'x' });
    expect(res.status).toBe(401);
  });

  it('POST /claims - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/insurance/claims').send({ patientId: 'x' });
    expect(res.status).toBe(401);
  });

  it('POST /settlements - should reject unauthenticated', async () => {
    const res = await request(app).post('/api/insurance/settlements').send({ claimId: 'x' });
    expect(res.status).toBe(401);
  });
});
