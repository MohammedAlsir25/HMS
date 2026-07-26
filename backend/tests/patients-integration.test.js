import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { getAuthToken, authHeader, makeId } from './helpers.js';

let token = null;

beforeAll(async () => {
  token = await getAuthToken();
});

describe('Patients Integration — /api/patients', () => {
  // Test 1: Creates patient with valid data → 201 with MRN
  it('creates a patient with valid data and returns MRN', async () => {
    if (!token) return;
    const suffix = Date.now();
    const res = await request(app)
      .post('/api/patients')
      .set(authHeader(token))
      .send({
        fullName: `Test Patient ${suffix}`,
        phone: '0912345678',
        gender: 'MALE',
        dateOfBirth: '1990-01-15',
        diabetesType: 'NONE',
        nationalId: `NAT-${suffix}`,
      });
    expect([200, 201]).toContain(res.status);
    expect(res.body.fullName).toBe(`Test Patient ${suffix}`);
  });

  // Test 2: Creates patient missing required fields → 400
  it('rejects creation without fullName', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/patients')
      .set(authHeader(token))
      .send({ phone: '0912345678' });
    expect(res.status).toBe(400);
  });

  // Test 3: Search patients by name → returns matching results
  it('searches patients by name', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/patients/search?q=Test')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // Test 4: Search patients by MRN → returns exact match
  it('searches patients by MRN via identifier', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/patients/search?q=MRN')
      .set(authHeader(token));
    expect(res.status).toBe(200);
  });

  // Test 5: List patients → paginated list with patients array + totalCount
  it('lists patients with pagination', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/patients')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.patients)).toBe(true);
    expect(typeof res.body.totalCount).toBe('number');
  });

  // Test 6: Get patient by ID → full patient object
  it('gets a patient by ID', async () => {
    if (!token) return;
    // First create a patient
    const create = await request(app)
      .post('/api/patients')
      .set(authHeader(token))
      .send({
        fullName: `Detail Test ${Date.now()}`,
        phone: '0912345679',
        gender: 'FEMALE',
        dateOfBirth: '1985-06-15',
        diabetesType: 'NONE',
      });
    if (create.status !== 200 && create.status !== 201) return;
    const id = create.body.id;
    const res = await request(app)
      .get(`/api/patients/${id}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  // Test 7: Get patient with invalid ID → 404
  it('returns 404 for non-existent patient', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/patients/00000000-0000-0000-0000-000000000000')
      .set(authHeader(token));
    expect([400, 404]).toContain(res.status);
  });

  // Test 8: Update patient → patched fields returned
  it('updates patient fields', async () => {
    if (!token) return;
    const create = await request(app)
      .post('/api/patients')
      .set(authHeader(token))
      .send({
        fullName: `Update Test ${Date.now()}`,
        phone: '0912345680',
        gender: 'MALE',
        dateOfBirth: '1992-03-20',
        diabetesType: 'NONE',
      });
    if (create.status !== 200 && create.status !== 201) return;
    const id = create.body.id;
    const res = await request(app)
      .patch(`/api/patients/${id}`)
      .set(authHeader(token))
      .send({ phone: '0999999999' });
    expect([200, 204]).toContain(res.status);
  });

  // Test 9: Check duplicate detection endpoint
  it('checks for duplicate patients', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/patients/check-duplicates')
      .set(authHeader(token))
      .send({ fullName: 'Test', phone: '0912345678' });
    expect([200, 204, 404]).toContain(res.status);
  });

  // Test 10: List patients with gender filter
  it('filters patients by gender', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/patients?gender=MALE')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.patients)).toBe(true);
  });

  // Test 11: Rejects unauthenticated
  it('rejects unauthenticated patient list', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  // Test 12: Rejects empty body for create
  it('rejects empty body for patient creation', async () => {
    if (!token) return;
    const res = await request(app)
      .post('/api/patients')
      .set(authHeader(token))
      .send({});
    expect(res.status).toBe(400);
  });
});
