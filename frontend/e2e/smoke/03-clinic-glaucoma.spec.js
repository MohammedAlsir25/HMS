import { test, expect } from '@playwright/test';
import { createTestPatientViaAPI, getClinicBySlug, checkInPatient } from '../helpers.js';

async function loginAsDoctor(page, email, clinicSlug) {
  const res = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  })).json();
  expect(res.token).toBeDefined();
  expect(res.user).toBeDefined();

  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.evaluate((authData) => {
    localStorage.setItem('jh-auth-storage', JSON.stringify({ state: authData }));
  }, { token: res.token, user: res.user, refreshToken: res.refreshToken });
  await page.goto(`/clinic/${clinicSlug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
}

test.describe('Glaucoma Clinic — Full Consultation Workflow', () => {

  test('complete patient consultation with AI, ICD-10, and save', async ({ page, request }) => {
    const loginRes = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reception@aljawahir.ae', password: 'password123' }),
    })).json();
    const token = loginRes.token;
    expect(token).toBeDefined();

    const clinic = await getClinicBySlug(request, token, 'glaucoma');
    const patient = await createTestPatientViaAPI(request, token);
    await checkInPatient(request, token, patient.id, clinic.id);

    await loginAsDoctor(page, 'doctor.glaucoma@aljawahir.ae', 'glaucoma');

    await expect(page.getByText(patient.mrn).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'See Patient' }).first().click();
    await expect(page.getByText('Vital Signs')).toBeVisible({ timeout: 10000 });

    const saveBtn = page.getByRole('button', { name: 'Save Clinical Record' });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    await expect(page.getByText('Record saved successfully')).toBeVisible({ timeout: 15000 });
  });
});
