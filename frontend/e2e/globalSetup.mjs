import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '../../backend');

async function checkIfSeeded() {
  return new Promise((resolvePromise) => {
    const data = JSON.stringify({ email: 'reception@aljawahir.ae', password: 'password123' });
    const req = https.request({
      hostname: 'al-jawahir-hospital-production.up.railway.app',
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 10000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolvePromise(!!json.token);
        } catch { resolvePromise(false); }
      });
    });
    req.on('error', () => resolvePromise(false));
    req.on('timeout', () => { req.destroy(); resolvePromise(false); });
    req.write(data);
    req.end();
  });
}

export default async function globalSetup() {
  const seeded = await checkIfSeeded();
  if (seeded) {
    console.log('[globalSetup] Database already seeded, skipping.');
    return;
  }
  console.log('\n[globalSetup] Reseeding database (this may take several minutes)...');
  execSync('npm run prisma:seed', { cwd: backendDir, stdio: 'inherit', timeout: 600000 });
  console.log('[globalSetup] Database seeded.\n');
}
