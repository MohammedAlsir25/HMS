import prisma from '../../../lib/prisma.js';

export async function generateClaimNumber(hospitalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CLM-${year}-`;
  const lastClaim = await prisma.insuranceClaim.findFirst({
    where: {
      hospitalId,
      claimNumber: { startsWith: prefix },
    },
    orderBy: { claimNumber: 'desc' },
  });
  let seq = 1;
  if (lastClaim) {
    const lastSeq = parseInt(lastClaim.claimNumber.slice(-5), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}
