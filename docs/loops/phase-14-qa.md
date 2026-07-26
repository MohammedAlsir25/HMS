# Phase 14 — Patient Portal: QA Report

**Date:** 2026-07-19  
**Status:** CONDITIONAL PASS (5 critical route mismatches must be fixed)

---

## 1. Acceptance Criteria Results

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | PatientUser model exists with proper relations | ✅ PASS | `PatientUser` model in schema.prisma (line 315) with `patient`, `hospital`, `notificationPreferences` relations. Unique constraint on `[hospitalId, email]`. |
| 2 | Patient auth flow (register → login → token) | ⚠️ PARTIAL | Register and login endpoints exist and return JWT. **Bug:** Registration step 1 calls `POST /portal/auth/forgot-password` which does not exist on backend (only `/reset-password`). |
| 3 | Portal has separate layout (no sidebar) | ✅ PASS | `PortalLayout.jsx` — custom header with hospital branding, mobile menu, footer. Zero imports of `AppShell`, `Sidebar`, or staff layout components. |
| 4 | Appointment booking works (clinic → doctor → slot) | ❌ FAIL | Backend missing routes for `GET /portal/clinics` and `GET /portal/clinics/:id/doctors`. Availability endpoint URL mismatch: frontend calls `/portal/availability`, backend serves at `/portal/appointments/available-slots`. |
| 5 | Medical records timeline aggregates from all sources | ✅ PASS | `medicalRecords.routes.ts` aggregates consultations, lab orders, and imaging orders into a unified timeline sorted by date. |
| 6 | Billing shows invoices + payment stub | ⚠️ PARTIAL | Invoice listing and payment stub logic works. **Bug:** Payment route mismatch — frontend calls `POST /portal/billing/pay`, backend has `POST /portal/billing/invoices/:id/pay`. |
| 7 | All portal routes under `/portal/` prefix | ✅ PASS | All portal frontend routes are under `/portal/*` in App.jsx (line 193-207). |
| 8 | Protected routes redirect to login if not authenticated | ✅ PASS | `ProtectedPortalRoute` (App.jsx:113-118) checks `isAuthenticated` and redirects to `/portal/login`. |
| 9 | Hospital scoping on all portal queries | ⚠️ PARTIAL | Profile, appointments, records, billing queries filter by `patientId` from JWT. **Gap:** `available-slots` endpoint has NO hospital scoping. Admin stats/count have no hospital scoping. |
| 10 | No RBAC on patient endpoints (just patientId verification) | ✅ PASS | All patient endpoints verify `patientId` from token. Admin routes correctly use staff auth (`authenticate` + `requirePermission`). |
| 11 | Separate JWT secret from staff auth | ✅ PASS | Separate `PATIENT_JWT_SECRET` in config (config/index.ts:33-36), dedicated `authenticatePatient` middleware (middleware/authenticatePatient.ts), separate token type claim (`type: "patient"`). |

**Score: 7/11 PASS, 3/11 PARTIAL, 1/11 FAIL**

---

## 2. Code Quality Checklist

### ✅ Passes
- **No JSON.stringify misuse** — only in `usePortalApi.js` fetch wrapper (necessary for `fetch()` body serialization)
- **No comments** in portal JSX files
- **PortalLayout does NOT import AppShell/Sidebar** — zero staff layout contamination
- **Separate auth store** — uses `PortalAuthProvider` with React Context (not Zustand `authStore`)
- **All pages have loading/empty/error states** — verified in Dashboard, Appointments, MedicalRecords, Billing, Profile, Admin pages
- **No portal imports pollute staff bundle** — no cross-feature imports
- **Fragments properly closed** — all JSX fragments correct
- **Import paths correct** — `../../components/ui/` is correct for flat structure (2 levels up)

### ❌ Issues Found

| # | Issue | Severity | File:Line |
|---|-------|----------|-----------|
| 1 | **usePortalAuth.js contained JSX but had `.js` extension** — Vite build failed | **CRITICAL (FIXED)** | `hooks/usePortalAuth.js` → renamed to `.jsx` |
| 2 | **Frontend calls `/portal/auth/forgot-password` — backend has no such route** (only `/reset-password`) | **BUG** | `usePortalApi.js:40` / `auth.routes.ts:118` |
| 3 | **Frontend calls `GET /portal/clinics` — no backend route exists** | **BUG** | `usePortalApi.js:45` |
| 4 | **Frontend calls `GET /portal/clinics/:id/doctors` — no backend route exists** | **BUG** | `usePortalApi.js:46` |
| 5 | **Frontend calls `GET /portal/availability` — backend has `/portal/appointments/available-slots`** | **BUG** | `usePortalApi.js:48` / `appointments.routes.ts:9` |
| 6 | **Frontend calls `POST /portal/billing/pay` — backend has `POST /portal/billing/invoices/:id/pay`** | **BUG** | `usePortalApi.js:59` / `billing.routes.ts:46` |
| 7 | **Frontend calls `GET /portal/notifications/preferences` — backend has `/portal/notification-preferences`** | **BUG** | `usePortalApi.js:61` / `profile.routes.ts:84` |
| 8 | **No i18n files** (`en/patientPortal.json`, `ar/patientPortal.json`) — pages use hardcoded English strings | **MISSING** | `frontend/src/i18n/locales/` |
| 9 | **i18n index.ts not modified** to register `patientPortal` namespace | **MISSING** | `frontend/src/i18n/index.ts` |
| 10 | **`PATIENT_JWT_SECRET` not validated in production** — silently falls back to dev secret | **SECURITY** | `config/index.ts:8-18` |
| 11 | **`available-slots` endpoint has no `authenticatePatient` middleware** — publicly accessible | **SECURITY** | `appointments.routes.ts:9` |
| 12 | **`available-slots` has no hospitalId scoping** — multi-tenancy leak | **SECURITY** | `appointments.routes.ts:9-72` |
| 13 | **Admin stats/count have no hospital scoping** — counts all patients globally | **MINOR** | `admin.routes.ts:38-71` |
| 14 | **No `.env.example` file** exists in backend | **MISSING** | `backend/.env.example` |

---

## 3. Build Status

| Step | Status | Notes |
|------|--------|-------|
| Backend `tsc --noEmit` | ✅ PASS | Clean — zero errors |
| Frontend `tsc --noEmit` | ✅ PASS | Clean — zero errors |
| Frontend `vite build` | ✅ PASS | **After** renaming `usePortalAuth.js` → `.jsx`. Built in 7.41s, 2113 modules transformed |

---

## 4. Bugs Found (Summary)

### Critical (Must Fix Before Release)

1. **5 API route mismatches** — Frontend and backend disagree on URL paths for: clinics listing, doctors listing, availability, payment, and notification preferences. All booking flow, payment, and notification features will 404 at runtime.

2. **usePortalAuth.js JSX syntax** — **FIXED** by renaming to `.jsx`

### Security (Must Fix)

3. **`PATIENT_JWT_SECRET` not production-validated** — App runs in production with fallback dev secret if env var missing.

4. **`available-slots` unauthenticated + unscaled** — Anyone (even unauthenticated) can query doctor availability across all hospitals.

### Missing Features

5. **No i18n files** — All portal pages use hardcoded English strings, no Arabic translation support.

6. **No `.env.example`** — Developers won't know to set `PATIENT_JWT_SECRET`.

---

## 5. Recommendation

### CONDITIONAL PASS

The implementation architecture is solid: clean separation of staff/patient auth, proper React Context for portal state, mobile-first layout, comprehensive route protection, and good loading/empty/error state handling across all pages.

**However, 5 critical API route mismatches will cause runtime failures in the booking, payment, and notification flows.** These must be resolved before the feature can be considered functional.

### Required Fixes (Priority Order)

1. Add backend routes: `GET /portal/clinics`, `GET /portal/clinics/:id/doctors`
2. Align availability URL: either change frontend to `/portal/appointments/available-slots` or add alias route
3. Align payment URL: either change frontend to `/portal/billing/invoices/:id/pay` or add alias route
4. Add `POST /portal/auth/forgot-password` endpoint (or alias to `/reset-password`)
5. Align notification preferences URL path
6. Add `PATIENT_JWT_SECRET` to production config validation
7. Add `authenticatePatient` middleware to `available-slots` route
8. Add hospital scoping to `available-slots` and admin stats endpoints
9. Create i18n files and register namespace
10. Create `.env.example` with `PATIENT_JWT_SECRET`
