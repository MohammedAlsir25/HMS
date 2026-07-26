import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { name, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (name) where.fullName = { contains: name as string, mode: 'insensitive' };

    const count = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const entries = users.map(u => ({
      resourceType: 'Practitioner',
      id: toFhirId(u.id),
      meta: { lastUpdated: u.updatedAt?.toISOString() || new Date().toISOString() },
      active: true,
      name: [{ family: u.fullName?.split(' ').slice(-1)[0] || '', given: u.fullName?.split(' ').slice(0, -1) || [] }],
      telecom: [{ system: 'email', value: u.email }],
    }));

    return fhirResponse(res, fhirBundle(entries, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return fhirError(res, 404, 'not-found', `Practitioner ${req.params.id} not found`);

    const fhir = {
      resourceType: 'Practitioner',
      id: toFhirId(user.id),
      meta: { lastUpdated: user.updatedAt?.toISOString() || new Date().toISOString() },
      active: true,
      name: [{ family: user.fullName?.split(' ').slice(-1)[0] || '', given: user.fullName?.split(' ').slice(0, -1) || [] }],
      telecom: [{ system: 'email', value: user.email }],
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
