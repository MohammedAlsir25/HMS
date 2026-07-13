import { z } from 'zod';

export const createLabJobSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction ID'),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  sphOD: z.string().optional().nullable(),
  cylOD: z.string().optional().nullable(),
  axisOD: z.string().optional().nullable(),
  sphOS: z.string().optional().nullable(),
  cylOS: z.string().optional().nullable(),
  axisOS: z.string().optional().nullable(),
  frameName: z.string().optional().nullable(),
  frameSku: z.string().optional().nullable(),
  frameItemId: z.string().optional().nullable(),
});

export const updateLabJobStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED']),
});
