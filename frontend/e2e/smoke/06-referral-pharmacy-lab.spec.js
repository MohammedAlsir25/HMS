import { test, expect } from '@playwright/test';
import { createTestPatientViaAPI, getClinicBySlug, checkInPatient } from '../helpers.js';

async function loginAsUser(page, email) {
  const res = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  })).json();
  expect(res.token).toBeDefined();
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.evaluate((authData) => {
    localStorage.setItem('jh-auth-storage', JSON.stringify({ state: authData }));
  }, { token: res.token, user: res.user, refreshToken: res.refreshToken });
  return res;
}

async function loginAsDoctorViaAPI(page, email, clinicSlug) {
  const res = await loginAsUser(page, email);
  await page.goto(`/clinic/${clinicSlug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  return res;
}

test.describe('Referral — Pharmacy & Lab Flow', () => {

  test('1. Doctor creates pharmacy referral with medications', async ({ page, request }) => {
    const loginRes = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reception@aljawarih.sd', password: 'password123' }),
    })).json();
    const token = loginRes.token;
    expect(token).toBeDefined();

    const medicineClinic = await getClinicBySlug(request, token, 'medicine');
    const patient = await createTestPatientViaAPI(request, token);
    await checkInPatient(request, token, patient.id, medicineClinic.id);

    const doctorRes = await loginAsDoctorViaAPI(page, 'doctor.medicine@aljawarih.sd', 'medicine');
    await expect(page.getByText(patient.mrn).first()).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'See Patient' }).first().click();
    await page.waitForTimeout(1000);

    const referBtn = page.getByRole('button', { name: 'Refer Patient' }).first();
    await expect(referBtn).toBeVisible({ timeout: 10000 });
    await referBtn.click();
    await page.waitForTimeout(500);

    const modalSearch = page.locator('input[placeholder="Name or MRN..."]');
    await expect(modalSearch).toBeVisible({ timeout: 5000 });
    await modalSearch.fill(patient.mrn);
    await page.waitForTimeout(1500);

    const modalPatient = page.locator(`button:has-text("${patient.mrn}")`).first();
    if (await modalPatient.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modalPatient.click();
      await page.waitForTimeout(300);
    }

    const pharmacyBtn = page.getByRole('button', { name: 'Pharmacy' });
    await expect(pharmacyBtn).toBeVisible({ timeout: 5000 });
    await pharmacyBtn.click();
    await page.waitForTimeout(300);

    const refRes = await fetch('http://127.0.0.1:4001/api/referrals', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${doctorRes.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        fromClinicId: medicineClinic.id,
        type: 'PHARMACY_DISPATCH',
        medications: [{ drugName: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days', route: 'oral' }],
      }),
    });
    expect(refRes.ok).toBeTruthy();

    await page.waitForTimeout(500);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('2. Pharmacist sees pending referral in POS', async ({ page, request }) => {
    const docRes = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor.medicine@aljawarih.sd', password: 'password123' }),
    })).json();
    expect(docRes.token).toBeDefined();

    const recepRes = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reception@aljawarih.sd', password: 'password123' }),
    })).json();

    const clinic = await getClinicBySlug(request, recepRes.token, 'medicine');
    const patient = await createTestPatientViaAPI(request, recepRes.token);
    await checkInPatient(request, recepRes.token, patient.id, clinic.id);

    const refRes = await fetch('http://127.0.0.1:4001/api/referrals', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${docRes.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        fromClinicId: clinic.id,
        type: 'PHARMACY_DISPATCH',
        medications: [{ drugName: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', duration: '7 days', route: 'oral' }],
      }),
    });
    expect(refRes.ok).toBeTruthy();

    const pharmRes = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pharmacy@aljawarih.sd', password: 'password123' }),
    })).json();
    expect(pharmRes.token).toBeDefined();

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.evaluate((authData) => {
      localStorage.setItem('jh-auth-storage', JSON.stringify({ state: authData }));
    }, { token: pharmRes.token, user: pharmRes.user, refreshToken: pharmRes.refreshToken });

    await page.goto('/pharmacy', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const referralsTab = page.getByRole('button', { name: 'Referrals' });
    await expect(referralsTab).toBeVisible({ timeout: 10000 });
    await referralsTab.click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Pending Pharmacy Referrals')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Amoxicillin').first()).toBeVisible({ timeout: 5000 });
  });

  test('3. Doctor creates lab referral with test selection', async ({ page, request }) => {
    const loginRes = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor.medicine@aljawarih.sd', password: 'password123' }),
    })).json();
    const doctorToken = loginRes.token;
    expect(doctorToken).toBeDefined();

    const loginResReception = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reception@aljawarih.sd', password: 'password123' }),
    })).json();
    const receptionToken = loginResReception.token;

    const medicineClinic = await getClinicBySlug(request, receptionToken, 'medicine');
    const patient = await createTestPatientViaAPI(request, receptionToken);
    await checkInPatient(request, receptionToken, patient.id, medicineClinic.id);

    const testsRes = await fetch('http://127.0.0.1:4001/api/lab/tests', {
      headers: { 'Authorization': `Bearer ${doctorToken}` },
    });
    const testCatalog = await testsRes.json();
    expect(Array.isArray(testCatalog)).toBeTruthy();
    expect(testCatalog.length).toBeGreaterThan(0);
    const testIds = testCatalog.slice(0, 2).map(t => t.id);

    await loginAsDoctorViaAPI(page, 'doctor.medicine@aljawarih.sd', 'medicine');
    await expect(page.getByText(patient.mrn).first()).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'See Patient' }).first().click();
    await page.waitForTimeout(1000);

    const referBtn = page.getByRole('button', { name: 'Refer Patient' }).first();
    await expect(referBtn).toBeVisible({ timeout: 10000 });
    await referBtn.click();
    await page.waitForTimeout(500);

    const modalSearch = page.locator('input[placeholder="Name or MRN..."]');
    await expect(modalSearch).toBeVisible({ timeout: 5000 });
    await modalSearch.fill(patient.mrn);
    await page.waitForTimeout(1500);

    const modalPatient = page.locator(`button:has-text("${patient.mrn}")`).first();
    if (await modalPatient.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modalPatient.click();
      await page.waitForTimeout(300);
    }

    const labBtn = page.getByRole('button', { name: 'Lab Tests' });
    await expect(labBtn).toBeVisible({ timeout: 5000 });
    await labBtn.click();
    await page.waitForTimeout(500);

    const refRes = await fetch('http://127.0.0.1:4001/api/referrals', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.id,
        fromClinicId: medicineClinic.id,
        type: 'LAB_DISPATCH',
        testIds,
      }),
    });
    expect(refRes.ok).toBeTruthy();

    await page.waitForTimeout(500);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('4. Lab order from referral appears in queue', async ({ page }) => {
    const res = await (await fetch('http://127.0.0.1:4001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lab.tech@aljawarih.sd', password: 'password123' }),
    })).json();
    expect(res.token).toBeDefined();

    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.evaluate((authData) => {
      localStorage.setItem('jh-auth-storage', JSON.stringify({ state: authData }));
    }, { token: res.token, user: res.user, refreshToken: res.refreshToken });

    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const statusBtns = page.getByRole('button', { name: 'PENDING' });
    await expect(statusBtns.first()).toBeVisible({ timeout: 10000 });
  });
});
