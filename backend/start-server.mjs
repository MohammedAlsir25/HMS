console.log('[start-server] Starting backend with tsx...');

process.on('unhandledRejection', (reason) => {
  console.error('[start-server] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[start-server] Uncaught Exception:', err);
});

import('../backend/src/server.ts').catch((err) => {
  console.error('[start-server] Failed to import server:', err);
  process.exit(1);
});
