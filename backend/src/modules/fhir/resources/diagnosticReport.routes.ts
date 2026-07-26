import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId, FhirResource } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const count = await prisma.diagnosticOrder.count({ where });
    const orders = await prisma.diagnosticOrder.findMany({
      where,
      include: { tests: { include: { test: true } } },
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const reports: FhirResource[] = [];
    for (const order of orders) {
      for (const t of order.tests || []) {
        if (!t.value) continue;
        reports.push({
          resourceType: 'DiagnosticReport',
          id: toFhirId(t.id),
          meta: { lastUpdated: t.updated_at?.toISOString() || new Date().toISOString() },
          status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: order.orderType || 'LAB' }] }],
          code: { text: t.test?.name || t.testId },
          subject: { reference: `Patient/${toFhirId(order.patientId)}` },
          effectiveDateTime: order.createdAt?.toISOString(),
          conclusion: t.value,
        });
      }
    }

    return fhirResponse(res, fhirBundle(reports, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const test = await prisma.diagnosticOrderTest.findUnique({
      where: { id: req.params.id },
      include: { order: true, test: true },
    });
    if (!test) return fhirError(res, 404, 'not-found', `DiagnosticReport ${req.params.id} not found`);

    const fhir = {
      resourceType: 'DiagnosticReport',
      id: toFhirId(test.id),
      meta: { lastUpdated: test.updated_at?.toISOString() || new Date().toISOString() },
      status: 'final',
      code: { text: test.test?.name || test.testId },
      subject: { reference: `Patient/${toFhirId(test.order.patientId)}` },
      effectiveDateTime: test.order.createdAt?.toISOString(),
      conclusion: test.value,
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
