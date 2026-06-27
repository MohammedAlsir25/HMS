# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\smoke\01-login.spec.js >> Login Flow >> reject invalid credentials
- Location: e2e\smoke\01-login.spec.js:21:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "networkidle"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginAs } from '../helpers.js';
  3  | 
  4  | test.describe('Login Flow', () => {
  5  | 
  6  |   test('login as receptionist and see dashboard nav grid', async ({ page }) => {
  7  |     await loginAs(page, 'reception@aljawahir.ae', 'password123');
  8  |     await expect(page.getByRole('link', { name: 'Reception' }).first()).toBeVisible();
  9  |     await expect(page.getByRole('link', { name: 'Pharmacy' }).first()).toBeVisible();
  10 |     await expect(page.getByRole('link', { name: 'Inventory' }).first()).toBeVisible();
  11 |   });
  12 | 
  13 |   test('login as glaucoma doctor and auto-redirect to clinic', async ({ page }) => {
  14 |     await loginAs(page, 'doctor.glaucoma@aljawahir.ae', 'password123');
  15 |     await expect(page).toHaveURL(/\/clinic\/glaucoma/);
  16 |     await expect(page.locator('h1:has-text("Glaucoma Clinic")')).toBeVisible();
  17 |     await expect(page.locator('h3:has-text("Patient Selection")')).toBeVisible();
  18 |     await expect(page.locator('h3:has-text("Waiting Queue")')).toBeVisible();
  19 |   });
  20 | 
  21 |   test('reject invalid credentials', async ({ page }) => {
> 22 |     await page.goto('/login', { waitUntil: 'networkidle' });
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  23 |     await page.fill('input[type="email"]', 'wrong@aljawahir.ae');
  24 |     await page.fill('input[type="password"]', 'wrongpass');
  25 |     await page.click('button[type="submit"]');
  26 |     await page.waitForTimeout(3000);
  27 |     await expect(page).toHaveURL(/\/login/);
  28 |   });
  29 | });
  30 | 
```