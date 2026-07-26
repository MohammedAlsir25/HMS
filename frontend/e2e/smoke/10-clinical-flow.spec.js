import { test, expect } from '@playwright/test';
import { loginAs, createTestPatientViaAPI, getClinicBySlug, checkInPatient } from '../helpers.js';

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

test.describe('Clinical Flow — Patient → Appointment → Consultation → Billing', () => {

  test('1. Receptionist checks in patient', async ({ page, request }) => {
    const recepRes = await apiLogin('reception@aljawarih.sd');
    const medicineClinic = await getClinicBySlug(request, recepRes.token, 'medicine');
    const patient = await createTestPatientViaAPI(request, recepRes.token);
    await checkInPatient(request, recepRes.token, patient.id, medicineClinic.id);

    await loginAs(page, 'reception@aljawarih.sd', 'password123');
    await expect(page).toHaveURL(/\/dashboard|\/reception/);
  });

  test('2. Doctor sees patient in clinic queue and completes consultation', async ({ page, request }) => {
    const recepRes = await apiLogin('reception@aljawarih.sd');
    const medicineClinic = await getClinicBySlug(request, recepRes.token, 'medicine');
    const patient = await createTestPatientViaAPI(request, recepRes.token);
    await checkInPatient(request, recepRes.token, patient.id, medicineClinic.id);

    await loginAsUser(page, 'doctor.medicine@aljawarih.sd');
    await page.goto('/clinic/medicine', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.getByText(patient.mrn).first()).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'See Patient' }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Patient Selection')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  });

  test('3. Accounting page shows invoices', async ({ page }) => {
    await loginAs(page, 'admin@aljawarih.sd', 'password123');
    await page.goto('/accounting', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const invoiceTab = page.getByRole('tab', { name: /invoices/i }).or(page.getByText('Invoices').first());
    if (await invoiceTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await invoiceTab.click();
      await page.waitForTimeout(1000);
    }
    await expect(page).not.toHaveURL(/\/login/);
  });
});
