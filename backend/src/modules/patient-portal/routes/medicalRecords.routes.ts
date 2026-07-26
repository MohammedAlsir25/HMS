import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { authenticatePatient } from '../middleware/authenticatePatient.js';

const router = Router();
router.use(authenticatePatient);

router.get('/', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const records: Array<{
    type: string;
    date: string;
    title: string;
    summary: string;
    id: string;
  }> = [];
  const consultations = await prisma.clinicalRecord.findMany({
    where: { patientId },
    include: {
      clinic: { select: { name: true } },
      medications: { select: { drugName: true, dosage: true, frequency: true } },
    },
    orderBy: { encounterDate: 'desc' },
  });
  for (const c of consultations) {
    records.push({
      type: 'consultation',
      date: c.encounterDate.toISOString(),
      title: c.diagnosis ?? `Consultation - ${c.clinic.name}`,
      summary: c.notes ?? c.diagnosis ?? '',
      id: c.id,
    });
  }
  const labOrders = await prisma.diagnosticOrder.findMany({
    where: { patientId, orderType: 'LAB' },
    include: {
      tests: {
        include: { test: { select: { name: true } } },
      },
      fromClinic: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  for (const o of labOrders) {
    const testNames = o.tests.map((t) => t.test.name).join(', ');
    records.push({
      type: 'lab',
      date: o.createdAt.toISOString(),
      title: `Lab Order - ${testNames || 'Tests'}`,
      summary: o.resultNotes ?? `Status: ${o.status}`,
      id: o.id,
    });
  }
  const imagingOrders = await prisma.imagingOrder.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
  });
  for (const o of imagingOrders) {
    records.push({
      type: 'imaging',
      date: o.createdAt.toISOString(),
      title: `Imaging - ${o.scanType}`,
      summary: o.impression ?? o.findings ?? `Status: ${o.status}`,
      id: o.id,
    });
  }
  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ records });
}));

router.get('/consultations', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const consultations = await prisma.clinicalRecord.findMany({
    where: { patientId },
    include: {
      clinic: { select: { name: true } },
      vitalSigns: true,
      medications: true,
      symptoms: true,
    },
    orderBy: { encounterDate: 'desc' },
  });
  res.json({
    consultations: consultations.map((c) => ({
      id: c.id,
      encounterDate: c.encounterDate.toISOString(),
      clinic: c.clinic.name,
      diagnosis: c.diagnosis,
      doctor: null,
      notes: c.notes,
      vitalSigns: c.vitalSigns.length > 0 ? {
        bloodPressureSystolic: c.vitalSigns[0]!.bloodPressureSystolic,
        bloodPressureDiastolic: c.vitalSigns[0]!.bloodPressureDiastolic,
        heartRate: c.vitalSigns[0]!.heartRate,
        temperature: c.vitalSigns[0]!.temperature?.toNumber() ?? null,
        spo2: c.vitalSigns[0]!.spo2,
        weight: c.vitalSigns[0]!.weight?.toNumber() ?? null,
      } : null,
      medications: c.medications.map((m) => ({
        drugName: m.drugName,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        route: m.route,
      })),
      symptoms: c.symptoms.map((s) => ({
        name: s.name,
        severity: s.severity,
        duration: s.duration,
      })),
    })),
  });
}));

router.get('/lab-results', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const orders = await prisma.diagnosticOrder.findMany({
    where: { patientId, orderType: 'LAB' },
    include: {
      tests: {
        include: { test: { select: { name: true, unit: true, refRangeText: true } } },
      },
      fromClinic: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    labResults: orders.map((o) => ({
      orderId: o.id,
      orderDate: o.createdAt.toISOString(),
      completedAt: o.completedAt?.toISOString() ?? null,
      status: o.status,
      clinic: o.fromClinic.name,
      tests: o.tests.map((t) => ({
        testName: t.test.name,
        value: t.value,
        unit: t.unit,
        refRange: t.refRangeText,
        flag: t.flag,
        isAbnormal: t.isAbnormal,
      })),
    })),
  });
}));

router.get('/prescriptions', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const clinicalRecords = await prisma.clinicalRecord.findMany({
    where: { patientId },
    include: {
      medications: true,
      clinic: { select: { name: true } },
    },
    orderBy: { encounterDate: 'desc' },
  });
  const prescriptions: Array<{
    id: string;
    drugName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    route: string | null;
    notes: string | null;
    prescribedDate: string;
    clinic: string;
    doctor: string;
  }> = [];
  for (const record of clinicalRecords) {
    for (const med of record.medications) {
      prescriptions.push({
        id: med.id,
        drugName: med.drugName,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        route: med.route,
        notes: med.notes,
        prescribedDate: record.encounterDate.toISOString(),
        clinic: record.clinic.name,
        doctor: '',
      });
    }
  }
  res.json({ prescriptions });
}));

router.get('/imaging', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const orders = await prisma.imagingOrder.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
  });
  const clinicIds = [...new Set(orders.map((o) => o.clinicId))];
  const clinics = await prisma.clinic.findMany({
    where: { id: { in: clinicIds } },
    select: { id: true, name: true },
  });
  const clinicMap = new Map(clinics.map((c) => [c.id, c.name]));
  res.json({
    imagingOrders: orders.map((o) => ({
      id: o.id,
      scanType: o.scanType,
      status: o.status,
      orderDate: o.createdAt.toISOString(),
      completedAt: o.completedAt?.toISOString() ?? null,
      clinic: clinicMap.get(o.clinicId) ?? null,
      findings: o.findings,
      impression: o.impression,
    })),
  });
}));

export default router;
