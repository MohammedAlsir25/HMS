import prisma from '../../../lib/prisma.js';

export async function adjudicateSecondaryClaim(primaryClaimId: string) {
  const primaryClaim = await prisma.insuranceClaim.findUnique({
    where: { id: primaryClaimId },
    include: {
      insurancePolicy: true,
      settlements: true,
      patient: { select: { id: true } },
    },
  });

  if (!primaryClaim) {
    throw new Error('Primary claim not found');
  }
  if (primaryClaim.status !== 'SETTLED') {
    throw new Error('Primary claim must be settled before COB adjudication');
  }

  const primaryPolicyOrder = primaryClaim.insurancePolicy.coordinationOrder;
  const totalSettled = primaryClaim.settlements.reduce(
    (sum, s) => sum + Number(s.amount), 0,
  );

  const secondaryPolicies = await prisma.insurancePolicy.findMany({
    where: {
      patientId: primaryClaim.patientId,
      hospitalId: primaryClaim.hospitalId,
      isActive: true,
      coordinationOrder: { gt: primaryPolicyOrder },
    },
    orderBy: { coordinationOrder: 'asc' },
  });

  if (secondaryPolicies.length === 0) {
    return null;
  }

  const secondaryPolicy = secondaryPolicies[0]!;
  const residual = Number(primaryClaim.claimAmount) - totalSettled;

  if (residual <= 0) {
    return null;
  }

  const secondaryCoveragePct = Number(secondaryPolicy.coveragePercent);
  const secondaryPays = Math.round(residual * (secondaryCoveragePct / 100) * 100) / 100;

  const year = new Date().getFullYear();
  const prefix = `CLM-${year}-`;
  const lastClaim = await prisma.insuranceClaim.findFirst({
    where: {
      hospitalId: primaryClaim.hospitalId,
      claimNumber: { startsWith: prefix },
    },
    orderBy: { claimNumber: 'desc' },
  });
  let seq = 1;
  if (lastClaim) {
    const lastSeq = parseInt(lastClaim.claimNumber.slice(-5), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  const claimNumber = `${prefix}${String(seq).padStart(5, '0')}`;

  const secondaryClaim = await prisma.insuranceClaim.create({
    data: {
      claimNumber,
      patientId: primaryClaim.patientId,
      insurancePolicyId: secondaryPolicy.id,
      insuranceCompanyId: secondaryPolicy.insuranceCompanyId,
      invoiceId: primaryClaim.invoiceId,
      claimAmount: residual,
      notes: `COB residual from claim ${primaryClaim.claimNumber}. Primary settled: ${totalSettled}. Residual: ${residual}. Secondary coverage: ${secondaryCoveragePct}%.`,
      clinicalRecords: (primaryClaim.clinicalRecords as Record<string, unknown>) || undefined,
      labResults: (primaryClaim.labResults as Record<string, unknown>) || undefined,
      imagingResults: (primaryClaim.imagingResults as Record<string, unknown>) || undefined,
      createdById: primaryClaim.createdById,
      hospitalId: primaryClaim.hospitalId,
    },
    include: {
      insurancePolicy: { select: { id: true, policyNumber: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });

  return {
    secondaryClaim,
    residual,
    secondaryPays,
    secondaryPolicy: {
      id: secondaryPolicy.id,
      policyNumber: secondaryPolicy.policyNumber,
      coordinationOrder: secondaryPolicy.coordinationOrder,
    },
  };
}

export async function getPatientPolicies(patientId: string, hospitalId: string) {
  return prisma.insurancePolicy.findMany({
    where: { patientId, hospitalId, isActive: true },
    orderBy: { coordinationOrder: 'asc' },
    include: {
      insuranceCompany: { select: { id: true, name: true } },
    },
  });
}
