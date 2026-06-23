import app from './app.js';
import { config } from './config/index.js';

process.on('unhandledRejection', (reason) => {
  console.error('[JH Hospital] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[JH Hospital] Uncaught Exception:', err);
});

app.listen(config.port, () => {
  console.log(`[JH Hospital] Server running on port ${config.port} (${config.nodeEnv})`);
});
