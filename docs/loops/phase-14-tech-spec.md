# Phase 14 — Patient Portal: Technical Specification

**Author:** Tech Lead  
**Date:** 2026-07-19  
**Status:** Ready for Sr Dev + Jr Dev  
**Complexity:** XL  
**Total Tasks:** 25 (13 backend + 12 frontend)

---

## 1. Architecture Decisions

### Decision 1: PatientUser Model — Separate Table

**Chosen:** Separate `PatientUser` table (NOT extending Patient).

**Rationale:** The existing `Patient` model is a pure clinical entity (MRN, demographics, clinical data). Auth concerns (passwords, tokens, verification status) are orthogonal. Separate table allows:
- Independent lifecycle (patient record exists before portal account, portal account can be deactivated without deleting patient)
- Different unique constraints (`email` unique per hospital on PatientUser vs `nationalId` global unique on Patient)
- No migration risk to 60+ existing queries that reference `Patient`

### Decision 2: Patient Auth — Separate JWT Secret + Separate Middleware

**Chosen:** Dedicated `PATIENT_JWT_SECRET` env var + dedicated `authenticatePatient` middleware.

**Rationale:** Patient tokens carry `{ id, patientId, hospitalId, type: "patient" }` — fundamentally different shape from staff tokens `{ id, role, permissions, hospitalId }`. Using a separate secret means:
- A stolen patient token cannot be used against staff endpoints (different signing key)
- Staff `authenticate` middleware remains untouched — zero regression risk
- Clear security boundary for audit/compliance

**Token payload shape:**
```json
{
  "sub": "patient-user-uuid",
  "patientId": "patient-uuid",
  "hospitalId": "hospital-uuid",
  "type": "patient",
  "iat": 1679900000,
  "exp": 1679900900
}
```

**No RBAC for patients.** All patient endpoints just verify `patientId` from token and ensure it matches the resource being accessed. A patient can only see THEIR OWN data.

### Decision 3: Portal Layout — Same React App, Separate Route Branch

**Chosen:** `/portal/*` routes within the existing React SPA, with a dedicated `PortalLayout` component.

**Rationale:** Single deployment, shared component library (reuse `Button`, `Card`, etc. from `components/ui/`). Portal layout is visually distinct:
- Hospital-branded header with logo (no sidebar nav)
- Mobile-first responsive design
- Footer with hospital contact info
- No `AppShell` import (avoids pulling sidebar/header staff bundle)

**Detection in App.jsx:** Add portal routes BEFORE the staff catch-all. The `/portal/*` route tree uses its own layout wrapper, not `ProtectedRoute` + `AppShell`.

### Decision 4: Payment Gateway Stub

**Chosen:** `PaymentGateway` utility class with `processPayment()` that simulates card processing.

**Behavior:**
- Accepts `{ invoiceId, amount, cardLast4, cardExpMonth, cardExpYear }`
- 90% success rate simulation (random)
- Returns `{ success: boolean, transactionId: string, message: string }`
- On success: creates `Transaction` record with `paymentMethod: CARD`
- On failure: returns error, no DB change
- Clear `// TODO: Replace with real Stripe/Moyasar integration` markers

### Decision 5: Appointment Slot Availability

**Chosen:** New public endpoint `GET /api/portal/availability` that returns open slots for a given clinic + date.

**Logic:**
1. Query `User` (doctors) assigned to the given clinic (`clinicId`)
2. For each doctor, determine working hours (default 9:00–17:00, 30-min slots)
3. Query existing `Appointment` records for that doctor + date where status NOT IN (`CANCELLED`, `NO_SHOW`)
4. Subtract booked slots from available slots
5. Return array of `{ doctorId, doctorName, slots: [{ time: "09:00", available: true }, ...] }`

### Decision 6: Notification Preferences

**Chosen:** New `PatientNotificationPreference` model per patient.

```prisma
model PatientNotificationPreference {
  id                    String   @id @default(uuid())
  patientUserId         String   @unique
  appointmentReminders  Boolean  @default(true)
  labResultsReady       Boolean  @default(true)
  paymentDueReminders   Boolean  @default(true)
  generalUpdates        Boolean  @default(true)
  emailEnabled          Boolean  @default(true)
  smsEnabled            Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  patientUser           PatientUser @relation(fields: [patientUserId], references: [id], onDelete: Cascade)
  hospitalId            String?
  hospital              Hospital?  @relation(fields: [hospitalId], references: [id])

  @@index([patientUserId])
  @@index([hospitalId])
  @@map("patient_notification_preferences")
}
```

---

## 2. Data Contracts

**Base URL:** `/api/portal`  
**Auth header:** `Authorization: Bearer <patient_token>`

All responses follow the existing TRD format:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

### 2.1 Auth Endpoints

#### `POST /api/portal/auth/register`
**Public.** Register a new portal account linked to an existing patient.

**Request:**
```json
{
  "mrn": "MRN-2026-00001",
  "phone": "+966501234567",
  "email": "patient@example.com",
  "password": "SecurePass123!",
  "otpCode": "123456"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "patient": {
      "id": "uuid",
      "fullName": "John Doe",
      "mrn": "MRN-2026-00001",
      "email": "patient@example.com",
      "phone": "+966501234567"
    }
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` — invalid input
- `404 NOT_FOUND` — MRN not found in this hospital
- `409 CONFLICT` — email already registered
- `422 UNVERIFIED` — OTP code invalid (stub: accept "123456")

#### `POST /api/portal/auth/login`
**Public.**

**Request:**
```json
{
  "email": "patient@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "patient": {
      "id": "uuid",
      "fullName": "John Doe",
      "mrn": "MRN-2026-00001",
      "email": "patient@example.com",
      "phone": "+966501234567"
    }
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` — invalid credentials
- `403 FORBIDDEN` — account deactivated

#### `POST /api/portal/auth/forgot-password`
**Public.**

**Request:**
```json
{ "email": "patient@example.com" }
```

**Response (200):**
```json
{ "success": true, "data": { "message": "If an account exists, a reset link has been sent" } }
```

#### `POST /api/portal/auth/reset-password`
**Public.**

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{ "success": true, "data": { "message": "Password reset successful" } }
```

#### `POST /api/portal/auth/refresh`
**Authenticated (patient token).**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token...",
    "expiresIn": "7d"
  }
}
```

---

### 2.2 Profile Endpoints

#### `GET /api/portal/profile`
**Authenticated.** Returns the authenticated patient's profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "patient-uuid",
    "fullName": "John Doe",
    "mrn": "MRN-2026-00001",
    "email": "patient@example.com",
    "phone": "+966501234567",
    "dateOfBirth": "1990-01-15T00:00:00.000Z",
    "gender": "MALE",
    "nationalId": "1234567890",
    "address": "123 Main St, Riyadh",
    "chronicConditions": ["Diabetes Type 2"],
    "createdAt": "2025-06-01T10:00:00.000Z"
  }
}
```

#### `PATCH /api/portal/profile`
**Authenticated.**

**Request:**
```json
{
  "email": "newemail@example.com",
  "phone": "+966509876543",
  "address": "456 New St, Riyadh"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "patient-uuid",
    "fullName": "John Doe",
    "mrn": "MRN-2026-00001",
    "email": "newemail@example.com",
    "phone": "+966509876543",
    "address": "456 New St, Riyadh",
    "dateOfBirth": "1990-01-15T00:00:00.000Z",
    "gender": "MALE",
    "nationalId": "1234567890",
    "chronicConditions": ["Diabetes Type 2"],
    "createdAt": "2025-06-01T10:00:00.000Z"
  }
}
```

#### `POST /api/portal/profile/change-password`
**Authenticated.**

**Request:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200):**
```json
{ "success": true, "data": { "message": "Password changed successfully" } }
```

---

### 2.3 Appointment Endpoints

#### `GET /api/portal/clinics`
**Authenticated.** List active clinics for the hospital (for booking flow).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "clinics": [
      {
        "id": "clinic-uuid",
        "name": "Medicine",
        "slug": "medicine",
        "type": "MEDICINE",
        "consultationFee": 200.00,
        "followUpFee": 150.00
      },
      {
        "id": "clinic-uuid-2",
        "name": "Optometry",
        "slug": "optometry",
        "type": "OPTOMETRY",
        "consultationFee": 150.00,
        "followUpFee": 100.00
      }
    ]
  }
}
```

#### `GET /api/portal/clinics/:clinicId/doctors`
**Authenticated.** List doctors in a specific clinic.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": "user-uuid",
        "fullName": "Dr. Ahmed Ali",
        "specialty": "Internal Medicine"
      }
    ]
  }
}
```

#### `GET /api/portal/availability?clinicId=...&date=2026-07-20`
**Authenticated.** Get available slots for a clinic on a specific date.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-07-20",
    "clinicId": "clinic-uuid",
    "doctors": [
      {
        "doctorId": "user-uuid",
        "doctorName": "Dr. Ahmed Ali",
        "slots": [
          { "time": "09:00", "available": true },
          { "time": "09:30", "available": false },
          { "time": "10:00", "available": true },
          { "time": "10:30", "available": true },
          { "time": "11:00", "available": true },
          { "time": "11:30", "available": false },
          { "time": "14:00", "available": true },
          { "time": "14:30", "available": true },
          { "time": "15:00", "available": true },
          { "time": "15:30", "available": true },
          { "time": "16:00", "available": true },
          { "time": "16:30", "available": true }
        ]
      }
    ]
  }
}
```

#### `POST /api/portal/appointments`
**Authenticated.** Book a new appointment.

**Request:**
```json
{
  "clinicId": "clinic-uuid",
  "doctorId": "user-uuid",
  "date": "2026-07-20",
  "time": "10:00",
  "visitType": "NEW_VISIT",
  "notes": "Annual checkup"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "appointment": {
      "id": "appt-uuid",
      "date": "2026-07-20",
      "time": "10:00",
      "doctor": "Dr. Ahmed Ali",
      "clinic": "Medicine",
      "status": "RESERVED",
      "type": "RESERVATION",
      "visitType": "NEW_VISIT",
      "token": 42
    }
  }
}
```

**Errors:**
- `409 CONFLICT` — slot already booked
- `400 VALIDATION_ERROR` — invalid date/time

#### `GET /api/portal/appointments`
**Authenticated.** List patient's appointments.

**Query params:** `?status=upcoming|past|all` (default: `upcoming`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "appt-uuid",
        "date": "2026-07-20",
        "time": "10:00",
        "doctor": "Dr. Ahmed Ali",
        "clinic": "Medicine",
        "status": "RESERVED",
        "type": "RESERVATION",
        "visitType": "NEW_VISIT",
        "token": 42,
        "notes": "Annual checkup",
        "createdAt": "2026-07-15T08:00:00.000Z"
      }
    ]
  }
}
```

#### `PATCH /api/portal/appointments/:id/cancel`
**Authenticated.** Cancel a patient's own appointment.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appointment": {
      "id": "appt-uuid",
      "status": "CANCELLED"
    }
  }
}
```

#### `PATCH /api/portal/appointments/:id/reschedule`
**Authenticated.** Reschedule to a new slot.

**Request:**
```json
{
  "date": "2026-07-22",
  "time": "11:00"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appointment": {
      "id": "appt-uuid",
      "date": "2026-07-22",
      "time": "11:00",
      "status": "RESERVED"
    }
  }
}
```

---

### 2.4 Medical Records Endpoints

#### `GET /api/portal/records/consultations`
**Authenticated.** List patient's clinical records (read-only).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "consultations": [
      {
        "id": "record-uuid",
        "encounterDate": "2026-06-15T10:00:00.000Z",
        "clinic": "Medicine",
        "diagnosis": "Hypertension, essential",
        "doctor": "Dr. Ahmed Ali",
        "notes": "BP elevated, continue medication",
        "vitalSigns": {
          "bloodPressureSystolic": 145,
          "bloodPressureDiastolic": 92,
          "heartRate": 78,
          "temperature": 36.8,
          "spo2": 98,
          "weight": 82.5
        },
        "medications": [
          {
            "drugName": "Amlodipine",
            "dosage": "5mg",
            "frequency": "Once daily",
            "duration": "3 months",
            "route": "Oral"
          }
        ],
        "symptoms": [
          {
            "name": "Headache",
            "severity": 3,
            "duration": "2 days"
          }
        ]
      }
    ]
  }
}
```

#### `GET /api/portal/records/lab-results`
**Authenticated.** List patient's lab results (completed orders with test values).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "labResults": [
      {
        "orderId": "order-uuid",
        "orderDate": "2026-06-10T09:00:00.000Z",
        "completedAt": "2026-06-11T14:00:00.000Z",
        "status": "COMPLETED",
        "clinic": "Medicine",
        "tests": [
          {
            "testName": "Fasting Blood Glucose",
            "value": "126",
            "unit": "mg/dL",
            "refRange": "70-100",
            "flag": "HIGH",
            "isAbnormal": true
          },
          {
            "testName": "HbA1c",
            "value": "7.2",
            "unit": "%",
            "refRange": "<5.7",
            "flag": "HIGH",
            "isAbnormal": true
          }
        ]
      }
    ]
  }
}
```

#### `GET /api/portal/records/prescriptions`
**Authenticated.** List patient's prescriptions (from Medication records).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "prescriptions": [
      {
        "id": "medication-uuid",
        "drugName": "Amlodipine",
        "dosage": "5mg",
        "frequency": "Once daily",
        "duration": "3 months",
        "route": "Oral",
        "notes": "Take in the morning",
        "prescribedDate": "2026-06-15T10:00:00.000Z",
        "clinic": "Medicine",
        "doctor": "Dr. Ahmed Ali"
      }
    ]
  }
}
```

#### `GET /api/portal/records/imaging`
**Authenticated.** List patient's imaging orders with results.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "imagingOrders": [
      {
        "id": "order-uuid",
        "scanType": "B_SCAN",
        "status": "COMPLETED",
        "orderDate": "2026-06-12T11:00:00.000Z",
        "completedAt": "2026-06-13T15:00:00.000Z",
        "clinic": "Imaging",
        "findings": "Normal posterior segment bilaterally",
        "impression": "No evidence of retinal pathology"
      }
    ]
  }
}
```

---

### 2.5 Billing Endpoints

#### `GET /api/portal/billing/invoices`
**Authenticated.** List patient's invoices.

**Query params:** `?status=pending|paid|all` (default: `pending`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "invoice-uuid",
        "invoiceNumber": "INV-2026-00042",
        "date": "2026-06-15T10:00:00.000Z",
        "subtotal": 200.00,
        "discount": 0,
        "tax": 30.00,
        "total": 230.00,
        "amountPaid": 0,
        "amountDue": 230.00,
        "paymentStatus": "Pending",
        "items": [
          {
            "description": "Consultation - Medicine",
            "quantity": 1,
            "unitPrice": 200.00,
            "total": 200.00
          }
        ]
      }
    ]
  }
}
```

#### `POST /api/portal/billing/pay`
**Authenticated.** Process payment for an invoice (gateway stub).

**Request:**
```json
{
  "invoiceId": "invoice-uuid",
  "amount": 230.00,
  "cardLast4": "4242",
  "cardExpMonth": 12,
  "cardExpYear": 2028
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "transactionId": "txn-uuid",
      "invoiceId": "invoice-uuid",
      "amount": 230.00,
      "status": "SUCCESS",
      "message": "Payment processed successfully",
      "receiptUrl": null
    }
  }
}
```

**Response (402 — Payment Failed):**
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment was declined. Please try again."
  }
}
```

#### `GET /api/portal/billing/history`
**Authenticated.** List patient's payment history (transactions).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "txn-uuid",
        "amount": 230.00,
        "paymentMethod": "CARD",
        "description": "Payment for INV-2026-00042",
        "createdAt": "2026-07-19T10:00:00.000Z",
        "invoiceNumber": "INV-2026-00042"
      }
    ]
  }
}
```

---

### 2.6 Notification Preferences Endpoints

#### `GET /api/portal/notifications/preferences`
**Authenticated.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "appointmentReminders": true,
      "labResultsReady": true,
      "paymentDueReminders": true,
      "generalUpdates": true,
      "emailEnabled": true,
      "smsEnabled": true
    }
  }
}
```

#### `PATCH /api/portal/notifications/preferences`
**Authenticated.**

**Request:**
```json
{
  "appointmentReminders": false,
  "emailEnabled": true,
  "smsEnabled": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "appointmentReminders": false,
      "labResultsReady": true,
      "paymentDueReminders": true,
      "generalUpdates": true,
      "emailEnabled": true,
      "smsEnabled": false
    }
  }
}
```

---

### 2.7 Portal Admin Endpoints (Staff-accessible)

These are behind staff `authenticate` + `requirePermission('admin:users')`.

#### `GET /api/portal/admin/stats`
**Staff authenticated.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRegisteredPatients": 342,
    "activePatientsLast30Days": 128,
    "appointmentsBookedViaPortal": 87,
    "onlinePaymentsProcessed": 45,
    "totalOnlineRevenue": 12450.00
  }
}
```

#### `GET /api/portal/admin/settings`
**Staff authenticated.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "portalEnabled": true,
      "selfBookingEnabled": true,
      "onlinePaymentEnabled": true,
      "medicalRecordsVisible": true,
      "maxAdvanceBookingDays": 30,
      "cancellationPolicyHours": 24
    }
  }
}
```

#### `PATCH /api/portal/admin/settings`
**Staff authenticated.**

**Request:**
```json
{
  "portalEnabled": true,
  "maxAdvanceBookingDays": 14
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "portalEnabled": true,
      "selfBookingEnabled": true,
      "onlinePaymentEnabled": true,
      "medicalRecordsVisible": true,
      "maxAdvanceBookingDays": 14,
      "cancellationPolicyHours": 24
    }
  }
}
```

---

## 3. Work Split

### Senior Developer — Backend (13 Tasks)

| Task | Description | Files | Depends On | Complexity |
|------|-------------|-------|------------|------------|
| **T1** | PatientUser + PatientNotificationPreference models + migration | `backend/prisma/schema.prisma`, migration SQL | — | HIGH |
| **T2** | Patient auth: register (MRN+phone+OTP stub), login, forgot-password, reset-password, refresh | `backend/src/modules/patient-portal/patientAuth.routes.ts`, `patientAuth.controller.ts`, `patientAuth.service.ts`, `patientAuth.validation.ts` | T1 | HIGH |
| **T3** | Patient auth middleware (`authenticatePatient`) | `backend/src/middleware/patientAuth.ts` | T2 | MEDIUM |
| **T4** | Patient profile: get, update, change password | `backend/src/modules/patient-portal/patientProfile.routes.ts`, controller, service | T3 | MEDIUM |
| **T5** | Portal clinics/doctors list endpoints | `backend/src/modules/patient-portal/patientBooking.routes.ts` | T3 | LOW |
| **T6** | Appointment slot availability endpoint (logic-heavy) | `patientBooking.routes.ts` | T5 | HIGH |
| **T7** | Book appointment, cancel, reschedule endpoints | `patientBooking.routes.ts` | T6 | HIGH |
| **T8** | List patient appointments (upcoming/past) | `patientBooking.routes.ts` | T3 | LOW |
| **T9** | Medical records: consultations, lab results, prescriptions, imaging (read-only) | `backend/src/modules/patient-portal/patientRecords.routes.ts`, controller, service | T3 | MEDIUM |
| **T10** | Billing: list invoices, payment history | `backend/src/modules/patient-portal/patientBilling.routes.ts`, controller, service | T3 | MEDIUM |
| **T11** | Pay invoice (PaymentGateway stub + Transaction creation) | `patientBilling.routes.ts` + `backend/src/lib/paymentGateway.ts` | T10 | HIGH |
| **T12** | Notification preferences CRUD | `backend/src/modules/patient-portal/patientNotifications.routes.ts` | T1 | LOW |
| **T13** | Portal admin: stats + settings + mount all portal routes in `app.ts` | `backend/src/modules/patient-portal/patientAdmin.routes.ts`, `backend/src/app.ts` | T2–T12 | MEDIUM |

### Junior Developer — Frontend (12 Tasks)

| Task | Description | Files | Depends On | Complexity |
|------|-------------|-------|------------|------------|
| **T14** | Portal layout (header with logo, footer, no sidebar, mobile-first) | `frontend/src/features/patient-portal/components/PortalLayout.jsx` | — | MEDIUM |
| **T15** | Patient auth store + API client (separate from staff auth) | `frontend/src/features/patient-portal/store/patientAuthStore.js`, `api/patientApi.js` | T2 contract | MEDIUM |
| **T16** | Portal login + register + password reset pages | `frontend/src/features/patient-portal/pages/PortalLoginPage.jsx`, `PortalRegisterPage.jsx`, `PortalForgotPasswordPage.jsx` | T15 | MEDIUM |
| **T17** | Portal dashboard (welcome, upcoming appointments, recent results) | `frontend/src/features/patient-portal/pages/PortalDashboardPage.jsx` | T15 | MEDIUM |
| **T18** | Appointment booking flow (clinic → doctor → date → slot → confirm) | `frontend/src/features/patient-portal/pages/BookAppointmentPage.jsx` | T5–T7 contract | HIGH |
| **T19** | Appointment management (list, cancel, reschedule) | `frontend/src/features/patient-portal/pages/MyAppointmentsPage.jsx` | T8 contract | MEDIUM |
| **T20** | Medical records page (tabbed: consultations, labs, prescriptions, imaging) | `frontend/src/features/patient-portal/pages/MedicalRecordsPage.jsx` | T9 contract | MEDIUM |
| **T21** | Billing page (invoices list + pay button + payment history) | `frontend/src/features/patient-portal/pages/BillingPage.jsx` | T10–T11 contract | MEDIUM |
| **T22** | Profile page + notification settings | `frontend/src/features/patient-portal/pages/ProfilePage.jsx` | T4, T12 contracts | LOW |
| **T23** | Portal route config + React Router setup in App.jsx | `frontend/src/app/App.jsx` (modify), portal routes config | T14–T22 | MEDIUM |
| **T24** | Portal i18n keys (en + ar) | `frontend/src/i18n/locales/en/patientPortal.json`, `ar/patientPortal.json`, `i18n/index.ts` (modify) | — | LOW |
| **T25** | Portal admin page (staff-facing portal stats + settings) | `frontend/src/features/patient-portal/pages/PortalAdminPage.jsx` | T13 contract | LOW |

---

## 4. Data Flow Diagrams

### 4.1 Patient Registration → Login → Dashboard

```
┌─────────────┐     POST /portal/auth/register      ┌──────────────┐
│  Patient     │ ──────── {mrn,phone,email,pass} ──→ │  Backend     │
│  Browser     │                                     │              │
│              │ ←── {token, patient} ─────────────── │  1. Find Patient by MRN+hospitalId
│              │                                     │  2. Create PatientUser (link to Patient)
│              │     POST /portal/auth/login          │  3. Sign JWT (patient payload)
│              │ ──────── {email, password} ────────→ │  4. Return token + patient info
│              │                                     │
│              │ ←── {token, patient} ─────────────── │
│              │                                     │
│              │     GET /portal/profile              │
│              │ ──────── Bearer <token> ──────────→ │
│              │                                     │
│              │ ←── {patient profile} ────────────── │  5. authenticatePatient middleware
│              │                                     │  6. Fetch Patient by patientId from JWT
│              │     GET /portal/appointments         │  7. Return profile
│              │ ──────── Bearer <token> ──────────→ │
│              │                                     │
│              │ ←── {appointments} ───────────────── │  8. Query Appointments WHERE patientId
│              │                                     │
│  ┌───────────┤     RENDER DASHBOARD                 │
│  │ Dashboard │                                     │
│  │ - Welcome │                                     │
│  │ - Next    │                                     │
│  │   Appt    │                                     │
│  │ - Recent  │                                     │
│  │   Results │                                     │
│  └───────────┘                                     │
└─────────────┘                                     └──────────────┘
```

### 4.2 Appointment Booking Flow

```
Patient Browser                 Backend                    Database
     │                             │                          │
     │  GET /portal/clinics        │                          │
     │ ──────────────────────────→ │ SELECT * FROM Clinic     │
     │ ←── {clinics: [...]} ────── │ WHERE hospitalId = :h   │
     │                             │ AND isActive = true      │
     │                             │                          │
     │  GET /portal/clinics/:id/   │                          │
     │       doctors               │                          │
     │ ──────────────────────────→ │ SELECT u FROM User u     │
     │ ←── {doctors: [...]} ────── │ JOIN Clinic c            │
     │                             │ WHERE c.id = :clinicId   │
     │                             │                          │
     │  GET /portal/availability   │                          │
     │     ?clinicId=X&date=Y      │                          │
     │ ──────────────────────────→ │ 1. Get doctors for clinic│
     │                             │ 2. Get booked slots      │
     │                             │    SELECT FROM Appointment│
     │                             │    WHERE doctorId IN (..) │
     │                             │    AND date = :date       │
     │                             │    AND status != CANCELLED│
     │                             │ 3. Compute available slots│
     │ ←── {doctors: [{slots}]} ── │                          │
     │                             │                          │
     │  POST /portal/appointments  │                          │
     │ ──────────────────────────→ │ 1. Validate slot available│
     │  {clinicId, doctorId,       │ 2. Get next token number │
     │   date, time, visitType}    │    for clinic+date       │
     │                             │ 3. INSERT INTO Appointment│
     │ ←── {appointment} ──────── │    status=RESERVED        │
     │                             │    type=RESERVATION       │
     │                             │                          │
```

### 4.3 Payment Flow

```
Patient Browser                 Backend                     PaymentGateway (Stub)
     │                             │                            │
     │  GET /portal/billing/       │                            │
     │       invoices              │                            │
     │ ──────────────────────────→ │ SELECT FROM Invoice        │
     │ ←── {invoices: [...]} ───── │ WHERE patientId = :pid    │
     │                             │                            │
     │  POST /portal/billing/pay   │                            │
     │  {invoiceId, amount,        │                            │
     │   cardLast4, cardExp...}    │                            │
     │ ──────────────────────────→ │                            │
     │                             │  1. Validate invoice owned │
     │                             │     by this patient        │
     │                             │  2. Call gateway stub ───→ │
     │                             │     processPayment()       │
     │                             │                            │
     │                             │  ←── {success: true, ───── │  90% success
     │                             │   transactionId: "txn"}    │  10% failure
     │                             │                            │
     │                             │  3. IF success:            │
     │                             │     UPDATE Invoice         │
     │                             │       amountPaid += amount │
     │                             │       paymentStatus = ...  │
     │                             │     INSERT Transaction     │
     │                             │       type=RECEPTION       │
     │                             │       paymentMethod=CARD   │
     │                             │                            │
     │ ←── {payment: {status}} ─── │  4. Return result          │
     │                             │                            │
```

---

## 5. Exact File List

### New Files — Backend

```
backend/prisma/migrations/YYYYMMDDHHMMSS_phase14_patient_portal/migration.sql
backend/src/modules/patient-portal/patientAuth.routes.ts
backend/src/modules/patient-portal/patientAuth.controller.ts
backend/src/modules/patient-portal/patientAuth.service.ts
backend/src/modules/patient-portal/patientAuth.validation.ts
backend/src/modules/patient-portal/patientProfile.routes.ts
backend/src/modules/patient-portal/patientProfile.controller.ts
backend/src/modules/patient-portal/patientProfile.service.ts
backend/src/modules/patient-portal/patientBooking.routes.ts
backend/src/modules/patient-portal/patientBooking.controller.ts
backend/src/modules/patient-portal/patientBooking.service.ts
backend/src/modules/patient-portal/patientRecords.routes.ts
backend/src/modules/patient-portal/patientRecords.controller.ts
backend/src/modules/patient-portal/patientRecords.service.ts
backend/src/modules/patient-portal/patientBilling.routes.ts
backend/src/modules/patient-portal/patientBilling.controller.ts
backend/src/modules/patient-portal/patientBilling.service.ts
backend/src/modules/patient-portal/patientNotifications.routes.ts
backend/src/modules/patient-portal/patientNotifications.controller.ts
backend/src/modules/patient-portal/patientNotifications.service.ts
backend/src/modules/patient-portal/patientAdmin.routes.ts
backend/src/modules/patient-portal/patientAdmin.controller.ts
backend/src/modules/patient-portal/patientAdmin.service.ts
backend/src/middleware/patientAuth.ts
backend/src/lib/paymentGateway.ts
```

### New Files — Frontend

```
frontend/src/features/patient-portal/components/PortalLayout.jsx
frontend/src/features/patient-portal/store/patientAuthStore.js
frontend/src/features/patient-portal/api/patientApi.js
frontend/src/features/patient-portal/pages/PortalLoginPage.jsx
frontend/src/features/patient-portal/pages/PortalRegisterPage.jsx
frontend/src/features/patient-portal/pages/PortalForgotPasswordPage.jsx
frontend/src/features/patient-portal/pages/PortalDashboardPage.jsx
frontend/src/features/patient-portal/pages/BookAppointmentPage.jsx
frontend/src/features/patient-portal/pages/MyAppointmentsPage.jsx
frontend/src/features/patient-portal/pages/MedicalRecordsPage.jsx
frontend/src/features/patient-portal/pages/BillingPage.jsx
frontend/src/features/patient-portal/pages/ProfilePage.jsx
frontend/src/features/patient-portal/pages/PortalAdminPage.jsx
frontend/src/i18n/locales/en/patientPortal.json
frontend/src/i18n/locales/ar/patientPortal.json
```

### Modified Files

```
backend/prisma/schema.prisma                         (add PatientUser + PatientNotificationPreference models)
backend/src/config/index.ts                          (add patientJwt config)
backend/src/app.ts                                   (mount /api/portal routes)
frontend/src/app/App.jsx                             (add /portal/* route tree)
frontend/src/i18n/index.ts                           (register patientPortal namespace)
```

---

## 6. Pattern References

| Pattern | Reference File | What to Follow |
|---------|---------------|----------------|
| Module structure | `backend/src/modules/auth/auth.routes.ts` | Router → controller → service pattern |
| Auth middleware | `backend/src/middleware/auth.ts` | Same JWT verify pattern, different secret |
| Zod validation | `backend/src/modules/auth/auth.validation.ts` | Schema definition + `validateBody` wrapper |
| Response format | `docs/02-trd.md:589-617` | `{ success, data }` / `{ success, error }` |
| Multi-tenant query | `backend/src/modules/patients/patients.service.ts` | Always filter by `hospitalId` from JWT |
| Frontend store | `frontend/src/stores/authStore.js` | Zustand + persist pattern |
| Frontend API client | `frontend/src/lib/api.js` | Axios instance with interceptors |
| Frontend page | `frontend/src/features/patients/PatientListPage.jsx` | Loading/Empty/Error states |
| i18n keys | `frontend/src/i18n/locales/en/translation.json` | Namespace pattern |
| Route config | `frontend/src/app/App.jsx` | Lazy imports, Suspense fallback |
| Prisma model | `backend/prisma/schema.prisma` (Patient, User) | Field naming, `@@map`, `@@index` |

---

## 7. Key Gotchas

### Auth Isolation
- **Patient auth MUST use `PATIENT_JWT_SECRET`** — never share with staff `JWT_SECRET`
- `authenticatePatient` middleware MUST NOT set `req.user` in the same shape as staff auth — use `req.patient` or a separate type
- Patient token MUST include `type: "patient"` claim — the `authenticatePatient` middleware should verify this

### Route Separation
- All portal API routes: `/api/portal/*` prefix
- All portal frontend routes: `/portal/*` prefix
- Portal routes in `App.jsx` must be placed BEFORE the `*` catch-all but AFTER `/login`
- Portal routes must NOT use `ProtectedRoute` (staff auth) or `AppShell` (staff layout)

### Data Isolation
- Every portal query MUST filter by `hospitalId` from the patient JWT
- Every portal query MUST filter by `patientId` from the patient JWT — a patient can ONLY see their own data
- Never return data from other patients, even within the same hospital

### Frontend Bundle
- `PortalLayout` must NOT import `AppShell`, `Sidebar`, or any staff layout components
- Portal pages import only from `components/ui/` (shared primitives) — never from `features/*/`
- Use separate Zustand store (`patientAuthStore`) — do NOT reuse `authStore`

### Payment Stub
- Gateway stub returns `success: true` 90% of the time, `success: false` 10%
- Must create `Transaction` record on success (reuse existing `Transaction` model)
- Set `paymentMethod: CARD` and link to the invoice
- Add clear TODO comments for real integration

### Appointment Slot Logic
- Default working hours: 09:00–17:00 (configurable per clinic in future)
- 30-minute slot duration (matching existing appointment flow)
- Skip lunch break 12:00–14:00 (standard for Saudi hospitals)
- Account for existing appointments with status NOT IN (CANCELLED, NO_SHOW)

### Config Changes
- Add `patientJwt.secret` to `backend/src/config/index.ts`
- Add `PATIENT_JWT_SECRET` to `backend/.env.example`
- Validate in production like existing JWT secrets

### i18n
- Create `patientPortal.json` namespace (not modify existing `translation.json`)
- Register in `frontend/src/i18n/index.ts` alongside existing namespaces
- All portal pages use `useTranslation('patientPortal')`

### Import Paths
- Frontend features in `frontend/src/features/patient-portal/` must use `../../../components/ui/` (3 levels up)
- NOT `../../components/ui/` (that's for features 2 levels deep)

---

## 8. Env Vars to Add

```bash
# .env.example additions
PATIENT_JWT_SECRET=<random-64-char-hex>        # Separate from staff JWT_SECRET
PATIENT_JWT_EXPIRY=7d                           # Patient token expiry
```

---

## 9. Acceptance Criteria Checklist

- [ ] Patient can register with MRN + phone + OTP (stub: "123456") + email + password
- [ ] Patient can log in with email + password and receive JWT
- [ ] Patient can view their profile, update phone/email/address
- [ ] Patient can change password (requires current password)
- [ ] Patient can browse clinics and doctors
- [ ] Patient can see available slots for a given clinic + date
- [ ] Patient can book an appointment — appears in staff Reception queue with status RESERVED
- [ ] Patient can view upcoming and past appointments
- [ ] Patient can cancel or reschedule their own appointments
- [ ] Patient can view consultation history with vitals, diagnosis, medications
- [ ] Patient can view lab results with abnormal value flags
- [ ] Patient can view prescriptions
- [ ] Patient can view imaging orders with results
- [ ] Patient can view invoices (pending + paid)
- [ ] Patient can "pay" an invoice via card stub (90% success rate)
- [ ] Patient can view payment history
- [ ] Patient can set notification preferences (email/SMS toggles)
- [ ] Portal admin can view portal usage stats (registered patients, online bookings, revenue)
- [ ] Portal admin can toggle portal settings (enabled, self-booking, online payment, etc.)
- [ ] All portal data is hospital-scoped (multi-tenant isolation)
- [ ] All portal data is patient-scoped (patient can only see their own data)
- [ ] Staff auth and patient auth are completely isolated
- [ ] Portal layout is mobile-first and visually distinct from admin
- [ ] No portal imports pollute staff bundle (no AppShell/Sidebar in portal)
- [ ] All pages have loading, empty, and error states
