import { test, expect } from '@playwright/test';

test.describe('Lab Module — Smoke Tests', () => {

  test('dashboard shows Laboratory icon for lab technician', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'lab.tech@aljawahir.ae');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await expect(page.getByRole('link', { name: 'Laboratory' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('lab page renders with tabs and stats', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'lab.tech@aljawahir.ae');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:has-text("Laboratory")')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Request Test' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Request Queue' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Test Catalog' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('lab order created via API appears in queue', async ({ page, request }) => {
    const loginRes = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor.medicine@aljawahir.ae', password: 'password123' }),
    })).json();
    const token = loginRes.token;
    expect(token).toBeDefined();

    const clinicsRes = await request.get('http://127.0.0.1:4001/api/clinics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(clinicsRes.ok()).toBeTruthy();
    const clinics = await clinicsRes.json();
    const medicineClinic = clinics.find(c => c.slug === 'medicine');
    expect(medicineClinic).toBeDefined();

    const patientRes = await request.post('http://127.0.0.1:4001/api/reception/patients', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { fullName: `LabTest Patient ${Date.now()}`, phone: '0501234567', gender: 'MALE', dateOfBirth: '1985-06-15', diabetesType: 'NONE' },
    });
    expect(patientRes.ok()).toBeTruthy();
    const patient = await patientRes.json();

    const catalogRes = await request.get('http://127.0.0.1:4001/api/lab/tests', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(catalogRes.ok()).toBeTruthy();
    const catalog = await catalogRes.json();
    const cbc = catalog.find(t => t.code === 'CBC');
    const glu = catalog.find(t => t.code === 'GLU');
    expect(cbc).toBeDefined();
    expect(glu).toBeDefined();

    const orderRes = await request.post('http://127.0.0.1:4001/api/lab/orders', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { patientId: patient.id, fromClinicId: medicineClinic.id, testIds: [cbc.id, glu.id], priority: 0 },
    });
    expect(orderRes.ok()).toBeTruthy();
    const order = await orderRes.json();
    expect(order).toHaveProperty('id');

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'lab.tech@aljawahir.ae');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });

    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator(`text=${patient.fullName}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=PENDING').first()).toBeVisible({ timeout: 5000 });
  });
});
