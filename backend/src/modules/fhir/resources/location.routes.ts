import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId, FhirResource } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { _count, _offset } = req.query;
    const wards = await prisma.ward.findMany({
      include: { beds: true },
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
    });

    const locations: FhirResource[] = [];
    for (const ward of wards) {
      locations.push({
        resourceType: 'Location',
        id: toFhirId(ward.id),
        meta: { lastUpdated: new Date().toISOString() },
        name: ward.name,
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode', code: 'WARD' }] },
        status: 'active',
      });
      for (const bed of ward.beds || []) {
        locations.push({
          resourceType: 'Location',
          id: toFhirId(bed.id),
          name: bed.bedNumber,
          type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode', code: 'BED' }] },
          status: bed.status === 'VACANT' ? 'active' : bed.status === 'OCCUPIED' ? 'active' : 'inactive',
          partOf: { reference: `Location/${toFhirId(ward.id)}` },
        });
      }
    }

    return fhirResponse(res, fhirBundle(locations, locations.length), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const ward = await prisma.ward.findUnique({ where: { id: req.params.id }, include: { beds: true } });
    if (ward) {
      const fhir = {
        resourceType: 'Location',
        id: toFhirId(ward.id),
        meta: { lastUpdated: new Date().toISOString() },
        name: ward.name,
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode', code: 'WARD' }] },
        status: 'active',
      };
      return fhirResponse(res, fhir, req.headers.accept as string);
    }

    const bed = await prisma.bed.findUnique({ where: { id: req.params.id } });
    if (bed) {
      const fhir = {
        resourceType: 'Location',
        id: toFhirId(bed.id),
        name: bed.bedNumber,
        status: bed.status === 'VACANT' ? 'active' : 'inactive',
      };
      return fhirResponse(res, fhir, req.headers.accept as string);
    }

    return fhirError(res, 404, 'not-found', `Location ${req.params.id} not found`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
