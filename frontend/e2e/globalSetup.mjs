import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '../../backend');

export default async function globalSetup() {
  console.log('\n[globalSetup] Reseeding database...');
  execSync('npm run prisma:seed', { cwd: backendDir, stdio: 'inherit' });
  console.log('[globalSetup] Database seeded.\n');
}
