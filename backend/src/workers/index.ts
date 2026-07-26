import { Worker } from 'bullmq';
import { connection } from '../config/redis.js';
import { processDueInstallments } from './paymentPlan.job.js';
import { generatePatientStatement } from './statement.job.js';
import { checkStaleAppeals } from './denialReminder.job.js';

const paymentPlanWorker = new Worker(
  'payment-plans',
  async (job) => {
    if (job.name === 'process-due-installments') {
      return processDueInstallments();
    }
  },
  { connection },
);

const statementWorker = new Worker(
  'statements',
  async (job) => {
    if (job.name === 'generate-statement') {
      const { patientId } = job.data as { patientId: string };
      return generatePatientStatement(patientId);
    }
  },
  { connection },
);

const denialReminderWorker = new Worker(
  'denial-reminders',
  async (job) => {
    if (job.name === 'check-stale-appeals') {
      return checkStaleAppeals();
    }
  },
  { connection },
);

paymentPlanWorker.on('completed', (job) => {
  console.log(`[payment-plans] Job ${job.id} completed`);
});

paymentPlanWorker.on('failed', (job, err) => {
  console.error(`[payment-plans] Job ${job?.id} failed:`, err.message);
});

statementWorker.on('completed', (job) => {
  console.log(`[statements] Job ${job.id} completed`);
});

statementWorker.on('failed', (job, err) => {
  console.error(`[statements] Job ${job?.id} failed:`, err.message);
});

denialReminderWorker.on('completed', (job) => {
  console.log(`[denial-reminders] Job ${job.id} completed`);
});

denialReminderWorker.on('failed', (job, err) => {
  console.error(`[denial-reminders] Job ${job?.id} failed:`, err.message);
});

export { paymentPlanWorker, statementWorker, denialReminderWorker };
