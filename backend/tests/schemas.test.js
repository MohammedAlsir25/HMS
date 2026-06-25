import { describe, it, expect } from '@jest/globals';
import { loginSchema, refreshSchema } from '../src/schemas/auth.schema.js';
import { createPatientSchema, checkInSchema } from '../src/schemas/reception.schema.js';
import { posTransactSchema } from '../src/schemas/pos.schema.js';
import { createReferralSchema, updateReferralStatusSchema } from '../src/schemas/referral.schema.js';
import { createOrderSchema, createTestSchema } from '../src/schemas/lab.schema.js';

describe('auth schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid login', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' });
      expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({ password: 'secret' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com' });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshSchema', () => {
    it('accepts valid refresh token', () => {
      const result = refreshSchema.safeParse({ refreshToken: 'some-token' });
      expect(result.success).toBe(true);
    });

    it('rejects empty refresh token', () => {
      const result = refreshSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });

    it('rejects missing refresh token', () => {
      const result = refreshSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe('reception schemas', () => {
  describe('createPatientSchema', () => {
    it('accepts minimal valid patient', () => {
      const result = createPatientSchema.safeParse({ fullName: 'John Doe' });
      expect(result.success).toBe(true);
    });

    it('accepts full patient data', () => {
      const result = createPatientSchema.safeParse({
        fullName: 'Jane Doe',
        phone: '+971501234567',
        email: 'jane@example.com',
        gender: 'FEMALE',
        diabetesType: 'TYPE2',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing fullName', () => {
      const result = createPatientSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty fullName', () => {
      const result = createPatientSchema.safeParse({ fullName: '' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = createPatientSchema.safeParse({ fullName: 'Test', email: 'bad' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid gender', () => {
      const result = createPatientSchema.safeParse({ fullName: 'Test', gender: 'OTHER' });
      expect(result.success).toBe(false);
    });

    it('defaults diabetesType to NONE', () => {
      const result = createPatientSchema.safeParse({ fullName: 'Test' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.diabetesType).toBe('NONE');
    });
  });

  describe('checkInSchema', () => {
    it('accepts minimal valid check-in', () => {
      const result = checkInSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        clinicId: 'clinic-1',
      });
      expect(result.success).toBe(true);
    });

    it('accepts full check-in data', () => {
      const result = checkInSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        clinicId: 'clinic-1',
        type: 'RESERVATION',
        visitType: 'FOLLOW_UP',
        priority: 5,
        collectPayment: true,
        paymentMethod: 'CASH',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID patientId', () => {
      const result = checkInSchema.safeParse({ patientId: 'not-a-uuid', clinicId: 'c1' });
      expect(result.success).toBe(false);
    });

    it('rejects missing patientId', () => {
      const result = checkInSchema.safeParse({ clinicId: 'c1' });
      expect(result.success).toBe(false);
    });

    it('rejects missing clinicId', () => {
      const result = checkInSchema.safeParse({ patientId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid priority range', () => {
      const result = checkInSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        clinicId: 'c1',
        priority: 15,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid paymentMethod', () => {
      const result = checkInSchema.safeParse({
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        clinicId: 'c1',
        paymentMethod: 'BITCOIN',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('POS schemas', () => {
  describe('posTransactSchema', () => {
    const validTransact = {
      type: 'PHARMACY',
      items: [{ id: 'item-1', quantity: 2 }],
      paymentMethod: 'CASH',
      amount: 100,
    };

    it('accepts valid transaction', () => {
      const result = posTransactSchema.safeParse(validTransact);
      expect(result.success).toBe(true);
    });

    it('accepts OPTICS type', () => {
      const result = posTransactSchema.safeParse({ ...validTransact, type: 'OPTICS' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = posTransactSchema.safeParse({ ...validTransact, type: 'LAB' });
      expect(result.success).toBe(false);
    });

    it('rejects empty items array', () => {
      const result = posTransactSchema.safeParse({ ...validTransact, items: [] });
      expect(result.success).toBe(false);
    });

    it('rejects missing items', () => {
      const { items, ...noItems } = validTransact;
      const result = posTransactSchema.safeParse(noItems);
      expect(result.success).toBe(false);
    });

    it('rejects non-positive amount', () => {
      const result = posTransactSchema.safeParse({ ...validTransact, amount: -5 });
      expect(result.success).toBe(false);
    });

    it('rejects zero amount', () => {
      const result = posTransactSchema.safeParse({ ...validTransact, amount: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects invalid payment method', () => {
      const result = posTransactSchema.safeParse({ ...validTransact, paymentMethod: 'CHEQUE' });
      expect(result.success).toBe(false);
    });

    it('defaults item quantity to 1', () => {
      const result = posTransactSchema.safeParse({
        ...validTransact,
        items: [{ id: 'item-1' }],
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.items[0].quantity).toBe(1);
    });
  });
});

describe('referral schemas', () => {
  describe('createReferralSchema', () => {
    const validReferral = {
      patientId: '550e8400-e29b-41d4-a716-446655440000',
      fromClinicId: 'clinic-1',
      type: 'PHARMACY_DISPATCH',
    };

    it('accepts valid referral', () => {
      const result = createReferralSchema.safeParse(validReferral);
      expect(result.success).toBe(true);
    });

    it('accepts referral with medications', () => {
      const result = createReferralSchema.safeParse({
        ...validReferral,
        medications: [{ drugName: 'Amoxicillin', dosage: '500mg' }],
      });
      expect(result.success).toBe(true);
    });

    it('accepts referral with testIds', () => {
      const result = createReferralSchema.safeParse({
        ...validReferral,
        type: 'LAB_DISPATCH',
        testIds: ['test-1', 'test-2'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing patientId', () => {
      const result = createReferralSchema.safeParse({ fromClinicId: 'c1', type: 'SPECIALIST' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid UUID patientId', () => {
      const result = createReferralSchema.safeParse({ ...validReferral, patientId: 'bad' });
      expect(result.success).toBe(false);
    });

    it('rejects missing fromClinicId', () => {
      const result = createReferralSchema.safeParse({ patientId: validReferral.patientId, type: 'SPECIALIST' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid type', () => {
      const result = createReferralSchema.safeParse({ ...validReferral, type: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('rejects medication without drugName', () => {
      const result = createReferralSchema.safeParse({
        ...validReferral,
        medications: [{ dosage: '500mg' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateReferralStatusSchema', () => {
    it('accepts valid status', () => {
      const result = updateReferralStatusSchema.safeParse({ status: 'FULFILLED' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = updateReferralStatusSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });
  });
});

describe('lab schemas', () => {
  describe('createOrderSchema', () => {
    const base = {
      patientId: '550e8400-e29b-41d4-a716-446655440000',
      fromClinicId: 'clinic-1',
    };

    it('accepts order with testIds', () => {
      const result = createOrderSchema.safeParse({ ...base, testIds: ['t1'] });
      expect(result.success).toBe(true);
    });

    it('accepts order with panelId', () => {
      const result = createOrderSchema.safeParse({ ...base, panelId: 'panel-1' });
      expect(result.success).toBe(true);
    });

    it('rejects order without testIds or panelId', () => {
      const result = createOrderSchema.safeParse(base);
      expect(result.success).toBe(false);
    });

    it('accepts numeric priority', () => {
      const result = createOrderSchema.safeParse({ ...base, testIds: ['t1'], priority: 2 });
      expect(result.success).toBe(true);
    });

    it('accepts string enum priority', () => {
      const result = createOrderSchema.safeParse({ ...base, testIds: ['t1'], priority: 'URGENT' });
      expect(result.success).toBe(true);
    });

    it('rejects out-of-range numeric priority', () => {
      const result = createOrderSchema.safeParse({ ...base, testIds: ['t1'], priority: 5 });
      expect(result.success).toBe(false);
    });
  });

  describe('createTestSchema', () => {
    it('accepts valid test', () => {
      const result = createTestSchema.safeParse({ code: 'CBC', name: 'Complete Blood Count' });
      expect(result.success).toBe(true);
    });

    it('rejects missing code', () => {
      const result = createTestSchema.safeParse({ name: 'Test' });
      expect(result.success).toBe(false);
    });

    it('rejects missing name', () => {
      const result = createTestSchema.safeParse({ code: 'CBC' });
      expect(result.success).toBe(false);
    });
  });
});
