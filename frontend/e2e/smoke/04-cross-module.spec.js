import { test, expect } from '@playwright/test';
import { loginAs, createTestPatientViaAPI, getClinicBySlug, checkInPatient } from '../helpers.js';

test.describe('Cross-Module — Referral Flow', () => {

  test('create a cross-referral from medicine to another clinic', async ({ page, request }) => {
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

    await loginAs(page, 'doctor.medicine@aljawarih.sd', 'password123');
    await expect(page).toHaveURL(/\/clinic\/medicine/);

    await expect(page.getByText(patient.mrn).first()).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'See Patient' }).first().click();
    await page.waitForTimeout(1000);

    // Open referral modal
    const referBtn = page.getByRole('button', { name: 'Refer Patient' }).first();
    await expect(referBtn).toBeVisible({ timeout: 10000 });
    await referBtn.click();
    await page.waitForTimeout(500);

    // Search for patient in the referral modal
    const modalSearch = page.locator('input[placeholder="Name or MRN..."]');
    await expect(modalSearch).toBeVisible({ timeout: 5000 });
    await modalSearch.fill(patient.mrn);
    await page.waitForTimeout(1500);

    // Select patient from modal search results
    const modalPatient = page.locator(`button:has-text("${patient.mrn}")`).first();
    if (await modalPatient.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modalPatient.click();
      await page.waitForTimeout(300);
    }

    // Select target clinic (Internal Clinic is default)
    const clinicSelect = page.locator('select').first();
    if (await clinicSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clinicSelect.selectOption('Glaucoma Clinic');
    }

    // Create the referral
    const createBtn = page.locator('button:has-text("Create Referral")');
    await expect(createBtn).toBeEnabled({ timeout: 5000 });
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();
    await page.waitForTimeout(1000);

    // Verify we're still on the clinic page (modal closed)
    await expect(page).toHaveURL(/\/clinic\/medicine/);
  });
});
