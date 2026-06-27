import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

const TEST_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiU3VwZXIgQWRtaW4iLCJwZXJtaXNzaW9ucyI6W119.TEST';

const ENDPOINTS = [
  { method: 'get', path: '/api/health' },
  { method: 'get', path: '/api/auth/me', auth: true },
  { method: 'get', path: '/api/patients/search?q=test', auth: true },
  { method: 'get', path: '/api/reception/waiting-room' },
  { method: 'get', path: '/api/clinics', auth: true },
  { method: 'get', path: '/api/surgeries', auth: true },
  { method: 'get', path: '/api/referrals', auth: true },
  { method: 'get', path: '/api/inventory/items', auth: true },
  { method: 'get', path: '/api/accounting/summary', auth: true },
  { method: 'get', path: '/api/admin/users', auth: true },
  { method: 'get', path: '/api/hr/employees', auth: true },
  { method: 'get', path: '/api/lab/tests', auth: true },
  { method: 'get', path: '/api/pos/items', auth: true },
  { method: 'get', path: '/api/departments', auth: true },
];

describe('Stress — rapid sequential requests', () => {
  it('handles 100 rapid requests without crashing', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) => {
        const ep = ENDPOINTS[i % ENDPOINTS.length];
        let req = request(app)[ep.method](ep.path);
        if (ep.auth) req = req.set('Authorization', TEST_TOKEN);
        return req;
      }),
    );
    const rejected = results.filter((r) => r.status === 'rejected');
    const successes = results.filter((r) => r.status === 'fulfilled' && r.value.status !== undefined);
    expect(rejected.length).toBe(0);
    expect(successes.length).toBe(100);
  });
});

describe('Stress — concurrent endpoint hit', () => {
  it('handles 50 concurrent calls to /api/appointments', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 50 }, () =>
        request(app).patch('/api/appointments/fake/status').send({ status: 'CALLED' }),
      ),
    );
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected.length).toBe(0);
  });
});
