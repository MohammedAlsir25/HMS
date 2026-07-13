import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Procurement API - /api/procurement', () => {
  describe('Purchase Orders', () => {
    it('GET /purchase-orders - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/purchase-orders');
      expect(res.status).toBe(401);
    });

    it('GET /purchase-orders/pending-approval - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/purchase-orders/pending-approval');
      expect(res.status).toBe(401);
    });

    it('GET /purchase-orders/:id - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/purchase-orders/fake-id');
      expect(res.status).toBe(401);
    });

    it('POST /purchase-orders - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/purchase-orders').send({});
      expect(res.status).toBe(401);
    });

    it('PUT /purchase-orders/:id - should reject unauthenticated', async () => {
      const res = await request(app).put('/api/procurement/purchase-orders/fake-id').send({});
      expect(res.status).toBe(401);
    });

    it('POST /purchase-orders/:id/submit - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/purchase-orders/fake-id/submit');
      expect(res.status).toBe(401);
    });

    it('POST /purchase-orders/:id/approve - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/purchase-orders/fake-id/approve');
      expect(res.status).toBe(401);
    });

    it('POST /purchase-orders/:id/reject - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/purchase-orders/fake-id/reject').send({});
      expect(res.status).toBe(401);
    });

    it('POST /purchase-orders/:id/receive - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/purchase-orders/fake-id/receive').send({});
      expect(res.status).toBe(401);
    });

    it('POST /purchase-orders/:id/payment - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/purchase-orders/fake-id/payment').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('Requisitions', () => {
    it('GET /requisitions - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/requisitions');
      expect(res.status).toBe(401);
    });

    it('GET /requisitions/:id - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/requisitions/fake-id');
      expect(res.status).toBe(401);
    });

    it('POST /requisitions - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/requisitions').send({});
      expect(res.status).toBe(401);
    });

    it('PUT /requisitions/:id - should reject unauthenticated', async () => {
      const res = await request(app).put('/api/procurement/requisitions/fake-id').send({});
      expect(res.status).toBe(401);
    });

    it('DELETE /requisitions/:id - should reject unauthenticated', async () => {
      const res = await request(app).delete('/api/procurement/requisitions/fake-id');
      expect(res.status).toBe(401);
    });
  });

  describe('Cost Centers', () => {
    it('GET /cost-centers - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/cost-centers');
      expect(res.status).toBe(401);
    });

    it('POST /cost-centers - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/cost-centers').send({});
      expect(res.status).toBe(401);
    });

    it('PATCH /cost-centers/:id - should reject unauthenticated', async () => {
      const res = await request(app).patch('/api/procurement/cost-centers/fake-id').send({});
      expect(res.status).toBe(401);
    });

    it('DELETE /cost-centers/:id - should reject unauthenticated', async () => {
      const res = await request(app).delete('/api/procurement/cost-centers/fake-id');
      expect(res.status).toBe(401);
    });
  });

  describe('Fixed Assets', () => {
    it('GET /assets - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/assets');
      expect(res.status).toBe(401);
    });

    it('GET /assets/:id - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/assets/fake-id');
      expect(res.status).toBe(401);
    });

    it('POST /assets - should reject unauthenticated', async () => {
      const res = await request(app).post('/api/procurement/assets').send({});
      expect(res.status).toBe(401);
    });

    it('PUT /assets/:id/depreciate - should reject unauthenticated', async () => {
      const res = await request(app).put('/api/procurement/assets/fake-id/depreciate');
      expect(res.status).toBe(401);
    });
  });

  describe('Notifications', () => {
    it('GET /notifications - should reject unauthenticated', async () => {
      const res = await request(app).get('/api/procurement/notifications');
      expect(res.status).toBe(401);
    });

    it('PUT /notifications/:id/read - should reject unauthenticated', async () => {
      const res = await request(app).put('/api/procurement/notifications/fake-id/read');
      expect(res.status).toBe(401);
    });

    it('PUT /notifications/read-all - should reject unauthenticated', async () => {
      const res = await request(app).put('/api/procurement/notifications/read-all');
      expect(res.status).toBe(401);
    });
  });
});
