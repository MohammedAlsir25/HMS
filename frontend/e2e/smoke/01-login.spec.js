import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers.js';

test.describe('Login Flow', () => {

  test('login as receptionist and see dashboard nav grid', async ({ page }) => {
    await loginAs(page, 'reception@aljawahir.ae', 'password123');
    await expect(page.getByRole('link', { name: 'Reception' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pharmacy' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inventory' }).first()).toBeVisible();
  });

  test('login as glaucoma doctor and auto-redirect to clinic', async ({ page }) => {
    await loginAs(page, 'doctor.glaucoma@aljawahir.ae', 'password123');
    await expect(page).toHaveURL(/\/clinic\/glaucoma/);
    await expect(page.locator('h1:has-text("Glaucoma Clinic")')).toBeVisible();
    await expect(page.locator('h3:has-text("Patient Selection")')).toBeVisible();
    await expect(page.locator('h3:has-text("Waiting Queue")')).toBeVisible();
  });

  test('reject invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'wrong@aljawahir.ae');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 10000 });
  });
});
