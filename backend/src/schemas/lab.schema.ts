import { z } from 'zod';

export const createOrderSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  fromClinicId: z.string().min(1, 'fromClinicId is required'),
  testIds: z.array(z.string()).optional(),
  panelId: z.string().optional(),
  clinicalNotes: z.string().optional().nullable(),
  priority: z.union([z.number().int().min(0).max(2), z.enum(['ROUTINE', 'URGENT', 'STAT'])]).optional().default(0),
}).refine(data => data.testIds?.length || data.panelId, {
  message: 'testIds or panelId is required',
});

export const createTestSchema = z.object({
  code: z.string().min(1, 'code is required'),
  name: z.string().min(1, 'name is required'),
  nameAr: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  specimen: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  refRangeText: z.string().optional().nullable(),
  refRangeLow: z.number().optional().nullable(),
  refRangeHigh: z.number().optional().nullable(),
  lowCritical: z.number().optional().nullable(),
  highCritical: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

export const createSampleSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  notes: z.string().optional().nullable(),
});

export const updateSampleStatusSchema = z.object({
  status: z.enum(['COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']),
  rejectionReason: z.string().optional(),
}).refine(data => data.status !== 'REJECTED' || data.rejectionReason, {
  message: 'rejectionReason is required when status is REJECTED',
});
