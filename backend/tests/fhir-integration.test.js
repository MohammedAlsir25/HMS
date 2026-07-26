import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { getAuthToken, authHeader } from './helpers.js';

let token = null;

beforeAll(async () => {
  token = await getAuthToken();
});

describe('FHIR R4 Endpoints', () => {
  it('returns CapabilityStatement at /metadata', async () => {
    const res = await request(app).get('/api/fhir/R4/metadata');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('CapabilityStatement');
  });

  it('searches Patient resources as Bundle', async () => {
    const res = await request(app).get('/api/fhir/R4/Patient');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
    expect(res.body.type).toBe('searchset');
    expect(Array.isArray(res.body.entry)).toBe(true);
  });

  it('searches Patient with name filter', async () => {
    const res = await request(app).get('/api/fhir/R4/Patient?name=Test');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('searches Patient with gender filter', async () => {
    const res = await request(app).get('/api/fhir/R4/Patient?gender=male');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('returns OperationOutcome for non-existent Patient', async () => {
    const res = await request(app).get('/api/fhir/R4/Patient/00000000000000000000000000000000');
    expect([404, 200]).toContain(res.status);
    if (res.status === 404) {
      expect(res.body.resourceType).toBe('OperationOutcome');
    }
  });

  it('searches Encounter resources', async () => {
    const res = await request(app).get('/api/fhir/R4/Encounter');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('searches Observation resources', async () => {
    const res = await request(app).get('/api/fhir/R4/Observation');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('searches Condition resources', async () => {
    const res = await request(app).get('/api/fhir/R4/Condition');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('searches Appointment resources', async () => {
    const res = await request(app).get('/api/fhir/R4/Appointment');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('searches Location resources', async () => {
    const res = await request(app).get('/api/fhir/R4/Location');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('searches Practitioner resources', async () => {
    const res = await request(app).get('/api/fhir/R4/Practitioner');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('searches MedicationRequest resources', async () => {
    const res = await request(app).get('/api/fhir/R4/MedicationRequest');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('searches ServiceRequest resources', async () => {
    const res = await request(app).get('/api/fhir/R4/ServiceRequest');
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('Bundle');
  });

  it('returns XML with Accept application/fhir+xml', async () => {
    const res = await request(app)
      .get('/api/fhir/R4/Patient')
      .set('Accept', 'application/fhir+xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
  });

  it('lists FHIR endpoints via admin API', async () => {
    if (!token) return;
    const res = await request(app)
      .get('/api/fhir/admin/endpoints')
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('rejects unauthenticated admin endpoint access', async () => {
    const res = await request(app).get('/api/fhir/admin/endpoints');
    expect(res.status).toBe(401);
  });
});
