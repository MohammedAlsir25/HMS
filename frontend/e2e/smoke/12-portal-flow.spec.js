import { test, expect } from '@playwright/test';

async function apiLogin(email) {
  const res = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  })).json();
  return res;
}

test.describe('Patient Portal Flow — Login → Book → Records → Pay', () => {

  test('1. Portal login page renders', async ({ page }) => {
    await page.goto('/portal/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
  });

  test('2. Portal rejects invalid credentials', async ({ page }) => {
    await page.goto('/portal/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('nonexistent@portal.com');
    await passwordInput.fill('wrongpass');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('3. Portal register page renders', async ({ page }) => {
    await page.goto('/portal/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page).not.toHaveURL(/\/login/);
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
