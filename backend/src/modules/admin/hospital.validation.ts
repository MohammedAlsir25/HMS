import { z } from 'zod';

export const createHospitalSchema = z.object({
  name: z.string().min(1, 'Hospital name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  type: z.enum(['GENERAL', 'OPHTHALMOLOGY', 'DENTAL', 'CLINIC', 'OTHER']).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  logoUrl: z.string().url('Invalid URL').optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const updateHospitalSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  logoUrl: z.string().url('Invalid URL').optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});
