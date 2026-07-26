import prisma from '../lib/prisma.js';

export async function processDueInstallments(): Promise<{ processed: number; reminders: number }> {
  const now = new Date();

  const activePlans = await prisma.paymentPlan.findMany({
    where: { status: 'ACTIVE' },
    include: {
      installments: {
        where: { status: 'PENDING', dueDate: { lte: now } },
      },
      patient: { select: { id: true, fullName: true, phone: true } },
    },
  });

  let processed = 0;
  let reminders = 0;

  for (const plan of activePlans) {
    for (const installment of plan.installments) {
      await prisma.paymentInstallment.update({
        where: { id: installment.id },
        data: {
          status: 'OVERDUE',
          notes: `Auto-flagged as overdue on ${now.toISOString()}`,
        },
      });
      processed++;
      reminders++;
    }

    const unpaidCount = await prisma.paymentInstallment.count({
      where: { planId: plan.id, status: { in: ['PENDING', 'OVERDUE'] } },
    });

    if (unpaidCount === 0) {
      await prisma.paymentPlan.update({
        where: { id: plan.id },
        data: { status: 'COMPLETED' },
      });
    } else {
      const totalInstallments = await prisma.paymentInstallment.count({
        where: { planId: plan.id },
      });
      const missedCount = totalInstallments - unpaidCount;
      if (missedCount >= Math.floor(totalInstallments / 3)) {
        await prisma.paymentPlan.update({
          where: { id: plan.id },
          data: { status: 'DEFAULTED' },
        });
      }
    }
  }

  return { processed, reminders };
}
