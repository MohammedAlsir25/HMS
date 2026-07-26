import prisma from '../lib/prisma.js';

export interface PatientStatement {
  patientId: string;
  patientName: string;
  mrn: string;
  generatedAt: Date;
  invoices: Array<{
    invoiceNumber: string;
    total: number;
    amountPaid: number;
    balance: number;
    paymentStatus: string;
    created_at: Date;
  }>;
  totalOutstanding: number;
  currency: string;
}

export async function generatePatientStatement(patientId: string): Promise<PatientStatement | null> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      fullName: true,
      mrn: true,
      invoices: {
        where: { paymentStatus: { not: 'PaidInFull' }, voided: false },
        orderBy: { created_at: 'desc' },
        select: {
          invoiceNumber: true,
          total: true,
          amountPaid: true,
          paymentStatus: true,
          currency: true,
          created_at: true,
        },
      },
    },
  });

  if (!patient) return null;

  const invoices = patient.invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    total: Number(inv.total),
    amountPaid: Number(inv.amountPaid),
    balance: Number(inv.total) - Number(inv.amountPaid),
    paymentStatus: inv.paymentStatus,
    created_at: inv.created_at ?? new Date(),
  }));

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0);
  const currency = patient.invoices[0]?.currency ?? 'SDG';

  return {
    patientId: patient.id,
    patientName: patient.fullName,
    mrn: patient.mrn,
    generatedAt: new Date(),
    invoices,
    totalOutstanding,
    currency,
  };
}
