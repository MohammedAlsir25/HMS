# Phase 15 — Emergency & Triage: QA Report

**Date:** 2026-07-20
**QA / Scrum Master:** opencode (big-pickle)
**Status:** FAIL — 8 bugs (3 High, 3 Medium, 2 Low) + 2 missing files

---

## 1. Test Results

| # | Test | Status | Notes |
|---|------|--------|-------|
| T1 | Backend `tsc --noEmit` | PASS | Zero errors |
| T2 | Frontend `tsc --noEmit` | PASS | Zero errors |
| T3 | Prisma `AcuityLevel` enum exists | PASS | 5 values match spec: RESUSCITATION, EMERGENT, URGENT, LESS_URGENT, NON_URGENT |
| T4 | Prisma `TriageAssessment` model | PASS | All fields, relations, indexes match spec |
| T5 | RBAC `EMERGENCY_READ` / `EMERGENCY_WRITE` | PASS | Added to PERMISSIONS (line 47-48). Assigned to SUPER_ADMIN, DOCTOR, NURSE, RECEPTIONIST |
| T6 | Barrel `emergency/index.ts` | PASS | Correctly mounts all 6 sub-route modules |
| T7 | `app.ts` emergency import + mount | PASS | `app.use('/api/emergency', emergencyRouter)` at line 121 |
| T8 | Navigation group | PASS | Emergency group at index 8 with 4 items (Dashboard, Triage, Register, Stats) |
| T9 | App.jsx routes | PASS | 4 routes: /emergency, /emergency/triage, /emergency/register, /emergency/stats |
| T10 | Import paths `../../components/ui/` | PASS | All frontend files use correct relative paths |
| T11 | No code comments in new files | PASS | Zero `//` comments in emergency module files |
| T12 | ESI color mapping consistency | PASS | ACUITY_STYLES/ACUITY_OPTIONS/ACUITY_COLORS all map identically across all components |
| T13 | Loading states | PASS | EmergencyDashboard, TriageWorkspace, EmergencyStats all have spinner states |
| T14 | Error states | PASS | EmergencyDashboard, TriageWorkspace, EmergencyStats all have error UI |
| T15 | Empty states | PASS | EmergencyDashboard ("No patients..."), TriageWorkspace (per-tab empty messages), EmergencyStats ("No data...") |
| T16 | RapidRegistration "Check Existing" flow | FAIL | Calls `GET /emergency/check-patient` — **endpoint does not exist in backend** |
| T17 | TriageForm vital signs fields | PASS | All 6 fields present: systolic, diastolic, heartRate, respiratoryRate, temperature, oxygenSaturation |
| T18 | TriageWorkspace 3-column layout | FAIL | Expects `data.awaitingTriage/activeTriage/completedTriage` — backend returns flat array |
| T19 | Dashboard acuity summary cards | FAIL | Frontend expects `summary.byAcuity.bedAvailability` — backend returns `patientsByAcuity.currentOccupancy` |
| T20 | Stats date range picker | PASS | Date inputs present and wired to params |
| T21 | Consultation queue priority mapping | FAIL | Backend uses 100/80/50/20/10 — spec says 10/8/5/3/1 |
| T22 | Rapid admission bed assignment | PARTIAL | Bed assign lacks `$transaction` — race condition risk |
| T23 | No `JSON.stringify` in backend | FAIL | `triage.routes.ts:22,43` uses `JSON.parse(JSON.stringify(vitalSigns))` |
| T24 | API path contract match (frontend ↔ backend) | FAIL | Multiple mismatches (see Bug #2, #3, #4, #5) |
| T25 | `EmergencyPatientCard.jsx` exists | FAIL | File does not exist (listed in tech spec) |
| T26 | `RapidAdmissionModal.jsx` exists | FAIL | File does not exist (listed in tech spec) |
| T27 | `acuityConfig.js` shared constants exists | FAIL | File does not exist — ACUITY_CONFIG duplicated in 3 components |

---

## 2. Bug List

### HIGH Severity

**BUG-01: Missing `/emergency/check-patient` endpoint**
- File: `backend/src/modules/emergency/routes/registration.routes.ts`
- Frontend: `frontend/src/features/emergency/RapidRegistration.jsx:33`
- Description: `RapidRegistration.jsx` calls `GET /emergency/check-patient?phone=...&name=...` but no such route exists in any backend file. The "Check Existing" button will always 404. This breaks the duplicate detection flow entirely.
- Fix: Add `router.get('/check-patient', ...)` to `registration.routes.ts` that looks up patients by phone or name within hospitalId.

**BUG-02: Dashboard response shape mismatch — frontend reads wrong fields**
- File (FE): `frontend/src/features/emergency/EmergencyDashboard.jsx:57-59`
- File (BE): `backend/src/modules/emergency/routes/dashboard.routes.ts:74-82`
- Description: Frontend reads `data.summary.totalToday`, `data.byAcuity[].patients[]`, `data.bedAvailability.totalBeds`. Backend returns `data.patientsByAcuity[]`, `data.totalInDepartment`, `data.currentOccupancy.totalBeds`. All summary cards render `0`, patient list is empty, bed stats are `undefined`.
- Fix: Align either frontend or backend. Recommendation: reshape backend to match tech spec contract (summary object + byAcuity with nested patients + bedAvailability).

**BUG-03: TriageWorkspace expects 3-column data but `/triage/active` returns flat array**
- File (FE): `frontend/src/features/emergency/TriageWorkspace.jsx:104-106`
- File (BE): `backend/src/modules/emergency/routes/triage.routes.ts:67-80`
- Description: Frontend destructures `data.awaitingTriage`, `data.activeTriage`, `data.completedTriage`. Backend `GET /emergency/triage/active` returns a flat array of all assessments with `disposition === null`. All three tabs always show "No patients" regardless of data.
- Fix: Either (a) add a grouped endpoint that returns `{ awaitingTriage, activeTriage, completedTriage }` using the status logic from the tech spec, or (b) add `GET /emergency/triage` with `?status=` query param and call it 3 times from frontend.

### MEDIUM Severity

**BUG-04: EmergencyStats response shape mismatch**
- File (FE): `frontend/src/features/emergency/EmergencyStats.jsx:49-51,91,97`
- File (BE): `backend/src/modules/emergency/routes/stats.routes.ts:41-49`
- Description: Frontend reads `stats.totalPatients`, `stats.averageWaitMinutes`, `stats.byAcuity[]`, `stats.byDisposition[]`. Backend returns `totalVisits`, `averageWaitTime`, `visitsByAcuity` (object, not array), and no `byDisposition`. Stat cards all show `0` and breakdown tables are empty.
- Fix: Reshape backend response to match spec: `totalPatients`, `averageWaitMinutes`, `byAcuity` as array with `{ acuity, count }`, add `byDisposition` array.

**BUG-05: DailyTrend response shape mismatch**
- File (FE): `frontend/src/features/emergency/EmergencyStats.jsx:51,177`
- File (BE): `backend/src/modules/emergency/routes/stats.routes.ts:82`
- Description: Frontend reads `trend?.dailyTrend` and expects each row to have `row.totalVisits`, `row.RESUSCITATION`, etc. Backend returns the array directly (no `.dailyTrend` wrapper), and uses `total` instead of `totalVisits`. Daily trend table renders empty.
- Fix: Either wrap response in `{ dailyTrend: [...] }` or change frontend to read `trend` directly. Also rename `total` → `totalVisits` in backend.

**BUG-06: `JSON.parse(JSON.stringify(vitalSigns))` in triage routes**
- File: `backend/src/modules/emergency/routes/triage.routes.ts:22,43`
- Description: Uses `JSON.parse(JSON.stringify(vitalSigns))` which violates the project rule (AGENTS.md: "NEVER use JSON.stringify — use safeStringify"). While functionally equivalent for plain objects, it breaks the coding standard and could fail on non-serializable values.
- Fix: Replace with `safeStringify` from `@voltagent/internal` or pass `vitalSigns` directly to Prisma (it accepts plain objects for Json fields).

**BUG-07: Consultation priority values don't match spec**
- File: `backend/src/modules/emergency/routes/consultation.routes.ts:10-16`
- Description: Uses `{ RESUSCITATION: 100, EMERGENT: 80, URGENT: 50, LESS_URGENT: 20, NON_URGENT: 10 }`. Spec says `{ 10, 8, 5, 3, 1 }`. Values are 10x too high, which will dominate the Appointment priority range (0-10) and could affect existing queue ordering.
- Fix: Change to `{ RESUSCITATION: 10, EMERGENT: 8, URGENT: 5, LESS_URGENT: 3, NON_URGENT: 1 }`.

**BUG-08: Rapid admission lacks `$transaction` — race condition**
- File: `backend/src/modules/emergency/routes/admission.routes.ts:46-60`
- Description: Bed assignment (`bed.update`) and triage disposition (`triageAssessment.update`) are two separate queries with no transaction. A concurrent request could assign the same bed to two patients. Also, if triage update fails, the bed remains OCCUPIED with no rollback.
- Fix: Wrap in `prisma.$transaction([bedUpdate, triageUpdate])`.

### LOW Severity

**BUG-09: Admission proceeds even when no bed found — sets ADMITTED with no bed**
- File: `backend/src/modules/emergency/routes/admission.routes.ts:57-60`
- Description: When `bed` is `null` (no vacant beds), the code still updates `disposition = 'ADMITTED'`. The response includes `bedId: null`. This creates a logically inconsistent record: patient is "ADMITTED" but has no bed.
- Fix: Throw `ValidationError('No vacant beds available')` if `bed` is null.

**BUG-10: Missing 3 frontend files from tech spec**
- Missing: `EmergencyPatientCard.jsx`, `RapidAdmissionModal.jsx`, `acuityConfig.js`
- Description: Tech spec lists these files. `EmergencyPatientCard` is a reusable patient card component. `RapidAdmissionModal` is the ward/bed selector for ESI 1-2 patients. `acuityConfig.js` should hold the shared `ACUITY_CONFIG` constant (currently duplicated in 3 files: EmergencyDashboard, TriageWorkspace, EmergencyStats).
- Fix: Create these files and extract shared ACUITY_CONFIG into `acuityConfig.js`.

---

## 3. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dashboard/stats show all zeros in production | HIGH | BUG-02/04/05 mean the emergency dashboard and stats pages are completely non-functional. Fix backend response shapes to match frontend expectations before deploying. |
| "Check Existing" button always 404s | HIGH | BUG-01 means rapid registration has no duplicate detection. Low clinical risk (creates new patient) but violates acceptance criteria. |
| Triage workspace shows empty tabs | HIGH | BUG-03 means triage nurses cannot use the workspace. This is the core feature of the phase. |
| Race condition on bed assignment | MEDIUM | BUG-08 could cause double-booking of beds in high-traffic ED. Use `prisma.$transaction`. |
| Priority 100 overwhelms queue ordering | MEDIUM | BUG-07 means emergency referrals will always be first in consultation queue, potentially deprioritizing non-emergency walk-ins with normal priorities (0-10). |
| `JSON.stringify` on vital signs | LOW | Functionally works for plain objects but violates coding standard and could break on complex types. |

---

## 4. Acceptance Criteria Cross-Check

| Criterion | Status |
|-----------|--------|
| Rapid registration creates/links patient with minimal fields | PARTIAL — Missing check-patient endpoint (BUG-01) |
| Triage captures ESI 1-5 with correct color coding | PASS |
| Triage captures vital signs (BP, HR, RR, temp, O2 sat) | PASS |
| Triage workspace has 3 tabs (Awaiting/Active/Completed) | FAIL — Backend doesn't group data (BUG-03) |
| Dashboard shows patients grouped by acuity with wait times | FAIL — Shape mismatch (BUG-02) |
| Dashboard shows bed availability summary | FAIL — Shape mismatch (BUG-02) |
| Critical patients (ESI 1-2) can be rapidly admitted | PARTIAL — Works but no transaction (BUG-08), no bed check (BUG-09) |
| After triage, patient appears in consultation queue with acuity priority | PARTIAL — Priority values 10x too high (BUG-07) |
| Stats endpoint returns volume by acuity, avg wait, admission/discharge rate | FAIL — Shape mismatch (BUG-04) |
| All emergency data hospital-scoped | PASS |
| All components have loading/empty/error states | PASS (for existing components) |
| Patient cards show correct ESI color badge | PASS |

---

## 5. Sign-off Status

**BLOCKED** — 3 HIGH-severity bugs must be resolved before Phase 15 can be marked complete:

1. BUG-01: Missing `/emergency/check-patient` endpoint
2. BUG-02: Dashboard response shape mismatch
3. BUG-03: TriageWorkspace data shape mismatch

Recommended next steps:
1. Backend dev: Add `/check-patient` route, reshape dashboard + triage/active + stats responses to match tech spec contracts
2. Backend dev: Fix priority values (BUG-07), add `$transaction` to admission (BUG-08), replace `JSON.stringify` (BUG-06)
3. Frontend dev: Create missing files (EmergencyPatientCard, RapidAdmissionModal, acuityConfig.js)
4. Re-run QA after fixes
