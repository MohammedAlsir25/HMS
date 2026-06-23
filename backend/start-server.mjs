console.log('[start-server] Starting backend...');

process.on('unhandledRejection', (reason) => {
  console.error('[start-server] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[start-server] Uncaught Exception:', err);
});

import('./src/server.js').catch((err) => {
  console.error('[start-server] Failed to import server:', err);
  process.exit(1);
});
