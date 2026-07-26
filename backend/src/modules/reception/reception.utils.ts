import multer from 'multer';
import prisma from '../../lib/prisma.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

export async function resolveClinic(identifier: string) {
  let clinic = await prisma.clinic.findFirst({ where: { id: identifier } });
  if (!clinic) clinic = await prisma.clinic.findFirst({ where: { slug: identifier } });
  return clinic;
}

export async function generateMRN(hospitalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastPatient = await prisma.patient.findFirst({
    where: {
      hospitalId,
      mrn: { startsWith: `MRN-${year}-` },
    },
    orderBy: { mrn: 'desc' },
    select: { mrn: true },
  });
  let sequence = 1;
  if (lastPatient) {
    const lastSeq = parseInt(lastPatient.mrn.split('-')[2]!);
    sequence = lastSeq + 1;
  }
  return `MRN-${year}-${String(sequence).padStart(5, '0')}`;
}

export async function nextToken(clinicId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = await prisma.appointment.findFirst({
    where: { clinicId, createdAt: { gte: today } },
    orderBy: { token: 'desc' },
  });
  return (last?.token || 0) + 1;
}
