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
  let clinic = await prisma.clinic.findUnique({ where: { id: identifier } });
  if (!clinic) clinic = await prisma.clinic.findUnique({ where: { slug: identifier } });
  return clinic;
}

export function generateMRN() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `MRN-${year}-${rand}`;
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
