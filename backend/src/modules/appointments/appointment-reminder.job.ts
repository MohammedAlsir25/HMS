import prisma from '../../lib/prisma.js';

const INTERVAL_MS = 30 * 60 * 1000;

export function startReminderJob() {
  console.log('[ReminderJob] Started (interval: 30 minutes)');
  runReminderCheck();
  setInterval(runReminderCheck, INTERVAL_MS);
}

async function runReminderCheck() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await prisma.appointment.findMany({
      where: {
        status: 'RESERVED',
        remindedAt: null,
        scheduledAt: {
          gte: now,
          lte: in24h,
        },
      },
      include: {
        patient: { select: { fullName: true, phone: true } },
        clinic: { select: { name: true } },
      },
    });

    for (const appointment of upcoming) {
      console.log(
        `[ReminderJob] Reminder for ${appointment.patient.fullName} ` +
        `(phone: ${appointment.patient.phone}) ` +
        `at ${appointment.clinic.name} on ${appointment.scheduledAt?.toISOString()}`
      );
    }

    if (upcoming.length > 0) {
      const ids = upcoming.map((a) => a.id);

      await prisma.$transaction([
        prisma.appointment.updateMany({
          where: { id: { in: ids } },
          data: { remindedAt: now },
        }),
        prisma.auditLog.createMany({
          data: upcoming.map((a) => ({
            action: 'REMINDER_SENT',
            entity: 'Appointment',
            entityId: a.id,
            details: {
              patientName: a.patient.fullName,
              clinicName: a.clinic.name,
              scheduledAt: a.scheduledAt?.toISOString(),
            },
            userId: 'system',
          })),
          skipDuplicates: true,
        }),
      ]);

      console.log(`[ReminderJob] Sent ${upcoming.length} reminder(s)`);
    }
  } catch (err) {
    console.error('[ReminderJob] Error:', err);
  }
}
