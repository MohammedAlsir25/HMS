import type { HospitalType } from '@prisma/client';

export interface CreateHospitalInput {
  name: string;
  slug: string;
  type?: HospitalType;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateHospitalInput {
  name?: string;
  slug?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
}
