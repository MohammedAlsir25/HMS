import { Router } from 'express';
import { toFhirPatient, findPatientByFhirId, searchPatients } from './patient.js';
import { fhirResponse, fhirError, fhirBundle } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { name, birthdate, identifier, gender, _count, _offset } = req.query;
    const { patients, total } = await searchPatients({
      name: name as string,
      birthdate: birthdate as string,
      identifier: identifier as string,
      gender: gender as string,
      _count: _count ? parseInt(_count as string) : undefined,
      _offset: _offset ? parseInt(_offset as string) : undefined,
    });

    const entries = await Promise.all(patients.map(toFhirPatient));
    const bundle = fhirBundle(entries, total);
    return fhirResponse(res, bundle, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const patient = await findPatientByFhirId(req.params.id);
    if (!patient) return fhirError(res, 404, 'not-found', `Patient ${req.params.id} not found`);
    const fhir = await toFhirPatient(patient);
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
