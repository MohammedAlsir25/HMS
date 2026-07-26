# Phase 15 — Emergency & Triage: Implementation Brief

**Date:** 2026-07-19  
**Status:** Ready for Tech Lead  
**Complexity:** L  
**Estimated Tasks:** 12–14  

---

## 1. Phase Goal

Build an emergency department workflow with rapid patient registration, triage assessment (ESI 1–5 with color coding), triage nurse workspace, and integration with existing ward/bed admission and consultation queue — enabling emergency patients to bypass normal flows for critical care.

---

## 2. What Already Exists vs What's Needed

| Component | Exists? | Details |
|-----------|---------|---------|
| `Patient` model | YES | `patients` table — `id`, `mrn`, `fullName`, `phone`, `dateOfBirth`, `gender`, `nationalId`, `hospitalId`, `createdById`. Full registration with 10+ fields. |
| Rapid registration (reception) | PARTIAL | `POST /reception/patients` (`backend/src/modules/reception/routes/patients.routes.ts:30`) creates patients with `fullName`, `phone`, `dateOfBirth`, `gender` — close to rapid registration but needs fewer required fields for emergency. |
| `Appointment` model | YES | `appointments` table — has `priority` (0–10), `status` (WAITING/CALLED/IN_PROGRESS/COMPLETED), `type` (WALKIN/RESERVATION), `clinicId`, `patientId`, `doctorId`. |
| Consultation queue (QueueBoard) | YES | `frontend/src/features/reception/QueueBoard.jsx` — 4-column Kanban (WAITING/CALLED/IN_PROGRESS/COMPLETED) with status transitions and wait-time display. |
| `VitalSign` model | YES | `vital_signs` table — `bloodPressureSystolic`, `bloodPressureDiastolic`, `heartRate`, `temperature`, `spo2`, `bloodGlucose`, `weight`. Scoped to `ClinicalRecord`. |
| Inpatient vitals | YES | `InpatientVital` model — `temperature`, `heartRate`, `bloodPressureSystolic`, `bloodPressureDiastolic`, `respiratoryRate`, `oxygenSaturation`, `painScore`. Scoped to `Bed`. |
| `Ward` / `Bed` models | YES | `wards` table — `name`, `nameAr`, `type`, `floor`, `capacity`, `departmentId`, `dailyRate`. `beds` table — `bedNumber`, `wardId`, `status` (VACANT/OCCUPIED/RESERVED/MAINTENANCE), `patientId`, `assignedAt`, `dischargedAt`. |
| Bed assign/discharge | YES | `POST /beds/:id/assign` sets OCCUPIED. `PATCH /beds/:id/discharge` auto-bills. |
| Ward dashboard | YES | `GET /wards/dashboard` — occupancy stats, by-ward breakdown, admissions/discharges today. |
| Navigation config | YES | `frontend/src/config/navigation.tsx` — 11 nav groups. No Emergency group exists. |
| RBAC permissions | YES | `backend/src/middleware/rbac.ts` — 52 permissions. No `emergency:*` permissions exist. |
| Triage assessment | NO | No `TriageAssessment` model, no triage routes, no triage frontend. |
| Emergency registration | NO | No simplified rapid-entry registration. Reception registration requires more fields. |
| ESI scale / color coding | NO | No acuity-based priority system with visual color coding. |
| Emergency dashboard | NO | No ED-specific dashboard showing patients by acuity, wait times, bed availability. |
| Triage nurse workspace | NO | No dedicated workspace for triage nurses (awaiting/active/completed triage). |
| Rapid admission workflow | NO | No direct triage-to-bed path that bypasses normal admission steps. |
| Emergency statistics | NO | No ED-specific analytics (patient volume by acuity, average wait time, admission rate). |

---

## 3. Tasks

### Backend Tasks

| # | Task | File(s) | Complexity | Depends On |
|---|------|---------|-----------|------------|
| B1 | Add `TriageAssessment` model + `AcuityLevel` enum (1–5) + migration | `backend/prisma/schema.prisma` | HIGH | — |
| B2 | Add `EMERGENCY_READ` + `EMERGENCY_WRITE` permissions to `PERMISSIONS` + default roles | `backend/src/middleware/rbac.ts` | LOW | — |
| B3 | Emergency rapid registration endpoint: `POST /emergency/register` — accepts minimal fields (fullName, phone, DOB, chiefComplaint), auto-creates patient if not found by phone, links to existing if found | `backend/src/modules/emergency/emergency.routes.ts` | HIGH | B1, B2 |
| B4 | Triage assessment CRUD: `POST /emergency/triage` (create), `GET /emergency/triage` (list by status), `PATCH /emergency/triage/:id` (update acuity/disposition) | `backend/src/modules/emergency/emergency.routes.ts` | HIGH | B1, B2 |
| B5 | Emergency queue endpoint: `GET /emergency/queue` — returns patients grouped by acuity level with wait times, triage status, disposition | `backend/src/modules/emergency/emergency.routes.ts` | MEDIUM | B4 |
| B6 | Rapid admission endpoint: `POST /emergency/admit` — triage → direct bed assignment (reuses existing `POST /beds/:id/assign` logic) for ESI 1-2 patients, skipping normal admission | `backend/src/modules/emergency/emergency.routes.ts` | MEDIUM | B4 |
| B7 | Integration with consultation queue: when triage completes, auto-create Appointment with priority derived from acuity (ESI 1→priority 10, ESI 2→8, ESI 3→5, ESI 4→3, ESI 5→1) in the emergency clinic | `backend/src/modules/emergency/emergency.routes.ts` | MEDIUM | B4 |
| B8 | Emergency statistics endpoint: `GET /emergency/stats` — patient volume by acuity, average wait time, admission rate, disposition breakdown | `backend/src/modules/emergency/emergency.routes.ts` | MEDIUM | B5 |
| B9 | Mount emergency routes in `app.ts` under `/api/emergency/*` | `backend/src/app.ts` | LOW | B3–B8 |

### Frontend Tasks

| # | Task | File(s) | Complexity | Depends On |
|---|------|---------|-----------|------------|
| F1 | Emergency registration form — rapid-entry with minimal fields: fullName, phone, DOB, chief complaint, gender. Duplicate detection by phone. Target: < 30 seconds | `frontend/src/features/emergency/EmergencyRegistration.jsx` | MEDIUM | B3 |
| F2 | Triage assessment form — ESI level selector (1–5) with color-coded buttons (1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue), vital signs capture (BP, HR, RR, temp, O2 sat), chief complaint, triage nurse assignment | `frontend/src/features/emergency/TriageForm.jsx` | HIGH | B4 |
| F3 | Emergency department dashboard — patients by acuity level, real-time wait times, bed availability summary, stats cards (total patients, avg wait, admissions today) | `frontend/src/features/emergency/EmergencyDashboard.jsx` | HIGH | B5, B8 |
| F4 | Triage nurse workspace — tabbed view: Awaiting Triage / Active Triage / Completed Triage. List with patient name, chief complaint, wait time, acuity badge. Click to open TriageForm | `frontend/src/features/emergency/TriageWorkspace.jsx` | MEDIUM | B5 |
| F5 | Emergency patient card component — shows patient name, MRN, acuity badge (color-coded), chief complaint, wait time, status, action buttons (Triage/Admit/Discharge) | `frontend/src/features/emergency/EmergencyPatientCard.jsx` | LOW | B5 |
| F6 | Rapid admission modal — select available ward/bed, confirm admission for critical patients (ESI 1-2). Reuses ward/bed data | `frontend/src/features/emergency/RapidAdmissionModal.jsx` | MEDIUM | B6 |
| F7 | React Query hooks for all emergency endpoints | `frontend/src/hooks/queries/useEmergency.js` | MEDIUM | B3–B8 |
| F8 | Add Emergency nav group to navigation config + route in router | `frontend/src/config/navigation.tsx`, `frontend/src/app/router.js` | LOW | F1–F6 |
| F9 | i18n keys (en + ar) for emergency module | `frontend/src/i18n/locales/en/emergency.json`, `ar/emergency.json` | LOW | — |

---

## 4. Acceptance Criteria

- [ ] Rapid registration creates/links a patient with only name, phone, DOB, chief complaint in < 30 seconds
- [ ] Triage assessment captures ESI level 1–5 with correct color coding: 1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue
- [ ] Triage assessment captures vital signs: BP (systolic/diastolic), heart rate, respiratory rate, temperature, O2 saturation
- [ ] Triage nurse workspace shows three tabs: Awaiting Triage, Active Triage, Completed Triage
- [ ] Emergency dashboard shows real-time patient list grouped by acuity level with wait times
- [ ] Emergency dashboard shows bed availability summary (reuses ward dashboard data)
- [ ] Critical patients (ESI 1-2) can be rapidly admitted directly to a ward bed (bypass normal admission)
- [ ] After triage, patient appears in consultation queue with priority derived from acuity level
- [ ] Emergency statistics endpoint returns patient volume by acuity, average wait time, admission rate, discharge rate
- [ ] All emergency data is hospital-scoped (multi-tenant isolation)
- [ ] All emergency components have loading, empty, and error states
- [ ] Emergency patient cards show correct ESI color badge, wait time (auto-updating), and action buttons

---

## 5. Work Split

### Senior Developer (B1–B9, F7–F8)
- TriageAssessment model + AcuityLevel enum + migration (B1)
- Permissions (B2) — quick addition
- All backend endpoints (B3–B9) — core business logic, rapid registration with duplicate detection, triage CRUD, queue logic, rapid admission, consultation queue integration, stats
- React Query hooks (F7) — must match API contract exactly
- Navigation + routing (F8) — connect everything

### Junior Developer (F1–F6, F9)
- Emergency registration form (F1) — straightforward rapid-entry form
- Triage assessment form (F2) — color-coded ESI buttons + vitals inputs
- Emergency dashboard (F3) — stat cards + patient list grouped by acuity
- Triage nurse workspace (F4) — tabbed list with status transitions
- Emergency patient card component (F5) — small reusable card
- Rapid admission modal (F6) — ward/bed selector + confirm
- i18n keys (F9)

---

## 6. Files Likely Impacted

### New Files
```
backend/prisma/migrations/..._phase_15_emergency_triage/migration.sql
backend/src/modules/emergency/emergency.routes.ts
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
backend/prisma/schema.prisma            (TriageAssessment model + AcuityLevel enum)
backend/src/middleware/rbac.ts           (add EMERGENCY_READ + EMERGENCY_WRITE permissions + role assignments)
backend/src/app.ts                       (mount /api/emergency routes)
backend/src/modules/wards/wards.routes.ts (potentially expose available beds for rapid admission — already exists)
frontend/src/config/navigation.tsx       (add Emergency nav group)
frontend/src/app/router.js              (add /emergency routes)
frontend/src/i18n/index.ts              (register emergency namespace)
```

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Triage assessment model design** — acuity level semantics, what fields to capture | MEDIUM | Follow ESI 1-5 standard. Use separate `AcuityLevel` enum rather than int for type safety. Vitals fields mirror existing `InpatientVital` model. |
| **Rapid registration duplicate detection** — matching by phone may have false positives | MEDIUM | Phone-based lookup only (not MRN — patient may not have one yet). Show "Patient found" confirmation before creating new. Accept minimal false-positive risk for speed. |
| **Consultation queue integration** — emergency patients must appear with correct priority | LOW | Create `Appointment` with `type: WALKIN` and `priority` derived from acuity. QueueBoard already supports priority display. |
| **Rapid admission bypassing normal flow** — must not break existing ward/bed logic | MEDIUM | Reuse existing `POST /beds/:id/assign` endpoint. Just call it directly from emergency module. No new bed logic needed. |
| **ESI color coding must be consistent** — used in cards, dashboard, triage form, badges | LOW | Define color map once in shared constants (same as `statusColors` pattern in `InpatientPage.jsx`). |
| **Multi-tenancy isolation** — emergency data must not leak across hospitals | HIGH | All emergency queries filter by `hospitalId` from JWT. TriageAssessment model includes `hospitalId` field. |
| **Navigation integration** — new Emergency group must not break existing sidebar | LOW | Add new group between "Clinical" and "Clinics" (logical position). Follow exact pattern of existing groups. |
| **Loading/empty/error states** — all new components must have these (per AGENTS.md rules) | MEDIUM | Explicitly call out in Jr Dev task specs. Follow `InpatientPage.jsx` pattern for loading/empty states. |

---

## 8. Dependency Graph

```
B1 (Schema: TriageAssessment + AcuityLevel enum)
 │
 ├─ B2 (Permissions) ──── B3 (Rapid Registration)
 │                        B4 (Triage Assessment CRUD)
 │                         ├─ B5 (Emergency Queue) ──── B8 (Stats)
 │                         ├─ B6 (Rapid Admission)
 │                         └─ B7 (Consultation Queue Integration)
 │                              └─ B9 (Mount Routes)
 │
 └── F9 (i18n keys)

F1 (Registration Form) ← depends on B3 API contract
F2 (Triage Form) ← depends on B4 API contract
F7 (React Query hooks) ← depends on B3–B8 API contracts
F3 (Emergency Dashboard) ← depends on B5, B8 + F5
F4 (Triage Workspace) ← depends on B5 + F2
F5 (Emergency Patient Card) ← depends on B5
F6 (Rapid Admission Modal) ← depends on B6
F8 (Navigation + Router) ← depends on F1–F6 + F7
```

---

## 9. ESI Color Scale Reference

| ESI Level | Label | Color | Tailwind Classes | Priority Value |
|-----------|-------|-------|-----------------|----------------|
| 1 | Resuscitation | Red | `bg-red-500 text-white` | 10 |
| 2 | Emergent | Orange | `bg-orange-500 text-white` | 8 |
| 3 | Urgent | Yellow | `bg-yellow-400 text-yellow-900` | 5 |
| 4 | Less Urgent | Green | `bg-green-500 text-white` | 3 |
| 5 | Non-Urgent | Blue | `bg-blue-500 text-white` | 1 |

**AcuityLevel enum values:** `RESUSCITATION`, `EMERGENT`, `URGENT`, `LESS_URGENT`, `NON_URGENT`
