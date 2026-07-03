import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '../../backend');

async function checkIfSeeded() {
  return new Promise((resolvePromise) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolvePromise(!!json.token || res.statusCode === 400);
        } catch { resolvePromise(false); }
      });
    });
    req.on('error', () => resolvePromise(false));
    req.on('timeout', () => { req.destroy(); resolvePromise(false); });
    req.write(JSON.stringify({ email: 'reception@aljawarih.sd', password: 'password123' }));
    req.end();
  });
}

export default async function globalSetup() {
  const seeded = await checkIfSeeded();
  if (seeded) {
    console.log('[globalSetup] Database already seeded, skipping.');
    return;
  }
  console.log('\n[globalSetup] Reseeding database...');
  execSync('npx prisma db push --skip-generate && npx tsx prisma/seed.js', { cwd: backendDir, stdio: 'inherit', timeout: 300000 });
  console.log('[globalSetup] Database seeded.\n');
}