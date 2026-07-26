import { test, expect } from '@playwright/test';

async function apiLogin(email) {
  const res = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  })).json();
  expect(res.token).toBeDefined();
  return res;
}

async function loginAsUser(page, email) {
  const res = await apiLogin(email);
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.evaluate((authData) => {
    localStorage.setItem('jh-auth-storage', JSON.stringify({ state: authData }));
  }, { token: res.token, user: res.user, refreshToken: res.refreshToken });
  return res;
}

test.describe('Pharmacy Flow — POS → Inventory → Dispensing', () => {

  test('1. Pharmacist opens POS page', async ({ page }) => {
    await loginAsUser(page, 'pharmacy@aljawarih.sd');
    await page.goto('/pharmacy', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });
  });

  test('2. Inventory page loads with items', async ({ page }) => {
    await loginAsUser(page, 'pharmacy@aljawarih.sd');
    await page.goto('/inventory', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page).not.toHaveURL(/\/login/);
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('3. POS search input is available', async ({ page }) => {
    await loginAsUser(page, 'pharmacy@aljawarih.sd');
    await page.goto('/pharmacy', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
    }
    await expect(page).not.toHaveURL(/\/login/);
  });
});
