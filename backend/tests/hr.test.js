import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('HR API - /api/hr', () => {
  describe('Original endpoints - auth rejection', () => {
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

  describe('Phase 12 shift endpoints - auth rejection', () => {
    it('GET /employees/shifts/templates - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/shifts/templates');
      expect(res.status).toBe(401);
    });

    it('POST /employees/shifts/templates - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/hr/employees/shifts/templates').send({});
      expect(res.status).toBe(401);
    });

    it('PATCH /employees/shifts/templates/:id - should reject unauthenticated', async () => {
      const res = await request(app).patch('/api/hr/employees/shifts/templates/fake-id').send({});
      expect(res.status).toBe(401);
    });

    it('DELETE /employees/shifts/templates/:id - should reject unauthenticated', async () => {
      const res = await request(app).delete('/api/hr/employees/shifts/templates/fake-id');
      expect(res.status).toBe(401);
    });

    it('GET /employees/shifts/roster - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/shifts/roster');
      expect(res.status).toBe(401);
    });

    it('POST /employees/shifts/assign - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/hr/employees/shifts/assign').send({});
      expect(res.status).toBe(401);
    });

    it('POST /employees/shifts/bulk-assign - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/hr/employees/shifts/bulk-assign').send({});
      expect(res.status).toBe(401);
    });

    it('DELETE /employees/shifts/:id - should reject unauthenticated', async () => {
      const res = await request(app).delete('/api/hr/employees/shifts/fake-id');
      expect(res.status).toBe(401);
    });
  });

  describe('Phase 12 leave balance endpoints - auth rejection', () => {
    it('GET /employees/leave-balances - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/leave-balances');
      expect(res.status).toBe(401);
    });

    it('POST /employees/leave-balances - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/hr/employees/leave-balances').send({});
      expect(res.status).toBe(401);
    });

    it('PATCH /employees/leave-balances/:id - should reject unauthenticated', async () => {
      const res = await request(app).patch('/api/hr/employees/leave-balances/fake-id').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('Phase 12 payroll bulk + payslip - auth rejection', () => {
    it('POST /payroll/generate - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/hr/payroll/generate').send({});
      expect(res.status).toBe(401);
    });

    it('GET /payroll/:id/payslip - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/payroll/fake-id/payslip');
      expect(res.status).toBe(401);
    });
  });

  describe('Phase 12 dashboard endpoint - auth rejection', () => {
    it('GET /employees/dashboard - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/dashboard');
      expect(res.status).toBe(401);
    });
  });

  describe('Phase 12 self-service endpoints - auth rejection', () => {
    it('GET /employees/me - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/me');
      expect(res.status).toBe(401);
    });

    it('GET /employees/me/attendance - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/me/attendance');
      expect(res.status).toBe(401);
    });

    it('GET /employees/me/leaves - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/me/leaves');
      expect(res.status).toBe(401);
    });

    it('POST /employees/me/leaves - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/hr/employees/me/leaves').send({});
      expect(res.status).toBe(401);
    });

    it('GET /employees/me/payroll - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/me/payroll');
      expect(res.status).toBe(401);
    });

    it('GET /employees/me/payslips/:id - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/hr/employees/me/payslips/fake-id');
      expect(res.status).toBe(401);
    });
  });
});
