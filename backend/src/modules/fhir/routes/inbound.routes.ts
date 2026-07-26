import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { fhirResponse, fhirError, fromFhirId } from '../utils/fhirHelpers.js';

const prisma = new PrismaClient();
const router = Router();

router.post('/', async (req, res) => {
  try {
    const resource = req.body;
    if (!resource || !resource.resourceType) {
      return fhirError(res, 400, 'invalid', 'Request body must be a valid FHIR resource');
    }

    switch (resource.resourceType) {
      case 'ServiceRequest':
        await handleInboundServiceRequest(resource);
        break;
      case 'Observation':
        await handleInboundObservation(resource);
        break;
      case 'Patient':
        await handleInboundPatient(resource);
        break;
      default:
        return fhirError(res, 422, 'not-supported', `Resource type ${resource.resourceType} is not supported for inbound merge`);
    }

    return fhirResponse(res, {
      resourceType: 'OperationOutcome',
      id: crypto.randomUUID(),
      issue: [{ severity: 'information', code: 'success', diagnostics: `Successfully processed ${resource.resourceType}` }],
    }, req.headers.accept as string);
  } catch (err: any) {
    return fhirError(res, 500, 'exception', err.message);
  }
});

async function findSystemUser(hospitalId: string | null) {
  if (hospitalId) {
    const adminRole = await prisma.role.findFirst({ where: { hospitalId, name: 'ADMIN' } });
    if (adminRole) {
      const user = await prisma.user.findFirst({ where: { hospitalId, roleId: adminRole.id } });
      if (user) return user;
    }
  }
  const anyAdmin = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } } });
  return anyAdmin;
}

async function findDefaultClinic(hospitalId: string | null) {
  if (hospitalId) {
    return prisma.clinic.findFirst({ where: { hospitalId } });
  }
  return prisma.clinic.findFirst();
}

async function handleInboundServiceRequest(resource: any) {
  const patientRef = resource.subject?.reference;
  const patientId = patientRef ? extractPatientId(patientRef) : null;

  if (!patientId) throw new Error('ServiceRequest must have a subject reference');

  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: patientId }, { mrn: resource.patient?.identifier?.value }] },
  });
  if (!patient) throw new Error(`Patient ${patientId} not found`);

  const defaultClinic = await findDefaultClinic(patient.hospitalId);
  if (!defaultClinic) throw new Error('No clinic found for patient hospital');

  const systemUser = await findSystemUser(patient.hospitalId);
  if (!systemUser) throw new Error('No admin user found for system operations');

  return prisma.diagnosticOrder.create({
    data: {
      patientId: patient.id,
      orderType: 'LAB',
      status: 'SUBMITTED',
      clinicalNotes: resource.code?.text || resource.code?.coding?.[0]?.display || 'external-referral',
      hospitalId: patient.hospitalId,
      requestedById: systemUser.id,
      fromClinicId: defaultClinic.id,
    },
  });
}

async function handleInboundObservation(resource: any) {
  const patientRef = resource.subject?.reference;
  const patientId = patientRef ? extractPatientId(patientRef) : null;
  if (!patientId) throw new Error('Observation must have a subject reference');

  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: patientId }, { mrn: resource.patient?.identifier?.value }] },
  });
  if (!patient) throw new Error(`Patient ${patientId} not found`);

  const code = resource.code?.coding?.[0]?.code || resource.code?.text;
  if (!code) throw new Error('Observation must have a code');

  const diagnosticTest = await prisma.diagnosticTest.findFirst({ where: { code } });

  const defaultClinic = await findDefaultClinic(patient.hospitalId);
  if (!defaultClinic) throw new Error('No clinic found for patient hospital');

  const systemUser = await findSystemUser(patient.hospitalId);
  if (!systemUser) throw new Error('No admin user found for system operations');

  const order = await prisma.diagnosticOrder.create({
    data: {
      patientId: patient.id,
      orderType: 'LAB',
      status: 'COMPLETED',
      clinicalNotes: 'Inbound FHIR Observation',
      hospitalId: patient.hospitalId,
      requestedById: systemUser.id,
      fromClinicId: defaultClinic.id,
    },
  });

  const resultValue = resource.valueQuantity?.value != null
    ? String(resource.valueQuantity.value)
    : resource.valueString || resource.conclusion || '';

  if (diagnosticTest) {
    const existingTest = await prisma.diagnosticOrderTest.findFirst({
      where: { orderId: order.id, testId: diagnosticTest.id },
    });

    if (existingTest) {
      return prisma.diagnosticOrderTest.update({
        where: { id: existingTest.id },
        data: { value: resultValue },
      });
    }

    return prisma.diagnosticOrderTest.create({
      data: {
        orderId: order.id,
        testId: diagnosticTest.id,
        value: resultValue,
        hospitalId: patient.hospitalId,
      },
    });
  }

  const fallbackTest = await prisma.diagnosticTest.findFirst({
    where: { code: 'UNMATCHED', orderType: 'LAB' },
  });

  if (fallbackTest) {
    return prisma.diagnosticOrderTest.create({
      data: {
        orderId: order.id,
        testId: fallbackTest.id,
        value: resultValue,
        hospitalId: patient.hospitalId,
      },
    });
  }

  return order;
}

async function handleInboundPatient(resource: any) {
  const name = resource.name?.[0];
  const fullName = name
    ? [...(name.prefix || []), ...(name.given || []), name.family].join(' ')
    : 'Unknown';
  const mrn = resource.identifier?.[0]?.value || `EXT-${Date.now()}`;

  const existing = await prisma.patient.findFirst({ where: { mrn } });
  if (existing) return existing;

  const GENDER_MAP: Record<string, string> = {
    male: 'MALE',
    female: 'FEMALE',
    other: 'OTHER',
    unknown: 'UNKNOWN',
  };

  const systemUser = await prisma.user.findFirst({ where: { role: { name: 'ADMIN' } } });

  return prisma.patient.create({
    data: {
      mrn,
      fullName,
      gender: (GENDER_MAP[resource.gender] || 'UNKNOWN') as any,
      dateOfBirth: resource.birthDate ? new Date(resource.birthDate) : undefined,
      phone: resource.telecom?.find((t: any) => t.system === 'phone')?.value,
      email: resource.telecom?.find((t: any) => t.system === 'email')?.value,
      address: resource.address?.[0]?.text,
      structuredName: name ? { family: name.family || '', given: name.given || [], prefix: name.prefix } : undefined,
      createdById: systemUser?.id || '',
    },
  });
}

function extractPatientId(reference: string): string | null {
  if (!reference) return null;
  const match = reference.match(/^Patient\/(.+)$/);
  if (match?.[1]) return fromFhirId(match[1]);
  const uuidMatch = reference.match(/^urn:uuid:(.+)$/);
  if (uuidMatch?.[1]) return fromFhirId(uuidMatch[1]);
  return reference;
}

export default router;
