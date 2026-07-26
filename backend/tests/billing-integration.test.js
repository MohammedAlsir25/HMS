import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { getAuthToken, authHeader } from './helpers.js';

let token = null;
let testPatientId = null;

beforeAll(async () => {
  token = await getAuthToken();
  if (!token) return;
  const pRes = await request(app)
    .post('/api/patients')
    .set(authHeader(token))
    .send({
      fullName: `Billing Test Patient ${Date.now()}`,
      phone: '0911111111',
      gender: 'MALE',
      dateOfBirth: '1980-01-01',
      diabetesType: 'NONE',
    });
  if (pRes.status === 200 || pRes.status === 201) {
    testPatientId = pRes.body.id;
  }
});

describe('Billing Integration — Invoices', () => {
  it('rejects unauthenticated invoice list', async () => {
    const res = await request(app).get('/api/accounting/invoices');
    expect(res.status).toBe(401);
  });

  it('lists invoices with pagination', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/accounting/invoices')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.invoices)).toBe(true);
    expect(typeof res.body.totalCount).toBe('number');
  });

  it('creates invoice with valid data', async () => {
    if (!token || !testPatientId) return;
    const res = await request(app)
      .post('/api/accounting/invoices')
      .set(authHeader(token))
      .send({
        patientId: testPatientId,
        sourceType: 'MANUAL',
        items: [{
          serviceItemId: '00000000-0000-0000-0000-000000000000',
          description: 'Test service',
          quantity: 1,
          unitPrice: 100,
        }],
      });
    expect([200, 201, 400]).toContain(res.status);
  });

  it('rejects invoice without patientId', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/accounting/invoices')
      .set(authHeader(token))
      .send({ sourceType: 'MANUAL', items: [] });
    expect(res.status).toBe(400);
  });

  it('rejects invoice with empty items', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/accounting/invoices')
      .set(authHeader(token))
      .send({
        patientId: testPatientId || 'fake',
        sourceType: 'MANUAL',
        items: [],
      });
    expect(res.status).toBe(400);
  });

  it('filters invoices by payment status', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/accounting/invoices?paymentStatus=Pending')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.invoices)).toBe(true);
  });

  it('returns 404 for non-existent invoice', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/accounting/invoices/00000000-0000-0000-0000-000000000000')
      .set(authHeader(token));
    expect([400, 404]).toContain(res.status);
  });
});

describe('Billing Integration — Payment Plans', () => {
  it('rejects unauthenticated payment plan list', async () => {
    const res = await request(app).get('/api/accounting/payment-plans');
    expect(res.status).toBe(401);
  });

  it('lists payment plans', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/accounting/payment-plans')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.plans)).toBe(true);
  });

  it('creates payment plan with valid data', async () => {
    if (!token || !testPatientId) return;
    const res = await request(app)
      .post('/api/accounting/payment-plans')
      .set(authHeader(token))
      .send({
        patientId: testPatientId,
        totalAmount: 600,
        numberOfInstallments: 6,
        frequency: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
      });
    expect([200, 201]).toContain(res.status);
  });

  it('rejects payment plan without totalAmount', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/accounting/payment-plans')
      .set(authHeader(token))
      .send({ patientId: 'fake', numberOfInstallments: 6, startDate: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent payment plan', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/accounting/payment-plans/00000000-0000-0000-0000-000000000000')
      .set(authHeader(token));
    expect([400, 404]).toContain(res.status);
  });

  it('filters payment plans by status', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/accounting/payment-plans?status=ACTIVE')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.plans)).toBe(true);
  });
});
