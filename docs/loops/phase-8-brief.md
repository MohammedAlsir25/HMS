# Phase 8 Brief: Inpatient Management

## 1. Phase Goal

Complete the ward/bed management module by adding a visual bed map with color-coded status, bed occupancy statistics endpoints, an inpatient dashboard with summary cards, and discharge workflow enhancements with billing integration — building on an already substantially-built foundation.

---

## 2. Executive Summary — What Already Exists

| Functionality | Status | Location |
|---|---|---|
| Ward CRUD (list, create, update, soft-delete) | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:12-52` |
| Bed CRUD (list, create, available, delete) | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:54-226` |
| Bed Assign (patient → bed, sets OCCUPIED) | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:89-111` |
| Bed Discharge (frees bed, auto-creates WARD Transaction) | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:113-154` |
| Bed Reserve / Transfer / Maintenance | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:156-226` |
| Inpatient Vitals (GET/POST per bed) | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:228-258` |
| Nursing Notes (GET/POST per bed) | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:260-281` |
| Ward Rounds (GET/POST) | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:283-322` |
| WardsPage (tabs: Wards / Beds / Rounds) | ✅ Built | `frontend/src/features/wards/WardsPage.jsx` |
| InpatientPage (bed map grid, vitals, notes, rounds) | ✅ Built | `frontend/src/features/wards/InpatientPage.jsx` |
| BedDetailPanel (inline vitals + notes) | ✅ Built | `frontend/src/features/wards/BedDetailPanel.jsx` |
| All React Query hooks (useWards, useInpatient) | ✅ Built | `frontend/src/hooks/queries/useWards.js`, `useInpatient.js` |
| Navigation config + routes wired | ✅ Built | `frontend/src/config/navigation.tsx:73-81`, `App.jsx:127-128` |
| Prisma models (Ward, Bed, InpatientVital, NursingNote, WardRound) | ✅ Built | `backend/prisma/schema.prisma:786-901` |
| BedStatus enum (VACANT, OCCUPIED, RESERVED, MAINTENANCE) | ✅ Built | `backend/prisma/schema.prisma:1851` |
| Discharge billing (auto Transaction on discharge) | ✅ Built | `wards.routes.ts:131-151` |

| Gap | Status | Impact |
|---|---|---|
| Visual bed map (color-coded grid per ward) on WardsPage | ❌ Missing | High — plan task #2 |
| Bed occupancy statistics API endpoint | ❌ Missing | High — plan task #9 |
| Inpatient dashboard summary cards (occupancy %, admissions today, discharges today) | ❌ Missing | Medium — plan task #5 |
| Discharge summary generation for non-surgery admissions | ❌ Missing | Medium — plan task #4 |
| Admission date input in bed assign flow | ⚠️ Partial | Low — `assignedAt` auto-set to `now()`, no manual date |
| i18n translation keys for wards/inpatient | ❌ Missing | Low |
| Ward round notes stored per-bed (not just per-ward) | ❌ Missing | Medium — plan says "per patient" |

---

## 3. Tasks

### Backend Tasks

#### T1: Add `GET /wards/dashboard` occupancy statistics endpoint
- **File:** `backend/src/modules/preoperative/wards.routes.ts`
- **Change:** Add new route handler that returns `{ totalBeds, occupiedBeds, vacantBeds, reservedBeds, maintenanceBeds, occupancyRate, byWard: [{ wardId, wardName, total, occupied, rate }], admissionsToday, dischargesToday }` using Prisma aggregate queries
- **Complexity:** M
- **Dependencies:** None

#### T2: Add `GET /wards/dashboard/trends` historical occupancy endpoint
- **File:** `backend/src/modules/preoperative/wards.routes.ts`
- **Change:** Add route that accepts `days` query param and returns daily `{ date, admissions, discharges, occupiedCount }` from `Bed.assignedAt` and `Bed.dischargedAt` timestamps
- **Complexity:** M
- **Dependencies:** None

#### T3: Enhance `POST /beds/:id/assign` to accept optional `admissionDate`
- **File:** `backend/src/modules/preoperative/wards.routes.ts:89-111`
- **Change:** Accept optional `admissionDate` in request body; if provided, use it instead of `new Date()` for `assignedAt`
- **Complexity:** S
- **Dependencies:** None

#### T4: Enhance `PATCH /beds/:id/discharge` to accept `dischargeDate` and optional `dischargeNotes`
- **File:** `backend/src/modules/preoperative/wards.routes.ts:113-154`
- **Change:** Accept optional `dischargeDate` (use instead of `new Date()` for `dischargedAt`) and `dischargeNotes` (store on bed or return in response). Calculate billing from provided date.
- **Complexity:** S
- **Dependencies:** None

#### T5: Add `GET /wards/:wardId/patients` endpoint for ward-specific patient list
- **File:** `backend/src/modules/preoperative/wards.routes.ts`
- **Change:** New route that returns all OCCUPIED beds in a ward with full patient info, vitals count, and last vitals timestamp — used by the ward rounds page to list patients
- **Complexity:** S
- **Dependencies:** None

### Frontend Tasks

#### T6: Build visual bed map on WardsPage (per-ward color-coded grid)
- **File:** `frontend/src/features/wards/WardsPage.jsx`
- **Change:** Add a "Bed Map" sub-tab (or embed within existing Beds tab) showing each ward as a section with a grid of bed tiles. Each tile color-coded: green=VACANT, red=OCCUPIED, yellow=RESERVED, gray=MAINTENANCE. Click occupied bed to expand BedDetailPanel. Click vacant bed to open assign modal.
- **Complexity:** L
- **Dependencies:** T1 (needs bed data, already available via existing hook)

#### T7: Build inpatient dashboard summary cards
- **File:** `frontend/src/features/wards/InpatientPage.jsx`
- **Change:** Add a stats row at the top with 4 cards: Total Beds, Occupied, Admissions Today, Discharges Today — data from `GET /wards/dashboard` (T1)
- **Complexity:** M
- **Dependencies:** T1

#### T8: Add discharge date/notes input to discharge flow
- **File:** `frontend/src/features/wards/WardsPage.jsx`
- **Change:** Replace the `confirm()` dialog for discharge with a Modal that includes a date picker (default: today) and optional notes textarea. Pass `dischargeDate` and `dischargeNotes` to the API.
- **Complexity:** M
- **Dependencies:** T4

#### T9: Add admission date input to assign patient flow
- **File:** `frontend/src/features/wards/WardsPage.jsx`
- **Change:** In the "Assign Patient to Bed" modal, add an optional date picker for admission date (default: today). Pass `admissionDate` to the API.
- **Complexity:** S
- **Dependencies:** T3

#### T10: Enhance ward rounds to show per-bed patient list
- **File:** `frontend/src/features/wards/InpatientPage.jsx`
- **Change:** In the Daily Rounds section, show a list of admitted patients (from `GET /wards/:wardId/patients` T5) so the doctor can see who to round on. Allow selecting a patient from the list when recording a round.
- **Complexity:** M
- **Dependencies:** T5

#### T11: Add i18n translation keys for wards/inpatient
- **Files:** `frontend/src/i18n/locales/en/translation.json`, `frontend/src/i18n/locales/ar/translation.json`
- **Change:** Add `wards` and `inpatient` namespaces with keys for all UI strings (tab labels, button text, form labels, status labels, empty states)
- **Complexity:** S
- **Dependencies:** None (start immediately)

---

## 4. Acceptance Criteria

- [ ] `GET /wards/dashboard` returns `occupancyRate` as a number between 0 and 100
- [ ] `GET /wards/dashboard` returns `admissionsToday` and `dischargesToday` as integers
- [ ] `GET /wards/dashboard` returns `byWard` array with per-ward stats
- [ ] `GET /wards/dashboard/trends?days=7` returns array of 7 daily entries
- [ ] `POST /beds/:id/assign` with `admissionDate` sets `assignedAt` to the provided date
- [ ] `PATCH /beds/:id/discharge` with `dischargeDate` calculates billing from that date
- [ ] `GET /wards/:wardId/patients` returns occupied beds with patient info and last vital timestamp
- [ ] WardsPage bed map shows green/red/yellow/gray tiles per bed status
- [ ] Clicking an occupied bed tile on the bed map opens BedDetailPanel
- [ ] Clicking a vacant bed tile opens the assign patient modal
- [ ] InpatientPage shows 4 summary stat cards at the top
- [ ] Discharge flow shows a modal with date picker and notes input (not just a confirm dialog)
- [ ] Assign patient modal includes optional admission date picker
- [ ] Ward rounds section shows list of admitted patients in the selected ward
- [ ] All ward data responses include `hospitalId` scoping
- [ ] No `JSON.stringify` used in any new backend code (use `safeStringify` from `@voltagent/internal` if needed)

---

## 5. Work Split

### Sr Dev Tasks (Backend + Core Logic)

| Task | Description | Depends On |
|------|-------------|------------|
| T1 | `GET /wards/dashboard` occupancy stats endpoint | None |
| T2 | `GET /wards/dashboard/trends` historical occupancy | None |
| T3 | Enhance bed assign with `admissionDate` | None |
| T4 | Enhance bed discharge with `dischargeDate` + `dischargeNotes` | None |
| T5 | `GET /wards/:wardId/patients` patient list endpoint | None |

**Coordination point:** After T1-T5 merge, Jr Dev can begin T6-T10.

### Jr Dev Tasks (UI Components + Pages)

| Task | Description | Depends On |
|------|-------------|------------|
| T6 | Visual bed map on WardsPage | None (bed data available) |
| T7 | InpatientPage summary stat cards | T1 |
| T8 | Discharge modal with date/notes | T4 |
| T9 | Admission date input in assign modal | T3 |
| T10 | Ward rounds patient list | T5 |
| T11 | i18n translations | None (start immediately) |

### Coordination Points

- **T6 can start immediately** — bed data is already fetched via existing hooks. The visual bed map is purely a UI enhancement using existing data.
- **T7, T8, T9, T10** must wait for their respective backend tasks (T1, T4, T3, T5) to be merged.
- **T11 can start immediately** — no backend dependency.

---

## 6. Files Likely Impacted

### New Files
- None expected (all changes are to existing files)

### Modified Files — Backend
| File | Changes |
|------|---------|
| `backend/src/modules/preoperative/wards.routes.ts` | Add 3 new routes (T1, T2, T5), modify 2 existing routes (T3, T4) |

### Modified Files — Frontend
| File | Changes |
|------|---------|
| `frontend/src/features/wards/WardsPage.jsx` | Add visual bed map grid (T6), discharge modal (T8), admission date input (T9) |
| `frontend/src/features/wards/InpatientPage.jsx` | Add summary stat cards (T7), patient list in rounds (T10) |
| `frontend/src/hooks/queries/useWards.js` | Add `useWardDashboard` query hook for T1 endpoint |
| `frontend/src/i18n/locales/en/translation.json` | Add wards/inpatient keys (T11) |
| `frontend/src/i18n/locales/ar/translation.json` | Add wards/inpatient keys (T11) |

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Bed map performance with many beds (>100 per ward) | Low | Use `React.memo` on bed tiles; ward filter limits rendered beds |
| Discharge billing calculation off-by-one (days) | Medium | Existing code uses `Math.ceil` — verify with edge cases (same-day admission/discharge) |
| `assignedAt` date override breaks billing | Medium | Validate `admissionDate <= now()` on backend; never allow future dates |
| Race condition on bed status (two users assign same bed) | Low | Prisma `update` on unique ID + status check prevents double-assign |
| Backend module lives under `preoperative/` directory | Low | Consider renaming to `wards/` for clarity, but not blocking — routes are mounted correctly at `/api/wards` |
| `WardRound` model is per-ward, not per-bed | Medium | Plan says "doctor enters round notes for each patient" — current model stores one round per ward. To support per-patient rounds, would need to add `bedId` or `patientId` field to `WardRound` model (schema change) — flag for future iteration |
