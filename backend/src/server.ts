import app from './app.js';
import { config } from './config/index.js';
import prisma from './lib/prisma.js';
import { startReminderJob } from './modules/appointments/appointment-reminder.job.js';

process.on('unhandledRejection', (reason) => {
  console.error('[JH Hospital] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[JH Hospital] Uncaught Exception:', err);
});

const server = app.listen(config.port, () => {
  console.log(`[JH Hospital] Server running on port ${config.port} (${config.nodeEnv})`);
  startReminderJob();
});

function gracefulShutdown(signal: string) {
  console.log(`[JH Hospital] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[JH Hospital] Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
