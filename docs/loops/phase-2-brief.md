# Phase 2 Brief: Patient Management

**Date:** 2026-07-16
**Complexity:** L | **Estimated Effort:** 3–4 days
**Focus Role:** fullstack
**Dependencies:** Phase 0 (multi-tenant), Phase 1 (navigation + role guarding)

---

## 1. Phase Goal

Complete the patient registry with per-hospital MRN generation, duplicate detection, a registration form, advanced search/filtering on the list page, a rich patient detail view with tabbed history and file upload, and a reusable quick-search component. This phase also adds patient merge capability and audit logging for compliance.

---

## 2. Tasks

### 2.1 MRN Generation — `backend/src/modules/patients/patients.routes.ts`

**Status: ALREADY BUILT** — The existing `generateMRN(hospitalId)` function (lines 26-42) already uses the `MRN-{YEAR}-{5-digit-sequence}` format scoped per hospital via `findFirst` with `startsWith: MRN-${year}-`. No changes needed.

### 2.2 Duplicate Detection Endpoint — `backend/src/modules/patients/patients.routes.ts`

Add a `POST /patients/check-duplicates` endpoint that searches for potential duplicates within the same hospital before creating a patient. The endpoint should:

- Accept: `{ fullName, dateOfBirth?, phone?, nationalId? }`
- Query logic: search for patients where ANY of these match within the same hospital:
  - `nationalId` matches exactly (if provided)
  - `fullName` fuzzy match (contains, case-insensitive) AND `dateOfBirth` matches
  - `phone` matches exactly (if provided)
- Return: array of potential matches (id, fullName, mrn, dateOfBirth, phone, nationalId) with match reason
- The query must be hospital-scoped (use `req.user.hospitalId`)
- This endpoint is called by the registration form BEFORE creating the patient

**Complexity:** M

### 2.3 Patient Registration Form — `frontend/src/features/patients/PatientRegistration.jsx`

Build a modal/slide-over registration form component that:

- Fields: fullName (required), phone, nationalId, email, dateOfBirth, gender (MALE/FEMALE select), address, chronicConditions (tag input), diabetesType (select: NONE/TYPE1/TYPE2/GESTATIONAL), notes
- On form submit: call `POST /patients/check-duplicates` first
- If duplicates found: show a warning panel listing potential matches with patient name, MRN, and phone; allow user to proceed anyway or view the existing patient
- If no duplicates (or user proceeds): call `POST /patients` to create
- On success: show success toast, close modal, invalidate patient list query
- Use existing `createPatientSchema` from `backend/src/schemas/reception.schema.js` for validation
- Use existing form patterns from the codebase (Input, Button, Select components)
- Accessible via a "Register Patient" button on the PatientListPage header

**Complexity:** M

### 2.4 Patient List Page Enhancements — `frontend/src/features/patients/PatientListPage.jsx`

Enhance the existing `PatientListPage.jsx` (currently 90 lines) with:

- **Gender filter:** dropdown/select to filter by MALE/FEMALE (add `gender` query param to API)
- **Date range filter:** two date inputs (from/to) for registration date range (add `dateFrom`/`dateTo` query params)
- **"Register Patient" button:** in the header area, opens the PatientRegistration modal (task 2.3)
- **Backend changes:** update `GET /patients` handler to accept `gender`, `dateFrom`, `dateTo` query params and add them to the Prisma `where` clause
- Preserve existing search and pagination functionality

**Complexity:** S (frontend) + S (backend filter params)

### 2.5 Patient Detail Page Tabs — `frontend/src/features/patients/PatientDetailPage.jsx`

Enhance the existing `PatientDetailPage.jsx` (currently 251 lines) to:

- Add **Referrals** tab: show referrals table (type, status, from/to clinic, date) using existing `patient.referrals` data
- Add **Preoperative** tab: show preoperative requests table (status, operation type, date) using existing `patient.preoperativeRequests` data
- Improve **Files** tab: add an upload button + drag-and-drop area that calls `POST /patients/:patientId/files` with FormData; show file type icons (PDF vs image); add delete button per file
- Add **File upload integration:** wire the existing `POST /patients/:patientId/files` endpoint (already built) to the Files tab with a proper upload UI (progress indicator, file type validation message)
- Improve **Clinical Records** tab: show each record as an expandable card instead of a flat table, with vitals summary, diagnosis, and prescriptions
- Improve **Appointments** tab: add status color coding via Badge, show clinic name

**Complexity:** M

### 2.6 Patient Merge Endpoint — `backend/src/modules/patients/patients.routes.ts`

Add a `POST /patients/:id/merge` endpoint (admin-only) that:

- Accepts: `{ sourcePatientId }` — the patient to merge INTO the current patient (target)
- Transfers ALL related records from source to target:
  - Appointments, ClinicalRecords, DiagnosticOrders, ImagingOrders, Referrals, Surgeries, PreoperativeRequests, Transactions, PatientFiles
- After transfer: soft-delete the source patient (set `deletedAt = new Date()`)
- Validates: both patients must be in the same hospital, source != target
- Creates an audit log entry recording the merge (who, when, source MRN → target MRN)
- Returns: summary of transferred record counts

**Complexity:** L

### 2.7 Patient Audit Log — `backend/src/modules/patients/patients.routes.ts`

Add audit logging for patient record changes:

- On `POST /patients` (create): log `{ action: 'CREATE', patientId, mrn, userId }`
- On `PATCH /patients/:id` (update): log `{ action: 'UPDATE', patientId, changes: { field: { old, new } } }`
- On `POST /patients/:id/merge` (merge): log `{ action: 'MERGE', sourcePatientId, targetPatientId }`
- Use the existing `AuditLog` model (referenced in `03-backend-schema.md` section 1.1, model #62)
- Add a `GET /patients/:id/audit` endpoint to retrieve audit history for a patient
- This endpoint requires `patient:read` permission

**Complexity:** M

### 2.8 Quick-Search Component — `frontend/src/components/shared/PatientQuickSearch.jsx`

Build a reusable patient quick-search component for use in reception, pharmacy, clinical, and other pages:

- Debounced input (300ms) that calls `GET /patients/search?q=term`
- Displays results in a dropdown: patient name, MRN, phone, gender
- On select: returns the selected patient object to the parent component
- Props: `onSelect(patient)`, `placeholder?`, `clinicSlug?` (optional, filters to patients in today's queue for that clinic)
- Reuse existing `GET /patients/search` endpoint (already built, line 44-72 of `patients.routes.ts`)
- Style: consistent with existing Input component, dropdown positioned below input

**Complexity:** M

### 2.9 File Upload Integration — `frontend/src/features/patients/PatientDetailPage.jsx`

Integrate file upload with the existing backend endpoint:

- The `POST /patients/:patientId/files` endpoint already exists (lines 93-113 of `patients.routes.ts`) with Supabase storage
- Build an upload UI component: file input (accept PDF, JPEG, PNG, WebP), upload button, progress state
- Use `FormData` with `files[]` field name (matching multer config)
- On upload success: invalidate patient query to refresh file list
- Add file preview for images (thumbnail in file list)
- Add file type icon for PDFs
- Limit: 15MB per file, max 10 files per upload (matching multer config)

**Complexity:** S

### 2.10 Fix Hospital Scoping on Patient Queries — `backend/src/modules/patients/patients.routes.ts`

**Critical fix:** The existing patient list and search endpoints do NOT include `hospitalId` in their `where` clauses. While Prisma middleware exists, it only validates on writes. Add `hospitalId` filter to:

- `GET /patients` (line 133): add `hospitalId: req.user!.hospitalId!` to `where`
- `GET /patients/search` (line 44): add `hospitalId: req.user!.hospitalId!` to `where`
- `GET /patients/:id` (line 163): add `hospitalId: req.user!.hospitalId!` to `where` (or verify via middleware)
- `POST /patients/check-duplicates` (task 2.2): must include hospitalId
- `PATCH /patients/:id`: verify hospitalId scoping

**Complexity:** S

---

## 3. Acceptance Criteria

- [ ] MRN format is `MRN-{YEAR}-{5-digit}` and unique within each hospital (verified — already works)
- [ ] Registration form warns about potential duplicates (by nationalId, name+DOB, or phone) before creating
- [ ] Patient list supports search, gender filter, date range filter, sort, and pagination
- [ ] Patient detail page shows all tabs: Overview, Appointments, Clinical Records, Surgery History, Files, Billing, Referrals, Preoperative
- [ ] Patient detail page allows inline editing of demographics (already works — verified)
- [ ] Files tab supports upload (PDF/images, max 15MB), listing, preview, and download
- [ ] Patient merge transfers all related records and soft-deletes the source
- [ ] Audit log records patient create, update, and merge events
- [ ] Quick-search component is reusable across modules (reception, pharmacy, clinical)
- [ ] All patient queries are hospital-scoped (Hospital A cannot see Hospital B patients)
- [ ] "Register Patient" button is accessible from the PatientListPage
- [ ] Loading, empty, and error states are present on all patient pages
- [ ] Responsive layout works on desktop (lg), tablet (md), and mobile
- [ ] No TypeScript/ESLint errors introduced
- [ ] All existing patient functionality continues to work (list, detail, search, file upload, edit)

---

## 4. Work Split

### Sr Dev — Complex Backend & Integration (estimated 2–2.5 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.2 Duplicate Detection | `backend/src/modules/patients/patients.routes.ts` | M | New endpoint. Requires multi-field fuzzy search with hospital scoping. Must handle edge cases: same name different person, nationalId exact match, phone match. |
| 2.6 Patient Merge | `backend/src/modules/patients/patients.routes.ts` | L | Most complex task. Must transfer records across 9+ related tables atomically (use Prisma transaction). Validate same-hospital constraint. Handle edge cases: source has active admission, source has pending appointments. |
| 2.7 Audit Log | `backend/src/modules/patients/patients.routes.ts` | M | Requires diffing update payloads to capture changed fields. Must integrate with existing AuditLog model. Add retrieval endpoint with pagination. |
| 2.8 Quick-Search Component | `frontend/src/components/shared/PatientQuickSearch.jsx` | M | Reusable component with debounced search, dropdown positioning, keyboard navigation. Must work in multiple parent contexts (reception check-in, pharmacy POS, clinical dashboard). |
| 2.10 Hospital Scoping Fix | `backend/src/modules/patients/patients.routes.ts` | S | Critical security fix. Add `hospitalId` to all patient query `where` clauses. Simple but must not be missed on any endpoint. |

### Jr Dev — Frontend Components & Forms (estimated 1.5–2 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.3 Registration Form | `frontend/src/features/patients/PatientRegistration.jsx` | M | Modal form with validation, duplicate warning panel, success/error handling. Follow existing form patterns (Input, Button, Select). Wire to check-duplicates then create endpoints. |
| 2.4 List Page Enhancements | `frontend/src/features/patients/PatientListPage.jsx` + backend | S | Add gender select, date range inputs, register button. Backend: add 3 query params to existing list endpoint. |
| 2.5 Detail Page Tabs | `frontend/src/features/patients/PatientDetailPage.jsx` | M | Add Referrals and Preoperative tabs (simple tables from existing data). Improve Files tab with upload UI. Improve Clinical Records with expandable cards. |
| 2.9 File Upload Integration | `frontend/src/features/patients/PatientDetailPage.jsx` | S | Wire existing backend endpoint to upload UI. FormData with multer-compatible field name. Progress state, file type validation. |

**Coordination point:** The Jr Dev tasks (2.3, 2.4, 2.5, 2.9) depend on the Sr Dev completing task 2.10 (hospital scoping) and task 2.2 (duplicate detection endpoint — needed by registration form). The Jr Dev should start with task 2.5 (detail page tabs — no backend dependency) and task 2.9 (file upload — endpoint already exists) in parallel while the Sr Dev builds the backend endpoints. Task 2.3 (registration form) should be built after task 2.2 is complete. Task 2.4 (list page filters) can be done anytime.

---

## 5. Files Likely Impacted

### New Files (2)

| File | Description |
|------|-------------|
| `frontend/src/features/patients/PatientRegistration.jsx` | Modal registration form with duplicate detection |
| `frontend/src/components/shared/PatientQuickSearch.jsx` | Reusable debounced patient search dropdown |

### Modified Files (5)

| File | Changes |
|------|---------|
| `backend/src/modules/patients/patients.routes.ts` | Add duplicate detection endpoint, merge endpoint, audit logging, hospital scoping fix, list endpoint filter params |
| `frontend/src/features/patients/PatientListPage.jsx` | Add gender filter, date range filter, register patient button |
| `frontend/src/features/patients/PatientDetailPage.jsx` | Add Referrals tab, Preoperative tab, file upload UI, improved clinical records display |
| `backend/src/schemas/patients.schema.ts` | Add duplicate check schema, merge schema if needed |
| `frontend/src/hooks/queries/usePatients.js` | Add `useCreatePatient` mutation, add `useMergePatients` mutation |

### Reference Files (read-only)

| File | Purpose |
|------|---------|
| `backend/src/schemas/reception.schema.js` | Existing `createPatientSchema` for patient creation validation |
| `backend/src/lib/prisma.js` | Prisma client instance |
| `backend/src/middleware/rbac.ts` | Permission constants (`PATIENT_READ`, `PATIENT_CREATE`, `PATIENT_UPDATE`) |
| `backend/src/middleware/auth.ts` | `authenticate` and `requirePermission` middleware |
| `backend/src/utils/errors.js` | `ValidationError`, `NotFoundError` error classes |
| `frontend/src/lib/api.js` | API client for making requests |
| `frontend/src/components/ui/Input.jsx` | Reusable Input component |
| `frontend/src/components/ui/Button.jsx` | Reusable Button component |
| `frontend/src/components/ui/Modal.jsx` | Reusable Modal component |
| `frontend/src/components/ui/Table.jsx` | Reusable Table component |
| `frontend/src/components/ui/Badge.jsx` | Reusable Badge component |
| `frontend/src/stores/authStore.js` | User permissions source |
| `frontend/src/hooks/queries/useClinics.js` | Clinic data hook (used by PatientListPage) |

---

*This brief is based on: `docs/01-prd.md` (Patient Management section 5.1, MRN spec Appendix A), `docs/02-trd.md` (Patient API section 3.6, MRN generation section 4.4), `docs/03-backend-schema.md` (Patient model section 2.3), `docs/04-ui-ux.md` (Patient List section 3.3, Patient Detail section 3.4), `docs/05-app-flow.md` (patient routes, Flow 1), `docs/06-implementation-plan.md` (Phase 2, lines 172-205), and inspection of existing codebase files.*
