# Phase 4 Brief: Clinical Module — EMR Consultation

**Date:** 2026-07-16
**Complexity:** XL | **Estimated Effort:** 5–7 days
**Focus Role:** fullstack
**Dependencies:** Phase 0 (multi-tenant), Phase 1 (navigation + role guarding), Phase 2 (patients), Phase 3 (appointments & reception)

---

## 1. Phase Goal

Build a comprehensive EMR consultation workflow that extends the existing clinic dashboards with lab/imaging order creation, clinical note templates, abnormal vital sign flagging, and enhanced consultation history on the patient detail page. The existing backend (ClinicalRecord CRUD, queue, stats, ICD-10 search, medications search) and frontend (10 clinic dashboards with vitals, symptoms, prescriptions, SOAP notes, AI diagnosis, referrals, follow-ups) provide a solid foundation — this phase fills the remaining gaps.

---

## 2. Tasks

### 2.1 Abnormal Vital Sign Flagging — `frontend/src/components/clinic/VitalSignsInput.jsx`

**ALREADY BUILT (partial):** The `VitalSignsInput` component exists and is used across all clinic dashboards. It captures BP, HR, Temp, SpO2, Blood Glucose, and Weight.

**What's needed:** Add visual abnormal value detection with color-coded indicators:

- Temp > 38.3°C (101°F) → red warning badge
- BP systolic > 140 or diastolic > 90 → amber warning badge
- Heart rate > 100 or < 60 → amber warning badge
- SpO2 < 95% → red warning badge
- Blood glucose > 200 mg/dL → red warning badge
- Each input field shows a small inline badge when abnormal
- Validation: prevent saving if any critical value is present (optional override with reason)

**Complexity:** S

### 2.2 Lab Order Creation from Consultation — Backend + Frontend

**Backend:** Add `POST /clinics/:slug/lab-order` endpoint to `backend/src/modules/clinics/clinics.routes.ts`:

- Accept: `{ patientId, testIds[], panelId?, clinicalNotes?, priority? }`
- Validate: patient exists, clinic exists, tests exist (from `DiagnosticTest` catalog)
- Create a `DiagnosticOrder` linked to the patient, ordering clinic, and requesting doctor
- Also create a `Referral` with type `LAB_DISPATCH` (following existing pattern in `referral.routes.ts`)
- Require `clinical:write` permission
- Return the created order

**Frontend:** Build `LabOrderModal` component (`frontend/src/components/clinic/LabOrderModal.jsx`):

- Modal triggered by "Order Lab Tests" button in clinic dashboards
- Searchable test catalog (fetch from `GET /lab/tests`)
- Panel selection (fetch from `GET /lab/panels`)
- Selected tests list with remove capability
- Clinical notes textarea
- Priority toggle (Routine / Urgent / STAT)
- Submit button → calls `POST /clinics/:slug/lab-order`
- Add the button to all clinic dashboards (MedicineDashboard, ENTDashboard, etc.)

**Complexity:** M (backend) + M (frontend)

### 2.3 Imaging Order Creation from Consultation — Backend + Frontend

**Backend:** Add `POST /clinics/:slug/imaging-order` endpoint to `backend/src/modules/clinics/clinics.routes.ts`:

- Accept: `{ patientId, scanType, laterality?, clinicalInfo?, procedureTypeId? }`
- Validate: patient exists, clinic exists, scan type valid (`ImagingScanType` enum)
- Create an `ImagingOrder` linked to the patient, requesting clinic, and imaging clinic
- Also create a `Referral` with type `INTERNAL_CLINIC` to the imaging clinic
- Require `clinical:write` permission
- Return the created order

**Frontend:** Build `ImagingOrderModal` component (`frontend/src/components/clinic/ImagingOrderModal.jsx`):

- Modal triggered by "Order Imaging" button in clinic dashboards
- Scan type selection (A-Scan, B-Scan, OCT, Biometry — from `ImagingScanType` enum)
- Laterality dropdown (Left / Right / Both)
- Clinical info textarea
- Procedure type selection (fetch from `GET /admin/pricing/imaging-procedure-types`)
- Submit button → calls `POST /clinics/:slug/imaging-order`
- Add the button to relevant ophthalmology clinic dashboards (Retina, Glaucoma, Orbit, Gen Ophth, Peds Ophth, Optometry)

**Complexity:** M (backend) + M (frontend)

### 2.4 Clinical Note Templates — Backend + Frontend

**Backend:** Add template management endpoints to `backend/src/modules/clinics/clinics.routes.ts`:

- `GET /clinics/:slug/templates` — list templates for a clinic type (from `clinicSpecificJson` or a new `ClinicalTemplate` model)
- `POST /clinics/:slug/templates` — create a template (admin/doctor only)
- `DELETE /clinics/:slug/templates/:id` — delete a template

**Approach:** Store templates in a new `ClinicalTemplate` Prisma model:
- `id`, `name`, `clinicType` (ClinicType enum), `sections` (Json — array of section objects with title, field type, default value), `createdById`, `hospitalId`, `createdAt`, `updatedAt`
- Seed default templates per clinic type (e.g., "General Consultation", "Eye Exam", "Dental Exam")

**Frontend:** Build `TemplateLoader` component (`frontend/src/components/clinic/TemplateLoader.jsx`):

- Dropdown to select a template
- On select: populate the consultation form fields (SOAP notes, diagnosis, vitals placeholders)
- "Save as Template" button to save current form state as a new template
- Add to all clinic dashboards above the SOAP notes section

**Complexity:** M (backend) + M (frontend)

### 2.5 Consultation History Enhancement — `frontend/src/features/patients/PatientDetailPage.jsx`

**ALREADY BUILT (partial):** The Patient Detail page has a "Clinical Records" tab that shows records in a table.

**What's needed:** Enhance to a timeline view with expand/collapse:

- Each record shown as a card with date, clinic name, diagnosis badge, and vitals summary
- Click to expand: shows full vitals, symptoms list, medications list, SOAP notes, and linked lab/imaging results
- Add "Print" button per record (reuse existing `GET /clinics/:slug/print-report/:recordId` endpoint)
- Add "View Lab Results" link if lab orders exist for that encounter
- Sort by encounter date (newest first)

**Complexity:** M

### 2.6 Unified Consultation Page — `frontend/src/features/clinics/ConsultationPage.jsx`

**ALREADY BUILT (partial):** Each clinic dashboard (MedicineDashboard, ENTDashboard, etc.) IS the consultation page. They all follow the same pattern via `ClinicDashboardShell`.

**What's needed:** Create a lightweight `ConsultationPage` that:

- Accepts a `clinicSlug` and `appointmentId` as route params (`/clinic/:slug/consultation/:appointmentId`)
- Loads the appointment context (patient, clinic, doctor)
- Redirects to the existing clinic dashboard with the patient pre-selected
- This provides a direct-linkable URL from the appointment queue (e.g., clicking a patient in the queue navigates to this page)
- Update `ClinicQueuePanel` to link to this route instead of just selecting the patient

**Complexity:** S

### 2.7 Referral Enhancement from Consultation — `frontend/src/components/referral/CrossReferralModal.jsx`

**ALREADY BUILT (partial):** `CrossReferralModal` exists and is used in all clinic dashboards.

**What's needed:**

- Add "Lab Dispatch" referral type option (currently only shows `INTERNAL_CLINIC`)
- Add "Pharmacy Dispatch" referral type option with medication list (reuse `ReferralMedication` pattern)
- Pre-fill patient context from the selected patient
- Show referral status (pending/dispatched/fulfilled) in the consultation history

**Complexity:** S

### 2.8 Backend: ICD-10 Search Endpoint Verification — `backend/src/modules/ai/ai.routes.ts`

**ALREADY BUILT:** The `GET /ai/icd10` endpoint exists (line 39 of `ai.routes.ts`) and the frontend `useIcd10Search` hook calls it.

**What's needed:** Verify the endpoint:

- Returns paginated results (currently returns all matches, capped at 20)
- Supports `hospitalId` scoping (Icd10Code table doesn't have hospitalId — it's a shared reference table, so this is correct)
- Add `category` filter parameter for specialty-specific filtering
- Add `code` exact-match parameter for direct code lookup

**Complexity:** S

### 2.9 Consultation Print Enhancement — `frontend/src/components/clinic/EncounterSummary.jsx`

**ALREADY BUILT (partial):** `EncounterSummary` component exists and generates print-ready HTML.

**What's needed:**

- Add lab results section to the print output (if lab orders exist for the encounter)
- Add imaging results section (if imaging orders exist)
- Add referral information section
- Format as A4 layout with hospital header (reuse existing print pattern from `clinics.helpers.ts`)
- Add thermal receipt format option (80mm width)

**Complexity:** M

### 2.10 Hospital Scoping Audit — `backend/src/modules/clinics/clinics.routes.ts`

**CRITICAL FIX:** The existing clinic endpoints do NOT consistently include `hospitalId` in their queries. While the Prisma middleware validates on writes, reads are not filtered.

**What's needed:** Add `hospitalId` filter to:

- `GET /clinics/:slug/dashboard` (line 23): verify clinic belongs to hospital
- `GET /clinics/:slug/queue` (line 118): add `hospitalId` to appointment query
- `GET /clinics/:slug/records` (line 95): add `hospitalId` to clinical record query
- `GET /clinics/:slug/stats` (line 158): add `hospitalId` to all count queries
- `GET /clinics/:slug/history` (line 262): add `hospitalId` to appointment and record queries
- `POST /clinics/:slug/record` (line 38): verify clinic belongs to hospital before creating
- `POST /clinics/:slug/lab-order` (new task 2.2): must include hospitalId
- `POST /clinics/:slug/imaging-order` (new task 2.3): must include hospitalId

**Complexity:** S

### 2.11 Medications Autocomplete Enhancement — `frontend/src/components/clinic/PrescriptionWriter.jsx`

**ALREADY BUILT (partial):** `PrescriptionWriter` component exists with drug name input.

**What's needed:**

- Connect to existing `GET /clinics/:slug/medications?search=` endpoint (already built, line 200 of `clinics.routes.ts`)
- Add debounced search (300ms) with dropdown results
- Show drug name, dosage form, and price in results
- Auto-fill dosage and frequency from common patterns
- Add "frequency" dropdown (Once daily, Twice daily, Three times daily, Four times daily, As needed, etc.)
- Add "route" dropdown (Oral, IV, IM, SC, Topical, Ophthalmic, etc.)

**Complexity:** M

---

## 3. Acceptance Criteria

- [ ] Vital signs form visually flags abnormal values (temp >38.3, BP >140/90, HR >100/<60, SpO2 <95%, glucose >200) with color-coded badges
- [ ] Lab orders can be created directly from any clinic dashboard with test selection, clinical notes, and priority
- [ ] Imaging orders can be created from ophthalmology clinic dashboards with scan type, laterality, and clinical info
- [ ] Clinical note templates can be loaded, filled, and saved per clinic type
- [ ] Consultation history on patient detail page shows expandable cards with vitals, symptoms, medications, and linked results
- [ ] Direct-linkable consultation URL (`/clinic/:slug/consultation/:appointmentId`) loads patient context
- [ ] Referral modal supports all referral types (Internal Clinic, Lab Dispatch, Pharmacy Dispatch)
- [ ] ICD-10 search supports category filtering and exact code lookup
- [ ] Print output includes lab results, imaging results, and referral information
- [ ] All clinic endpoints are hospital-scoped (cross-tenant isolation verified)
- [ ] Prescription writer has debounced drug search with frequency and route dropdowns
- [ ] All new endpoints include input validation (Zod), permission checks, and error handling
- [ ] All new frontend components have loading, empty, and error states
- [ ] Responsive layout works on desktop, tablet, and mobile
- [ ] No TypeScript/ESLint errors introduced

---

## 4. Work Split

### Sr Dev — Backend Endpoints & Integration (estimated 3–3.5 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.2 Lab Order Backend | `backend/src/modules/clinics/clinics.routes.ts` + `clinics.validation.ts` | M | New endpoint. Must create DiagnosticOrder + Referral atomically. Reuse existing lab order creation pattern from `lab.routes.ts`. |
| 2.3 Imaging Order Backend | `backend/src/modules/clinics/clinics.routes.ts` + `clinics.validation.ts` | M | New endpoint. Must create ImagingOrder + Referral atomically. Reuse existing imaging order pattern from `imaging.routes.ts`. |
| 2.4 Template Backend | `backend/src/modules/clinics/clinics.routes.ts` + new Prisma model + migration | M | New `ClinicalTemplate` model. CRUD endpoints. Seed default templates per clinic type. |
| 2.8 ICD-10 Search Enhancement | `backend/src/modules/ai/ai.routes.ts` | S | Add `category` and `code` query params to existing endpoint. Simple filter additions. |
| 2.10 Hospital Scoping Audit | `backend/src/modules/clinics/clinics.routes.ts` | S | Critical security fix. Add `hospitalId` to all clinic query `where` clauses. Systematic audit of every endpoint. |

### Jr Dev — Frontend Components & UI (estimated 2–2.5 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.1 Vital Signs Flagging | `frontend/src/components/clinic/VitalSignsInput.jsx` | S | Add inline warning badges per field. Threshold config object. No backend changes. |
| 2.2 Lab Order Modal | `frontend/src/components/clinic/LabOrderModal.jsx` + dashboard integration | M | New modal component. Searchable test catalog, panel selection, priority toggle. Wire to new backend endpoint. Add button to all 10 clinic dashboards. |
| 2.3 Imaging Order Modal | `frontend/src/components/clinic/ImagingOrderModal.jsx` + dashboard integration | M | New modal component. Scan type, laterality, clinical info. Wire to new backend endpoint. Add button to 6 ophthalmology dashboards. |
| 2.4 Template Loader | `frontend/src/components/clinic/TemplateLoader.jsx` + dashboard integration | M | Dropdown + save-as-template. Wire to new backend endpoints. Add to all dashboards. |
| 2.5 Consultation History | `frontend/src/features/patients/PatientDetailPage.jsx` | M | Enhance Clinical Records tab with expandable cards, vitals summary, linked results. |
| 2.6 ConsultationPage | `frontend/src/features/clinics/ConsultationPage.jsx` + router update | S | Thin wrapper that loads appointment context and redirects to clinic dashboard. Update `ClinicQueuePanel` links. |
| 2.7 Referral Enhancement | `frontend/src/components/referral/CrossReferralModal.jsx` | S | Add Lab Dispatch and Pharmacy Dispatch type options. Pre-fill patient context. |
| 2.9 Print Enhancement | `frontend/src/components/clinic/EncounterSummary.jsx` | M | Add lab/imaging/referral sections to print output. A4 and thermal layouts. |
| 2.11 Prescription Writer | `frontend/src/components/clinic/PrescriptionWriter.jsx` | M | Debounced drug search, frequency dropdown, route dropdown. Wire to existing medications endpoint. |

**Coordination point:** The Jr Dev should start with tasks 2.1, 2.5, 2.6, 2.7 (no new backend dependency) in parallel while the Sr Dev builds tasks 2.2, 2.3, 2.4 (new backend endpoints). Task 2.2 (Lab Order Modal) and task 2.3 (Imaging Order Modal) depend on the Sr Dev completing the corresponding backend endpoints. Task 2.11 (Prescription Writer) can be done anytime since the backend endpoint already exists. Task 2.4 (Template Loader) depends on the Sr Dev completing the template backend + migration.

---

## 5. Files Likely Impacted

### New Files (5)

| File | Description |
|------|-------------|
| `frontend/src/components/clinic/LabOrderModal.jsx` | Modal for creating lab orders from consultation |
| `frontend/src/components/clinic/ImagingOrderModal.jsx` | Modal for creating imaging orders from consultation |
| `frontend/src/components/clinic/TemplateLoader.jsx` | Clinical note template loader/saver component |
| `frontend/src/features/clinics/ConsultationPage.jsx` | Direct-linkable consultation page wrapper |
| `backend/prisma/migrations/...` | Migration for new `ClinicalTemplate` model |

### Modified Files (8)

| File | Changes |
|------|---------|
| `backend/src/modules/clinics/clinics.routes.ts` | Add lab-order, imaging-order, template CRUD endpoints; hospital scoping fix on all existing endpoints |
| `backend/src/schemas/clinics.schema.ts` | Add validation schemas for lab-order, imaging-order, template create |
| `frontend/src/components/clinic/VitalSignsInput.jsx` | Add abnormal value flagging with color-coded badges |
| `frontend/src/components/clinic/PrescriptionWriter.jsx` | Add debounced drug search, frequency/route dropdowns |
| `frontend/src/components/clinic/EncounterSummary.jsx` | Add lab/imaging/referral sections to print output |
| `frontend/src/components/referral/CrossReferralModal.jsx` | Add Lab Dispatch and Pharmacy Dispatch referral types |
| `frontend/src/features/patients/PatientDetailPage.jsx` | Enhance Clinical Records tab with expandable timeline cards |
| `frontend/src/app/App.jsx` | Add `/clinic/:slug/consultation/:appointmentId` route |

### Reference Files (read-only)

| File | Purpose |
|------|---------|
| `backend/src/modules/lab/lab.routes.ts` | Existing lab order creation pattern to reuse |
| `backend/src/modules/imaging/imaging.routes.ts` | Existing imaging order creation pattern to reuse |
| `backend/src/middleware/rbac.ts` | Permission constants (`CLINICAL_READ`, `CLINICAL_WRITE`) |
| `backend/src/middleware/auth.ts` | `authenticate` and `requirePermission` middleware |
| `backend/src/lib/prisma.js` | Prisma client instance |
| `frontend/src/hooks/useClinicalRecords.js` | Existing clinical records hook |
| `frontend/src/hooks/useAIDiagnosis.js` | Existing ICD-10 search hook |
| `frontend/src/hooks/useClinicQueue.js` | Existing clinic queue hook |
| `frontend/src/components/clinic/ClinicDashboardShell.jsx` | Shared clinic dashboard layout |
| `frontend/src/components/clinic/ClinicQueuePanel.jsx` | Queue panel (update links to ConsultationPage) |
| `frontend/src/components/ui/Modal.jsx` | Reusable Modal component |
| `frontend/src/components/ui/Badge.jsx` | Reusable Badge component |
| `frontend/src/components/ui/Button.jsx` | Reusable Button component |
| `frontend/src/stores/authStore.js` | User permissions source |
| `frontend/src/data/symptoms.js` | Symptom suggestions data |

---

*This brief is based on: `docs/01-prd.md` (Consultation/EMR section 5.3), `docs/02-trd.md` (Clinical API contracts section 3.4), `docs/03-backend-schema.md` (ClinicalRecord/VitalSign/Symptom/Medication/Icd10Code models section 2.5), `docs/04-ui-ux.md` (Consultation page wireframes section 3.7), `docs/05-app-flow.md` (Clinical routes, doctor workflow Flow 1), `docs/06-implementation-plan.md` (Phase 4, lines 248-286), and inspection of existing codebase files including `backend/src/modules/clinics/clinics.routes.ts`, `frontend/src/features/clinics/MedicineDashboard.jsx`, and the Prisma schema.*
