import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { getAuthToken, authHeader } from './helpers.js';

let token = null;
let testCompanyId = null;
let testPolicyId = null;
let testClaimId = null;

beforeAll(async () => {
  token = await getAuthToken();
  if (!token) return;

  // Create test insurance company
  const compRes = await request(app)
    .post('/api/insurance/companies')
    .set(authHeader(token))
    .send({ name: `TestIns Co ${Date.now()}`, phone: '0123456789', email: 'test@test.com' });
  if (compRes.status === 200 || compRes.status === 201) {
    testCompanyId = compRes.body.id;
  }
});

describe('Insurance Integration', () => {
  it('rejects unauthenticated company list', async () => {
    const res = await request(app).get('/api/insurance/companies');
    expect(res.status).toBe(401);
  });

  it('lists insurance companies', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/insurance/companies')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('creates insurance company', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/insurance/companies')
      .set(authHeader(token))
      .send({ name: `InsCo ${Date.now()}`, phone: '0123456789', email: 'ins@test.com' });
    expect([200, 201]).toContain(res.status);
    if (res.status === 200 || res.status === 201) {
      expect(res.body.name).toMatch(/InsCo/);
    }
  });

  it('lists insurance policies', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/insurance/policies')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('lists insurance claims', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/insurance/claims')
      .set(authHeader(token));
    expect(res.status).toBe(200);
  });

  it('lists denial appeals', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/insurance/denial-appeals')
      .set(authHeader(token));
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated appeal creation', async () => {
    const res = await request(app)
      .post('/api/insurance/denial-appeals')
      .send({ claimId: 'fake', denialReasonCode: 'MISSING_INFO' });
    expect(res.status).toBe(401);
  });

  it('rejects appeal with invalid claimId', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/insurance/denial-appeals')
      .set(authHeader(token))
      .send({ claimId: '00000000-0000-0000-0000-000000000000', denialReasonCode: 'MISSING_INFO' });
    expect([400, 404]).toContain(res.status);
  });

  it('returns 404 for non-existent appeal', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/insurance/denial-appeals/00000000-0000-0000-0000-000000000000')
      .set(authHeader(token));
    expect([400, 404]).toContain(res.status);
  });

  it('lists patient insurance policies', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/insurance/cob/patient/00000000-0000-0000-0000-000000000000')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejects COB process with invalid claim', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/insurance/cob/process/00000000-0000-0000-0000-000000000000')
      .set(authHeader(token));
    expect([400, 404]).toContain(res.status);
  });

  it('updates COB policy order with valid data', async () => {
    if (!token) return;
    const res = await request(app)
      .put('/api/insurance/cob/policies/order')
      .set(authHeader(token))
      .send({ orders: [] });
    expect(res.status).toBe(200);
  });
});
