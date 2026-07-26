import { z } from 'zod';

export const createPatientSchema = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  phone: z.string().min(1, 'phone is required'),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']).optional().nullable(),
  diabetesType: z.enum(['NONE', 'TYPE1', 'TYPE2', 'GESTATIONAL']).optional().default('NONE'),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const checkInSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  clinicId: z.string().min(1, 'Clinic ID is required'),
  type: z.enum(['WALKIN', 'RESERVATION']).optional().default('WALKIN'),
  visitType: z.enum(['NEW_VISIT', 'FOLLOW_UP']).optional().default('NEW_VISIT'),
  priority: z.number().int().min(0).max(10).optional().default(0),
  notes: z.string().optional().nullable(),
  collectPayment: z.boolean().optional().default(false),
  paymentMethod: z.enum(['CASH', 'CARD', 'INSURANCE', 'BANK_TRANSFER']).optional(),
});

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  clinicId: z.string().min(1, 'Clinic ID is required'),
  doctorId: z.string().uuid('Invalid doctor ID'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  visitType: z.enum(['NEW_VISIT', 'FOLLOW_UP']).default('NEW_VISIT'),
  appointmentType: z.enum(['WALKIN', 'RESERVATION']).default('WALKIN'),
  notes: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(10).optional().default(0),
});

export const queueStatusSchema = z.object({
  status: z.enum(['CALLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
});

export const checkInReservationSchema = z.object({
  priority: z.number().int().min(0).max(10).optional().default(5),
  visitType: z.enum(['NEW_VISIT', 'FOLLOW_UP']).optional().default('NEW_VISIT'),
});
