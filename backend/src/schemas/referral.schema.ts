import { z } from 'zod';

export const createReferralSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  fromClinicId: z.string().min(1, 'fromClinicId is required'),
  toClinicId: z.string().optional().nullable(),
  type: z.enum(['PHARMACY_DISPATCH', 'LAB_DISPATCH', 'OPTICS_DISPATCH', 'SPECIALIST']),
  notes: z.string().optional().nullable(),
  medications: z.array(z.object({
    drugName: z.string().min(1),
    dosage: z.string().optional().nullable(),
    frequency: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
    route: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional(),
  testIds: z.array(z.string()).optional(),
});

export const updateReferralStatusSchema = z.object({
  status: z.enum(['PENDING', 'DISPATCHED', 'FULFILLED', 'CANCELLED']),
});
