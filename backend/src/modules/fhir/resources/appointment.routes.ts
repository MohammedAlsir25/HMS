import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId } from '../utils/fhirHelpers.js';
import { AppointmentStatus } from '@prisma/client';

const STATUS_MAP: Record<string, string> = {
  WAITING: 'booked',
  CALLED: 'arrived',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'fulfilled',
  CANCELLED: 'cancelled',
  NO_SHOW: 'noshow',
  RESERVED: 'proposed',
};

const REVERSE_STATUS_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(STATUS_MAP)) {
  REVERSE_STATUS_MAP[v] = k;
}

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, status, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;
    if (status) {
      const internalStatus = REVERSE_STATUS_MAP[(status as string).toLowerCase()] || (status as string).toUpperCase();
      where.status = internalStatus as AppointmentStatus;
    }

    const count = await prisma.appointment.count({ where });
    const appointments = await prisma.appointment.findMany({
      where,
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const entries = appointments.map(a => ({
      resourceType: 'Appointment',
      id: toFhirId(a.id),
      meta: { lastUpdated: a.updatedAt?.toISOString() || new Date().toISOString() },
      status: STATUS_MAP[a.status] || 'booked',
      appointmentType: [{ coding: [{ display: a.type }] }],
      description: a.type,
      start: (a.scheduledAt || a.createdAt)?.toISOString(),
      participant: [{ actor: { reference: `Patient/${toFhirId(a.patientId)}` } }],
    }));

    return fhirResponse(res, fhirBundle(entries, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const apt = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!apt) return fhirError(res, 404, 'not-found', `Appointment ${req.params.id} not found`);

    const fhir = {
      resourceType: 'Appointment',
      id: toFhirId(apt.id),
      meta: { lastUpdated: apt.updatedAt?.toISOString() || new Date().toISOString() },
      status: STATUS_MAP[apt.status] || 'booked',
      description: apt.type,
      start: (apt.scheduledAt || apt.createdAt)?.toISOString(),
      participant: [{ actor: { reference: `Patient/${toFhirId(apt.patientId)}` } }],
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
