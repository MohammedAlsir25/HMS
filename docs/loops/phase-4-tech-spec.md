# Phase 4 Tech Spec: Clinical Module — EMR Consultation

**Date:** 2026-07-16  
**Author:** Tech Lead  
**Status:** Ready for implementation  
**Depends on:** Phase 0 (hospitalId in auth context), Phase 1 (navigation + role guarding), Phase 2 (patients), Phase 3 (appointments & reception)

---

## 1. Key Architectural Decisions

### 1.1 Vital Sign Abnormal Flagging is Purely Client-Side

**Decision:** Abnormal vital sign detection happens entirely in the frontend `VitalSignsInput.jsx` component. The backend `POST /clinics/:slug/record` endpoint does not validate or flag abnormal values.

**Rationale:** The threshold config (Temp >38.3, BP >140/90, HR >100/<60, SpO2 <95%, Glucose >200) is a clinical display concern, not a data integrity concern. Adding server-side validation would block saves in edge cases where the doctor intentionally records an abnormal value as part of treatment monitoring. The warning badges are visual aids, not hard constraints. Keeping this client-side means zero backend changes for task 2.1 and allows per-clinic threshold customization in the future without schema changes.

### 1.2 Lab/Imaging Orders Created as `DiagnosticOrder` + `ImagingOrder` with `Referral` Companion Record

**Decision:** When a doctor orders labs from a clinic dashboard, two records are created atomically inside a Prisma `$transaction`: a `DiagnosticOrder` (for the lab module to pick up) and a `Referral` with type `LAB_DISPATCH` (for the referral module to track). Same pattern for imaging: `ImagingOrder` + `Referral` with type `INTERNAL_CLINIC` to the imaging clinic.

**Rationale:** The existing lab module (`lab.routes.ts`) already consumes `DiagnosticOrder` records and manages the full lifecycle (submit → assign → results → complete). Creating a `DiagnosticOrder` from the clinic endpoint reuses that entire pipeline without duplicating logic. The companion `Referral` record gives the referral module visibility — doctors can track "did my lab order get dispatched?" from both the clinic dashboard and the referrals page. The `$transaction` ensures the order and referral are created atomically or not at all.

### 1.3 Templates Stored as a New `ClinicalTemplate` Prisma Model (Not JSON in `clinicSpecificJson`)

**Decision:** Create a new `ClinicalTemplate` model with fields `id`, `name`, `clinicType` (ClinicType enum), `sections` (Json array), `createdById`, `hospitalId`, `createdAt`, `updatedAt`. Do NOT store templates in the existing `ClinicalRecord.clinicSpecificJson` field.

**Rationale:** `clinicSpecificJson` is a per-record field that stores consultation-specific data (like autorefraction values for optometry). Templates are reusable definitions — they have a different lifecycle (create once, load many times) and need their own CRUD endpoints. Storing them in `clinicSpecificJson` would conflate record data with template metadata and make querying "all templates for ENT clinic" require JSON traversal. A dedicated model gives proper indexing, hospital scoping, and clean API design.

### 1.4 Consultation Page is a Thin Router Wrapper, Not a New Dashboard

**Decision:** `ConsultationPage.jsx` accepts `:slug` and `:appointmentId` route params, loads the appointment context, and redirects to the existing clinic dashboard (`/clinic/:slug`) with the patient pre-selected via URL search params or state. It does NOT duplicate the clinic dashboard layout.

**Rationale:** Every clinic already has a fully-featured dashboard (`MedicineDashboard`, `ENTDashboard`, etc.) with the complete consultation form. Creating a separate "consultation page" would duplicate 90% of that code. Instead, `ConsultationPage` acts as a bridge: it resolves the appointment → patient mapping, then hands off to the existing dashboard. This gives us a direct-linkable URL (`/clinic/:slug/consultation/:appointmentId`) for the queue panel to navigate to, without building a parallel UI.

### 1.5 Hospital Scoping Fix Applied to ALL Existing Clinic Endpoints Before New Work

**Decision:** Task 2.10 (hospital scoping audit) is the FIRST task in the implementation order. Every existing query in `clinics.routes.ts` that lacks `hospitalId` filtering gets fixed before any new endpoints are added.

**Rationale:** This is the same security pattern from Phase 2 and Phase 3. The existing clinic endpoints (`GET /:slug/dashboard`, `GET /:slug/records`, `GET /:slug/queue`, `GET /:slug/stats`, `GET /:slug/history`) query across all hospitals. A clinic doctor at Hospital A could theoretically see Hospital B's queue, records, or stats by guessing slugs. The fix is a one-line addition to each `where` clause. Doing this FIRST means all new endpoints built in Phase 4 inherit the correct pattern from the start.

### 1.6 Prescription Writer Debounced Search Uses Existing Medications Endpoint

**Decision:** The `PrescriptionWriter` component connects to the already-existing `GET /clinics/:slug/medications?search=` endpoint (line 200 of `clinics.routes.ts`). No new backend endpoint needed. The `DrugNameAutocomplete.jsx` component already exists and calls this endpoint — the enhancement adds debouncing, frequency dropdown, and route dropdown to the existing form.

**Rationale:** The medications endpoint already exists and works. The `DrugNameAutocomplete` component already does the search. The brief's task 2.11 is purely frontend enhancement of the existing `PrescriptionWriter` form — adding structured dropdowns for frequency and route instead of free-text input.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vital sign flagging | Client-side only, inline badges | Zero backend changes; thresholds are display concerns; doctors need to record abnormal values |
| Lab order creation | `DiagnosticOrder` + `Referral` in `$transaction` | Reuses existing lab pipeline; referral provides tracking visibility |
| Imaging order creation | `ImagingOrder` + `Referral` in `$transaction` | Same pattern as lab; reuses imaging module lifecycle |
| Template storage | New `ClinicalTemplate` Prisma model | Dedicated CRUD; hospital-scoped; clean query vs JSON nesting |
| Consultation page | Thin router wrapper → redirect to existing dashboard | No code duplication; gives direct-linkable URL |
| Hospital scoping | Fix all existing endpoints FIRST (task 2.10) | Security-critical; blocks everything else |
| Prescription search | Reuse existing `GET /:slug/medications` endpoint | Endpoint already works; frontend-only enhancement |
| ICD-10 search | Enhance existing `GET /ai/icd10` endpoint | Add `category` + `code` query params; no new endpoint |
| Print enhancement | Extend existing `EncounterSummary.jsx` print template | Same HTML-based print approach; add lab/imaging/referral sections |
| Referral types | Extend existing `CrossReferralModal.jsx` options | `LAB_DISPATCH` and `PHARMACY_DISPATCH` already in `ReferralType` enum |
| Consultation history | Enhance existing `ClinicalRecordCard` in `PatientDetailPage.jsx` | Already has expand/collapse; add vitals, symptoms, medications, linked results |
| Route registration | Add `/clinic/:slug/consultation/:appointmentId` in `App.jsx` | Follows existing `/clinic/:slug` pattern; lazy-loaded with RoleGuard |

---

## 3. Work Split

### 3.1 Sr Dev — Backend Endpoints & Security (estimated 3–3.5 days)

**Order:** 2.10 (hospital scoping — critical security, unblocks everything) → 2.2 (lab order endpoint) → 2.3 (imaging order endpoint) → 2.4 (template CRUD endpoints + migration) → 2.8 (ICD-10 search enhancement).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.10 | Hospital Scoping Audit | `clinics.routes.ts` | S | Add `hospitalId` to 8+ existing endpoint queries. Critical security fix. |
| 2.2 | Lab Order Endpoint | `clinics.routes.ts` + `clinics.schema.ts` | M | New `POST /:slug/lab-order`. Atomic `DiagnosticOrder` + `Referral`. Reuse pattern from `lab.routes.ts` (line 62-100). |
| 2.3 | Imaging Order Endpoint | `clinics.routes.ts` + `clinics.schema.ts` | M | New `POST /:slug/imaging-order`. Atomic `ImagingOrder` + `Referral`. Reuse pattern from imaging module. |
| 2.4 | Template CRUD Endpoints | `clinics.routes.ts` + `clinics.schema.ts` + Prisma migration | M | New `ClinicalTemplate` model. `GET /:slug/templates`, `POST /:slug/templates`, `DELETE /:slug/templates/:id`. Seed defaults. |
| 2.8 | ICD-10 Search Enhancement | `ai.routes.ts` | S | Add `category` and `code` query params to `GET /ai/icd10`. |

### 3.2 Jr Dev — Frontend Components & UI (estimated 2.5–3 days)

**Start immediately:** 2.1 (vitals flagging — no backend dependency), 2.5 (consultation history — uses existing data), 2.6 (consultation page wrapper — thin redirect), 2.7 (referral enhancement — existing modal), 2.9 (print enhancement — existing component), 2.11 (prescription writer — existing endpoint).  
**After 2.2 complete:** 2.2 frontend (lab order modal — needs new backend endpoint).  
**After 2.3 complete:** 2.3 frontend (imaging order modal — needs new backend endpoint).  
**After 2.4 complete:** 2.4 frontend (template loader — needs new backend endpoints).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.1 | Vital Signs Flagging | `VitalSignsInput.jsx` | S | Add inline warning badges per field. Threshold config object. No backend changes. |
| 2.2 FE | Lab Order Modal | `LabOrderModal.jsx` + dashboard integration | M | New modal. Searchable test catalog, panel selection, priority toggle. Wire to new endpoint. Add button to all 10 clinic dashboards. |
| 2.3 FE | Imaging Order Modal | `ImagingOrderModal.jsx` + dashboard integration | M | New modal. Scan type, laterality, clinical info. Wire to new endpoint. Add button to 6 ophthalmology dashboards. |
| 2.4 FE | Template Loader | `TemplateLoader.jsx` + dashboard integration | M | Dropdown + save-as-template. Wire to new endpoints. Add to all dashboards above SOAP notes. |
| 2.5 | Consultation History | `PatientDetailPage.jsx` | M | Enhance `ClinicalRecordCard` with vitals, symptoms, medications, linked lab/imaging results, print button. |
| 2.6 | Consultation Page | `ConsultationPage.jsx` + `App.jsx` route | S | Thin wrapper: load appointment → redirect to clinic dashboard with patient pre-selected. |
| 2.7 | Referral Enhancement | `CrossReferralModal.jsx` | S | Add Lab Dispatch and Pharmacy Dispatch type options. Pre-fill patient context. |
| 2.9 | Print Enhancement | `EncounterSummary.jsx` | M | Add lab/imaging/referral sections. A4 + thermal layout options. |
| 2.11 | Prescription Writer | `PrescriptionWriter.jsx` + `DrugNameAutocomplete.jsx` | M | Debounced drug search, frequency dropdown, route dropdown. |

---

## 4. Exact File Lists

### Sr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| 2.4 | `backend/prisma/migrations/YYYYMMDD_add_clinical_templates/migration.sql` | Schema migration for `ClinicalTemplate` model |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| 2.10 | `backend/src/modules/clinics/clinics.routes.ts` | Add `hospitalId` to `GET /:slug/dashboard`, `GET /:slug/records`, `GET /:slug/queue`, `GET /:slug/stats`, `GET /:slug/history`, `GET /:slug/doctors`, `GET /:slug/medications`, `GET /:slug/screening-queue`, `GET /:slug/upcoming-follow-ups` |
| 2.2 | `backend/src/modules/clinics/clinics.routes.ts` | Add `POST /:slug/lab-order` endpoint |
| 2.2 | `backend/src/schemas/clinics.schema.ts` | Add `createLabOrderSchema` Zod validation |
| 2.3 | `backend/src/modules/clinics/clinics.routes.ts` | Add `POST /:slug/imaging-order` endpoint |
| 2.3 | `backend/src/schemas/clinics.schema.ts` | Add `createImagingOrderSchema` Zod validation |
| 2.4 | `backend/src/modules/clinics/clinics.routes.ts` | Add `GET /:slug/templates`, `POST /:slug/templates`, `DELETE /:slug/templates/:id` |
| 2.4 | `backend/src/schemas/clinics.schema.ts` | Add `createTemplateSchema` Zod validation |
| 2.4 | `backend/prisma/schema.prisma` | Add `ClinicalTemplate` model |
| 2.8 | `backend/src/modules/ai/ai.routes.ts` | Add `category` and `code` query params to `GET /ai/icd10` |

### Jr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| 2.2 FE | `frontend/src/components/clinic/LabOrderModal.jsx` | Modal for creating lab orders from consultation |
| 2.3 FE | `frontend/src/components/clinic/ImagingOrderModal.jsx` | Modal for creating imaging orders from consultation |
| 2.4 FE | `frontend/src/components/clinic/TemplateLoader.jsx` | Clinical note template loader/saver component |
| 2.6 | `frontend/src/features/clinics/ConsultationPage.jsx` | Direct-linkable consultation page wrapper |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| 2.1 | `frontend/src/components/clinic/VitalSignsInput.jsx` | Add abnormal value flagging with color-coded inline badges |
| 2.2 FE | `frontend/src/features/clinics/MedicineDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.2 FE | `frontend/src/features/clinics/ENTDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.2 FE | `frontend/src/features/clinics/DentalDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.2 FE | `frontend/src/features/clinics/RetinaDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.2 FE | `frontend/src/features/clinics/GlaucomaDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.2 FE | `frontend/src/features/clinics/OrbitDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.2 FE | `frontend/src/features/clinics/PedsOphthDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.2 FE | `frontend/src/features/clinics/GenOphthDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.2 FE | `frontend/src/features/clinics/OptometryDashboard.jsx` | Add "Order Lab Tests" button + LabOrderModal integration |
| 2.3 FE | `frontend/src/features/clinics/RetinaDashboard.jsx` | Add "Order Imaging" button + ImagingOrderModal integration |
| 2.3 FE | `frontend/src/features/clinics/GlaucomaDashboard.jsx` | Add "Order Imaging" button + ImagingOrderModal integration |
| 2.3 FE | `frontend/src/features/clinics/OrbitDashboard.jsx` | Add "Order Imaging" button + ImagingOrderModal integration |
| 2.3 FE | `frontend/src/features/clinics/PedsOphthDashboard.jsx` | Add "Order Imaging" button + ImagingOrderModal integration |
| 2.3 FE | `frontend/src/features/clinics/GenOphthDashboard.jsx` | Add "Order Imaging" button + ImagingOrderModal integration |
| 2.3 FE | `frontend/src/features/clinics/OptometryDashboard.jsx` | Add "Order Imaging" button + ImagingOrderModal integration |
| 2.4 FE | All 10 clinic dashboards | Add TemplateLoader above SOAP notes section |
| 2.5 | `frontend/src/features/patients/PatientDetailPage.jsx` | Enhance `ClinicalRecordCard` with vitals, symptoms, medications, linked results, print |
| 2.6 | `frontend/src/app/App.jsx` | Add `/clinic/:slug/consultation/:appointmentId` route |
| 2.7 | `frontend/src/features/referral/CrossReferralModal.jsx` | Add Lab Dispatch and Pharmacy Dispatch type options |
| 2.9 | `frontend/src/components/clinic/EncounterSummary.jsx` | Add lab/imaging/referral sections, A4 + thermal layouts |
| 2.11 | `frontend/src/components/clinic/PrescriptionWriter.jsx` | Frequency dropdown, route dropdown, debounced search integration |

### Reference Files (read-only)

| File | Purpose |
|------|---------|
| `backend/src/modules/lab/lab.routes.ts` | Existing lab order creation pattern (lines 62-100) |
| `backend/src/middleware/rbac.ts` | Permission constants (`CLINICAL_READ`, `CLINICAL_WRITE`, `DIAGNOSTICS_READ`, `DIAGNOSTICS_ORDER`) |
| `backend/src/middleware/auth.ts` | `authenticate` and `requirePermission` middleware |
| `backend/src/lib/prisma.js` | Prisma client instance |
| `frontend/src/hooks/useClinicalRecords.js` | Existing clinical records hook |
| `frontend/src/hooks/useAIDiagnosis.js` | Existing ICD-10 search hook (`useIcd10Search`) |
| `frontend/src/hooks/useClinicQueue.js` | Existing clinic queue hook |
| `frontend/src/components/clinic/ClinicDashboardShell.jsx` | Shared clinic dashboard layout (`ClinicSection`, `StatCard`) |
| `frontend/src/components/clinic/ClinicQueuePanel.jsx` | Queue panel (update links to ConsultationPage) |
| `frontend/src/components/clinic/DrugNameAutocomplete.jsx` | Existing drug search autocomplete |
| `frontend/src/components/ui/Modal.jsx` | Reusable Modal component |
| `frontend/src/components/ui/Badge.jsx` | Reusable Badge component |
| `frontend/src/components/ui/Button.jsx` | Reusable Button component |
| `frontend/src/components/ui/Input.jsx` | Reusable Input component |
| `frontend/src/stores/authStore.js` | User permissions source |

---

## 5. Implementation Details — Sr Dev

### 2.10 Hospital Scoping Audit — `clinics.routes.ts`

**Priority:** FIRST task. Critical security fix. All existing clinic endpoints must be hospital-scoped before adding new features.

#### Audit Checklist

Every query in `clinics.routes.ts` that reads data must include `hospitalId: req.user!.hospitalId!` in its `where` clause. The clinic itself should also be verified to belong to the hospital.

**Endpoints to fix:**

| Endpoint | Current Issue | Fix |
|----------|--------------|-----|
| `GET /` (line 15) | Lists ALL active clinics | Add `hospitalId` filter |
| `GET /:slug/dashboard` (line 23) | No hospital check on clinic lookup | Add `hospitalId` to `findFirst` where |
| `GET /:slug/records` (line 95) | Queries records by `clinicId` only | Add `hospitalId` to `where` |
| `GET /:slug/queue` (line 118) | Queries appointments by `clinicId` only | Add `hospitalId` to `where` |
| `GET /:slug/stats` (line 158) | All count queries lack `hospitalId` | Add `hospitalId` to all `count`/`groupBy` where clauses |
| `GET /:slug/doctors` (line 189) | Queries users by `clinicId` only | Add `hospitalId` to `where` |
| `GET /:slug/medications` (line 200) | Queries inventory items without hospital | Add `hospitalId` to `where` |
| `GET /:slug/screening-queue` (line 238) | Queries appointments by `clinicId` only | Add `hospitalId` to `where` |
| `GET /:slug/history` (line 262) | Queries appointments by `clinicId` only | Add `hospitalId` to `where` |
| `GET /:slug/upcoming-follow-ups` (line 329) | Queries appointments by `clinicId` only | Add `hospitalId` to `where` |
| `POST /:slug/complete-screening` (line 213) | No hospital check before creating record | Verify clinic belongs to hospital |

#### Implementation Pattern

For each endpoint, the fix follows the same pattern. Example for `GET /:slug/records`:

```ts
// BEFORE (line 100):
const where: Record<string, unknown> = { clinicId: clinic.id };

// AFTER:
const hospitalId = req.user!.hospitalId!;
const where: Record<string, unknown> = { clinicId: clinic.id, hospitalId };
```

For clinic lookup, add `hospitalId` to the `findFirst`:

```ts
// BEFORE (line 24):
const clinic = await prisma.clinic.findFirst({ where: { slug: req.params.slug } });

// AFTER:
const clinic = await prisma.clinic.findFirst({
  where: { slug: req.params.slug, hospitalId: req.user!.hospitalId! },
});
```

#### Verification Checklist

- [ ] `GET /` — includes `hospitalId` filter
- [ ] `GET /:slug/dashboard` — clinic lookup includes `hospitalId`
- [ ] `GET /:slug/records` — query includes `hospitalId`
- [ ] `GET /:slug/queue` — query includes `hospitalId`
- [ ] `GET /:slug/stats` — all count/groupBy queries include `hospitalId`
- [ ] `GET /:slug/doctors` — query includes `hospitalId`
- [ ] `GET /:slug/medications` — query includes `hospitalId`
- [ ] `GET /:slug/screening-queue` — query includes `hospitalId`
- [ ] `GET /:slug/history` — query includes `hospitalId`
- [ ] `GET /:slug/upcoming-follow-ups` — query includes `hospitalId`
- [ ] `POST /:slug/complete-screening` — clinic lookup includes `hospitalId`
- [ ] `POST /:slug/record` — clinic lookup includes `hospitalId`
- [ ] `POST /:slug/schedule-follow-up` — clinic lookup includes `hospitalId`

---

### 2.2 Lab Order Endpoint — `clinics.routes.ts`

**Route:** `POST /clinics/:slug/lab-order`  
**Permission:** `CLINICAL_WRITE`  
**Validation:** Zod schema `createLabOrderSchema`

#### Request Body

```ts
{
  patientId: string;          // required, UUID
  testIds: string[];          // required, array of DiagnosticTest IDs
  panelId?: string;           // optional, DiagnosticPanel ID
  clinicalNotes?: string;     // optional
  priority?: number;          // optional, 0-5, default 0
}
```

#### Zod Schema — `clinics.schema.ts`

```ts
export const createLabOrderSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  testIds: z.array(z.string().uuid()).min(1, 'At least one test is required'),
  panelId: z.string().uuid().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(5).optional().default(0),
});
```

#### Implementation

```ts
router.post('/:slug/lab-order',
  authenticate,
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validate(createLabOrderSchema),
  asyncHandler(async (req, res) => {
    const hospitalId = req.user!.hospitalId!;

    const clinic = await prisma.clinic.findFirst({
      where: { slug: req.params.slug, hospitalId },
    });
    if (!clinic) throw new NotFoundError('Clinic not found');

    const { patientId, testIds, panelId, clinicalNotes, priority } = req.body;

    // Verify patient exists and belongs to hospital
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, hospitalId },
    });
    if (!patient) throw new NotFoundError('Patient not found');

    // Verify all tests exist and are active
    const tests = await prisma.diagnosticTest.findMany({
      where: { id: { in: testIds }, isActive: true },
    });
    if (tests.length !== testIds.length) {
      throw new ValidationError('One or more selected tests are invalid or inactive');
    }

    // Optionally verify panel
    if (panelId) {
      const panel = await prisma.diagnosticPanel.findFirst({
        where: { id: panelId, isActive: true, is_deleted: false },
      });
      if (!panel) throw new NotFoundError('Panel not found');
    }

    // Atomic: create DiagnosticOrder + Referral
    const result = await prisma.$transaction(async (tx) => {
      // Find the imaging/lab clinic for the referral
      // Lab orders go to the lab department's clinic (type IMAGING is for imaging, lab is implicit)
      // For now, create the referral without a specific toClinicId — the lab module picks up DiagnosticOrders directly

      const order = await tx.diagnosticOrder.create({
        data: {
          orderType: 'LAB',
          status: 'SUBMITTED',
          priority: priority || 0,
          clinicalNotes: clinicalNotes || null,
          requestedById: req.user!.id,
          fromClinicId: clinic.id,
          patientId,
          panelId: panelId || null,
          hospitalId,
          tests: {
            create: testIds.map((testId) => {
              const test = tests.find((t) => t.id === testId)!;
              return {
                testId,
                refRangeLow: test.refRangeLow,
                refRangeHigh: test.refRangeHigh,
                refRangeText: test.refRangeText,
              };
            }),
          },
        },
        include: {
          tests: { include: { test: true } },
          fromClinic: { select: { name: true } },
          patient: { select: { fullName: true, mrn: true } },
        },
      });

      // Create companion Referral for tracking
      const referral = await tx.referral.create({
        data: {
          type: 'LAB_DISPATCH',
          status: 'PENDING',
          notes: clinicalNotes || `Lab order for ${patient.fullName}`,
          fromClinicId: clinic.id,
          patientId,
          hospitalId,
        },
      });

      // Link referral to order
      await tx.diagnosticOrder.update({
        where: { id: order.id },
        data: { referralId: referral.id },
      });

      return { ...order, referral };
    });

    res.status(201).json(result);
  })
);
```

#### Response Shape

```ts
{
  id: string;
  orderType: 'LAB';
  status: 'SUBMITTED';
  priority: number;
  clinicalNotes: string | null;
  patient: { fullName: string; mrn: string };
  fromClinic: { name: string };
  tests: Array<{
    id: string;
    test: { id: string; name: string; code: string; category: string; unit: string | null };
    refRangeLow: Decimal | null;
    refRangeHigh: Decimal | null;
    refRangeText: string | null;
  }>;
  referral: { id: string; type: 'LAB_DISPATCH'; status: 'PENDING' };
}
```

#### Edge Cases

- **Invalid test IDs:** Validate count matches; throw `ValidationError` if mismatch
- **Patient not in same hospital:** `findFirst` with `hospitalId` filter catches this
- **Panel with no tests:** Panel is optional; if provided, verify it exists but don't auto-add panel tests (doctor selects explicitly)
- **Inactive test:** Filtered by `isActive: true` in the query

---

### 2.3 Imaging Order Endpoint — `clinics.routes.ts`

**Route:** `POST /clinics/:slug/imaging-order`  
**Permission:** `CLINICAL_WRITE`  
**Validation:** Zod schema `createImagingOrderSchema`

#### Request Body

```ts
{
  patientId: string;          // required, UUID
  scanType: ImagingScanType;  // required, enum: A_SCAN | B_SCAN | OTT | BIOMETRY
  laterality?: string;        // optional: 'Left' | 'Right' | 'Both'
  clinicalInfo?: string;      // optional
  procedureTypeId?: string;   // optional, UUID of ImagingProcedureType
}
```

#### Zod Schema — `clinics.schema.ts`

```ts
import { z } from 'zod';

export const createImagingOrderSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  scanType: z.enum(['A_SCAN', 'B_SCAN', 'OTT', 'BIOMETRY']),
  laterality: z.enum(['Left', 'Right', 'Both']).optional().nullable(),
  clinicalInfo: z.string().optional().nullable(),
  procedureTypeId: z.string().uuid().optional().nullable(),
});
```

#### Implementation

```ts
router.post('/:slug/imaging-order',
  authenticate,
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validate(createImagingOrderSchema),
  asyncHandler(async (req, res) => {
    const hospitalId = req.user!.hospitalId!;

    const clinic = await prisma.clinic.findFirst({
      where: { slug: req.params.slug, hospitalId },
    });
    if (!clinic) throw new NotFoundError('Clinic not found');

    const { patientId, scanType, laterality, clinicalInfo, procedureTypeId } = req.body;

    // Verify patient
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, hospitalId },
    });
    if (!patient) throw new NotFoundError('Patient not found');

    // Find the imaging clinic for the referral
    const imagingClinic = await prisma.clinic.findFirst({
      where: { slug: 'imaging', hospitalId, isActive: true },
    });

    // Optionally verify procedure type
    if (procedureTypeId) {
      const pt = await prisma.imagingProcedureType.findFirst({
        where: { id: procedureTypeId, isActive: true },
      });
      if (!pt) throw new NotFoundError('Imaging procedure type not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.imagingOrder.create({
        data: {
          patientId,
          requestedByClinicId: clinic.id,
          clinicId: imagingClinic?.id || clinic.id,
          scanType,
          laterality: laterality || null,
          clinicalInfo: clinicalInfo || null,
          createdById: req.user!.id,
          procedureTypeId: procedureTypeId || null,
          hospitalId,
        },
        include: {
          procedureType: { select: { id: true, name: true, scanType: true } },
          hospital: { select: { name: true } },
        },
      });

      // Create companion Referral
      const referral = await tx.referral.create({
        data: {
          type: 'INTERNAL_CLINIC',
          status: 'PENDING',
          notes: clinicalInfo || `Imaging order: ${scanType} for ${patient.fullName}`,
          fromClinicId: clinic.id,
          toClinicId: imagingClinic?.id || undefined,
          patientId,
          hospitalId,
        },
      });

      return { ...order, referral };
    });

    res.status(201).json(result);
  })
);
```

#### Response Shape

```ts
{
  id: string;
  scanType: ImagingScanType;
  laterality: string | null;
  clinicalInfo: string | null;
  status: 'PENDING';
  procedureType: { id: string; name: string; scanType: string } | null;
  referral: { id: string; type: 'INTERNAL_CLINIC'; status: 'PENDING' };
}
```

#### Edge Cases

- **Imaging clinic not found:** Fall back to ordering clinic as `clinicId`. The imaging module will reassign.
- **Duplicate order for same patient/scanType:** Allow — a patient may need repeat imaging.
- **Procedure type not provided:** Order created without price calculation. Pricing happens at the imaging module.

---

### 2.4 Template CRUD Endpoints + Prisma Model — `clinics.routes.ts` + Schema Migration

#### Prisma Migration — New `ClinicalTemplate` Model

Add to `schema.prisma`:

```prisma
model ClinicalTemplate {
  id            String    @id @default(uuid())
  name          String
  clinicType    ClinicType
  sections      Json      @default("[]")
  createdById   String
  hospitalId    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdBy     User      @relation(fields: [createdById], references: [id])
  hospital      Hospital? @relation(fields: [hospitalId], references: [id])

  @@index([clinicType])
  @@index([hospitalId])
  @@index([createdById])
  @@map("clinical_templates")
}
```

Also add `clinicalTemplates ClinicalTemplate[]` to the `Hospital` model and `User` model relations.

The `sections` JSON field stores an array of section objects:

```ts
// sections type:
Array<{
  title: string;           // e.g. "Chief Complaint", "Examination Findings"
  fieldType: 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
  fieldName: string;       // unique key, maps to form state
  defaultValue?: string;   // pre-filled value when template is loaded
  options?: string[];      // for fieldType 'select'
  required?: boolean;
}>
```

#### Seed Default Templates

After migration, seed one template per `ClinicType`:

| ClinicType | Template Name | Sections |
|-----------|---------------|----------|
| MEDICINE | General Consultation | Chief Complaint, History of Present Illness, Physical Exam, Assessment, Plan |
| ENT | ENT Examination | Ear Exam, Nose Exam, Throat Exam, Hearing Assessment, Plan |
| DENTAL | Dental Examination | Oral Exam, Teeth Chart, Periodontal, Radiograph Notes, Plan |
| RETINA | Retina Examination | Visual Acuity, IOP, Fundoscopy, OCT Notes, Plan |
| GLAUCOMA | Glaucoma Evaluation | IOP History, Visual Field, OCT RNFL, Disc Assessment, Plan |
| ORBIT | Orbit Examination | External Exam, Motility, Proptosis Measurement, Imaging Review, Plan |
| PEDS_OPHTH | Pediatric Eye Exam | Fixation, Red Reflex, Cover Test, Cycloplegic Refraction, Plan |
| GEN_OPHTH | General Eye Exam | Visual Acuity, IOP, Slit Lamp, Fundoscopy, Plan |
| OPTOMETRY | Optometry Exam | Autorefraction, Visual Acuity, IOP, Tear Film, Plan |
| IMAGING | Imaging Study | Clinical Indication, Technique, Findings, Impression, Recommendation |

#### API Endpoints

**`GET /clinics/:slug/templates`** — List templates for this clinic's type

```ts
router.get('/:slug/templates',
  authenticate,
  requirePermission(PERMISSIONS.CLINICAL_READ),
  asyncHandler(async (req, res) => {
    const hospitalId = req.user!.hospitalId!;
    const clinic = await prisma.clinic.findFirst({
      where: { slug: req.params.slug, hospitalId },
    });
    if (!clinic) throw new NotFoundError('Clinic not found');

    const templates = await prisma.clinicalTemplate.findMany({
      where: { clinicType: clinic.type, hospitalId },
      include: { createdBy: { select: { fullName: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(templates);
  })
);
```

**`POST /clinics/:slug/templates`** — Create a template

```ts
router.post('/:slug/templates',
  authenticate,
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  validate(createTemplateSchema),
  asyncHandler(async (req, res) => {
    const hospitalId = req.user!.hospitalId!;
    const clinic = await prisma.clinic.findFirst({
      where: { slug: req.params.slug, hospitalId },
    });
    if (!clinic) throw new NotFoundError('Clinic not found');

    const { name, sections } = req.body;
    const template = await prisma.clinicalTemplate.create({
      data: {
        name,
        clinicType: clinic.type,
        sections: sections || [],
        createdById: req.user!.id,
        hospitalId,
      },
      include: { createdBy: { select: { fullName: true } } },
    });
    res.status(201).json(template);
  })
);
```

**`DELETE /clinics/:slug/templates/:id`** — Delete a template

```ts
router.delete('/:slug/templates/:id',
  authenticate,
  requirePermission(PERMISSIONS.CLINICAL_WRITE),
  asyncHandler(async (req, res) => {
    const hospitalId = req.user!.hospitalId!;
    const template = await prisma.clinicalTemplate.findFirst({
      where: { id: req.params.id, hospitalId },
    });
    if (!template) throw new NotFoundError('Template not found');

    await prisma.clinicalTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);
```

#### Zod Schema — `clinics.schema.ts`

```ts
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100),
  sections: z.array(z.object({
    title: z.string(),
    fieldType: z.enum(['text', 'textarea', 'number', 'select', 'checkbox']),
    fieldName: z.string(),
    defaultValue: z.string().optional(),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
  })).optional().default([]),
});
```

#### Edge Cases

- **Template name collision per clinic type:** Allow duplicates (doctors may have personal templates with same name)
- **Template for wrong clinic type:** `clinicType` is derived from the clinic, not the request body
- **Deleting seeded templates:** Allowed. Seeds run once; deleted templates stay deleted.
- **Sections JSON malformed:** Zod validates the structure before Prisma sees it

---

### 2.8 ICD-10 Search Enhancement — `ai.routes.ts`

**Current endpoint:** `GET /ai/icd10` (line 39 of `ai.routes.ts`)  
**Current behavior:** Returns all matches capped at 50, searching `code` and `name` fields.  
**Enhancement:** Add `category` filter and `code` exact-match parameter.

#### Changes

```ts
router.get('/icd10',
  authenticate,
  requirePermission(PERMISSIONS.CLINICAL_READ),
  asyncHandler(async (req, res) => {
    const { q, category, code } = req.query as { q?: string; category?: string; code?: string };

    // Exact code lookup — highest priority
    if (code) {
      const exact = await prisma.icd10Code.findUnique({ where: { code } });
      return res.json(exact ? [exact] : []);
    }

    const where: Record<string, unknown> = {};

    // Search by name or code (existing behavior)
    if (q && q.length >= 2) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Category filter (new)
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const codes = await prisma.icd10Code.findMany({
      where,
      orderBy: { code: 'asc' },
      take: 50,
    });
    res.json(codes);
  })
);
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | No | Search by name or code (min 2 chars). Existing param. |
| `category` | string | No | Filter by category (case-insensitive contains). New param. |
| `code` | string | No | Exact code lookup (e.g., `J06.9`). New param. Returns single result or `[]`. |

#### Edge Cases

- **`code` provided with `q`:** `code` takes priority; `q` is ignored
- **No results for exact code:** Return `[]` (empty array), not 404
- **Category not found:** Return `[]` (empty array)
- **`q` shorter than 2 chars:** Existing behavior — return all (or filtered by category)

---

## 6. Implementation Details — Jr Dev

### 2.1 Vital Signs Flagging — `VitalSignsInput.jsx`

**File:** `frontend/src/components/clinic/VitalSignsInput.jsx`

**Current state:** Simple grid of `<Input>` fields with labels and suffixes. No validation or warnings.

**Enhancement:** Add a threshold config object and inline warning badges.

#### Threshold Config

```js
const abnormalThresholds = {
  bloodPressureSystolic: { critical: null, warning: (v) => v > 140, label: 'BP High', severity: 'warning' },
  bloodPressureDiastolic: { critical: null, warning: (v) => v > 90, label: 'BP Diastolic High', severity: 'warning' },
  heartRate: { critical: null, warning: (v) => v > 100 || v < 60, label: 'HR Abnormal', severity: 'warning' },
  temperature: { critical: (v) => v > 38.3, warning: null, label: 'Fever', severity: 'critical' },
  spo2: { critical: (v) => v < 95, warning: null, label: 'Low SpO2', severity: 'critical' },
  bloodGlucose: { critical: (v) => v > 200, warning: null, label: 'High Glucose', severity: 'critical' },
};
```

#### Detection Function

```js
function getAbnormalStatus(key, value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  const threshold = abnormalThresholds[key];
  if (!threshold) return null;
  if (threshold.critical && threshold.critical(num)) return { type: 'critical', label: threshold.label };
  if (threshold.warning && threshold.warning(num)) return { type: 'warning', label: threshold.label };
  return null;
}
```

#### Inline Badge Rendering

Within each input's `<div key={v.key}>` block, after the `<Input>` element:

```jsx
{(() => {
  const status = getAbnormalStatus(v.key, values?.[v.key]);
  if (!status) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${
      status.type === 'critical'
        ? 'bg-red-100 text-red-700 border border-red-200'
        : 'bg-amber-100 text-amber-700 border border-amber-200'
    }`}>
      {status.type === 'critical' ? '⚠' : '!'} {status.label}
    </span>
  );
})()}
```

#### Export Thresholds for Save Validation

Export the thresholds so dashboards can optionally warn before save:

```js
export function getAbnormalVitals(values) {
  const abnormal = [];
  for (const [key, config] of Object.entries(abnormalThresholds)) {
    const status = getAbnormalStatus(key, values?.[key]);
    if (status) abnormal.push({ key, ...config, ...status });
  }
  return abnormal;
}
```

In `MedicineDashboard.handleSave`, before calling `records.saveRecord`:

```js
const abnormal = getAbnormalVitals(vitals);
if (abnormal.length > 0) {
  const critical = abnormal.filter(a => a.type === 'critical');
  if (critical.length > 0 && !window.confirm(`Critical values detected: ${critical.map(a => a.label).join(', ')}. Save anyway?`)) {
    return;
  }
}
```

#### No Backend Changes

This task is purely frontend. The backend `POST /clinics/:slug/record` endpoint stores vitals as-is.

---

### 2.2 Lab Order Modal — `LabOrderModal.jsx` + Dashboard Integration

**File:** `frontend/src/components/clinic/LabOrderModal.jsx`

#### Component API

```jsx
<LabOrderModal
  isOpen={boolean}
  onClose={() => void}
  clinicSlug={string}
  patientId={string}
  patientName={string}
  onOrderCreated={() => void}
/>
```

#### State

```js
const [testSearch, setTestSearch] = useState('');
const [testResults, setTestResults] = useState([]);
const [selectedTests, setSelectedTests] = useState([]);
const [selectedPanel, setSelectedPanel] = useState(null);
const [panels, setPanels] = useState([]);
const [clinicalNotes, setClinicalNotes] = useState('');
const [priority, setPriority] = useState(0);
const [submitting, setSubmitting] = useState(false);
```

#### Data Fetching

On modal open:
1. Fetch test catalog: `GET /lab/tests?search=` (debounced 300ms on search input)
2. Fetch panels: `GET /lab/panels`

Use the existing `api` utility:

```js
useEffect(() => {
  if (!isOpen) return;
  api.get('/lab/tests').then(setTestResults);
  api.get('/lab/panels').then(setPanels);
}, [isOpen]);
```

#### Test Selection UX

- Searchable list on the left, selected tests on the right
- Click a test to add it to the selected list
- Click "Remove" on a selected test to remove it
- Panel selection: dropdown of panels. On select, auto-add all panel tests (if not already selected)
- Show test name, code, category, and unit in the list

#### Submit Logic

```js
const handleSubmit = async () => {
  if (selectedTests.length === 0) return;
  setSubmitting(true);
  try {
    await api.post(`/clinics/${clinicSlug}/lab-order`, {
      patientId,
      testIds: selectedTests.map(t => t.id),
      panelId: selectedPanel?.id || null,
      clinicalNotes: clinicalNotes || null,
      priority,
    });
    toast.success('Lab order created');
    onOrderCreated();
    onClose();
  } catch (err) {
    toast.error(err.message || 'Failed to create lab order');
  } finally {
    setSubmitting(false);
  }
};
```

#### Dashboard Integration — "Order Lab Tests" Button

Add to the action button row in each clinic dashboard (after "Save Clinical Record", before "Refer Patient"):

```jsx
import LabOrderModal from '../../components/clinic/LabOrderModal';

// State:
const [showLabOrder, setShowLabOrder] = useState(false);

// In JSX — button (inside the `{patients.selectedPatient && (...)}` block):
<Button variant="secondary" onClick={() => setShowLabOrder(true)}>
  Order Lab Tests
</Button>

// Modal:
<LabOrderModal
  isOpen={showLabOrder}
  onClose={() => setShowLabOrder(false)}
  clinicSlug="medicine"
  patientId={patients.selectedPatient?.id}
  patientName={patients.selectedPatient?.fullName}
  onOrderCreated={() => { /* refresh lab results view */ }}
/>
```

Repeat for all 10 clinic dashboards. Each passes its own `clinicSlug`.

---

### 2.3 Imaging Order Modal — `ImagingOrderModal.jsx` + Dashboard Integration

**File:** `frontend/src/components/clinic/ImagingOrderModal.jsx`

#### Component API

```jsx
<ImagingOrderModal
  isOpen={boolean}
  onClose={() => void}
  clinicSlug={string}
  patientId={string}
  patientName={string}
  onOrderCreated={() => void}
/>
```

#### State

```js
const [scanType, setScanType] = useState('');
const [laterality, setLaterality] = useState('');
const [clinicalInfo, setClinicalInfo] = useState('');
const [procedureTypeId, setProcedureTypeId] = useState('');
const [procedureTypes, setProcedureTypes] = useState([]);
const [submitting, setSubmitting] = useState(false);
```

#### Data Fetching

On modal open, fetch imaging procedure types:

```js
useEffect(() => {
  if (!isOpen) return;
  api.get('/admin/pricing/imaging-procedure-types').then(setProcedureTypes).catch(() => setProcedureTypes([]));
}, [isOpen]);
```

#### Form Layout

```jsx
<Modal isOpen={isOpen} onClose={onClose} title={`Order Imaging — ${patientName}`}>
  <div className="space-y-4">
    {/* Scan Type */}
    <div>
      <label className="text-sm font-medium text-graphite block mb-1">Scan Type</label>
      <select value={scanType} onChange={(e) => setScanType(e.target.value)}
        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian">
        <option value="">Select scan type</option>
        <option value="A_SCAN">A-Scan</option>
        <option value="B_SCAN">B-Scan</option>
        <option value="OTT">OCT</option>
        <option value="BIOMETRY">Biometry</option>
      </select>
    </div>

    {/* Laterality */}
    <div>
      <label className="text-sm font-medium text-graphite block mb-1">Laterality</label>
      <select value={laterality} onChange={(e) => setLaterality(e.target.value)}
        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian">
        <option value="">Select</option>
        <option value="Left">Left (OS)</option>
        <option value="Right">Right (OD)</option>
        <option value="Both">Both (OU)</option>
      </select>
    </div>

    {/* Procedure Type */}
    <div>
      <label className="text-sm font-medium text-graphite block mb-1">Procedure Type</label>
      <select value={procedureTypeId} onChange={(e) => setProcedureTypeId(e.target.value)}
        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian">
        <option value="">Select procedure type</option>
        {procedureTypes.map(pt => (
          <option key={pt.id} value={pt.id}>{pt.name}</option>
        ))}
      </select>
    </div>

    {/* Clinical Info */}
    <div>
      <label className="text-sm font-medium text-graphite block mb-1">Clinical Information</label>
      <textarea value={clinicalInfo} onChange={(e) => setClinicalInfo(e.target.value)}
        placeholder="Relevant clinical history, indication for imaging..."
        className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
    </div>

    <div className="flex gap-2 justify-end">
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={!scanType}>
        Create Imaging Order
      </Button>
    </div>
  </div>
</Modal>
```

#### Submit Logic

```js
const handleSubmit = async () => {
  if (!scanType) return;
  setSubmitting(true);
  try {
    await api.post(`/clinics/${clinicSlug}/imaging-order`, {
      patientId,
      scanType,
      laterality: laterality || null,
      clinicalInfo: clinicalInfo || null,
      procedureTypeId: procedureTypeId || null,
    });
    toast.success('Imaging order created');
    onOrderCreated();
    onClose();
  } catch (err) {
    toast.error(err.message || 'Failed to create imaging order');
  } finally {
    setSubmitting(false);
  }
};
```

#### Dashboard Integration

Add "Order Imaging" button to the 6 ophthalmology dashboards (Retina, Glaucoma, Orbit, PedsOphth, GenOphth, Optometry). Follow the same pattern as the lab order button. Medicine, ENT, Dental, and Imaging dashboards do NOT get this button (imaging orders are ophthalmology-specific per the brief).

---

### 2.4 Template Loader — `TemplateLoader.jsx` + Dashboard Integration

**File:** `frontend/src/components/clinic/TemplateLoader.jsx`

#### Component API

```jsx
<TemplateLoader
  clinicSlug={string}
  onLoadTemplate={(sections) => void}  // populates SOAP notes + diagnosis fields
  onSaveTemplate={(name, sections) => void}  // saves current form state as template
  currentSections={object}  // current SOAP notes state
/>
```

#### Data Fetching

On mount, fetch templates for this clinic type:

```js
const [templates, setTemplates] = useState([]);
useEffect(() => {
  api.get(`/clinics/${clinicSlug}/templates`).then(setTemplates).catch(() => {});
}, [clinicSlug]);
```

#### Load Template Flow

1. Dropdown shows template names
2. On select, call `onLoadTemplate(template.sections)`
3. In the dashboard, this populates the SOAP notes textareas and optionally the diagnosis field

```js
const handleLoad = (template) => {
  const soapData = { subjective: '', objective: '', assessment: '', plan: '' };
  for (const section of template.sections) {
    if (section.fieldName in soapData) {
      soapData[section.fieldName] = section.defaultValue || '';
    }
  }
  onLoadTemplate(soapData);
};
```

#### Save as Template Flow

1. "Save as Template" button opens an inline name input
2. On confirm, POST to `POST /clinics/${clinicSlug}/templates` with the current SOAP notes as sections

```js
const handleSave = async () => {
  if (!templateName.trim()) return;
  const sections = [
    { title: 'Subjective', fieldType: 'textarea', fieldName: 'subjective', defaultValue: currentSections.subjective || '' },
    { title: 'Objective', fieldType: 'textarea', fieldName: 'objective', defaultValue: currentSections.objective || '' },
    { title: 'Assessment', fieldType: 'textarea', fieldName: 'assessment', defaultValue: currentSections.assessment || '' },
    { title: 'Plan', fieldType: 'textarea', fieldName: 'plan', defaultValue: currentSections.plan || '' },
  ];
  await api.post(`/clinics/${clinicSlug}/templates`, { name: templateName, sections });
  toast.success('Template saved');
  // Refresh template list
  const updated = await api.get(`/clinics/${clinicSlug}/templates`);
  setTemplates(updated);
};
```

#### UI Layout

```jsx
<div className="flex items-center gap-2 mb-4">
  <select className="flex-1 px-3 py-2 bg-paper border border-silver rounded-lg text-body"
    onChange={(e) => handleLoad(templates.find(t => t.id === e.target.value))}>
    <option value="">Load a template...</option>
    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
  </select>
  <Button variant="ghost" size="sm" onClick={() => setShowSaveInput(!showSaveInput)}>
    Save as Template
  </Button>
</div>
{showSaveInput && (
  <div className="flex items-center gap-2 mb-4">
    <Input placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
    <Button size="sm" onClick={handleSave}>Save</Button>
  </div>
)}
```

#### Dashboard Integration

Add `<TemplateLoader>` above the SOAP Notes section in all 10 clinic dashboards. Pass `clinicSlug`, `onLoadTemplate`, `onSaveTemplate`, and `currentSections`.

---

### 2.5 Consultation History — `PatientDetailPage.jsx`

**File:** `frontend/src/features/patients/PatientDetailPage.jsx`

**Current state:** `ClinicalRecordCard` (line 87) shows a collapsible card with date, doctor name, and expanded content showing vitals (raw JSON), diagnosis, treatment, and prescriptions (basic list).

**Enhancement:** Make the card richer with proper vitals display, symptoms, medications, linked lab/imaging results, and a print button.

#### Enhanced `ClinicalRecordCard`

Replace the existing component (lines 87-141):

```jsx
function ClinicalRecordCard({ record }) {
  const [expanded, setExpanded] = useState(false);

  const vitals = record.vitalSigns?.[0];
  const vitalsSummary = vitals ? [
    vitals.bloodPressureSystolic ? `BP ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic || '?'}` : null,
    vitals.heartRate ? `HR ${vitals.heartRate}` : null,
    vitals.temperature ? `Temp ${vitals.temperature}°C` : null,
    vitals.spo2 ? `SpO2 ${vitals.spo2}%` : null,
    vitals.bloodGlucose ? `BG ${vitals.bloodGlucose}` : null,
  ].filter(Boolean).join(' · ') : null;

  return (
    <div className="border border-silver/50 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bone/50 transition-colors text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-body text-obsidian font-medium">
            {formatDateTime(record.encounterDate || record.createdAt)}
          </span>
          {record.diagnosis && (
            <Badge variant="warning" className="truncate max-w-[200px]">{record.diagnosis}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {vitalsSummary && <span className="text-caption text-slate hidden sm:inline">{vitalsSummary}</span>}
          <ChevronDown className={`w-4 h-4 text-slate transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-silver/50 space-y-4">
          {/* Vitals Grid */}
          {vitals && (
            <div>
              <p className="text-caption text-slate mb-2 font-medium">Vital Signs</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {vitals.bloodPressureSystolic && (
                  <VitalBadge label="BP" value={`${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic || '?'}`} unit="mmHg"
                    abnormal={vitals.bloodPressureSystolic > 140 || vitals.bloodPressureDiastolic > 90} />
                )}
                {vitals.heartRate && (
                  <VitalBadge label="HR" value={vitals.heartRate} unit="bpm"
                    abnormal={vitals.heartRate > 100 || vitals.heartRate < 60} />
                )}
                {vitals.temperature && (
                  <VitalBadge label="Temp" value={vitals.temperature} unit="°C"
                    abnormal={Number(vitals.temperature) > 38.3} />
                )}
                {vitals.spo2 && (
                  <VitalBadge label="SpO2" value={vitals.spo2} unit="%"
                    abnormal={vitals.spo2 < 95} />
                )}
                {vitals.bloodGlucose && (
                  <VitalBadge label="BG" value={vitals.bloodGlucose} unit="mg/dL"
                    abnormal={vitals.bloodGlucose > 200} />
                )}
                {vitals.weight && (
                  <VitalBadge label="Weight" value={vitals.weight} unit="kg" />
                )}
              </div>
            </div>
          )}

          {/* Symptoms */}
          {record.symptoms?.length > 0 && (
            <div>
              <p className="text-caption text-slate mb-1 font-medium">Symptoms</p>
              <div className="flex flex-wrap gap-1.5">
                {record.symptoms.map((s, i) => (
                  <Badge key={i} variant="info">{s.name}{s.severity ? ` (${s.severity}/10)` : ''}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Diagnosis */}
          {record.diagnosis && (
            <div>
              <p className="text-caption text-slate mb-1 font-medium">Diagnosis</p>
              <p className="text-body text-obsidian">{record.diagnosis}</p>
            </div>
          )}

          {/* Medications */}
          {record.medications?.length > 0 && (
            <div>
              <p className="text-caption text-slate mb-1 font-medium">Medications</p>
              <div className="space-y-1">
                {record.medications.map((m, i) => (
                  <p key={i} className="text-body text-obsidian">
                    {m.drugName} {m.dosage} {m.frequency} {m.route ? `(${m.route})` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* SOAP Notes */}
          {record.notes && (
            <div>
              <p className="text-caption text-slate mb-1 font-medium">Clinical Notes</p>
              <div className="bg-bone/50 rounded-lg p-3 text-body text-obsidian whitespace-pre-wrap">{record.notes}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-silver/30">
            <Button variant="ghost" size="sm" onClick={() => window.open(`/clinics/${record.clinic?.slug || 'medicine'}/print-report/${record.id}`, '_blank')}>
              <Printer size={14} className="mr-1" /> Print
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function VitalBadge({ label, value, unit, abnormal }) {
  return (
    <div className={`px-2 py-1.5 rounded-lg text-center ${abnormal ? 'bg-red-50 border border-red-200' : 'bg-bone/50'}`}>
      <p className="text-xs text-slate">{label}</p>
      <p className={`text-sm font-medium ${abnormal ? 'text-red-700' : 'text-obsidian'}`}>{value} <span className="text-xs font-normal">{unit}</span></p>
    </div>
  );
}
```

#### Data Shape Requirement

The `patient.clinicalRecords` from the patient detail endpoint must include `vitalSigns`, `symptoms`, and `medications` as nested relations. Verify the patient detail API query includes these:

```ts
// In the patient detail endpoint (wherever patient.clinicalRecords is queried):
clinicalRecords: {
  include: {
    vitalSigns: true,
    symptoms: true,
    medications: true,
  },
  orderBy: { encounterDate: 'desc' },
},
```

If the patient detail endpoint doesn't include these, the `PatientDetailPage` will need to fetch them separately using the existing `GET /clinics/:slug/records?patientId=` endpoint.

---

### 2.6 Consultation Page — `ConsultationPage.jsx` + `App.jsx`

**File:** `frontend/src/features/clinics/ConsultationPage.jsx`

#### Component

```jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Spinner } from '../ui/Spinner';

// Slug-to-dashboard-route mapping
const clinicRouteMap = {
  medicine: '/clinic/medicine',
  ent: '/clinic/ent',
  dental: '/clinic/dental',
  retina: '/clinic/retina',
  glaucoma: '/clinic/glaucoma',
  orbit: '/clinic/orbit',
  'pediatrics-ophth': '/clinic/pediatrics-ophth',
  'general-ophth': '/clinic/general-ophth',
  optometry: '/clinic/optometry',
  imaging: '/clinic/imaging',
};

export default function ConsultationPage() {
  const { slug, appointmentId } = useParams();
  const navigate = useNavigate();

  const { data: queue, isLoading, error } = useQuery({
    queryKey: ['clinics', slug, 'queue'],
    queryFn: () => api.get(`/clinics/${slug}/queue`),
  });

  useEffect(() => {
    if (!queue || !appointmentId) return;
    const appointment = queue.find(a => a.id === appointmentId);
    if (appointment) {
      // Redirect to clinic dashboard — the queue panel will auto-select this patient
      // via a search param or state
      navigate(`/clinic/${slug}`, {
        state: { selectedAppointmentId: appointmentId, selectedPatientId: appointment.patientId },
        replace: true,
      });
    } else {
      // Appointment not in queue — redirect to dashboard anyway
      navigate(`/clinic/${slug}`, { replace: true });
    }
  }, [queue, appointmentId, slug, navigate]);

  if (isLoading) return <Spinner />;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load consultation context</div>;

  return <Spinner />;
}
```

#### Route Registration in `App.jsx`

Add lazy import:

```js
const ConsultationPage = lazy(() => import('../features/clinics/ConsultationPage'));
```

Add route (before the catch-all `*` route):

```jsx
<Route path="/clinic/:slug/consultation/:appointmentId" element={
  <ProtectedRoute>
    <RoleGuard requiredPermissions={['clinical:read']}>
      <ConsultationPage />
    </RoleGuard>
  </ProtectedRoute>
} />
```

#### ClinicQueuePanel Link Update

Update `ClinicQueuePanel` so that clicking a patient in the queue navigates to the consultation page:

```jsx
// In ClinicQueuePanel, replace the onClick handler for queue items:
onClick={() => navigate(`/clinic/${clinicSlug}/consultation/${appointment.id}`)}
```

#### Passing Selected Patient to Dashboard

The `MedicineDashboard` (and other dashboards) need to accept a `selectedPatientId` from `location.state` and auto-select the patient on mount. Add to each dashboard:

```js
import { useLocation } from 'react-router-dom';

// In the dashboard component:
const location = useLocation();

useEffect(() => {
  if (location.state?.selectedPatientId) {
    patients.selectPatientById(location.state.selectedPatientId);
  }
}, [location.state]);
```

This requires adding a `selectPatientById` method to the `usePatients` hook that fetches the patient by ID and sets them as selected.

---

### 2.7 Referral Enhancement — `CrossReferralModal.jsx`

**File:** `frontend/src/features/referral/CrossReferralModal.jsx`

**Current state:** Shows `INTERNAL_CLINIC` referral type only.

**Enhancement:** Add `LAB_DISPATCH` and `PHARMACY_DISPATCH` options.

The `ReferralType` enum already includes all four types:

```prisma
enum ReferralType {
  INTERNAL_CLINIC
  PHARMACY_DISPATCH
  OPTICS_DISPATCH
  LAB_DISPATCH
}
```

#### Changes

Add a referral type selector at the top of the modal:

```jsx
const [referralType, setReferralType] = useState('INTERNAL_CLINIC');

// In the modal JSX:
<div className="mb-4">
  <label className="text-sm font-medium text-graphite block mb-1">Referral Type</label>
  <select value={referralType} onChange={(e) => setReferralType(e.target.value)}
    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian">
    <option value="INTERNAL_CLINIC">Internal Clinic Referral</option>
    <option value="LAB_DISPATCH">Lab Dispatch</option>
    <option value="PHARMACY_DISPATCH">Pharmacy Dispatch</option>
  </select>
</div>
```

For `LAB_DISPATCH`: Show the "to clinic" dropdown filtered to lab-type departments. Include a notes field for test instructions.

For `PHARMACY_DISPATCH`: Show a medication list (similar to `PrescriptionWriter`) using `ReferralMedication` pattern. Add medication fields inline.

Pre-fill the patient context from the selected patient prop:

```jsx
useEffect(() => {
  if (patient) {
    setFormData(prev => ({ ...prev, patientId: patient.id, patientName: patient.fullName }));
  }
}, [patient]);
```

---

### 2.9 Print Enhancement — `EncounterSummary.jsx`

**File:** `frontend/src/components/clinic/EncounterSummary.jsx`

**Current state:** Prints patient info, vitals, symptoms, diagnosis, and medications in a basic HTML template.

**Enhancement:** Add lab results, imaging results, and referral information sections.

#### Additional Props

```jsx
export default function EncounterSummary({
  patient, vitals, symptoms, diagnosis, diagnosisIcd10, medications, soapNotes,
  labOrders, imagingOrders, referrals,  // NEW props
  onClose, layout = 'a4'  // NEW: 'a4' | 'thermal'
}) {
```

#### Lab Results Section

```js
// In the HTML template, after the Medications section:
${labOrders?.length > 0 ? `
  <h2>Lab Orders</h2>
  <table>
    <tr><th>Test</th><th>Status</th><th>Priority</th></tr>
    ${labOrders.map(order => order.tests.map(test =>
      `<tr><td>${test.test.name}</td><td>${order.status}</td><td>${order.priority > 0 ? 'Urgent' : 'Routine'}</td></tr>`
    ).join('')).join('')}
  </table>
` : ''}
```

#### Imaging Results Section

```js
${imagingOrders?.length > 0 ? `
  <h2>Imaging Orders</h2>
  <table>
    <tr><th>Scan Type</th><th>Laterality</th><th>Status</th></tr>
    ${imagingOrders.map(order =>
      `<tr><td>${order.scanType}</td><td>${order.laterality || '-'}</td><td>${order.status}</td></tr>`
    ).join('')}
  </table>
` : ''}
```

#### Referral Section

```js
${referrals?.length > 0 ? `
  <h2>Referrals</h2>
  <table>
    <tr><th>Type</th><th>To</th><th>Status</th><th>Notes</th></tr>
    ${referrals.map(r =>
      `<tr><td>${r.type.replace(/_/g, ' ')}</td><td>${r.toClinic?.name || '-'}</td><td>${r.status}</td><td>${r.notes || '-'}</td></tr>`
    ).join('')}
  </table>
` : ''}
```

#### Thermal Layout Option

When `layout === 'thermal'`, output a narrower HTML template (80mm width):

```js
const thermalStyles = `
  body { font-family: Arial, sans-serif; width: 80mm; margin: 0; padding: 4mm; font-size: 10px; color: #000; }
  h1 { font-size: 12px; text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
  h2 { font-size: 10px; margin-top: 8px; margin-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .field { margin-bottom: 2px; }
  .label { font-size: 8px; color: #666; }
  .value { font-size: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { font-size: 8px; text-align: left; padding: 2px; border-bottom: 1px solid #000; }
  td { font-size: 9px; padding: 2px; border-bottom: 1px solid #eee; }
`;
```

Add a layout toggle button in the component:

```jsx
<Button variant="ghost" size="sm" onClick={() => setLayout(layout === 'a4' ? 'thermal' : 'a4')}>
  {layout === 'a4' ? 'Thermal' : 'A4'}
</Button>
```

---

### 2.11 Prescription Writer Enhancement — `PrescriptionWriter.jsx`

**File:** `frontend/src/components/clinic/PrescriptionWriter.jsx`

**Current state:** Uses `DrugNameAutocomplete` for drug search, free-text inputs for dosage, frequency, duration, and a basic route dropdown (oral, topical, IV, IM, subcutaneous, inhalation).

**Enhancement:** Add structured frequency dropdown, expanded route dropdown, and debounced search.

#### Frequency Dropdown

Replace the frequency `<Input>` with a `<select>`:

```jsx
const frequencyOptions = [
  { value: '', label: 'Select frequency' },
  { value: 'Once daily', label: 'Once daily (OD)' },
  { value: 'Twice daily', label: 'Twice daily (BD)' },
  { value: 'Three times daily', label: 'Three times daily (TDS)' },
  { value: 'Four times daily', label: 'Four times daily (QID)' },
  { value: 'Every 8 hours', label: 'Every 8 hours (Q8H)' },
  { value: 'Every 12 hours', label: 'Every 12 hours (Q12H)' },
  { value: 'At bedtime', label: 'At bedtime (HS)' },
  { value: 'As needed', label: 'As needed (PRN)' },
  { value: 'Once weekly', label: 'Once weekly' },
  { value: 'Stat', label: 'Stat (immediately)' },
];

// Replace <Input label="Frequency" ...> with:
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-graphite">Frequency</label>
  <select value={med.frequency} onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
    {frequencyOptions.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
</div>
```

#### Expanded Route Dropdown

Replace the existing route `<select>` with more options:

```jsx
const routeOptions = [
  { value: 'oral', label: 'Oral' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'topical', label: 'Topical' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
  { value: 'otic', label: 'Otic' },
  { value: 'nasal', label: 'Nasal' },
  { value: 'rectal', label: 'Rectal' },
  { value: 'vaginal', label: 'Vaginal' },
  { value: 'intravenous', label: 'Intravenous (IV)' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'transdermal', label: 'Transdermal' },
];
```

#### Debounced Search Integration

The `DrugNameAutocomplete` component already handles search. Verify it debounces properly. If not, add the `useDebounce` hook (already exists at `hooks/useDebounce.js`):

```js
// In DrugNameAutocomplete.jsx, if not already debounced:
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  if (debouncedSearch.length >= 2) {
    api.get(`/clinics/${clinicSlug}/medications?search=${debouncedSearch}`).then(setResults);
  } else {
    setResults([]);
  }
}, [debouncedSearch, clinicSlug]);
```

---

## 7. Coordination Points

### Dependency Graph

```
2.10 (Hospital Scoping) ──────> 2.2 (Lab Order Endpoint)
      │                          2.3 (Imaging Order Endpoint)
      │                          2.4 (Template CRUD Endpoints)
      │
      └─────────────────────────> 2.8 (ICD-10 Enhancement) — standalone

2.2 (Lab Order Backend) ──────> 2.2 FE (Lab Order Modal)
2.3 (Imaging Order Backend) ──> 2.3 FE (Imaging Order Modal)
2.4 (Template Backend) ───────> 2.4 FE (Template Loader)

2.1 (Vital Signs Flagging) ────> (no backend dependency, start immediately)
2.5 (Consultation History) ────> (no backend dependency, start immediately)
2.6 (Consultation Page) ───────> (no backend dependency, start immediately)
2.7 (Referral Enhancement) ────> (no backend dependency, start immediately)
2.9 (Print Enhancement) ───────> (no backend dependency, start immediately)
2.11 (Prescription Writer) ───> (no backend dependency, start immediately)
```

### Parallel Execution Plan

**Day 1 (morning):**
- Sr Dev: 2.10 (hospital scoping fix — critical security, unblocks everything)
- Jr Dev: 2.1 (vitals flagging), 2.5 (consultation history), 2.11 (prescription writer)

**Day 1 (afternoon):**
- Sr Dev: 2.2 (lab order endpoint) + 2.8 (ICD-10 search enhancement)
- Jr Dev: 2.6 (consultation page wrapper), 2.7 (referral enhancement), 2.9 (print enhancement)

**Day 2 (morning):**
- Sr Dev: 2.3 (imaging order endpoint) + 2.4 (template CRUD + migration)
- Jr Dev: 2.2 FE (lab order modal — can start wiring to endpoint as it's being built)

**Day 2 (afternoon):**
- Sr Dev: Finish 2.4 migration + seed, review all endpoints
- Jr Dev: 2.3 FE (imaging order modal), 2.4 FE (template loader)

**Day 3-4:**
- Sr Dev: Review/code review, assist with frontend integration, seed default templates
- Jr Dev: Dashboard integration (add buttons to all 10 dashboards), route registration, testing
- Both: Integration testing, edge cases, responsive layout verification

### Coordination Rules

1. **2.1, 2.5, 2.6, 2.7, 2.9, 2.11 can start immediately** — no new backend dependency
2. **2.2 FE needs 2.2 backend** — lab order modal calls `POST /:slug/lab-order`
3. **2.3 FE needs 2.3 backend** — imaging order modal calls `POST /:slug/imaging-order`
4. **2.4 FE needs 2.4 backend** — template loader calls `GET/POST/DELETE /:slug/templates`
5. **2.10 MUST complete first** — all subsequent backend work inherits hospital scoping
6. **Dashboard integration is the last frontend step** — once modals are built, add buttons to all 10 dashboards

---

## 8. Acceptance Criteria Checklist

- [ ] Vital signs form visually flags abnormal values (Temp >38.3°C red, BP >140/90 amber, HR >100/<60 amber, SpO2 <95% red, Glucose >200 red) with color-coded inline badges
- [ ] Saving a record with critical values shows a confirmation prompt (optional override)
- [ ] Lab orders can be created from any clinic dashboard: searchable test catalog, panel selection, clinical notes, priority toggle
- [ ] Lab order creates a `DiagnosticOrder` (status SUBMITTED) and companion `Referral` (type LAB_DISPATCH) atomically
- [ ] Imaging orders can be created from ophthalmology dashboards: scan type, laterality, clinical info, procedure type
- [ ] Imaging order creates an `ImagingOrder` (status PENDING) and companion `Referral` (type INTERNAL_CLINIC) atomically
- [ ] Clinical note templates can be loaded from a dropdown per clinic type, populating SOAP notes fields
- [ ] Current form state can be saved as a new template with a custom name
- [ ] Default templates exist for all 10 clinic types after migration seed
- [ ] Consultation history on patient detail page shows expandable cards with vitals grid, symptoms badges, medications list, diagnosis, and clinical notes
- [ ] Consultation history cards show abnormal vitals highlighted in red
- [ ] Consultation history cards have a Print button per record
- [ ] Direct-linkable URL `/clinic/:slug/consultation/:appointmentId` loads appointment context and redirects to dashboard with patient pre-selected
- [ ] Clicking a patient in the queue panel navigates to the consultation page URL
- [ ] Referral modal supports all three types: Internal Clinic, Lab Dispatch, Pharmacy Dispatch
- [ ] Lab Dispatch referral shows test instructions notes field
- [ ] Pharmacy Dispatch referral shows medication list fields
- [ ] ICD-10 search supports `category` filtering (e.g., `?category= Respiratory`)
- [ ] ICD-10 search supports exact `code` lookup (e.g., `?code=J06.9`)
- [ ] Print output includes lab orders section, imaging orders section, and referrals section
- [ ] Print output supports A4 layout and thermal (80mm) layout toggle
- [ ] All clinic endpoints are hospital-scoped (cross-tenant isolation verified for every endpoint in `clinics.routes.ts`)
- [ ] Prescription writer has structured frequency dropdown (OD, BD, TDS, QID, PRN, etc.)
- [ ] Prescription writer has expanded route dropdown (Oral, Ophthalmic, IV, IM, SC, etc.)
- [ ] Drug search is debounced (300ms) with dropdown results showing drug name, dosage form, price
- [ ] All new endpoints include Zod input validation, permission checks, and error handling
- [ ] All new frontend components have loading, empty, and error states
- [ ] Responsive layout works on desktop, tablet, and mobile
- [ ] No TypeScript/ESLint errors introduced
- [ ] All existing clinic functionality continues to work (record save, vitals, symptoms, prescriptions, SOAP notes, AI diagnosis, referrals, follow-ups, queue, history, print)
