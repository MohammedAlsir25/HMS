# Phase 15 — Emergency & Triage: Tech Spec

**Date:** 2026-07-19
**Status:** Ready for Implementation
**Author:** Tech Lead

---

## 1. Architecture Decisions

### 1.1 TriageAssessment Model

New Prisma model with `AcuityLevel` enum (1-5 ESI scale). Fields:

- `id` — UUID @id @default(uuid())
- `patientId` — String, FK to Patient
- `acuity` — AcuityLevel enum
- `chiefComplaint` — String
- `triageNotes` — String?
- `vitalSigns` — Json? — stores `{ systolic, diastolic, heartRate, respiratoryRate, temperature, oxygenSaturation }`
- `triageNurseId` — String, FK to User
- `triageTime` — DateTime @default(now())
- `seenByDoctorAt` — DateTime?
- `disposition` — String? — values: `ADMITTED`, `DISCHARGED`, `TRANSFERRED`, `OBSERVATION`
- `hospitalId` — String?
- `createdAt` / `updatedAt`

**AcuityLevel enum:**
```
enum AcuityLevel {
  RESUSCITATION   // 1 — Red
  EMERGENT        // 2 — Orange
  URGENT          // 3 — Yellow
  LESS_URGENT     // 4 — Green
  NON_URGENT      // 5 — Blue
}
```

### 1.2 Rapid Registration

Reuse existing `Patient` model. New endpoint `POST /emergency/register` accepts only:
- `fullName` (required)
- `phone` (optional but used for duplicate lookup)
- `dateOfBirth` (optional)
- `gender` (optional)
- `chiefComplaint` (required — for TriageAssessment)

Logic:
1. If `phone` provided, `findFirst` existing patient by phone + hospitalId
2. If found → return existing patient, create TriageAssessment linked to them
3. If not found → create new Patient with minimal fields + generate MRN, then create TriageAssessment

Calls existing `generateMRN()` from `reception.utils.ts`. All queries filtered by `hospitalId`.

### 1.3 Acuity Color Coding

Backend stores enum value only. Frontend defines shared constant:

```js
export const ACUITY_CONFIG = {
  RESUSCITATION: { level: 1, label: 'Resuscitation', color: 'bg-red-500 text-white', priority: 10 },
  EMERGENT:      { level: 2, label: 'Emergent',      color: 'bg-orange-500 text-white', priority: 8 },
  URGENT:        { level: 3, label: 'Urgent',        color: 'bg-yellow-400 text-yellow-900', priority: 5 },
  LESS_URGENT:   { level: 4, label: 'Less Urgent',   color: 'bg-green-500 text-white', priority: 3 },
  NON_URGENT:    { level: 5, label: 'Non-Urgent',    color: 'bg-blue-500 text-white', priority: 1 },
};
```

### 1.4 Consultation Queue Integration

When triage completes (or on rapid registration), auto-create `Appointment` with:
- `type: WALKIN`
- `priority`: derived from acuity (RESUSCITATION→10, EMERGENT→8, URGENT→5, LESS_URGENT→3, NON_URGENT→1)
- `clinicId`: the emergency clinic (seeded or looked up by slug `'emergency'`)
- `doctorId`: null initially (assigned when doctor picks up)
- `status: WAITING`
- `patientId`, `hospitalId`

Requires that an "Emergency" clinic exists. If not seeded, the endpoint should look up or error.

### 1.5 Rapid Admission

For ESI 1-2 patients, endpoint `POST /emergency/admit` accepts `triageAssessmentId`, `wardId`, `bedId`. Internally calls the same Prisma logic as existing `POST /beds/:id/assign`:
- Set `bed.status = OCCUPIED`, `bed.patientId`, `bed.assignedAt = now()`
- Create `TriageAssessment.disposition = 'ADMITTED'`

Does NOT create an Invoice or run billing logic — emergency bypass.

### 1.6 Emergency Dashboard

Endpoint `GET /emergency/dashboard` returns:
- Patients grouped by acuity level with wait times
- Total patients awaiting triage, in triage, completed today
- Bed availability summary (reuse ward dashboard data or query Bed model)

---

## 2. Data Contracts

### 2.1 `POST /emergency/register`

**Request:**
```json
{
  "fullName": "string (required)",
  "phone": "string (optional)",
  "dateOfBirth": "string (optional, ISO date)",
  "gender": "string (optional)",
  "chiefComplaint": "string (required)"
}
```

**Response 201:**
```json
{
  "patient": {
    "id": "uuid",
    "mrn": "MRN-2026-00001",
    "fullName": "string",
    "phone": "string | null",
    "dateOfBirth": "string | null",
    "gender": "string | null",
    "createdAt": "ISO datetime"
  },
  "triageAssessment": {
    "id": "uuid",
    "patientId": "uuid",
    "acuity": "URGENT",
    "chiefComplaint": "string",
    "triageNotes": null,
    "vitalSigns": null,
    "triageNurseId": "uuid",
    "triageTime": "ISO datetime",
    "seenByDoctorAt": null,
    "disposition": null,
    "createdAt": "ISO datetime"
  },
  "existingPatient": false
}
```

**Response 201 (existing patient found):**
Same shape, `"existingPatient": true`.

**Error 400:**
```json
{ "message": "chiefComplaint is required" }
```

### 2.2 `POST /emergency/triage`

**Request:**
```json
{
  "triageAssessmentId": "uuid (required)",
  "acuity": "RESUSCITATION | EMERGENT | URGENT | LESS_URGENT | NON_URGENT (required)",
  "triageNotes": "string (optional)",
  "vitalSigns": {
    "systolic": 120,
    "diastolic": 80,
    "heartRate": 72,
    "respiratoryRate": 16,
    "temperature": 36.8,
    "oxygenSaturation": 98
  }
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "patientId": "uuid",
  "patient": {
    "id": "uuid",
    "mrn": "MRN-2026-00001",
    "fullName": "string",
    "phone": "string | null"
  },
  "acuity": "EMERGENT",
  "chiefComplaint": "string",
  "triageNotes": "string",
  "vitalSigns": { "systolic": 120, "diastolic": 80, "heartRate": 72, "respiratoryRate": 16, "temperature": 36.8, "oxygenSaturation": 98 },
  "triageNurseId": "uuid",
  "triageTime": "ISO datetime",
  "seenByDoctorAt": null,
  "disposition": null,
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

### 2.3 `PATCH /emergency/triage/:id`

**Request:**
```json
{
  "acuity": "LESS_URGENT (optional)",
  "triageNotes": "string (optional)",
  "vitalSigns": { ... },
  "disposition": "ADMITTED | DISCHARGED | TRANSFERRED | OBSERVATION (optional)",
  "seenByDoctorAt": "ISO datetime (optional)"
}
```

**Response 200:** Same shape as POST response.

### 2.4 `GET /emergency/triage`

**Query params:** `status` (AWAITING_TRIAGE | IN_TRIAGE | COMPLETED — optional filter), `page` (default 1), `limit` (default 50)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patientId": "uuid",
      "patient": {
        "id": "uuid",
        "mrn": "MRN-2026-00001",
        "fullName": "string",
        "phone": "string | null"
      },
      "acuity": "URGENT",
      "chiefComplaint": "string",
      "triageNotes": "string | null",
      "vitalSigns": { ... } | null,
      "triageNurseId": "uuid",
      "triageNurse": { "id": "uuid", "fullName": "string" },
      "triageTime": "ISO datetime",
      "seenByDoctorAt": "ISO datetime | null",
      "disposition": "string | null",
      "createdAt": "ISO datetime",
      "updatedAt": "ISO datetime"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 42,
    "totalPages": 1
  }
}
```

Status logic:
- `AWAITING_TRIAGE`: `seenByDoctorAt IS NULL` and `triageNotes IS NULL`
- `IN_TRIAGE`: `seenByDoctorAt IS NULL` and `triageNotes IS NOT NULL`
- `COMPLETED`: `seenByDoctorAt IS NOT NULL`

### 2.5 `GET /emergency/dashboard`

**Response 200:**
```json
{
  "summary": {
    "totalToday": 25,
    "awaitingTriage": 5,
    "inTriage": 3,
    "completedToday": 17,
    "admittedToday": 4,
    "averageWaitMinutes": 12
  },
  "byAcuity": [
    {
      "acuity": "RESUSCITATION",
      "level": 1,
      "count": 2,
      "patients": [
        {
          "id": "uuid",
          "patientId": "uuid",
          "patientName": "string",
          "mrn": "string",
          "chiefComplaint": "string",
          "triageTime": "ISO datetime",
          "waitMinutes": 5,
          "disposition": null
        }
      ]
    },
    { "acuity": "EMERGENT", "level": 2, "count": 3, "patients": [...] },
    { "acuity": "URGENT", "level": 3, "count": 5, "patients": [...] },
    { "acuity": "LESS_URGENT", "level": 4, "count": 8, "patients": [...] },
    { "acuity": "NON_URGENT", "level": 5, "count": 7, "patients": [...] }
  ],
  "bedAvailability": {
    "totalBeds": 50,
    "occupiedBeds": 35,
    "vacantBeds": 15,
    "occupancyRate": 70
  }
}
```

### 2.6 `POST /emergency/admit`

**Request:**
```json
{
  "triageAssessmentId": "uuid (required)",
  "wardId": "uuid (required)",
  "bedId": "uuid (required)"
}
```

**Response 200:**
```json
{
  "message": "Patient admitted successfully",
  "triageAssessment": { ... },
  "bed": {
    "id": "uuid",
    "bedNumber": "string",
    "wardId": "uuid",
    "status": "OCCUPIED",
    "patientId": "uuid",
    "assignedAt": "ISO datetime"
  }
}
```

**Error 400:** `{ "message": "Bed is not available" }`
**Error 400:** `{ "message": "Triage assessment not found" }`

### 2.7 `GET /emergency/stats`

**Query params:** `startDate` (ISO date, optional), `endDate` (ISO date, optional)

**Response 200:**
```json
{
  "period": { "startDate": "2026-07-01", "endDate": "2026-07-19" },
  "totalPatients": 150,
  "byAcuity": [
    { "acuity": "RESUSCITATION", "count": 5 },
    { "acuity": "EMERGENT", "count": 20 },
    { "acuity": "URGENT", "count": 45 },
    { "acuity": "LESS_URGENT", "count": 50 },
    { "acuity": "NON_URGENT", "count": 30 }
  ],
  "byDisposition": [
    { "disposition": "ADMITTED", "count": 30 },
    { "disposition": "DISCHARGED", "count": 80 },
    { "disposition": "TRANSFERRED", "count": 15 },
    { "disposition": "OBSERVATION", "count": 25 }
  ],
  "averageWaitMinutes": 14,
  "admissionRate": 20.0,
  "dischargeRate": 53.3
}
```

### 2.8 `GET /emergency/queue`

**Response 200:**
```json
{
  "awaitingTriage": [
    {
      "id": "uuid",
      "patientName": "string",
      "mrn": "string",
      "chiefComplaint": "string",
      "triageTime": "ISO datetime",
      "waitMinutes": 5,
      "acuity": "URGENT"
    }
  ],
  "inConsultation": [
    {
      "id": "uuid",
      "patientName": "string",
      "mrn": "string",
      "chiefComplaint": "string",
      "acuity": "EMERGENT",
      "appointmentStatus": "WAITING",
      "waitMinutes": 12
    }
  ],
  "admitted": [
    {
      "id": "uuid",
      "patientName": "string",
      "mrn": "string",
      "acuity": "RESUSCITATION",
      "wardName": "string",
      "bedNumber": "string",
      "admittedAt": "ISO datetime"
    }
  ]
}
```

---

## 3. Work Split

### 3.1 Sr Dev (Backend) — Tasks T1–T7

| # | Task | Files | Depends On |
|---|------|-------|------------|
| T1 | Add `AcuityLevel` enum + `TriageAssessment` model to `schema.prisma` + migration | `backend/prisma/schema.prisma` | — |
| T2 | Add `EMERGENCY_READ` + `EMERGENCY_WRITE` permissions to `PERMISSIONS` + assign to `NURSE` and `DOCTOR` and `SUPER_ADMIN` roles | `backend/src/middleware/rbac.ts` | — |
| T3 | Create `backend/src/modules/emergency/emergency.routes.ts` — mount `POST /emergency/register` (rapid registration) | `emergency.routes.ts` | T1, T2 |
| T4 | Add triage assessment endpoints: `POST /emergency/triage`, `GET /emergency/triage` (list with status filter), `PATCH /emergency/triage/:id` | `emergency.routes.ts` | T1, T2 |
| T5 | Add `GET /emergency/dashboard` — patients grouped by acuity, wait times, bed availability | `emergency.routes.ts` | T4 |
| T6 | Add `POST /emergency/admit` — rapid admission for ESI 1-2, reuse bed assign logic | `emergency.routes.ts` | T4 |
| T7 | Add `GET /emergency/stats` — period stats, by-acuity counts, by-disposition, avg wait | `emergency.routes.ts` | T5 |
| T8 | Add consultation queue integration — auto-create `Appointment` with priority from acuity on triage completion | `emergency.routes.ts` | T4 |
| T9 | Mount emergency routes in `app.ts` under `/api/emergency` | `backend/src/app.ts` | T3–T8 |

### 3.2 Jr Dev (Frontend) — Tasks T10–T16

| # | Task | Files | Depends On |
|---|------|-------|------------|
| T10 | Create `frontend/src/features/emergency/` directory. Create `ACUITY_CONFIG` shared constants | `frontend/src/features/emergency/acuityConfig.js` | — |
| T11 | Create React Query hooks | `frontend/src/hooks/queries/useEmergency.js` | T3–T8 (API contracts) |
| T12 | Emergency registration form — rapid entry with fullName, phone, DOB, gender, chiefComplaint. Duplicate detection UI | `frontend/src/features/emergency/EmergencyRegistration.jsx` | T3, T11 |
| T13 | Triage assessment form — ESI level selector (color-coded buttons), vital signs capture, triage notes, submit | `frontend/src/features/emergency/TriageForm.jsx` | T4, T11 |
| T14 | Emergency dashboard — stat cards, patients grouped by acuity with color-coded badges, wait times | `frontend/src/features/emergency/EmergencyDashboard.jsx` | T5, T7, T11 |
| T15 | Triage nurse workspace — tabbed view (Awaiting / Active / Completed), patient cards with acuity badge + wait time | `frontend/src/features/emergency/TriageWorkspace.jsx` | T5, T13 |
| T16 | Emergency patient card component — reusable card with acuity badge, chief complaint, wait time, action buttons | `frontend/src/features/emergency/EmergencyPatientCard.jsx` | T11 |
| T17 | Rapid admission modal — ward/bed selector, confirm for ESI 1-2 | `frontend/src/features/emergency/RapidAdmissionModal.jsx` | T6, T11 |
| T18 | Add Emergency nav group to `navigation.tsx` + routes in `router.js` | `frontend/src/config/navigation.tsx`, `frontend/src/app/router.js` | T10–T17 |
| T19 | i18n keys (en + ar) for emergency module | `frontend/src/i18n/locales/en/emergency.json`, `ar/emergency.json` | — |

---

## 4. Data Flow Diagrams

### 4.1 Rapid Registration Flow

```
Frontend                     Backend                      Database
   |                            |                            |
   |-- POST /emergency/register -->                         |
   |                            |-- findByPhone (Patient) -->|
   |                            |<-- patient | null ---------|
   |                            |                            |
   |                  [if null: create Patient]              |
   |                            |-- prisma.patient.create -->|
   |                            |<-- new patient ------------|
   |                            |                            |
   |                  [create TriageAssessment]              |
   |                            |-- prisma.triageAssessment.create -->|
   |                            |<-- assessment -------------|
   |                            |                            |
   |<-- 201 {patient, assessment, existingPatient} ----------|
```

### 4.2 Triage → Consultation Queue Flow

```
Nurse                         Backend                      Database
   |                            |                            |
   |-- POST /emergency/triage ->                            |
   |                            |-- update TriageAssessment->|
   |                            |-- create Appointment ------>|
   |                            |   (priority from acuity)   |
   |                            |                            |
   |<-- 200 {updated assessment} ---------------------------|
```

### 4.3 Rapid Admission Flow

```
Frontend                     Backend                      Database
   |                            |                            |
   |-- POST /emergency/admit -->                             |
   |                            |-- verify bed is VACANT --->|
   |                            |-- bed.assign (OCCUPIED) -->|
   |                            |-- update disposition ------>|
   |                            |                            |
   |<-- 200 {bed, assessment} ------------------------------|
```

---

## 5. Exact File List

### New Files

```
backend/prisma/migrations/..._emergency_triage/migration.sql
backend/src/modules/emergency/emergency.routes.ts
frontend/src/features/emergency/acuityConfig.js
frontend/src/features/emergency/EmergencyRegistration.jsx
frontend/src/features/emergency/TriageForm.jsx
frontend/src/features/emergency/EmergencyDashboard.jsx
frontend/src/features/emergency/TriageWorkspace.jsx
frontend/src/features/emergency/EmergencyPatientCard.jsx
frontend/src/features/emergency/RapidAdmissionModal.jsx
frontend/src/hooks/queries/useEmergency.js
frontend/src/i18n/locales/en/emergency.json
frontend/src/i18n/locales/ar/emergency.json
```

### Modified Files

```
backend/prisma/schema.prisma                          (AcuityLevel enum + TriageAssessment model)
backend/src/middleware/rbac.ts                         (EMERGENCY_READ + EMERGENCY_WRITE permissions)
backend/src/app.ts                                     (mount /api/emergency)
frontend/src/config/navigation.tsx                     (add Emergency nav group)
frontend/src/app/router.js                             (add /emergency routes)
frontend/src/i18n/index.ts                             (register emergency namespace)
```

---

## 6. Pattern References

| Pattern | Reference File | Line |
|---------|---------------|------|
| Patient creation with MRN | `backend/src/modules/reception/routes/patients.routes.ts:30` | `generateMRN()` + `prisma.patient.create` |
| findByPhone (findFirst) | `backend/src/modules/reception/routes/patients.routes.ts:16` | `prisma.patient.findFirst` with `where` |
| Route mounting pattern | `backend/src/app.ts:96` | `app.use('/api/emergency', emergencyRoutes)` |
| Permission constants | `backend/src/middleware/rbac.ts:5` | `PERMISSIONS` object |
| Role permission arrays | `backend/src/middleware/rbac.ts:54` | `DEFAULT_ROLES` |
| Dashboard stat cards | `frontend/src/features/lab/LabDashboardShell.jsx:20` | `useQuery` + stat cards pattern |
| Tabbed workspace | `frontend/src/features/lab/LabDashboardShell.jsx:27` | Tab state + conditional render |
| Nav group config | `frontend/src/config/navigation.tsx:26` | `NAV_GROUPS` array |
| Bed assign logic | `backend/src/modules/preoperative/wards.routes.ts:80+` | `POST /beds/:id/assign` |
| Ward dashboard stats | `backend/src/modules/preoperative/wards.routes.ts:24` | `GET /wards/dashboard` |
| Audit logging | `backend/src/modules/preoperative/wards.routes.ts:6` | `auditMiddleware` import |
| asyncHandler pattern | `backend/src/modules/reception/routes/patients.routes.ts:3` | `asyncHandler(async (req, res) => ...)` |
| validate middleware | `backend/src/modules/reception/routes/patients.routes.ts:4` | `validate(schema)` |
| Import path for UI components | `frontend/src/features/lab/LabDashboardShell.jsx:5` | `../../components/ui/Card` |

---

## 7. Key Gotchas

### 7.1 ESI Level Color Mapping
ESI levels are 1-5. Color map is **frontend-only**. Backend stores the enum string (`RESUSCITATION`, `EMERGENT`, etc.). Frontend maps to colors via `ACUITY_CONFIG`. Never store color strings in the database.

### 7.2 Rapid Registration Speed
Target: < 30 seconds. The form must have as few fields as possible. Use `chiefComplaint` (required) to immediately create the TriageAssessment alongside the Patient. Do NOT require phone — some emergency patients arrive unidentified.

### 7.3 Consultation Priority Derived from Acuity
The `Appointment.priority` field is an Int (0-10). Map:
- RESUSCITATION → 10
- EMERGENT → 8
- URGENT → 5
- LESS_URGENT → 3
- NON_URGENT → 1

### 7.4 Hospital-Scoped All Queries
Every query in `emergency.routes.ts` MUST filter by `hospitalId` from `req.user.hospitalId`. The TriageAssessment model has `hospitalId` for this purpose. The tenant Prisma extension may auto-inject, but explicit filtering is safer.

### 7.5 findFirst not findUnique
Patient lookup by phone must use `findFirst({ where: { phone, hospitalId } })` not `findUnique`. The `Patient` model has composite unique on `[hospitalId, mrn]` and a global unique on `nationalId`, but phone is NOT unique — multiple patients could share a phone number in different hospitals.

### 7.6 Existing Patient Detection
When a patient is found by phone during rapid registration, return `"existingPatient": true` so the frontend can show a confirmation ("Patient found: John Doe (MRN-2026-00042). Use existing record?"). If the user confirms, link the TriageAssessment to the existing patient.

### 7.7 Emergency Clinic Required
The consultation queue integration (T8) needs a `clinicId`. Must ensure an "Emergency" clinic exists. Either seed it or look up by slug `'emergency'`. If not found, skip Appointment creation and log a warning.

### 7.8 Bed Status Check in Rapid Admission
Before assigning a bed, verify `bed.status === 'VACANT'`. Return 400 if occupied. Use a transaction for atomicity: update bed + update triage disposition in one `prisma.$transaction`.

### 7.9 JSX Structural Rules
All frontend components MUST follow:
- Every ternary must have matching branches; wrap multi-element branches in `<>...</>`
- All `<>` must have matching `</>`
- Import UI components from `../../components/ui/` not `../ui/`
- Every component must have Loading, Empty, and Error states

### 7.10 No JSON.stringify
Use `safeStringify` from `@voltagent/internal` if stringification is needed. This is a hard rule.

### 7.11 File Write Verification
Every file written MUST be read back to confirm persistence. The `general` task subagent may not persist writes reliably.

### 7.12 tsc --noEmit Required
Both Sr Dev and Jr Dev MUST run `tsc --noEmit` on their target directory after completing changes and fix ALL errors before reporting done.

---

## 8. RBAC Changes

### New Permissions

```typescript
EMERGENCY_READ: 'emergency:read',
EMERGENCY_WRITE: 'emergency:write',
```

### Role Assignments

| Role | emergency:read | emergency:write |
|------|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ |
| DOCTOR | ✅ | ✅ |
| NURSE | ✅ | ✅ |
| RECEPTIONIST | ✅ | ✅ |

---

## 9. Prisma Schema Addition

```prisma
enum AcuityLevel {
  RESUSCITATION
  EMERGENT
  URGENT
  LESS_URGENT
  NON_URGENT
}

model TriageAssessment {
  id               String       @id @default(uuid())
  patientId        String
  acuity           AcuityLevel
  chiefComplaint   String
  triageNotes      String?
  vitalSigns       Json?
  triageNurseId    String
  triageTime       DateTime     @default(now())
  seenByDoctorAt   DateTime?
  disposition      String?
  hospitalId       String?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  patient          Patient      @relation(fields: [patientId], references: [id])
  triageNurse      User         @relation(fields: [triageNurseId], references: [id])
  hospital         Hospital?    @relation(fields: [hospitalId], references: [id])

  @@index([patientId])
  @@index([triageNurseId])
  @@index([acuity])
  @@index([triageTime])
  @@index([hospitalId])
  @@map("triage_assessments")
}
```

Also add `triageAssessments TriageAssessment[]` to the `Patient`, `User`, and `Hospital` models.

---

## 10. Navigation Group

```typescript
{
  key: 'emergency',
  label: 'Emergency',
  requiredPermissions: ['emergency:read'],
  items: [
    { label: 'ED Dashboard', icon: Siren, path: '/emergency/dashboard', requiredPermissions: [] },
    { label: 'Triage', icon: HeartPulse, path: '/emergency/triage', requiredPermissions: ['emergency:write'] },
    { label: 'Register', icon: ClipboardList, path: '/emergency/register', requiredPermissions: ['emergency:write'] },
    { label: 'Stats', icon: BarChart3, path: '/emergency/stats', requiredPermissions: [] },
  ],
},
```

Insert between `lab` and `operations` groups (index 6 in NAV_GROUPS).
