import { z } from 'zod';

export const updatePatientSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  nationalId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']).optional().nullable(),
  chronicConditions: z.array(z.string()).optional(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  diabetesType: z.enum(['NONE', 'TYPE1', 'TYPE2', 'GESTATIONAL']).optional(),
});
