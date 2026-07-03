import { test, expect } from '@playwright/test';

const ADMIN = { email: 'admin@aljawarih.sd', password: 'password123' };
const BASE = 'http://127.0.0.1:4001';

async function adminToken(request) {
  const res = await request.post(`${BASE}/api/auth/login`, { data: ADMIN });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.token;
}

test.describe('Sync API — Backend Endpoints', () => {

  test('GET /api/sync/initial returns all reference tables', async ({ request }) => {
    const token = await adminToken(request);
    const res = await request.get(`${BASE}/api/sync/initial`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('timestamp');
    const tables = Object.keys(body.data);
    expect(tables.length).toBeGreaterThanOrEqual(8);
    expect(tables).toContain('role');
    expect(tables).toContain('clinic');
    expect(tables).toContain('department');
    expect(tables).toContain('icd10Code');
    expect(Array.isArray(body.data.role)).toBeTruthy();
    expect(body.data.role.length).toBeGreaterThan(0);
  });

  test('GET /api/sync/pull returns changes since timestamp', async ({ request }) => {
    const token = await adminToken(request);
    const res = await request.get(`${BASE}/api/sync/pull?since=2020-01-01T00:00:00Z`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('changes');
    expect(body).toHaveProperty('timestamp');
    const changed = Object.keys(body.changes);
    expect(changed.length).toBeGreaterThanOrEqual(1);
    expect(typeof body.timestamp).toBe('string');
  });

  test('POST /api/sync/push create → update → delete round-trip', async ({ request }) => {
    const token = await adminToken(request);
    const roleId = crypto.randomUUID();

    // CREATE
    const createRes = await request.post(`${BASE}/api/sync/push`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        mutations: [{
          table: 'role',
          action: 'create',
          recordId: roleId,
          data: { name: `sync-e2e-${Date.now()}`, description: 'created via e2e' },
          clientTimestamp: new Date().toISOString(),
        }],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const createBody = await createRes.json();
    expect(createBody.results[0].status).toBe('applied');

    // UPDATE
    const updateRes = await request.post(`${BASE}/api/sync/push`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        mutations: [{
          table: 'role',
          action: 'update',
          recordId: roleId,
          data: { name: `sync-e2e-updated-${Date.now()}`, description: 'updated via e2e' },
          clientTimestamp: new Date().toISOString(),
        }],
      },
    });
    expect(updateRes.ok()).toBeTruthy();
    const updateBody = await updateRes.json();
    expect(updateBody.results[0].status).toBe('applied');

    // VERIFY via pull
    const since = new Date(Date.now() - 60000).toISOString();
    const pullRes = await request.get(`${BASE}/api/sync/pull?since=${encodeURIComponent(since)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(pullRes.ok()).toBeTruthy();
    const pullBody = await pullRes.json();
    expect(pullBody.changes.role).toBeDefined();
    const matched = pullBody.changes.role.find(r => r.id === roleId);
    expect(matched).toBeDefined();
    expect(matched.description).toBe('updated via e2e');

    // DELETE
    const deleteRes = await request.post(`${BASE}/api/sync/push`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        mutations: [{
          table: 'role',
          action: 'delete',
          recordId: roleId,
          data: {},
          clientTimestamp: new Date().toISOString(),
        }],
      },
    });
    expect(deleteRes.ok()).toBeTruthy();
    const deleteBody = await deleteRes.json();
    expect(deleteBody.results[0].status).toBe('applied');
  });

});
