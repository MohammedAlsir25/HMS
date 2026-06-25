import { z } from 'zod';

const paymentMethods = z.enum(['CASH', 'CARD', 'INSURANCE', 'BANK_TRANSFER']);

export const posTransactSchema = z.object({
  type: z.enum(['PHARMACY', 'OPTICS']),
  items: z.array(z.object({
    id: z.string().min(1),
    quantity: z.number().int().positive().optional().default(1),
    name: z.string().optional(),
  })).min(1, 'items array is required'),
  paymentMethod: paymentMethods,
  amount: z.number().positive('amount is required'),
  description: z.string().optional().nullable(),
  patientName: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  referralId: z.string().optional().nullable(),
});
