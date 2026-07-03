export async function loginAs(page, email, password) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // After login, wait for AppShell header logo (proves main UI rendered)
  await page.waitForSelector('img[alt="Al Jawarih"]', { timeout: 30000 });
  await page.waitForTimeout(500);
}

export async function createTestPatientViaAPI(request, token) {
  const res = await request.post('http://127.0.0.1:4001/api/reception/patients', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      fullName: `SmokeTest Patient ${Date.now()}`,
      phone: '0501234567',
      gender: 'MALE',
      dateOfBirth: '1985-06-15',
      diabetesType: 'NONE',
    },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`createPatient failed (${res.status()}): ${body}`);
  }
  return await res.json();
}

export async function getClinicBySlug(request, token, slug) {
  const res = await request.get('http://127.0.0.1:4001/api/clinics', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok()) throw new Error(`getClinics failed: ${res.status()}`);
  const clinics = await res.json();
  return clinics.find(c => c.slug === slug);
}

export async function checkInPatient(request, token, patientId, clinicId) {
  const res = await request.post('http://127.0.0.1:4001/api/reception/check-in', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { patientId, clinicId, type: 'WALKIN', visitType: 'NEW_VISIT' },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`checkIn failed (${res.status()}): ${body}`);
  }
  const data = await res.json();
  return data.appointment || data;
}
