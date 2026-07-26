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

export const registerPatientSchema = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  phone: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']).optional().nullable(),
  address: z.string().optional().nullable(),
  chronicConditions: z.array(z.string()).optional(),
  diabetesType: z.enum(['NONE', 'TYPE1', 'TYPE2', 'GESTATIONAL']).optional(),
  notes: z.string().optional().nullable(),
});

export const checkDuplicatesSchema = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  dateOfBirth: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
});

export const mergePatientsSchema = z.object({
  sourcePatientId: z.string().uuid('Invalid patient ID'),
});
