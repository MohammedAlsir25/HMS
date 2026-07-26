# Phase 14 — Patient Portal: Implementation Brief

**Date:** 2026-07-19  
**Status:** Ready for Tech Lead  
**Complexity:** XL  
**Estimated Tasks:** 15–18  

---

## 1. Phase Goal

Build a patient-facing self-service web portal for appointment booking, medical record access, and online payment — completely separate from the staff admin interface, with its own auth flow, layout, and route prefix (`/portal/*`).

---

## 2. What Already Exists vs What's Needed

| Component | Exists? | Details |
|-----------|---------|---------|
| `Patient` model | YES | `patients` table — `id`, `mrn`, `fullName`, `phone`, `email`, `dateOfBirth`, `gender`, `nationalId`, `hospitalId`. No `PatientUser` model. |
| `PatientUser` model | NO | Must be created. Links patient to portal login credentials. |
| Patient auth (JWT) | NO | Only staff auth exists (`backend/src/middleware/auth.ts`). Patient auth needs separate token flow. |
| Patient portal layout | NO | `04-ui-ux.md:1053-1060` explicitly says "Not yet implemented." |
| Portal frontend directory | NO | `frontend/src/features/` has 22 feature dirs — none are `patient-portal`. |
| Appointment booking (self-service) | NO | `reception/routes/appointments.routes.ts` is staff-only (requires `authenticate` + RBAC). |
| Appointment slot availability | NO | No endpoint to query available time slots per doctor/clinic. |
| Medical records view (read-only) | NO | `ClinicalRecord`, `DiagnosticOrder`, `Medication` models exist but all endpoints are staff-auth-protected. |
| Invoice/Billing view | YES (partial) | `Invoice` model exists (`invoices` table) with `patientId`, `paymentStatus`, `amountPaid`. Staff endpoints exist. Patient-facing read endpoints needed. |
| Payment gateway stub | NO | No payment integration exists. `Transaction` model uses `PaymentMethod` enum (CASH/CARD/INSURANCE/BANK_TRANSFER). |
| Notification preferences | NO | `Notification` model exists for in-app staff notifications. Patient notification preferences needed. |
| Public routes (unauthenticated) | MINIMAL | Only `GET /reception/waiting-room` is public. Everything else requires JWT. |

---

## 3. Key Architectural Decisions

### Decision 1: PatientUser Model — Separate Table (Recommended)

**Approach:** New `PatientUser` table linked to existing `Patient` via `patientId`.

**Rationale:** Patients have different auth needs (MRN-based registration, phone verification) vs staff (admin-created accounts). A separate table keeps concerns clean, avoids polluting the `Patient` model with auth fields, and allows independent session/token management.

```prisma
model PatientUser {
  id           String    @id @default(uuid())
  patientId    String    @unique
  patient      Patient   @relation(fields: [patientId], references: [id])
  email        String
  passwordHash String
  phone        String
  isVerified   Boolean   @default(false)
  isActive     Boolean   @default(true)
  lastLogin    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### Decision 2: Patient Auth Flow

- Separate JWT secret (`PATIENT_JWT_SECRET`) or same secret with `type: "patient"` claim
- Separate middleware (`authenticatePatient`) that verifies patient tokens
- Registration: patient enters MRN + phone → SMS code → set password
- Login: email/password → patient JWT token
- Patient token carries: `{ id, patientId, hospitalId, type: "patient" }`

### Decision 3: Portal Layout — Same React App, Different Route Branch

**Approach:** `/portal/*` route prefix within the same React SPA, with its own layout component (`PortalLayout`) that has hospital branding, minimal nav (no sidebar), and mobile-first responsive design.

**Rationale:** Single deployment, shared component library, easier maintenance. The portal layout is visually distinct (simpler, branded, patient-focused).

### Decision 4: Payment Gateway Stub

Create a `PaymentGatewayService` with a `processPayment(invoiceId, amount, method, cardDetails?)` interface. Phase 14 implements the stub that logs the attempt and creates a `Transaction` record. Real Stripe/Moyasar integration deferred to Phase 15+.

### Decision 5: Appointment Availability Logic

New endpoint: `GET /portal/availability?clinicId&date` returns available slots by querying the doctor's assigned clinic, checking existing appointments for that date, and returning open time blocks.

---

## 4. Tasks

### Backend Tasks

| # | Task | File(s) | Complexity | Depends On |
|---|------|---------|-----------|------------|
| B1 | Add `PatientUser` + `PatientNotificationPreference` models + migration | `backend/prisma/schema.prisma` | HIGH | — |
| B2 | Patient auth module: register (MRN+phone), login, refresh, verify | `backend/src/modules/patient-portal/patientAuth.routes.ts` | HIGH | B1 |
| B3 | Patient auth middleware (`authenticatePatient`) | `backend/src/middleware/patientAuth.ts` | MEDIUM | B2 |
| B4 | Portal endpoints: patient profile, update profile | `backend/src/modules/patient-portal/patientProfile.routes.ts` | MEDIUM | B3 |
| B5 | Portal endpoints: list clinics, list doctors per clinic | `backend/src/modules/patient-portal/patientBooking.routes.ts` | MEDIUM | B3 |
| B6 | Portal endpoints: appointment slot availability | `backend/src/modules/patient-portal/patientBooking.routes.ts` | HIGH | B5 |
| B7 | Portal endpoints: book appointment, cancel, reschedule | `backend/src/modules/patient-portal/patientBooking.routes.ts` | HIGH | B6 |
| B8 | Portal endpoints: view appointments (upcoming/past) | `backend/src/modules/patient-portal/patientBooking.routes.ts` | LOW | B3 |
| B9 | Portal endpoints: medical records (consultations, prescriptions, labs) read-only | `backend/src/modules/patient-portal/patientRecords.routes.ts` | MEDIUM | B3 |
| B10 | Portal endpoints: invoices & payment history | `backend/src/modules/patient-portal/patientBilling.routes.ts` | MEDIUM | B3 |
| B11 | Portal endpoints: pay invoice (gateway stub) | `backend/src/modules/patient-portal/patientBilling.routes.ts` | HIGH | B10 |
| B12 | Portal endpoints: notification preferences CRUD | `backend/src/modules/patient-portal/patientNotifications.routes.ts` | LOW | B1 |
| B13 | Mount portal routes in `app.ts` under `/api/portal/*` | `backend/src/app.ts` | LOW | B2–B12 |

### Frontend Tasks

| # | Task | File(s) | Complexity | Depends On |
|---|------|---------|-----------|------------|
| F1 | Portal layout (`PortalLayout`) — header with hospital logo, footer, no sidebar | `frontend/src/features/patient-portal/components/PortalLayout.jsx` | MEDIUM | — |
| F2 | Portal auth store + API client (separate from staff authStore) | `frontend/src/features/patient-portal/store/patientAuthStore.ts`, `api/patientApi.js` | MEDIUM | B2 |
| F3 | Portal login page | `frontend/src/features/patient-portal/pages/PortalLoginPage.jsx` | LOW | F2 |
| F4 | Portal registration page (MRN + phone verification + password) | `frontend/src/features/patient-portal/pages/PortalRegisterPage.jsx` | MEDIUM | F2 |
| F5 | Portal dashboard (welcome, upcoming appointments, recent results) | `frontend/src/features/patient-portal/pages/PortalDashboardPage.jsx` | MEDIUM | F2 |
| F6 | Appointment booking flow (select clinic → doctor → date → slot → confirm) | `frontend/src/features/patient-portal/pages/BookAppointmentPage.jsx` | HIGH | B5–B7 |
| F7 | Appointment management (list, cancel, reschedule) | `frontend/src/features/patient-portal/pages/MyAppointmentsPage.jsx` | MEDIUM | B8 |
| F8 | Medical records view (tabbed: consultations, prescriptions, labs) | `frontend/src/features/patient-portal/pages/MedicalRecordsPage.jsx` | MEDIUM | B9 |
| F9 | Billing page (invoices list, pay button, payment history) | `frontend/src/features/patient-portal/pages/BillingPage.jsx` | MEDIUM | B10–B11 |
| F10 | Profile page (view/edit personal info) | `frontend/src/features/patient-portal/pages/ProfilePage.jsx` | LOW | B4 |
| F11 | Portal route config + React Router setup (`/portal/*`) | `frontend/src/app/router.js` (modify) | MEDIUM | F1–F10 |
| F12 | Portal i18n keys (en + ar) | `frontend/src/i18n/locales/en/patientPortal.json`, `ar/patientPortal.json` | LOW | — |

---

## 5. Acceptance Criteria

- [ ] Patient can register with MRN + phone, set password, and log in to `/portal`
- [ ] Patient can browse clinics and doctors, see available slots for a given date
- [ ] Patient can book an appointment — appointment appears in staff Reception queue
- [ ] Patient can view upcoming and past appointments, cancel or reschedule
- [ ] Patient can view consultation history, prescriptions, and lab results (read-only)
- [ ] Patient can view invoices, see payment status, and "pay" via gateway stub
- [ ] Patient can update their profile (phone, email, address)
- [ ] Patient can set notification preferences (email/SMS toggles)
- [ ] All portal data is hospital-scoped (multi-tenant)
- [ ] Portal layout is visually distinct from admin — hospital-branded, mobile-first
- [ ] Staff auth and patient auth are completely isolated (separate tokens, separate middleware)
- [ ] No patient portal data leaks into staff endpoints and vice versa

---

## 6. Work Split

### Senior Developer (B1–B11, F11)
- PatientUser model + migration (B1)
- Patient auth module (B2, B3) — **highest risk, must be solid**
- All portal API endpoints (B4–B12)
- Route mounting (B13)
- Frontend routing setup (F11)

### Junior Developer (F1–F10, F12)
- Portal layout + login/register pages (F1–F4)
- Dashboard, booking flow, records, billing pages (F5–F10)
- i18n keys (F12)

---

## 7. Files Likely Impacted

### New Files
```
backend/prisma/migrations/..._phase_14_patient_portal/migration.sql
backend/src/modules/patient-portal/patientAuth.routes.ts
backend/src/modules/patient-portal/patientProfile.routes.ts
backend/src/modules/patient-portal/patientBooking.routes.ts
backend/src/modules/patient-portal/patientRecords.routes.ts
backend/src/modules/patient-portal/patientBilling.routes.ts
backend/src/modules/patient-portal/patientNotifications.routes.ts
backend/src/middleware/patientAuth.ts
backend/src/schemas/patientPortal.schema.ts
frontend/src/features/patient-portal/components/PortalLayout.jsx
frontend/src/features/patient-portal/store/patientAuthStore.ts
frontend/src/features/patient-portal/api/patientApi.js
frontend/src/features/patient-portal/pages/PortalLoginPage.jsx
frontend/src/features/patient-portal/pages/PortalRegisterPage.jsx
frontend/src/features/patient-portal/pages/PortalDashboardPage.jsx
frontend/src/features/patient-portal/pages/BookAppointmentPage.jsx
frontend/src/features/patient-portal/pages/MyAppointmentsPage.jsx
frontend/src/features/patient-portal/pages/MedicalRecordsPage.jsx
frontend/src/features/patient-portal/pages/BillingPage.jsx
frontend/src/features/patient-portal/pages/ProfilePage.jsx
frontend/src/i18n/locales/en/patientPortal.json
frontend/src/i18n/locales/ar/patientPortal.json
```

### Modified Files
```
backend/prisma/schema.prisma            (PatientUser + PatientNotificationPreference models)
backend/src/app.ts                       (mount portal routes)
backend/src/lib/prisma.ts               (add PatientUser to tenant models if applicable)
frontend/src/app/router.js              (add /portal/* routes)
frontend/src/i18n/index.ts              (register patientPortal namespace)
```

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **XL phase size** — 15-18 tasks, both backend auth + frontend layout | HIGH | Strict task sequencing. Sr Dev builds auth + all API first. Jr Dev builds UI in parallel once API contract is defined. |
| **Patient auth is a new attack surface** — separate from well-tested staff auth | HIGH | Use same JWT/bcrypt patterns. Rate-limit registration (5/15min). Phone verification before account activation. |
| **Appointment availability logic** — slot calculation, conflict detection, timezone handling | MEDIUM | Query existing appointments for the doctor+date, subtract from clinic operating hours. Use server timezone. |
| **Payment gateway stub** — must not expose real payment processing accidentally | MEDIUM | Stub returns `success: true` but does NOT charge. Clear `TODO` markers. Separate `PATIENT_JWT_SECRET` env var. |
| **Multi-tenancy isolation** — patient portal must not leak data across hospitals | HIGH | All portal queries filter by `hospitalId` from patient JWT. Patient can only see their own data (enforced by `patientId` match). |
| **Portal layout divergence** — must not break existing admin layout | LOW | Portal is entirely new route tree under `/portal/*`. No changes to existing `AppShell` or `StaggeredMenu`. |
| **Mobile responsiveness** — patients will use phones | MEDIUM | Portal pages built mobile-first. Test at 375px width. |

---

## 9. Dependency Graph

```
B1 (Schema)
 ├── B2 (Patient Auth) ──── B3 (Middleware)
 │    ├── B4 (Profile)
 │    ├── B5 (Clinics/Doctors) ──── B6 (Availability) ──── B7 (Book/Cancel/Reschedule)
 │    ├── B8 (List Appointments)
 │    ├── B9 (Medical Records)
 │    ├── B10 (Invoices) ──── B11 (Pay Stub)
 │    └── B12 (Notifications)
 │         └── B13 (Mount Routes)
 │
 └── F12 (i18n keys)

F1 (Layout) + F2 (Auth Store/API) ← depends on B2 API contract
 ├── F3 (Login)
 ├── F4 (Register)
 ├── F5 (Dashboard)
 ├── F6 (Book Appointment) ← depends on B5-B7
 ├── F7 (My Appointments) ← depends on B8
 ├── F8 (Medical Records) ← depends on B9
 ├── F9 (Billing) ← depends on B10-B11
 ├── F10 (Profile) ← depends on B4
 └── F11 (Router setup) ← depends on F1 + all pages
```
