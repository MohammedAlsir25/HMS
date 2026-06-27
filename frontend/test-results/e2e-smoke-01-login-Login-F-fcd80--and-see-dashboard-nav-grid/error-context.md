# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\smoke\01-login.spec.js >> Login Flow >> login as receptionist and see dashboard nav grid
- Location: e2e\smoke\01-login.spec.js:6:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "networkidle"

```

# Test source

```ts
  1  | export async function loginAs(page, email, password) {
> 2  |   await page.goto('/login', { waitUntil: 'networkidle' });
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  3  |   await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  4  |   await page.fill('input[type="email"]', email);
  5  |   await page.fill('input[type="password"]', password);
  6  |   await page.click('button[type="submit"]');
  7  |   // After login, wait for main UI to render (navigates via React Router, not browser nav)
  8  |   if (email.includes('reception')) {
  9  |     await page.waitForSelector('text=Welcome', { timeout: 30000 });
  10 |   } else {
  11 |     await page.waitForURL(/\/clinic\//, { timeout: 30000 });
  12 |   }
  13 |   await page.waitForTimeout(500);
  14 | }
  15 | 
  16 | export async function createTestPatientViaAPI(request, token) {
  17 |   const res = await request.post('http://127.0.0.1:4001/api/reception/patients', {
  18 |     headers: {
  19 |       'Authorization': `Bearer ${token}`,
  20 |       'Content-Type': 'application/json',
  21 |     },
  22 |     data: {
  23 |       fullName: `SmokeTest Patient ${Date.now()}`,
  24 |       phone: '0501234567',
  25 |       gender: 'MALE',
  26 |       dateOfBirth: '1985-06-15',
  27 |       diabetesType: 'NONE',
  28 |     },
  29 |   });
  30 |   if (!res.ok()) {
  31 |     const body = await res.text();
  32 |     throw new Error(`createPatient failed (${res.status()}): ${body}`);
  33 |   }
  34 |   return await res.json();
  35 | }
  36 | 
  37 | export async function getClinicBySlug(request, token, slug) {
  38 |   const res = await request.get('http://127.0.0.1:4001/api/clinics', {
  39 |     headers: { 'Authorization': `Bearer ${token}` },
  40 |   });
  41 |   if (!res.ok()) throw new Error(`getClinics failed: ${res.status()}`);
  42 |   const clinics = await res.json();
  43 |   return clinics.find(c => c.slug === slug);
  44 | }
  45 | 
  46 | export async function checkInPatient(request, token, patientId, clinicId) {
  47 |   const res = await request.post('http://127.0.0.1:4001/api/reception/check-in', {
  48 |     headers: {
  49 |       'Authorization': `Bearer ${token}`,
  50 |       'Content-Type': 'application/json',
  51 |     },
  52 |     data: { patientId, clinicId, type: 'WALKIN', visitType: 'NEW_VISIT' },
  53 |   });
  54 |   if (!res.ok()) {
  55 |     const body = await res.text();
  56 |     throw new Error(`checkIn failed (${res.status()}): ${body}`);
  57 |   }
  58 |   const data = await res.json();
  59 |   return data.appointment || data;
  60 | }
  61 | 
```