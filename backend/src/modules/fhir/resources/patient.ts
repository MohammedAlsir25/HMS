import prisma from '../../../lib/prisma.js';
import { GenderType } from '@prisma/client';
import { parseFullName, StructuredName } from '../../../utils/nameParser.js';
import { FhirResource, toFhirId } from '../utils/fhirHelpers.js';

const GENDER_MAP: Record<string, string> = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
  UNKNOWN: 'unknown',
};

export async function toFhirPatient(patient: {
  id: string;
  fullName: string;
  mrn: string;
  gender?: GenderType | null;
  structuredName?: unknown;
  dateOfBirth?: Date | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  nationalId?: string | null;
  updatedAt?: Date;
}): Promise<FhirResource> {
  const structuredName: StructuredName = (patient.structuredName as StructuredName) || parseFullName(patient.fullName);
  const fhirId = toFhirId(patient.id);

  return {
    resourceType: 'Patient',
    id: fhirId,
    meta: { lastUpdated: patient.updatedAt?.toISOString() || new Date().toISOString() },
    identifier: [
      { system: 'urn:oid:2.16.840.1.113883.3.0.0', value: patient.mrn, type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }] } },
      ...(patient.nationalId ? [{ system: 'urn:oid:2.16.840.1.113883.3.0.0', value: patient.nationalId, type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NI' }] } }] : []),
    ],
    name: [{
      use: 'official',
      family: structuredName.family,
      given: structuredName.given,
      ...(structuredName.prefix ? { prefix: [structuredName.prefix] } : {}),
    }],
    gender: GENDER_MAP[patient.gender || 'UNKNOWN'] || 'unknown',
    birthDate: patient.dateOfBirth?.toISOString().split('T')[0],
    telecom: [
      ...(patient.phone ? [{ system: 'phone', value: patient.phone, use: 'home' }] : []),
      ...(patient.email ? [{ system: 'email', value: patient.email, use: 'home' }] : []),
    ],
    address: patient.address ? [{ text: patient.address }] : [],
    contact: patient.phone ? [{ relationship: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0131', code: 'EP' }] }], telecom: [{ system: 'phone', value: patient.phone }] }] : [],
  };
}

export async function findPatientByFhirId(fhirId: string) {
  const patients = await prisma.patient.findMany({
    where: { is_deleted: false },
    take: 100,
  });
  return patients.find(p => toFhirId(p.id) === fhirId);
}

export async function searchPatients(params: { name?: string; birthdate?: string; identifier?: string; gender?: string; _count?: number; _offset?: number }) {
  const where: Record<string, unknown> = { is_deleted: false };
  if (params.name) {
    where.OR = [
      { fullName: { contains: params.name, mode: 'insensitive' } },
    ];
  }
  if (params.identifier) {
    where.OR = [
      { mrn: params.identifier },
      { nationalId: params.identifier },
    ];
  }
  if (params.gender) {
    const reverseGender = Object.entries(GENDER_MAP).find(([, v]) => v === params.gender?.toLowerCase());
    if (reverseGender) where.gender = reverseGender[0] as GenderType;
  }
  if (params.birthdate) {
    const date = new Date(params.birthdate);
    where.dateOfBirth = date;
  }

  const count = await prisma.patient.count({ where });
  const patients = await prisma.patient.findMany({
    where,
    skip: params._offset || 0,
    take: params._count || 20,
    orderBy: { createdAt: 'desc' },
  });

  return { patients, total: count };
}
