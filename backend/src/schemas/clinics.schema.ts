import { z } from 'zod';

export const scheduleFollowUpSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  scheduledDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date format'),
  notes: z.string().optional().nullable(),
});

export const createLabOrderSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  testIds: z.array(z.string().uuid()).min(1, 'At least one test is required'),
  panelId: z.string().uuid().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(5).optional().default(0),
});

export const createImagingOrderSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  scanType: z.enum(['A_SCAN', 'B_SCAN', 'OTT', 'BIOMETRY']),
  laterality: z.enum(['Left', 'Right', 'Both']).optional().nullable(),
  clinicalInfo: z.string().optional().nullable(),
  procedureTypeId: z.string().uuid().optional().nullable(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  sections: z.array(z.object({
    title: z.string(),
    fieldType: z.enum(['text', 'textarea', 'number', 'select', 'checkbox']),
    fieldName: z.string(),
    defaultValue: z.string().optional(),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
  })).optional().default([]),
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
