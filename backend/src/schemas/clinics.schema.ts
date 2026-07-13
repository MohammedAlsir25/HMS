import { z } from 'zod';

export const scheduleFollowUpSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  scheduledDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date format'),
  notes: z.string().optional().nullable(),
});

export const completeScreeningSchema = z.object({
  optometryAppointmentId: z.string().uuid('Invalid appointment ID'),
  diagnosis: z.string().optional().nullable(),
  diagnosisIcd10: z.string().optional().nullable(),
  prescriptions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  vitalSigns: z.object({
    bloodPressureSystolic: z.coerce.number().optional().nullable(),
    bloodPressureDiastolic: z.coerce.number().optional().nullable(),
    heartRate: z.coerce.number().optional().nullable(),
    temperature: z.coerce.number().optional().nullable(),
    spo2: z.coerce.number().optional().nullable(),
    bloodGlucose: z.coerce.number().optional().nullable(),
    weight: z.coerce.number().optional().nullable(),
  }).optional().nullable(),
  symptoms: z.array(z.object({
    name: z.string(),
    bodyArea: z.string().optional().nullable(),
    onset: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
    severity: z.number().optional().nullable(),
    description: z.string().optional().nullable(),
  })).optional().nullable(),
  medications: z.array(z.object({
    drugName: z.string(),
    dosage: z.string().optional().nullable(),
    frequency: z.string().optional().nullable(),
    duration: z.string().optional().nullable(),
    route: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional().nullable(),
  autorefraction: z.object({
    odSph: z.string().optional().nullable(),
    odCyl: z.string().optional().nullable(),
    odAxis: z.string().optional().nullable(),
    osSph: z.string().optional().nullable(),
    osCyl: z.string().optional().nullable(),
    osAxis: z.string().optional().nullable(),
  }).optional().nullable(),
});
