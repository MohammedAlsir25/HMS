import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { buildDateWhere, formatPercent } from '../utils/reportHelpers.js';

const router = Router();

router.get('/patients/volume', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { groupBy } = req.query as Record<string, string>;
  const group = groupBy === 'week' || groupBy === 'month' ? groupBy : 'day';
  const where = buildDateWhere(req, 'createdAt');

  const appointments = await prisma.appointment.findMany({
    where,
    select: { patientId: true, clinicId: true, createdAt: true, visitType: true },
    orderBy: { createdAt: 'asc' },
  });

  const patients = await prisma.patient.findMany({
    where: { hospitalId, createdAt: where.createdAt as Record<string, unknown> | undefined },
    select: { id: true, gender: true, dateOfBirth: true, createdAt: true },
  });

  const patientFirstSeen = new Map<string, Date>();
  for (const p of patients) {
    patientFirstSeen.set(p.id, p.createdAt);
  }

  const dateKey = (d: Date): string => {
    if (group === 'month') return d.toISOString().slice(0, 7);
    if (group === 'week') {
      const ws = new Date(d);
      ws.setDate(d.getDate() - d.getDay());
      return ws.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  };

  const volumeMap: Record<string, { date: string; newPatients: number; returningPatients: number; total: number }> = {};
  const clinicMap: Record<string, number> = {};

  for (const apt of appointments) {
    const key = dateKey(apt.createdAt);
    if (!volumeMap[key]) volumeMap[key] = { date: key, newPatients: 0, returningPatients: 0, total: 0 };
    const entry = volumeMap[key]!;
    entry.total++;
    const firstSeen = patientFirstSeen.get(apt.patientId);
    if (firstSeen && firstSeen.toISOString().slice(0, 10) === apt.createdAt.toISOString().slice(0, 10)) {
      entry.newPatients++;
    } else {
      entry.returningPatients++;
    }
    clinicMap[apt.clinicId] = (clinicMap[apt.clinicId] || 0) + 1;
  }

  const clinicIds = Object.keys(clinicMap);
  const clinics = clinicIds.length > 0
    ? await prisma.clinic.findMany({ where: { id: { in: clinicIds }, hospitalId }, select: { id: true, name: true } })
    : [];
  const clinicNames = new Map(clinics.map((c) => [c.id, c.name]));

  const genderMap: Record<string, number> = {};
  const ageGroups: Record<string, number> = { '0-17': 0, '18-34': 0, '35-49': 0, '50-64': 0, '65+': 0 };
  const now = new Date();
  for (const p of patients) {
    const g = p.gender || 'Unknown';
    genderMap[g] = (genderMap[g] || 0) + 1;
    if (p.dateOfBirth) {
      const age = Math.floor((now.getTime() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) ageGroups['0-17']!++;
      else if (age < 35) ageGroups['18-34']!++;
      else if (age < 50) ageGroups['35-49']!++;
      else if (age < 65) ageGroups['50-64']!++;
      else ageGroups['65+']!++;
    }
  }

  res.json({
    volumeByDate: Object.values(volumeMap),
    byClinic: Object.entries(clinicMap)
      .map(([clinicId, count]) => ({ clinic: clinicNames.get(clinicId) || clinicId, count }))
      .sort((a, b) => b.count - a.count),
    demographics: {
      byGender: Object.entries(genderMap).map(([gender, count]) => ({ gender, count, percent: formatPercent(count, patients.length) })),
      byAgeGroup: Object.entries(ageGroups).map(([grp, count]) => ({ group: grp, count, percent: formatPercent(count, patients.length) })),
    },
  });
}));

router.get('/patients/demographics', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;

  const patients = await prisma.patient.findMany({
    where: { hospitalId },
    select: { gender: true, dateOfBirth: true },
  });

  const now = new Date();
  const genderMap: Record<string, number> = {};
  const ageGroups: Record<string, number> = { '0-17': 0, '18-34': 0, '35-49': 0, '50-64': 0, '65+': 0 };

  for (const p of patients) {
    const g = p.gender || 'Unknown';
    genderMap[g] = (genderMap[g] || 0) + 1;
    if (p.dateOfBirth) {
      const age = Math.floor((now.getTime() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) ageGroups['0-17']!++;
      else if (age < 35) ageGroups['18-34']!++;
      else if (age < 50) ageGroups['35-49']!++;
      else if (age < 65) ageGroups['50-64']!++;
      else ageGroups['65+']!++;
    }
  }

  res.json({
    totalPatients: patients.length,
    byGender: Object.entries(genderMap).map(([gender, count]) => ({ gender, count, percent: formatPercent(count, patients.length) })),
    byAgeGroup: Object.entries(ageGroups).map(([grp, count]) => ({ group: grp, count, percent: formatPercent(count, patients.length) })),
  });
}));

export default router;
