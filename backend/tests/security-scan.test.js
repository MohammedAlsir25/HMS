import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendSrc = path.resolve(__dirname, '..', 'src');

describe('Security Audit - Hardcoded Secrets', () => {
  const sensitivePatterns = [
    { pattern: /sk_live_|sk_test_/, label: 'Stripe secret key' },
    { pattern: /AIza[0-9A-Za-z_-]{35}/, label: 'Firebase API key' },
    { pattern: /ghp_[0-9a-zA-Z]{36}/, label: 'GitHub personal access token' },
    { pattern: /-----BEGIN RSA PRIVATE KEY-----/, label: 'RSA private key' },
    { pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/, label: 'OpenSSH private key' },
    { pattern: /mongodb\+srv:\/\/[^:]+:[^@]+@/, label: 'MongoDB connection string' },
    { pattern: /password[=:]["']?.{0,1}(?!\*)/i, label: 'Potential hardcoded password' },
  ];

  function walkDir(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        files = files.concat(walkDir(full));
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        files.push(full);
      }
    }
    return files;
  }

  const files = walkDir(backendSrc);

  sensitivePatterns.forEach(({ pattern, label }) => {
    it(`should not contain ${label}`, () => {
      const violations = [];
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(pattern);
        if (matches) {
          violations.push(`${path.relative(backendSrc, file)}: ${matches[0].slice(0, 40)}`);
        }
      }
      if (violations.length > 0) {
        console.warn(`[WARN] Potential ${label} found:\n`, violations.join('\n'));
      }
      // Soft warning only - .env files are the intended pattern
      expect(violations).toEqual([]);
    });
  });
});

describe('Security Audit - SQL Injection Vectors', () => {
  it('should not contain raw SQL string concatenation', () => {
    const walk = (dir) => {
      let files = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') files = files.concat(walk(full));
        else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
      }
      return files;
    };
    const files = walk(backendSrc);

    const riskyPatterns = [
      /\.query\(`[^`]*\$\{/,
      /\.raw\(`[^`]*\$\{/,
      /\$executeRaw`[^`]*\$\{/,
    ];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of riskyPatterns) {
        if (pattern.test(content)) {
          throw new Error(`Possible SQL injection in ${path.relative(backendSrc, file)}`);
        }
      }
    }
  });
});

describe('Security Audit - XSS Vectors', () => {
  it('should not use dangerouslySetInnerHTML', () => {
    const frontendSrc = path.resolve(__dirname, '..', '..', 'frontend', 'src');
    if (!fs.existsSync(frontendSrc)) return;

    const walk = (dir) => {
      const files = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') files.push(...walk(full));
        else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.tsx'))) files.push(full);
      }
      return files;
    };

    const files = walk(frontendSrc);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('dangerouslySetInnerHTML')) {
        throw new Error(`XSS risk: dangerouslySetInnerHTML found in ${path.relative(frontendSrc, file)}`);
      }
    }
  });
});
