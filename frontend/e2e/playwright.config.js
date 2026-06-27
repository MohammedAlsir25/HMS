import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './smoke',
  globalSetup: './globalSetup.mjs',
  timeout: 120000,
  retries: 0,
  expect: { timeout: 20000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 30000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: '../../backend',
      port: 4001,
      timeout: 60000,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite --port 5173',
      cwd: '..',
      port: 5173,
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
