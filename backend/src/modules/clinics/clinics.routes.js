import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const clinics = await prisma.clinic.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(clinics);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:slug/dashboard', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    const patients = await prisma.patient.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
    const appointments = await prisma.apppointment.findMany({
      where: { clinicId: clinic.id, status: { in: ['WAITING', 'IN_PROGRESS'] } },
      include: { patient: { select: { fullName: true, mrn: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ clinic, patients, appointments });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:slug/record', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    const { patientId, diagnosis, prescriptions, clinicSpecificJson, notes, vitalSigns, symptoms, medications } = req.body;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });

    const record = await prisma.clinicalRecord.create({
      data: {
        patientId,
        clinicId: clinic.id,
        diagnosis: diagnosis || null,
        prescriptions: prescriptions || null,
        clinicSpecificJson: clinicSpecificJson || {},
        notes: notes || null,
        vitalSigns: vitalSigns ? {
          create: {
            bloodPressureSystolic: vitalSigns.bloodPressureSystolic || null,
            bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic || null,
            heartRate: vitalSigns.heartRate || null,
            temperature: vitalSigns.temperature || null,
            spo2: vitalSigns.spo2 || null,
            bloodGlucose: vitalSigns.bloodGlucose || null,
            weight: vitalSigns.weight || null,
          },
        } : undefined,
        symptoms: symptoms?.length ? {
          create: symptoms.map(s => ({
            name: s.name,
            bodyArea: s.bodyArea || null,
            onset: s.onset || null,
            duration: s.duration || null,
            severity: s.severity || null,
            description: s.description || null,
          })),
        } : undefined,
        medications: medications?.length ? {
          create: medications.map(m => ({
            drugName: m.drugName,
            dosage: m.dosage || null,
            frequency: m.frequency || null,
            duration: m.duration || null,
            route: m.route || null,
            notes: m.notes || null,
          })),
        } : undefined,
      },
      include: {
        vitalSigns: true,
        symptoms: true,
        medications: true,
      },
    });

    res.status(201).json(record);
  } catch (err) {
    console.error('Create record error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:slug/records', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    const { patientId } = req.query;
    const where = { clinicId: clinic.id };
    if (patientId) where.patientId = patientId;

    const records = await prisma.clinicalRecord.findMany({
      where,
      include: {
        patient: { select: { fullName: true, mrn: true } },
        vitalSigns: true,
        symptoms: true,
        medications: true,
      },
      orderBy: { encounterDate: 'desc' },
      take: 50,
    });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:slug/queue', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    const queue = await prisma.apppointment.findMany({
      where: {
        clinicId: clinic.id,
        status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true, phone: true, gender: true, dateOfBirth: true, chronicConditions: true, diabetesType: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    res.json(queue);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:slug/stats', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalPatients, todayAppointments, todayRecords, chronicPatients] = await Promise.all([
      prisma.clinicalRecord.groupBy({
        by: ['patientId'],
        where: { clinicId: clinic.id },
      }),
      prisma.apppointment.count({
        where: { clinicId: clinic.id, createdAt: { gte: today } },
      }),
      prisma.clinicalRecord.count({
        where: { clinicId: clinic.id, createdAt: { gte: today } },
      }),
      prisma.patient.count({
        where: { chronicConditions: { isEmpty: false } },
      }),
    ]);

    res.json({
      totalPatients: totalPatients.length,
      todayAppointments,
      todayRecords,
      chronicPatients,
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:slug/medications', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), async (req, res) => {
  try {
    const { search } = req.query;
    const where = { isActive: true, category: { contains: 'medication', mode: 'insensitive' } };
    if (search && search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' }, take: 20 });
    res.json(items);
  } catch (err) {
    console.error('Medication search error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
