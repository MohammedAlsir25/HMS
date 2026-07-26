import { Router } from 'express';
import patientRoutes from './resources/patient.routes.js';
import encounterRoutes from './resources/encounter.routes.js';
import observationRoutes from './resources/observation.routes.js';
import conditionRoutes from './resources/condition.routes.js';
import medicationRequestRoutes from './resources/medicationRequest.routes.js';
import serviceRequestRoutes from './resources/serviceRequest.routes.js';
import diagnosticReportRoutes from './resources/diagnosticReport.routes.js';
import appointmentRoutes from './resources/appointment.routes.js';
import procedureRoutes from './resources/procedure.routes.js';
import coverageRoutes from './resources/coverage.routes.js';
import claimRoutes from './resources/claim.routes.js';
import locationRoutes from './resources/location.routes.js';
import practitionerRoutes from './resources/practitioner.routes.js';
import documentReferenceRoutes from './resources/documentReference.routes.js';
import inboundRoutes from './routes/inbound.routes.js';
import adminRoutes from './routes/admin.routes.js';
import documentRoutes from './routes/document.routes.js';
import { fhirAuth } from './middleware/fhirAuth.js';

const router = Router();

router.get('/metadata', (_req, res) => {
  res.json({
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    software: { name: 'HMS FHIR Server', version: '1.0.0' },
    fhirVersion: '4.0.1',
    format: ['json', 'xml'],
    rest: [{
      mode: 'server',
      resource: [
        { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Observation', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Condition', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'MedicationRequest', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'ServiceRequest', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'DiagnosticReport', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Appointment', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Procedure', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Coverage', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Claim', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Location', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Practitioner', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'DocumentReference', interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }] },
      ],
    }],
  });
});

router.use(fhirAuth);

router.use('/Patient', patientRoutes);
router.use('/Encounter', encounterRoutes);
router.use('/Observation', observationRoutes);
router.use('/Condition', conditionRoutes);
router.use('/MedicationRequest', medicationRequestRoutes);
router.use('/ServiceRequest', serviceRequestRoutes);
router.use('/DiagnosticReport', diagnosticReportRoutes);
router.use('/Appointment', appointmentRoutes);
router.use('/Procedure', procedureRoutes);
router.use('/Coverage', coverageRoutes);
router.use('/Claim', claimRoutes);
router.use('/Location', locationRoutes);
router.use('/Practitioner', practitionerRoutes);
router.use('/DocumentReference', documentReferenceRoutes);
router.use('/$merge', inboundRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);

export default router;
