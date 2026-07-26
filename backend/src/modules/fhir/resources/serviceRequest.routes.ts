import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const count = await prisma.diagnosticOrder.count({ where });
    const orders = await prisma.diagnosticOrder.findMany({
      where,
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const serviceRequests = orders.map(o => ({
      resourceType: 'ServiceRequest',
      id: toFhirId(o.id),
      meta: { lastUpdated: o.updatedAt?.toISOString() || new Date().toISOString() },
      status: o.status?.toLowerCase() || 'active',
      intent: 'order',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/service-category', code: o.orderType || 'laboratory' }] }],
      code: { text: o.orderType },
      subject: { reference: `Patient/${toFhirId(o.patientId)}` },
      authoredOn: o.createdAt?.toISOString(),
    }));

    return fhirResponse(res, fhirBundle(serviceRequests, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.diagnosticOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return fhirError(res, 404, 'not-found', `ServiceRequest ${req.params.id} not found`);

    const fhir = {
      resourceType: 'ServiceRequest',
      id: toFhirId(order.id),
      meta: { lastUpdated: order.updatedAt?.toISOString() || new Date().toISOString() },
      status: order.status?.toLowerCase() || 'active',
      intent: 'order',
      code: { text: order.orderType },
      subject: { reference: `Patient/${toFhirId(order.patientId)}` },
      authoredOn: order.createdAt?.toISOString(),
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
