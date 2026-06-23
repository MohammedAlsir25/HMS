import { test, expect } from '@playwright/test';
import { loginAs, createTestPatientViaAPI, getClinicBySlug, checkInPatient } from '../helpers.js';

test.describe('Reception — Patient Intake API Flow', () => {

  test('register patient and check into glaucoma clinic via API', async ({ page, request }) => {
    // Login as receptionist to get auth token
    await loginAs(page, 'reception@aljawahir.ae', 'password123');
    await expect(page).toHaveURL(/\/dashboard/);

    // Get auth token from localStorage
    const storage = await page.evaluate(() => {
      const raw = localStorage.getItem('jh-auth-storage');
      if (!raw) return null;
      try { return JSON.parse(raw).state; } catch { return null; }
    });
    expect(storage).not.toBeNull();
    const token = storage.token;

    // Get glaucoma clinic ID
    const clinic = await getClinicBySlug(request, token, 'glaucoma');
    expect(clinic).not.toBeUndefined();

    // Create a patient via API
    const patient = await createTestPatientViaAPI(request, token);
    expect(patient).toHaveProperty('id');
    expect(patient).toHaveProperty('mrn');
    expect(patient.fullName).toContain('SmokeTest');

    // Check in the patient via API
    const appointment = await checkInPatient(request, token, patient.id, clinic.id);
    expect(appointment).toHaveProperty('id');
    expect(appointment).toHaveProperty('token');
    expect(appointment.status).toBe('WAITING');
    expect(appointment.patient.mrn).toBe(patient.mrn);

    // Verify the glaucoma queue endpoint includes this patient
    const queueRes = await request.get(`http://127.0.0.1:4001/api/reception/queue/${clinic.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(queueRes.ok()).toBeTruthy();
    const queue = await queueRes.json();
    expect(queue.some(a => a.patient.mrn === patient.mrn)).toBeTruthy();
  });
});
