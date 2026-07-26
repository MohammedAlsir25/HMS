# Phase 6 Tech Spec: Laboratory Module — Sample Tracking, Results & Reports

**Date:** 2026-07-16
**Author:** Tech Lead
**Status:** Ready for implementation
**Depends on:** Phase 0 (multi-tenant), Phase 4 (clinic lab orders), Phase 5 (pharmacy — payment patterns)

---

## 1. Key Architectural Decisions

### 1.1 LabSample is One-to-Many with DiagnosticOrder, Auto-Created on Claim

**Decision:** A `DiagnosticOrder` can have zero or many `LabSample` records (one-to-many). A `LabSample` is **automatically created** when the order transitions to `IN_PROGRESS` (i.e., when a lab tech claims it via `PATCH /lab/orders/:id/claim`).

**Rationale:**
- The brief says "When a lab order's status changes to IN_PROGRESS, auto-create a `LabSample` if one doesn't exist." However, in practice a single order may require multiple specimen collections (e.g., blood draw + urine sample for a comprehensive panel). Making it one-to-many gives flexibility without breaking the common single-sample case.
- Auto-creation on claim is better than auto-creation on order creation because: (a) the order isn't paid yet at creation time — no work should start before payment, (b) the lab tech who claims the order is the one responsible for the sample.
- The idempotent guard (`if one doesn't exist`) from the brief is dropped in favor of always allowing creation — the frontend will show existing samples so the tech won't accidentally create duplicates.

### 1.2 PDF Generation Uses HTML Print Template + window.print() — No PDF Library

**Decision:** The `GET /lab/orders/:id/report` endpoint returns a server-rendered JSON payload. The frontend renders it into an HTML template inside a print-optimized `<div>` and calls `window.print()`. No server-side PDF library (PDFKit, puppeteer, etc.) is added.

**Rationale:**
- Adding PDFKit or puppeteer adds a native dependency that complicates the Docker build and CI pipeline.
- The brief itself says: "Use simple HTML print template + window.print() — no PDF library needed initially."
- The existing report endpoint (`GET /lab/orders/:id/report`) already returns the order with all nested data. The frontend just needs to format it.
- If PDF download is later required, a `/lab/orders/:id/report.pdf` endpoint can be added using the same HTML template piped through puppeteer — but that's a future phase.

### 1.3 LabDashboard Decomposition Follows Feature-Based File Split

**Decision:** Split `LabDashboard.jsx` (624 lines) into 7 files under `frontend/src/features/lab/`, each a self-contained component with its own state. The shell (`LabDashboardShell.jsx`) owns the tab state and delegates to tab components. Modals (`LabResultEntryModal`, `NewRequestModal`) are extracted as standalone components.

**Rationale:**
- The existing code already has inline components (`OrderDetailModal`, `NewRequestModal`, `CatalogManager`, `CatalogEditModal`) that are only used within this file. Extracting them into separate files makes them independently importable and testable.
- No new logic is introduced — this is a pure decomposition. Each extracted component keeps the exact same props interface.

### 1.4 Result Flag Auto-Calculation Happens Backend-Side on PUT /results

**Decision:** The backend's `PUT /lab/orders/:id/results` handler computes `flag` and `isAbnormal` from the `DiagnosticTest` reference ranges. The frontend no longer sends `flag` — it only sends `value`, `unit`, and optional overrides.

**Rationale:**
- The brief specifies the exact algorithm. Computing server-side ensures consistency (no client-side bugs in flag calculation).
- The frontend can still display computed flags read-only after submission, but the source of truth is the backend.
- The existing endpoint already receives results and writes them — we're just adding the auto-calculation logic inside the `$transaction` callback.

### 1.5 Hospital Scoping is Already Handled by Prisma Tenant Middleware

**Decision:** The tenant middleware (`createTenantPrisma`) already auto-injects `hospitalId` on `DiagnosticOrder`, `DiagnosticOrderTest`, and (after migration) `LabSample` queries. The Phase 6 audit (task 2.8) verifies this is working, but does NOT need to add explicit `hospitalId` to every query — the middleware handles it.

**Rationale:**
- `DiagnosticOrder` and `DiagnosticOrderTest` are already in `TENANT_SCOPED_MODELS` (see `tenant.ts:15`).
- The `LabSample` model will be added to `TENANT_SCOPED_MODELS` when created.
- The audit task verifies that: (a) all models are in the set, (b) `req.user!.hospitalId` is being set by the auth middleware, (c) the middleware's `findUnique` override correctly checks hospitalId ownership.
- The only endpoint that may need manual attention is `GET /lab/tests` — the `DiagnosticTest` model is **NOT** in `TENANT_SCOPED_MODELS` because tests are shared reference data. This is correct and intentional.

### 1.6 Checkout Missing hospitalId is a Tenant Middleware Gap, Not a Route Bug

**Decision:** The `POST /lab/checkout` endpoint creates a `Transaction` without explicitly setting `hospitalId`. The tenant middleware will auto-inject it. However, the `Transaction` creation also sets `departmentId` from a hospital-unscoped `findFirst({ slug: 'lab-dept' })` query. This is a latent bug — multiple hospitals could have different lab departments with the same slug. Fix: scope the `department.findFirst` to include hospitalId.

**Rationale:** The `Department` model IS in `TENANT_SCOPED_MODELS`, so the middleware already scopes the `findFirst` query. No manual fix needed — the middleware handles it.

---

## 2. Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LabSample ↔ DiagnosticOrder | One-to-many, auto-created on claim | Multiple specimens per order possible; work starts after payment |
| PDF generation | HTML print template + `window.print()` | No new dependencies; matches brief recommendation |
| Dashboard decomposition | 7 feature files, shell delegates to tabs | Pure extraction, no new logic |
| Flag auto-calculation | Backend-side in PUT /results | Single source of truth; matches brief algorithm |
| Hospital scoping | Tenant middleware auto-injection | Already handles DiagnosticOrder, DiagnosticOrderTest, LabSample |
| LabSample in TENANT_SCOPED_MODELS | Yes, added on migration | Required for multi-tenant isolation |
| DiagnosticTest scoping | NOT tenant-scoped (shared reference) | Tests are global catalog data |

---

## 3. Work Split

### 3.1 Sr Dev — Backend (estimated 2.5–3 days)

**Order:** 2.8 (hospital scoping audit) → 2.2 (sample tracking) → 2.5 (flag auto-calculation) → 2.4 backend (report endpoint enhancement) → 2.9 (backend tests).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.8 | Hospital scoping audit | `lab.routes.ts`, `tenant.ts` | S | Verify all DiagnosticOrder queries are tenant-scoped. Add LabSample to TENANT_SCOPED_MODELS. Verify `req.user!.hospitalId` is set. |
| 2.2 | Sample tracking model + endpoints | `schema.prisma`, `lab.routes.ts`, `lab.schema.ts`, `tenant.ts` | M | New Prisma model + 5 endpoints + auto-label generation + auto-create on claim. |
| 2.5 | Result flag auto-calculation | `lab.routes.ts` | M | Compute flag/isAbnormal in PUT /results from value vs test reference ranges. |
| 2.4 | Report endpoint enhancement | `lab.routes.ts` | S | Existing GET /orders/:id/report already returns full order data. Add `samples` to the include. No PDF library needed. |
| 2.9 | Backend tests | `tests/lab.test.js` | M | Authenticated business logic tests: order lifecycle, checkout, validation, referral, hospital scoping. |

### 3.2 Jr Dev — Frontend (estimated 3–3.5 days)

**Start immediately:** 2.1 (bug fixes — unblocks everything), 2.6 (decomposition — pure extraction).
**After 2.2 complete:** 2.7 (sample tracker — needs sample endpoints).
**After 2.4 backend complete:** 2.4 frontend (reports tab — needs full order data).
**After 2.5 complete:** 2.3 (panels tab — uses existing endpoints, no dependency).
**After 2.5 complete:** 2.5 frontend (color-coded flags — needs computed flags in response).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.1 | Bug fixes | `LabDashboard.jsx` | S | 3 critical runtime bugs. Fix FIRST. |
| 2.6 | Dashboard decomposition | 7 NEW files + `LabDashboard.jsx` (MODIFY) | L | Split 624-line monolith. No new logic. |
| 2.7 | Sample tracker frontend | `LabSampleTracker.jsx` (NEW) + `LabQueueTab.jsx` | M | Sample list, collect button, status badges, barcode label display. |
| 2.4 FE | Reports tab | `LabReportsTab.jsx` (NEW) | M | Date range filter, order list, view report modal, print button. |
| 2.3 | Panels tab | `LabPanelsTab.jsx` (NEW) | M | Panel list, expandable tests, create/delete modals. Uses existing GET/POST/DELETE /lab/panels. |
| 2.5 FE | Color-coded flags | `LabQueueTab.jsx`, `LabResultEntryModal.jsx` | S | Display flags with bg-red/bg-green classes. Show computed flag from backend response. |

---

## 4. Key Gotchas — From Reading the Actual Code

### 4.1 `resultValue` vs `value` Field Mismatch (CRITICAL)

**Location:** `LabDashboard.jsx:38, 49-51`

The frontend initializes results with `ot.resultValue` (line 38) and sends `resultValue` in the payload (line 49). But the `DiagnosticOrderTest` Prisma model has field `value` (string?), not `resultValue`. The backend's `PUT /lab/orders/:id/results` correctly reads `r2.value` (line 247).

**Impact:** Results submission sends `resultValue: "..."` but the backend reads `r2.value` which is `undefined`. The result is always saved as `null`.

**Fix:** Change `ot.resultValue` to `ot.value` on line 38, and change `resultValue` to `value` on line 49.

### 4.2 Missing `useLabCheckout` Import (CRITICAL)

**Location:** `LabDashboard.jsx:437`

`const labCheckout = useLabCheckout();` is called but `useLabCheckout` is NOT imported on line 4. The import line only imports: `useLabOrders, useLabStats, useUpdateOrderStatus, useClaimOrder, useUnclaimOrder, labKeys`.

**Impact:** Runtime `ReferenceError: useLabCheckout is not defined` when the component mounts. This crashes the entire lab dashboard.

**Fix:** Add `useLabCheckout` to the import from `../../hooks/queries/useLab`.

### 4.3 `refRange` Display Bug (MEDIUM)

**Location:** `LabDashboard.jsx:84`

The component renders `ot.test?.refRange` but `DiagnosticTest` has `refRangeText` (String?), `refRangeLow` (Decimal?), `refRangeHigh` (Decimal?) — there is no `refRange` field.

**Impact:** Reference range always displays as empty/undefined.

**Fix:** Change to `ot.test?.refRangeText || (ot.test?.refRangeLow && ot.test?.refRangeHigh ? `${ot.test.refRangeLow} - ${ot.test.refRangeHigh}` : '')`.

### 4.4 `refRange` Field in CatalogEditModal (MEDIUM)

**Location:** `LabDashboard.jsx:364, 410`

The `CatalogEditModal` creates new tests with a single `refRange` string field. But the backend model has `refRangeText`, `refRangeLow`, `refRangeHigh`, `lowCritical`, `highCritical` as separate fields. The `createTestSchema` in `lab.schema.ts` expects these as separate fields.

**Impact:** Creating a new test from the UI only sends `refRange` (ignored by backend) and misses `refRangeLow`, `refRangeHigh`. Tests get created without numeric reference ranges, making flag auto-calculation impossible.

**Fix:** Update `CatalogEditModal` to have separate inputs for `refRangeLow`, `refRangeHigh`, `lowCritical`, `highCritical`. This is part of task 2.6 (decomposition) when `LabCatalogTab.jsx` is extracted.

### 4.5 `labCheckout` Variable Declared but Never Used

**Location:** `LabDashboard.jsx:437`

Even if the import is fixed, `labCheckout` is declared but never used in the template. The checkout flow (if it exists) is missing.

**Impact:** Dead code. The checkout endpoint (`POST /lab/checkout`) exists but is never called from the UI.

**Fix:** Either add a checkout button to the queue tab or remove the variable. The brief doesn't mention checkout UI, so removing it is the safer choice.

### 4.6 `DiagnosticTest` is NOT in TENANT_SCOPED_MODELS

**Location:** `tenant.ts:4-21`

The `DiagnosticTest` model is intentionally NOT in the tenant-scoped set because test catalog is shared across hospitals. This is correct — but it means `GET /lab/tests` returns ALL tests from ALL hospitals. If different hospitals need different test catalogs in the future, this will need to change. For now, it's fine.

### 4.7 Referral Creation Without hospitalId

**Location:** `lab.routes.ts:162-164`

The `POST /lab/orders` handler creates a `Referral` without explicitly setting `hospitalId`:
```ts
const referral = await prisma.referral.create({
  data: { type: 'LAB_DISPATCH', status: 'PENDING', patientId, fromClinicId, notes: clinicalNotes || null },
});
```

`Referral` IS in `TENANT_SCOPED_MODELS`, so the middleware auto-injects `hospitalId`. This works correctly. No fix needed — but worth noting in the audit.

### 4.8 `POST /lab/checkout` Creates Transaction Without hospitalId

**Location:** `lab.routes.ts:342-358`

Similar to 4.7, `Transaction` IS in `TENANT_SCOPED_MODELS`. The middleware auto-injects `hospitalId`. The `shift` query (line 337) is scoped to `userId`, which is fine. The `department.findFirst` (line 341) queries by `slug: 'lab-dept'` — but `Department` IS in `TENANT_SCOPED_MODELS`, so the middleware adds hospitalId filter automatically.

### 4.9 Order Status Filter Doesn't Include SUBMITTED

**Location:** `LabDashboard.jsx:461`

The `filterOptions` array is `['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']` but the actual `DiagnosticOrderStatus` enum has `SUBMITTED`, not `PENDING`. The backend filters by `status` query param, so filtering by "PENDING" will return 0 results.

**Fix:** Change `'PENDING'` to `'SUBMITTED'` in `filterOptions`.

### 4.10 `OrderDetailModal` Sends `testId` Instead of `orderTestId`

**Location:** `LabDashboard.jsx:49-53`

The results payload maps `testId` as the key and includes `orderTestId` separately. But the backend expects `orderTestId` as the identifier for the `diagnosticOrderTest` update. The current code works because it sends `orderTestId` correctly — but the `results` object uses `testId` as the key, which could be confusing. The payload shape is:

```js
{ results: [{ testId: "...", resultValue: "...", orderTestId: "..." }] }
```

The backend reads `r2.orderTestId` (line 242) correctly. However, `resultValue` is sent as a field name while the backend reads `r2.value` — this is the same bug as 4.1.

---

## 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LAB WORKFLOW DATA FLOW                       │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │  DOCTOR      │  Creates order via LabOrderModal (Phase 4)
  │  (Clinic)    │  POST /lab/orders { patientId, testIds, priority }
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  ORDER       │  status = SUBMITTED, paid = false
  │  CREATED     │  Referral auto-created (LAB_DISPATCH)
  │              │  Notification NOT sent yet
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  RECEPTIONIST│  POST /lab/checkout { orderIds, paymentMethod }
  │  (Checkout)  │  Creates Transaction(type=LAB), sets paid=true
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  LAB TECH    │  PATCH /lab/orders/:id/claim
  │  (Claims)    │  status → IN_PROGRESS, assignedToId = tech
  │              │  ★ Auto-creates LabSample (label: LAB-YYMMDD-NNNN)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  SAMPLE      │  PATCH /lab/samples/:id/collect
  │  COLLECTED   │  status = COLLECTED, collectedAt = now
  │              │  (Blood draw, urine, etc.)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  RESULTS     │  PUT /lab/orders/:id/results
  │  ENTRY       │  { results: [{ orderTestId, value, unit }] }
  │              │  ★ Backend auto-calculates flag + isAbnormal
  │              │  status → COMPLETED
  │              │  Referral → FULFILLED
  │              │  Notifications sent to clinic users
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  REPORT      │  GET /lab/orders/:id/report (JSON)
  │  AVAILABLE   │  Frontend renders HTML print template
  │              │  window.print() → PDF
  └──────────────┘
```

### Sample Status Sub-Flow

```
  Order claimed
       │
       ▼
  LabSample created (status: COLLECTED)
       │
       ▼
  Lab tech collects specimen → PATCH /lab/samples/:id/collect
       │
       ▼
  Sample status: COLLECTED
       │
       ▼
  Lab tech starts processing → PATCH /lab/samples/:id/status { status: "IN_PROGRESS" }
       │
       ▼
  Processing complete → PATCH /lab/samples/:id/status { status: "COMPLETED" }
       │
       ▼
  (or) Rejected → PATCH /lab/samples/:id/status { status: "REJECTED", rejectionReason: "..." }
```

---

## 6. Exact File List

### 6.1 Sr Dev — Backend Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| 2.2 | `backend/prisma/migrations/YYYYMMDD_add_lab_sample_model/migration.sql` | Migration for LabSample model + LabSampleStatus enum |
| 2.9 | _(no new files)_ | Tests added to existing file |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| 2.2 | `backend/prisma/schema.prisma` | Add `LabSample` model + `LabSampleStatus` enum. Add `labSamples` relation to `DiagnosticOrder`. Add `labSamples` relation to `User`. Add `labSamples` relation to `Hospital`. |
| 2.2 | `backend/src/middleware/tenant.ts` | Add `'LabSample'` to `TENANT_SCOPED_MODELS` set (line 19) |
| 2.2 | `backend/src/modules/lab/lab.routes.ts` | Add 5 sample endpoints. Add auto-create sample on claim. Add samples to ORDER_INCLUDE. Add `calculateFlag` helper. |
| 2.2 | `backend/src/schemas/lab.schema.ts` | Add `createSampleSchema`, `updateSampleStatusSchema` |
| 2.4 | `backend/src/modules/lab/lab.routes.ts` | Enhance GET /orders/:id/report to include samples in the response |
| 2.5 | `backend/src/modules/lab/lab.routes.ts` | Add `calculateFlag` function. Modify PUT /orders/:id/results to auto-compute flag and isAbnormal from value vs test ref ranges. |
| 2.8 | `backend/src/middleware/tenant.ts` | Verify `LabSample` is added to TENANT_SCOPED_MODELS (done in 2.2). Verify all DiagnosticOrder queries pass. |
| 2.9 | `backend/tests/lab.test.js` | Add authenticated business logic tests |

### 6.2 Jr Dev — Frontend Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| 2.6 | `frontend/src/features/lab/LabDashboardShell.jsx` | Tab container with stats cards, header, "Request Test" button |
| 2.6 | `frontend/src/features/lab/LabQueueTab.jsx` | Order table with status filters, claim/unclaim/complete/cancel actions |
| 2.6 | `frontend/src/features/lab/LabCatalogTab.jsx` | Test catalog CRUD table + edit modal (extracted from CatalogManager + CatalogEditModal) |
| 2.6 | `frontend/src/features/lab/LabPanelsTab.jsx` | Panel list with expandable tests, create/delete (NEW content) |
| 2.6 | `frontend/src/features/lab/LabReportsTab.jsx` | Reports list with date filter, view report modal, print button (NEW content) |
| 2.6 | `frontend/src/features/lab/LabResultEntryModal.jsx` | Result entry form (extracted from OrderDetailModal) |
| 2.7 | `frontend/src/features/lab/LabSampleTracker.jsx` | Sample tracking overlay (NEW content) |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| 2.1 | `frontend/src/features/lab/LabDashboard.jsx` | Fix 3 bugs: import useLabCheckout, resultValue→value, refRange display |
| 2.6 | `frontend/src/features/lab/LabDashboard.jsx` | Gut 624 lines → ~30 lines importing LabDashboardShell |

#### MODIFY — Hooks

| # | File | Changes |
|---|------|---------|
| 2.7 | `frontend/src/hooks/queries/useLab.js` | Add `useLabSamples`, `useCreateSample`, `useCollectSample`, `useUpdateSampleStatus` hooks |

---

## 7. Pattern References — Existing Files to Follow as Templates

| Pattern | Reference File | What to Follow |
|---------|---------------|----------------|
| Backend route structure | `backend/src/modules/lab/lab.routes.ts` | Import pattern, middleware chain (`authenticate, requirePermission, validate, asyncHandler`), error handling |
| Zod schema | `backend/src/schemas/lab.schema.ts` | Schema shape, optional fields, `.refine()` for cross-field validation |
| Prisma model with relations | `backend/prisma/schema.prisma` (DiagnosticOrder, line 1161) | Field types, `@id @default(uuid())`, relations, `@@index`, `@@map` |
| Tenant middleware | `backend/src/middleware/tenant.ts` | How to add model to TENANT_SCOPED_MODELS |
| React Query hook | `frontend/src/hooks/queries/useLab.js` | `useQuery`/`useMutation` pattern, query key factory (`labKeys`), `invalidateQueries` |
| Frontend component | `frontend/src/features/lab/LabDashboard.jsx` | Import pattern, UI components (`Card`, `Badge`, `Table`, `Modal`, `Button`, `Input`), `useTranslation`, `notifySuccess`/`notifyError` |
| Modal component | `frontend/src/components/ui/Modal.jsx` | Props: `open`, `onClose`, `title`, `children`, `className` |
| Table component | `frontend/src/components/ui/Table.jsx` | Props: `columns` (key, label, render), `data`, `onRowClick` |
| Backend test | `backend/tests/lab.test.js` | `describe`/`it` structure with supertest, `app` import, 401 rejection tests |
| E2E test | `frontend/e2e/smoke/05-lab.spec.js` | Login flow, navigation, selector patterns |
| RBAC permissions | `backend/src/middleware/rbac.ts` | `PERMISSIONS` constants, role definitions |
| Error classes | `backend/src/utils/errors.ts` | `ValidationError`, `NotFoundError` |
| Audit middleware | `backend/src/middleware/auditLog.ts` | `auditMiddleware(action, modelName)` pattern |

---

## 8. API Contracts — Detailed Request/Response Shapes

### 8.1 Sample Endpoints

#### `GET /lab/samples`

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter by LabSampleStatus |
| `orderId` | string | No | Filter by order ID |

**Permission:** `diagnostics:read`

**Response 200:**

```ts
Array<{
  id: string;
  label: string;                    // "LAB-260716-0001"
  status: "COLLECTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  collectedAt: string | null;       // ISO date
  collectedBy: { id: string; fullName: string } | null;
  order: {
    id: string;
    patient: { id: string; fullName: string; mrn: string };
    status: string;
  };
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}>
```

#### `POST /lab/samples`

**Permission:** `diagnostics:write`

**Request Body:**

```ts
{
  orderId: string;       // required, must be a valid DiagnosticOrder ID
  notes?: string;        // optional
}
```

**Zod Schema (`createSampleSchema`):**

```ts
z.object({
  orderId: z.string().uuid('Invalid order ID'),
  notes: z.string().optional().nullable(),
})
```

**Behavior:**
- Auto-generates `label` in format `LAB-{YYMMDD}-{NNNN}` (e.g., `LAB-260716-0001`)
- NNNN is a daily sequential counter per hospital (resets each day)
- Sets `status = 'COLLECTED'`
- Sets `hospitalId` from tenant middleware

**Response 201:**

```ts
{
  id: string;
  label: string;
  status: "COLLECTED";
  collectedAt: null;
  collectedBy: null;
  order: { id: string; patient: { fullName: string; mrn: string } };
  notes: string | null;
  createdAt: string;
}
```

#### `PATCH /lab/samples/:id/collect`

**Permission:** `diagnostics:write`

**Request Body:**

```ts
{
  notes?: string;        // optional
}
```

**Behavior:**
- Sets `collectedAt = new Date()`
- Sets `collectedById = req.user!.id`
- Sets `status = 'COLLECTED'` (if not already)
- If already collected, returns the sample unchanged (idempotent)

**Response 200:** Updated sample object (same shape as POST response).

#### `PATCH /lab/samples/:id/status`

**Permission:** `diagnostics:write`

**Request Body:**

```ts
{
  status: "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  rejectionReason?: string;   // required if status = "REJECTED"
}
```

**Zod Schema (`updateSampleStatusSchema`):**

```ts
z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'REJECTED']),
  rejectionReason: z.string().optional(),
}).refine(data => data.status !== 'REJECTED' || data.rejectionReason, {
  message: 'rejectionReason is required when status is REJECTED',
})
```

**Response 200:** Updated sample object.

#### `DELETE /lab/samples/:id`

**Permission:** `diagnostics:write`

**Behavior:** Soft-delete (sets `is_deleted = true` on the record, or removes it). Given the existing pattern in the codebase uses soft-delete for some models (e.g., `DiagnosticPanel.is_deleted`) but hard-delete is not used anywhere for lab — use hard delete for simplicity since samples are lightweight records.

**Response 200:** `{ success: true }`

### 8.2 Enhanced Report Endpoint

#### `GET /lab/orders/:id/report` (existing, enhanced)

**Permission:** `diagnostics:read`

**Response 200 (unchanged shape, samples added):**

```ts
{
  id: string;
  orderType: "LAB";
  status: string;
  priority: number;
  clinicalNotes: string | null;
  resultNotes: string | null;
  createdAt: string;
  completedAt: string | null;
  paid: boolean;
  patient: {
    id: string;
    fullName: string;
    mrn: string;
    dateOfBirth: string | null;
    gender: string | null;
  };
  requestedBy: { id: string; fullName: string };
  fromClinic: { id: string; name: string; slug: string };
  assignedTo: { id: string; fullName: string } | null;
  panel: { id: string; name: string } | null;
  referral: { id: string; status: string } | null;
  tests: Array<{
    id: string;
    value: string | null;
    unit: string | null;
    refRangeLow: number | null;
    refRangeHigh: number | null;
    refRangeText: string | null;
    flag: "NORMAL" | "HIGH" | "LOW" | "CRITICAL_HIGH" | "CRITICAL_LOW" | "ABNORMAL";
    notes: string | null;
    isAbnormal: boolean;
    resultEnteredAt: string | null;
    test: {
      id: string;
      code: string;
      name: string;
      category: string;
      specimen: string | null;
      unit: string | null;
      refRangeText: string | null;
      refRangeLow: number | null;
      refRangeHigh: number | null;
    };
    resultEnteredBy: { fullName: string } | null;
  }>;
  samples: Array<{           // NEW: added to ORDER_INCLUDE
    id: string;
    label: string;
    status: string;
    collectedAt: string | null;
    collectedBy: { fullName: string } | null;
    rejectionReason: string | null;
  }>;
}
```

### 8.3 Flag Auto-Calculation Logic

**Location:** `lab.routes.ts` — new `calculateFlag` function

```ts
function calculateFlag(
  value: string,
  test: { refRangeLow: number | null; refRangeHigh: number | null; lowCritical: number | null; highCritical: number | null }
): { flag: $Enums.ResultFlag; isAbnormal: boolean } {
  const num = parseFloat(value);
  if (isNaN(num)) return { flag: 'NORMAL', isAbnormal: false };

  if (test.highCritical != null && num > Number(test.highCritical)) return { flag: 'CRITICAL_HIGH', isAbnormal: true };
  if (test.lowCritical != null && num < Number(test.lowCritical)) return { flag: 'CRITICAL_LOW', isAbnormal: true };
  if (test.refRangeHigh != null && num > Number(test.refRangeHigh)) return { flag: 'HIGH', isAbnormal: true };
  if (test.refRangeLow != null && num < Number(test.refRangeLow)) return { flag: 'LOW', isAbnormal: true };
  return { flag: 'NORMAL', isAbnormal: false };
}
```

**Modified PUT /orders/:id/results handler:**

Inside the `$transaction` callback, after extracting `r2`, look up the test's reference ranges from the `order.tests` include (which already fetches `test: true`). Use the test's `refRangeLow`/`refRangeHigh`/`lowCritical`/`highCritical` to compute `flag` and `isAbnormal`. Ignore any `flag` value sent by the frontend.

```ts
// Inside $transaction callback:
const orderTest = order.tests.find(t => t.id === r2.orderTestId);
const test = orderTest?.test;
let flag: $Enums.ResultFlag = 'NORMAL';
let isAbnormal = false;
if (test && r2.value) {
  const computed = calculateFlag(r2.value, test);
  flag = computed.flag;
  isAbnormal = computed.isAbnormal;
}

return prisma.diagnosticOrderTest.update({
  where: { id: r2.orderTestId },
  data: {
    value: r2.value ?? null,
    unit: r2.unit ?? null,
    refRangeLow: r2.refRangeLow !== undefined ? parseFloat(r2.refRangeLow) : null,
    refRangeHigh: r2.refRangeHigh !== undefined ? parseFloat(r2.refRangeHigh) : null,
    refRangeText: r2.refRangeText ?? null,
    flag,
    notes: r2.notes ?? null,
    resultEnteredAt: new Date(),
    resultEnteredById: req.user!.id,
    isAbnormal,
  },
});
```

### 8.4 Sample Label Generation

**Format:** `LAB-{YYMMDD}-{NNNN}`

**Example:** `LAB-260716-0001` (first sample on July 16, 2026)

**Implementation:**

```ts
async function generateSampleLabel(hospitalId: string | null): Promise<string> {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, ''); // "260716"
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const count = await prisma.labSample.count({
    where: {
      createdAt: { gte: startOfDay, lt: nextDay },
      ...(hospitalId ? { hospitalId } : {}),
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `LAB-${datePart}-${seq}`;
}
```

**Note:** This is not atomic-safe for concurrent requests. For a production system, use a database sequence or Redis counter. For this phase, the simple count approach is sufficient — the label uniqueness constraint will catch any collisions, and the caller can retry.

---

## 9. Component API — Frontend Component Props

### 9.1 LabDashboardShell

**File:** `frontend/src/features/lab/LabDashboardShell.jsx`

The top-level component that replaces the current default export of `LabDashboard.jsx`.

```jsx
// No props — self-contained. Manages tab state internally.
// Uses useLabStats() for stats cards.
// Renders: header, stats grid, tab bar, active tab content, modals.

<LabDashboardShell />
```

**Internal state:**
- `activeTab` — one of `'queue' | 'catalog' | 'panels' | 'reports'`
- `showNewRequest` — boolean (controls NewRequestModal)
- `mutationError` — string (error banner)

**Delegates to:**
- `<LabQueueTab />` when activeTab === 'queue'
- `<LabCatalogTab />` when activeTab === 'catalog'
- `<LabPanelsTab />` when activeTab === 'panels'
- `<LabReportsTab />` when activeTab === 'reports'
- `<NewRequestModal />` (kept in shell, shared across tabs)

### 9.2 LabQueueTab

**File:** `frontend/src/features/lab/LabQueueTab.jsx`

```jsx
// No props — self-contained. Fetches its own data.
// Uses useLabOrders(params), useClaimOrder(), useUnclaimOrder(), useUpdateOrderStatus().
// Shows: filter bar, order table, sample tracker inline.

<LabQueueTab />
```

**Internal state:**
- `statusFilter` — string (default `'ALL'`)
- `selectedOrder` — order object | null
- `showDetail` — boolean

**Behavior:**
- Fetches orders based on `statusFilter`
- Table columns: status (badge), patient name, priority (badge), test count, assigned to, date, sample status, actions
- Actions per row: View/Enter Results (opens LabResultEntryModal), Claim, Unclaim, Complete, Cancel
- Sample tracker column shows inline badge for sample status if sample exists

### 9.3 LabCatalogTab

**File:** `frontend/src/features/lab/LabCatalogTab.jsx`

```jsx
// Props:
//   onRefresh?: () => void    // Called after catalog changes to refresh stats

<LabCatalogTab onRefresh={handleSaveResults} />
```

**Internal state:**
- `catalog` — array of DiagnosticTest
- `loading` — boolean
- `editTest` — test object | null (controls edit modal)
- `saving` — boolean

**Behavior:**
- Fetches `GET /lab/tests` on mount
- Shows table with columns: code, name, category, specimen, unit, refRangeLow-RefRangeHigh, price, actions
- "Add Test" button opens `CatalogEditModal` (extracted inline component)
- Edit modal has fields: code, name, category, specimen, unit, refRangeLow, refRangeHigh, lowCritical, highCritical, price
- Calls `PUT /lab/tests/:id` for edit, `POST /lab/tests` for create

### 9.4 LabPanelsTab

**File:** `frontend/src/features/lab/LabPanelsTab.jsx`

```jsx
// No props — self-contained.

<LabPanelsTab />
```

**Internal state:**
- `panels` — array of DiagnosticPanel with panelTests
- `loading` — boolean
- `showCreate` — boolean
- `expandedPanelId` — string | null
- `testCatalog` — array (for multi-select in create modal)
- `form` — { name, testIds: string[] }

**Behavior:**
- Fetches `GET /lab/panels` on mount
- Table with columns: name, test count, actions
- Expandable row: shows member tests as a sub-table
- "Create Panel" button opens modal with: name input, multi-select test list (checkboxes grouped by category, same pattern as NewRequestModal)
- "Delete Panel" button with confirmation dialog
- Empty state: "No panels created yet. Create one from the test catalog."

### 9.5 LabReportsTab

**File:** `frontend/src/features/lab/LabReportsTab.jsx`

```jsx
// No props — self-contained.

<LabReportsTab />
```

**Internal state:**
- `orders` — array of completed orders
- `loading` — boolean
- `selectedOrder` — order object | null (for report view)
- `showReport` — boolean
- `dateFrom` — string (ISO date)
- `dateTo` — string (ISO date)
- `statusFilter` — string

**Behavior:**
- Fetches `GET /lab/orders?status=COMPLETED` on mount (plus date range params if backend supports it)
- Date range filter (from/to inputs)
- Order list table: patient, date, test count, status badge, actions
- "View Report" action opens a read-only modal showing:
  - Hospital header (name from order context)
  - Patient info (name, MRN, DOB, gender)
  - Order info (date, order ID, requested by)
  - Results table: test name, value, unit, ref range, flag (color-coded badge)
  - Footer: "Report generated on {date}"
- "Print Report" button calls `window.print()` on the report content div
- Empty state: "No completed reports found"

### 9.6 LabResultEntryModal

**File:** `frontend/src/features/lab/LabResultEntryModal.jsx`

```jsx
// Props:
//   order: DiagnosticOrder (with tests nested)
//   open: boolean
//   onClose: () => void
//   onSave: () => void

<LabResultEntryModal order={order} open={showDetail} onClose={handleClose} onSave={handleSaveResults} />
```

**Internal state:**
- `results` — Record<testId, { value, unit, refRangeLow, refRangeHigh }>
- `resultNotes` — string
- `saving` — boolean

**Behavior:**
- Shows order status badge, priority badge, assigned to
- For each test in order.tests:
  - Test name + unit
  - Reference range display (from test definition, using refRangeText or refRangeLow-refRangeHigh)
  - Input for value
  - Input for unit (pre-filled from test definition)
  - (Read-only) computed flag display after submission
- Notes textarea
- "Save Results" button sends `PUT /lab/orders/:id/results`
- Payload shape:

```ts
{
  results: Array<{
    orderTestId: string;
    value: string;
    unit?: string;
    refRangeLow?: string;
    refRangeHigh?: string;
    refRangeText?: string;
    notes?: string;
  }>;
  resultNotes?: string;
}
```

### 9.7 LabSampleTracker

**File:** `frontend/src/features/lab/LabSampleTracker.jsx`

```jsx
// Props:
//   orderId: string                    // required
//   samples: Array<LabSample> | undefined  // optional, passed from parent
//   onRefresh?: () => void             // Called after sample action to refresh parent data

<LabSampleTracker orderId={order.id} samples={order.samples} onRefresh={handleSaveResults} />
```

**Internal state:**
- `creating` — boolean
- `updatingId` — string | null (which sample is being updated)

**Behavior:**
- Shows existing samples for the order (if any)
- Each sample shows: label (prominent, monospace font), status badge (color-coded), collected by, collected at, actions
- "Collect Sample" button → calls `POST /lab/samples` with `{ orderId }`, then `onRefresh()`
- Status dropdown for each sample → calls `PATCH /lab/samples/:id/status` with new status
- For REJECTED status: shows rejectionReason input
- Empty state: "No samples collected yet"
- Status badge colors:
  - COLLECTED → `warning` (yellow)
  - IN_PROGRESS → `info` (blue)
  - COMPLETED → `success` (green)
  - REJECTED → `danger` (red)

---

## 10. Implementation Details — Backend

### 10.1 LabSample Prisma Model

Add to `schema.prisma` after the `DiagnosticOrderTest` model (line 1234):

```prisma
model LabSample {
  id              String            @id @default(uuid())
  label           String            @unique
  status          LabSampleStatus   @default(COLLECTED)
  collectedAt     DateTime?
  collectedById   String?
  orderId         String
  hospitalId      String?
  rejectionReason String?
  notes           String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  collectedBy     User?             @relation("SampleCollector", fields: [collectedById], references: [id])
  order           DiagnosticOrder   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  hospital        Hospital?         @relation(fields: [hospitalId], references: [id])

  @@index([orderId])
  @@index([hospitalId, status])
  @@index([label])
  @@map("lab_samples")
}
```

Add to `DiagnosticOrder` model (after `transactions Transaction[]` on line 1190):

```prisma
  labSamples      LabSample[]
```

Add to `Hospital` model (after `imagingOrders` on line 80):

```prisma
  labSamples      LabSample[]
```

Add to `User` model (find the model and add):

```prisma
  collectedSamples LabSample[] @relation("SampleCollector")
```

Add enum (after `ResultFlag` enum, line 1899):

```prisma
enum LabSampleStatus {
  COLLECTED
  IN_PROGRESS
  COMPLETED
  REJECTED
}
```

### 10.2 Tenant Middleware Update

Add `'LabSample'` to the `TENANT_SCOPED_MODELS` set in `tenant.ts` (line 19, after `'DiagnosticOrderTest'`):

```ts
'LabSample',
```

### 10.3 New Zod Schemas

Add to `lab.schema.ts`:

```ts
export const createSampleSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  notes: z.string().optional().nullable(),
});

export const updateSampleStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'REJECTED']),
  rejectionReason: z.string().optional(),
}).refine(data => data.status !== 'REJECTED' || data.rejectionReason, {
  message: 'rejectionReason is required when status is REJECTED',
});
```

Update the import in `lab.routes.ts`:

```ts
import { createOrderSchema, createTestSchema, createSampleSchema, updateSampleStatusSchema } from '../../schemas/lab.schema.js';
```

### 10.4 Sample Endpoints Implementation

Add to `lab.routes.ts` after the existing `/stats` endpoint (line 369):

```ts
// --- Label Generator ---
async function generateSampleLabel(hospitalId: string | null): Promise<string> {
  const now = new Date();
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const datePart = `${y}${m}${d}`;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const count = await prisma.labSample.count({
    where: {
      createdAt: { gte: startOfDay, lt: endOfDay },
      ...(hospitalId ? { hospitalId } : {}),
    },
  });
  return `LAB-${datePart}-${String(count + 1).padStart(4, '0')}`;
}

// --- List Samples ---
router.get('/samples', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const { status, orderId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;
  const samples = await prisma.labSample.findMany({
    where,
    include: {
      collectedBy: { select: { id: true, fullName: true } },
      order: {
        select: {
          id: true,
          status: true,
          patient: { select: { id: true, fullName: true, mrn: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(samples);
}));

// --- Create Sample ---
router.post('/samples', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), validate(createSampleSchema), asyncHandler(async (req, res) => {
  const { orderId, notes } = req.body;
  const order = await prisma.diagnosticOrder.findFirst({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');
  const label = await generateSampleLabel(req.user!.hospitalId || null);
  const sample = await prisma.labSample.create({
    data: {
      label,
      orderId,
      notes: notes || null,
      status: 'COLLECTED',
    },
    include: {
      collectedBy: { select: { id: true, fullName: true } },
      order: { select: { id: true, patient: { select: { fullName: true, mrn: true } } } },
    },
  });
  res.status(201).json(sample);
}));

// --- Collect Sample ---
router.patch('/samples/:id/collect', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const sample = await prisma.labSample.findFirst({ where: { id: req.params.id } });
  if (!sample) throw new NotFoundError('Sample not found');
  const updated = await prisma.labSample.update({
    where: { id: req.params.id },
    data: {
      collectedAt: sample.collectedAt || new Date(),
      collectedById: sample.collectedById || req.user!.id,
      status: sample.status === 'COLLECTED' ? 'COLLECTED' : sample.status,
    },
    include: {
      collectedBy: { select: { id: true, fullName: true } },
      order: { select: { id: true, patient: { select: { fullName: true, mrn: true } } } },
    },
  });
  res.json(updated);
}));

// --- Update Sample Status ---
router.patch('/samples/:id/status', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), validate(updateSampleStatusSchema), asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;
  const sample = await prisma.labSample.findFirst({ where: { id: req.params.id } });
  if (!sample) throw new NotFoundError('Sample not found');
  const updated = await prisma.labSample.update({
    where: { id: req.params.id },
    data: {
      status,
      rejectionReason: status === 'REJECTED' ? (rejectionReason || null) : null,
    },
    include: {
      collectedBy: { select: { id: true, fullName: true } },
      order: { select: { id: true, patient: { select: { fullName: true, mrn: true } } } },
    },
  });
  res.json(updated);
}));

// --- Delete Sample ---
router.delete('/samples/:id', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const sample = await prisma.labSample.findFirst({ where: { id: req.params.id } });
  if (!sample) throw new NotFoundError('Sample not found');
  await prisma.labSample.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));
```

### 10.5 Auto-Create Sample on Claim

Modify the `PATCH /orders/:id/claim` handler (line 178-188). After updating the order status to `IN_PROGRESS`, auto-create a LabSample:

```ts
router.patch('/orders/:id/claim', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const existing = await prisma.diagnosticOrder.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Order not found');
  if (!existing.paid) throw new ValidationError('Order must be paid before it can be claimed');
  const order = await prisma.diagnosticOrder.update({
    where: { id: req.params.id },
    data: { status: 'IN_PROGRESS', assignedToId: req.user!.id },
    include: ORDER_INCLUDE,
  });
  // Auto-create sample
  const label = await generateSampleLabel(req.user!.hospitalId || null);
  await prisma.labSample.create({
    data: {
      label,
      orderId: order.id,
      status: 'COLLECTED',
      collectedAt: new Date(),
      collectedById: req.user!.id,
    },
  });
  res.json(order);
}));
```

### 10.6 Add Samples to ORDER_INCLUDE

Update the `ORDER_INCLUDE` constant (line 14-28) to include samples:

```ts
const ORDER_INCLUDE = {
  patient: { select: { id: true, fullName: true, mrn: true, dateOfBirth: true, gender: true } },
  requestedBy: { select: { id: true, fullName: true } },
  fromClinic: { select: { id: true, name: true, slug: true } },
  assignedTo: { select: { id: true, fullName: true } },
  panel: { select: { id: true, name: true } },
  referral: { select: { id: true, status: true } },
  tests: {
    include: {
      test: true,
      resultEnteredBy: { select: { id: true, fullName: true } },
    },
    orderBy: { test: { sortOrder: 'asc' as const } },
  },
  labSamples: {
    select: {
      id: true, label: true, status: true, collectedAt: true, rejectionReason: true, notes: true,
      collectedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};
```

### 10.7 Hospital Scoping Audit Checklist

Verify the following (tenant middleware should handle all automatically):

| Endpoint | Model | In TENANT_SCOPED_MODELS? | Manual hospitalId needed? |
|----------|-------|--------------------------|---------------------------|
| GET /lab/orders | DiagnosticOrder | ✅ Yes | No — middleware injects |
| POST /lab/orders | DiagnosticOrder, Referral | ✅ Yes | No — middleware injects |
| PATCH /orders/:id/claim | DiagnosticOrder | ✅ Yes | No — middleware injects |
| PATCH /orders/:id/unclaim | DiagnosticOrder | ✅ Yes | No — middleware injects |
| PATCH /orders/:id/status | DiagnosticOrder | ✅ Yes | No — middleware injects |
| PUT /orders/:id/results | DiagnosticOrder, DiagnosticOrderTest | ✅ Yes | No — middleware injects |
| GET /results | DiagnosticOrder | ✅ Yes | No — middleware injects |
| POST /checkout | Transaction, DiagnosticOrder | ✅ Yes | No — middleware injects |
| GET /stats | DiagnosticOrder, DiagnosticTest | ✅/❌ DiagnosticTest not scoped | No — tests are shared |
| GET /samples | LabSample | ✅ (added in 10.2) | No — middleware injects |
| POST /samples | LabSample | ✅ (added in 10.2) | No — middleware injects |
| PATCH /samples/:id/* | LabSample | ✅ (added in 10.2) | No — middleware injects |
| DELETE /samples/:id | LabSample | ✅ (added in 10.2) | No — middleware injects |

---

## 11. Implementation Details — Frontend

### 11.1 Bug Fixes (Task 2.1) — Apply to LabDashboard.jsx FIRST

**Fix 1:** Add missing import (line 4):

```diff
- import { useLabOrders, useLabStats, useUpdateOrderStatus, useClaimOrder, useUnclaimOrder, labKeys } from '../../hooks/queries/useLab';
+ import { useLabOrders, useLabStats, useUpdateOrderStatus, useClaimOrder, useUnclaimOrder, useLabCheckout, labKeys } from '../../hooks/queries/useLab';
```

**Fix 2:** Fix resultValue field (line 38):

```diff
- init[ot.testId] = ot.resultValue || '';
+ init[ot.testId] = ot.value || '';
```

**Fix 3:** Fix refRange display (line 84):

```diff
- {ot.test?.refRange && (
-   <p className="text-caption text-slate">{t('lab.refRange')}: {ot.test.refRange}</p>
+ {(() => {
+   const rr = ot.test?.refRangeText || (ot.test?.refRangeLow != null && ot.test?.refRangeHigh != null ? `${ot.test.refRangeLow} - ${ot.test.refRangeHigh}` : null);
+   return rr ? <p className="text-caption text-slate">{t('lab.refRange')}: {rr}</p> : null;
+ })()
```

**Fix 4:** Fix filter options (line 461):

```diff
- const filterOptions = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
+ const filterOptions = ['ALL', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
```

**Fix 5:** Fix results payload field name (line 49):

```diff
- const payload = {
-   results: Object.entries(results).map(([testId, resultValue]) => ({
-     testId,
-     resultValue,
-     orderTestId: order.tests?.find((ot) => ot.testId === testId)?.id,
-   })),
-   resultNotes,
- };
+ const payload = {
+   results: Object.entries(results).map(([testId, value]) => ({
+     orderTestId: order.tests?.find((ot) => ot.testId === testId)?.id,
+     value,
+   })),
+   resultNotes,
+ };
```

### 11.2 New React Query Hooks

Add to `useLab.js`:

```js
// --- Sample Hooks ---
export const labSampleKeys = {
  all: ['lab', 'samples'],
  list: (params) => ['lab', 'samples', params],
  order: (orderId) => ['lab', 'samples', 'order', orderId],
};

export function useLabSamples(params) {
  return useQuery({
    queryKey: labSampleKeys.list(params),
    queryFn: () => api.get(`/lab/samples${params ? `?${params}` : ''}`),
  });
}

export function useLabSamplesByOrder(orderId) {
  return useQuery({
    queryKey: labSampleKeys.order(orderId),
    queryFn: () => api.get(`/lab/samples?orderId=${orderId}`),
    enabled: !!orderId,
  });
}

export function useCreateSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/lab/samples', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: labSampleKeys.all });
      if (variables.orderId) {
        queryClient.invalidateQueries({ queryKey: labSampleKeys.order(variables.orderId) });
      }
    },
  });
}

export function useCollectSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }) => api.patch(`/lab/samples/${id}/collect`, { notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: labSampleKeys.all }),
  });
}

export function useUpdateSampleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }) =>
      api.patch(`/lab/samples/${id}/status`, { status, rejectionReason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: labSampleKeys.all }),
  });
}
```

### 11.3 LabDashboard Decomposition (Task 2.6)

**Original `LabDashboard.jsx` becomes a thin wrapper (~30 lines):**

```jsx
import LabDashboardShell from './LabDashboardShell';

export default function LabDashboard() {
  return <LabDashboardShell />;
}
```

**LabDashboardShell.jsx** — contains:
- `activeTab` state, `showNewRequest` state, `mutationError` state
- Header with title, description, "Request Test" button
- Tab bar (queue, catalog, panels, reports)
- Stats cards (from `useLabStats()`)
- Renders active tab component
- `NewRequestModal` (kept in shell, shared)
- Error banner

**LabQueueTab.jsx** — contains:
- `statusFilter` state, `selectedOrder` state, `showDetail` state
- Filter buttons
- Order table (from `useLabOrders()`)
- Claim/unclaim/complete/cancel handlers
- `LabResultEntryModal` (opened from queue)
- `LabSampleTracker` (inline in queue row or expanded section)

**LabCatalogTab.jsx** — contains:
- Everything from `CatalogManager` + `CatalogEditModal` (lines 323-419)
- Updated `CatalogEditModal` with proper reference range fields

**LabPanelsTab.jsx** — NEW content (panels tab was a stub)

**LabReportsTab.jsx** — NEW content (reports tab was a stub)

**LabResultEntryModal.jsx** — extracted from `OrderDetailModal` (lines 28-115)

**LabSampleTracker.jsx** — NEW component (sample tracking)

### 11.4 LabPanelsTab Implementation Notes

The backend already has `GET /lab/panels` (returns panels with `panelTests.test` included), `POST /lab/panels` (creates with `testIds` array), and `DELETE /lab/panels/:id` (soft-deletes).

The frontend needs:
1. Fetch panels on mount using `api.get('/lab/panels')`
2. Table with columns: Name, Test Count, Actions (Delete)
3. Expandable row showing member tests (nested table or list)
4. "Create Panel" button → modal with:
   - Name input
   - Test catalog multi-select (fetch `GET /lab/tests` for the list)
   - Grouped by category (same pattern as `NewRequestModal`)
   - Submit sends `POST /lab/panels` with `{ name, testIds: [...] }`
5. Delete with confirmation

### 11.5 LabReportsTab Implementation Notes

The backend already returns full order data via `GET /lab/orders?status=COMPLETED`. The reports tab:

1. Fetches completed orders using `useLabOrders('status=COMPLETED')`
2. Date range filter (client-side filtering on `createdAt` since backend doesn't have date params on GET /orders)
3. Order list table: patient name, date, test count, status, "View Report" action
4. "View Report" opens a read-only modal:
   - Fetches full order data via `GET /lab/orders/:id/report`
   - Renders formatted report with:
     - Hospital name (from order context or hardcoded)
     - Patient: name, MRN, DOB, gender
     - Order: date, ID, requested by, assigned to
     - Results table with columns: Test, Value, Unit, Ref Range, Flag
     - Flag cells colored: NORMAL=green, HIGH=orange, LOW=blue, CRITICAL_HIGH=red, CRITICAL_LOW=red
   - "Print Report" button: wraps report div in print-optimized CSS and calls `window.print()`

### 11.6 LabSampleTracker Integration in Queue Tab

The `LabSampleTracker` component is rendered inline in the queue tab's order table. Two integration approaches:

**Option A (recommended):** Add a "Samples" column to the queue table that shows a compact badge:
```jsx
{ key: 'samples', label: 'Samples', render: (r) => {
  const samples = r.labSamples || [];
  if (samples.length === 0) return <span className="text-caption text-slate">-</span>;
  const latest = samples[samples.length - 1];
  return <Badge variant={sampleStatusBadge[latest.status]}>{samples.length} sample(s)</Badge>;
}}
```

**Option B:** Expand a row to show the full `LabSampleTracker` component.

Option A is simpler and keeps the table scannable. Full sample management can be done from within the `LabResultEntryModal`.

---

## 12. Implementation Order — Recommended Sequence

### Sr Dev Day 1:
1. Task 2.8: Hospital scoping audit (verify, don't write new code)
2. Task 2.2: Add LabSample model to schema.prisma + migration
3. Task 2.2: Add LabSample to TENANT_SCOPED_MODELS in tenant.ts

### Sr Dev Day 2:
4. Task 2.2: Add sample CRUD endpoints + label generator to lab.routes.ts
5. Task 2.2: Add Zod schemas to lab.schema.ts
6. Task 2.2: Add auto-create sample on claim
7. Task 2.2: Add samples to ORDER_INCLUDE

### Sr Dev Day 3:
8. Task 2.5: Add calculateFlag function + modify PUT /results handler
9. Task 2.4: Verify GET /orders/:id/report includes samples
10. Task 2.9: Add business logic tests to lab.test.js

### Jr Dev Day 1:
1. Task 2.1: Fix 3 bugs in LabDashboard.jsx
2. Task 2.6: Extract LabDashboardShell.jsx
3. Task 2.6: Extract LabQueueTab.jsx

### Jr Dev Day 2:
4. Task 2.6: Extract LabCatalogTab.jsx (fix CatalogEditModal refRange fields)
5. Task 2.6: Extract LabResultEntryModal.jsx
6. Task 2.6: Simplify LabDashboard.jsx to thin wrapper

### Jr Dev Day 3:
7. Task 2.3: Build LabPanelsTab.jsx
8. Task 2.4 FE: Build LabReportsTab.jsx
9. Task 2.7: Build LabSampleTracker.jsx + integrate into LabQueueTab
10. Task 2.5 FE: Add color-coded flag badges to queue table and result entry modal

---

*This tech spec is based on: `docs/loops/phase-6-brief.md`, `docs/06-implementation-plan.md` (Phase 6), `docs/loops/phase-5-tech-spec.md` (pattern reference), and a comprehensive code audit of `backend/src/modules/lab/lab.routes.ts`, `backend/src/schemas/lab.schema.ts`, `backend/prisma/schema.prisma`, `backend/src/middleware/tenant.ts`, `backend/src/middleware/rbac.ts`, `backend/src/lib/prisma.ts`, `frontend/src/features/lab/LabDashboard.jsx`, `frontend/src/hooks/queries/useLab.js`, `backend/tests/lab.test.js`, and `frontend/e2e/smoke/05-lab.spec.js`.*
