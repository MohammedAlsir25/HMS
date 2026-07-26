import prisma from '../../../lib/prisma.js';

export async function generatePreAuthRefNumber(hospitalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PA-${year}-`;
  const lastAuth = await prisma.preAuthorization.findFirst({
    where: {
      hospitalId,
      referenceNumber: { startsWith: prefix },
    },
    orderBy: { referenceNumber: 'desc' },
  });
  let seq = 1;
  if (lastAuth) {
    const lastSeq = parseInt(lastAuth.referenceNumber.slice(-5), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}
