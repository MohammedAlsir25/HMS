# Phase 6 Brief: Laboratory Module — Sample Tracking, Results & Reports

**Date:** 2026-07-16
**Dependencies:** Phase 0 (multi-tenant), Phase 4 (clinic lab orders), Phase 5 (pharmacy — payment patterns)

---

## Executive Summary — What Already Exists

The lab module is **already substantially built**. This phase fills specific gaps and hardens existing code.

**Already built:**

| Area | What Exists | Status |
|------|-------------|--------|
| Prisma models (5) | DiagnosticTest, DiagnosticPanel, DiagnosticPanelTest, DiagnosticOrder, DiagnosticOrderTest with all fields, enums, indexes | ✅ Complete |
| Test catalog | Full CRUD: `GET/POST/PUT/DELETE /lab/tests`, categories endpoint | ✅ Complete |
| Test panels | Full CRUD: `GET/POST/DELETE /lab/panels` | ✅ Complete |
| Order lifecycle | `POST /lab/orders` (create with referral), `PATCH claim/unclaim`, `PATCH /status`, `PUT /results` (atomic), `POST /checkout` | ✅ Complete |
| Result entry | Per-test values, flag, notes, enteredBy tracking | ✅ Complete |
| Payment integration | Makes Transaction type=LAB, links to Shift, lab-dept department | ✅ Complete |
| Referral linkage | Auto-creates Referral LAB_DISPATCH on order creation | ✅ Complete |
| RBAC (5 perms) | diagnostics:read/order/write/results/catalog, Lab Tech + Lab Admin roles | ✅ Complete |
| Lab frontend | LabDashboard.jsx (624 lines) with Queue tab, Catalog tab, stub Panels/Reports tabs | ✅ Partial |
| Clinic order modal | LabOrderModal.jsx (Phase 4) for doctors to order from consultations | ✅ Complete |
| React Query hooks | useLab.js with 8 hooks (tests, orders, stats, claim, unclaim, status, results, checkout) | ✅ Complete |
| Backend route file | lab.routes.ts (372 lines) — monolithic but complete | ✅ Complete |
| E2E tests | 2 spec files (05-lab.spec.js, 06-referral-pharmacy-lab.spec.js) — 8 tests total | ✅ Partial |

**Gaps / What needs enhancement:**

| Gap | Description | Priority |
|-----|-------------|----------|
| **Sample tracking** | No LabSample model, no specimen collection, no barcode/label for samples. Lab techs can't track which samples have been collected, which are in progress, which are done. | HIGH |
| **Panels tab stub** | Panels tab shows "No data" — the backend has panel CRUD but the frontend tab is empty | MEDIUM |
| **Reports tab stub** | Reports tab shows "No data" — no results review, no PDF download, no print | HIGH |
| **PDF report generation** | `GET /lab/orders/:id/report` returns JSON only. No formatted PDF with hospital header, patient info, results table, reference ranges, flags. | HIGH |
| **Result flag auto-calculation** | Frontend `LabDashboard.jsx` allows setting flag manually. Should auto-compute from `value` vs `refRangeLow`/`refRangeHigh`/`lowCritical`/`highCritical`. | MEDIUM |
| **Bug: useLabCheckout** | LabDashboard.jsx line 437 calls `useLabCheckout()` without importing it (undefined ReferenceError at runtime) | CRITICAL |
| **Bug: resultValue field** | LabDashboard.jsx uses `ot.resultValue` but backend model has `ot.value` — results submission will fail silently | CRITICAL |
| **Bug: refRange display** | LabDashboard.jsx uses `ot.test?.refRange` but backend model has `refRangeText`, `refRangeLow`, `refRangeHigh` separately | MEDIUM |
| **Trending view** | No way to see a patient's lab results over time for a specific test | LOW |
| **Backend tests** | Only auth-guard tests (12 tests, all 401). No business logic tests for order lifecycle, results submission, checkout. | MEDIUM |
| **Frontend tests** | Zero unit tests for lab components | LOW |
| **Router decomposition** | LabDashboard.jsx is 624-line monolithic component. Should split into sub-components. | MEDIUM |

---

## 2. Tasks

### 2.1 Bug Fixes — LabDashboard.jsx (CRITICAL — do first)

**What's needed:** Fix 3 runtime bugs in `frontend/src/features/lab/LabDashboard.jsx`:

1. **Missing `useLabCheckout` import** (line 437): Add `useLabCheckout` to the import from `'../../hooks/queries/useLab'`
2. **Wrong field name `resultValue`** (lines 38, 73-85): Change `ot.resultValue` to `ot.value` (matching `DiagnosticOrderTest.value` in Prisma schema)
3. **`refRange` display** (line 84): Change `ot.test?.refRange` to `ot.refRangeText || `${ot.refRangeLow} - ${ot.refRangeHigh}``

**Complexity:** S

### 2.2 Sample Tracking Model + Endpoints — Backend (NEW)

**What's needed:** Create sample tracking system for lab workflow.

**Prisma model — `LabSample`:**
- `id` String @id @default(uuid())
- `label` String — barcode-style label (auto-generated: `LAB-{YYMMDD}-{NNNN}`)
- `status` LabSampleStatus (COLLECTED, IN_PROGRESS, COMPLETED, REJECTED)
- `collectedAt` DateTime?
- `collectedById` String? → User
- `orderId` String → DiagnosticOrder
- `hospitalId` String?
- `rejectionReason` String?
- `notes` String?
- `createdAt`, `updatedAt`
- Enum `LabSampleStatus`: COLLECTED, IN_PROGRESS, COMPLETED, REJECTED
- Unique: `[label]`
- Index: `[orderId]`, `[hospitalId, status]`

**New endpoints — `lab.routes.ts`:**
- `GET /lab/samples` — list samples (filter by status, orderId, hospital-scoped)
- `POST /lab/samples` — create sample from an order (auto-generates label)
- `PATCH /lab/samples/:id/collect` — mark as collected (set collectedAt, collectedById)
- `PATCH /lab/samples/:id/status` — change status (IN_PROGRESS, COMPLETED, REJECTED)
- `DELETE /lab/samples/:id` — soft-delete

**Auto-create:** When a lab order's status changes to IN_PROGRESS, auto-create a `LabSample` if one doesn't exist.

**Complexity:** M

### 2.3 Panels Tab — Frontend

**What's needed:** Implement the Panels tab in `LabDashboard.jsx` with:
- Table of all panels (fetch `GET /lab/panels`)
- Expandable rows showing panel's member tests
- "Create Panel" button with modal: name, select tests (multi-select from catalog)
- "Delete Panel" button with confirmation
- Empty state: "No panels created yet. Create one from the test catalog."

**Complexity:** M

### 2.4 Reports Tab + PDF Generation — Backend + Frontend

**Backend:** Enhance `GET /lab/orders/:id/report` or create `GET /lab/orders/:id/report.pdf`:
- If `Accept: application/pdf` header or `?format=pdf` query param, generate PDF with:
  - Hospital header (hospital name from `DiagnosticOrder.hospitalId`)
  - Patient info (name, MRN, DOB, gender)
  - Order info (date, order ID, requested by)
  - Results table: test name, value, ref range, flag (color-coded)
  - Footer: report generated date, lab name
- Use PDFKit or a simple HTML-to-PDF approach
- For now, return HTML that can be printed via `window.print()`

**Frontend — Reports tab in LabDashboard.jsx:**
- Date range filter (from/to)
- Order status filter
- Click order → "View Report" modal showing formatted results
- "Print Report" button → opens print dialog
- "Download PDF" button → if PDF endpoint available
- Empty state: "No reports available"

**Complexity:** L

### 2.5 Result Flag Auto-Calculation — Backend

**What's needed:** In `PUT /lab/orders/:id/results`, auto-calculate `isAbnormal` and `flag` for each result:

```ts
function calculateFlag(value: number, test: DiagnosticTest): { flag: ResultFlag; isAbnormal: boolean } {
  if (test.highCritical && value > test.highCritical) return { flag: 'CRITICAL_HIGH', isAbnormal: true };
  if (test.lowCritical && value < test.lowCritical) return { flag: 'CRITICAL_LOW', isAbnormal: true };
  if (test.refRangeHigh && value > test.refRangeHigh) return { flag: 'HIGH', isAbnormal: true };
  if (test.refRangeLow && value < test.refRangeLow) return { flag: 'LOW', isAbnormal: true };
  return { flag: 'NORMAL', isAbnormal: false };
}
```

**Also:** Add frontend display of color-coded flags in the Queue tab's results section.

**Complexity:** M

### 2.6 Dashboard Component Decomposition — Frontend

**What's needed:** Split the 624-line `LabDashboard.jsx` into separate files:
- `frontend/src/features/lab/LabDashboardShell.jsx` — tab container, stats cards
- `frontend/src/features/lab/LabQueueTab.jsx` — order table with filters, claim/result actions
- `frontend/src/features/lab/LabCatalogTab.jsx` — test catalog CRUD (extract from existing CatalogManager)
- `frontend/src/features/lab/LabPanelsTab.jsx` — panel management (from task 2.3)
- `frontend/src/features/lab/LabReportsTab.jsx` — reports (from task 2.4)
- `frontend/src/features/lab/LabResultEntryModal.jsx` — result entry form (extract from OrderDetailModal)
- `frontend/src/features/lab/LabSampleTracker.jsx` — sample tracking overlay (from task 2.2 frontend)

**Note:** This is decomposition of existing code. Logic stays the same, just relocated.

**Complexity:** L

### 2.7 Lab Sample Tracker — Frontend

**What's needed:** Create `LabSampleTracker.jsx` component:
- List samples with status badges (COLLECTED → IN_PROGRESS → COMPLETED)
- "Collect Sample" button → creates sample, auto-generates label
- Status update dropdown
- Display barcode-style label prominently
- Integrated into the Queue tab as a column or action
- Empty state: "No samples for this order"

**Complexity:** M

### 2.8 Hospital Scoping Audit — Backend

**Critical fix:** Audit all lab endpoints for `hospitalId`:
- `lab.routes.ts`: Most endpoints use `req.user!.hospitalId!` but some may be missing:
  - `GET /lab/tests` — tests are shared reference data, no hospitalId needed
  - `GET /lab/orders` — **must** filter by hospitalId
  - `POST /lab/orders` — must create with hospitalId
  - `PUT /lab/orders/:id/results` — must verify order belongs to hospital
  - `GET /lab/results` — must filter by hospitalId
  - `GET /lab/stats` — must filter by hospitalId
- Check all DiagnosticOrder queries have `hospitalId: req.user!.hospitalId!`
- Check all DiagnosticOrder creates include `hospitalId`

**Complexity:** S

### 2.9 Backend Tests — lab.test.js

**What's needed:** Add real business logic tests to `backend/tests/lab.test.js`:
- Test order lifecycle with authenticated user: create → claim → enter results → complete
- Test checkout creates Transaction
- Test validation: missing patientId, missing tests/panel
- Test referral auto-creation
- Test auth rejection (keep existing tests)
- Test hospital scoping

**Complexity:** M

---

## 3. Acceptance Criteria

- [ ] Bug fixes applied: `useLabCheckout` import, `resultValue`→`value`, `refRange` display (task 2.1)
- [ ] LabSample model created with proper fields, enum, indexes
- [ ] Sample CRUD endpoints working: create, collect, status update, list
- [ ] Sample label auto-generated in format LAB-YYMMDD-NNNN
- [ ] Panels tab shows panel list with expandable test members and CRUD
- [ ] Reports tab shows filtered order list with formatted results and print/PDF download
- [ ] PDF/print report includes hospital header, patient info, results table with color-coded flags, reference ranges
- [ ] Result flag auto-calculated from value vs reference ranges on submission
- [ ] LabDashboard split into 7+ sub-components with no functionality loss
- [ ] Sample tracker shows samples per order with status badges and collection workflow
- [ ] All lab endpoints filter by `hospitalId` (cross-tenant isolation verified)
- [ ] Backend tests cover order lifecycle, checkout, validation, referral, auth
- [ ] All new endpoints include Zod validation, permission checks, error handling
- [ ] All new frontend components have loading, empty, error states
- [ ] No TypeScript errors introduced (tsc --noEmit = 0 errors on backend + frontend)
- [ ] Vite build passes clean

---

## 4. Work Split

### Sr Dev — Backend (estimated 3 days)

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.2 | Sample tracking model + endpoints | `schema.prisma` + `lab.routes.ts` + `lab.schema.ts` + migration | M | New Prisma model. 5 new endpoints. Auto-label generation. |
| 2.4 | PDF report generation (backend) | `lab.routes.ts` + new helper file | M | Generate print HTML or PDF. Include hospital header, results table. |
| 2.5 | Result flag auto-calculation | `lab.routes.ts` | M | Compute flag from value vs ref ranges. Update DiagnosticOrderTest. |
| 2.8 | Hospital scoping audit | `lab.routes.ts` | S | Add hospitalId to all queries/creates. |
| 2.9 | Backend tests | `tests/lab.test.js` | M | Real business logic tests. |

### Jr Dev — Frontend (estimated 3 days)

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.1 | Bug fixes | `LabDashboard.jsx` | S | 3 critical-runtime bugs. Fix first. |
| 2.3 | Panels tab | `LabPanelsTab.jsx` (NEW) | M | Panel list, expandable tests, create/delete. |
| 2.4 | Reports tab (frontend) | `LabReportsTab.jsx` (NEW) | M | Filters, result view modal, print button. |
| 2.6 | Dashboard decomposition | 7 files (NEW) + `LabDashboard.jsx` (MODIFY) | L | Split 624-line file. No new logic. |
| 2.7 | Sample tracker | `LabSampleTracker.jsx` (NEW) | M | Sample list, collect button, status updates. |

---

## 5. Files Likely Impacted

### New Files (8+)

| File | Task |
|------|------|
| `backend/prisma/migrations/...` | Migration for LabSample model |
| `frontend/src/features/lab/LabDashboardShell.jsx` | Tab container shell |
| `frontend/src/features/lab/LabQueueTab.jsx` | Queue/orders tab |
| `frontend/src/features/lab/LabCatalogTab.jsx` | Test catalog tab |
| `frontend/src/features/lab/LabPanelsTab.jsx` | Panels tab |
| `frontend/src/features/lab/LabReportsTab.jsx` | Reports tab |
| `frontend/src/features/lab/LabResultEntryModal.jsx` | Result entry modal |
| `frontend/src/features/lab/LabSampleTracker.jsx` | Sample tracking component |

### Modified Files (5)

| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Add LabSample model + LabSampleStatus enum |
| `backend/src/modules/lab/lab.routes.ts` | Add sample endpoints, flag auto-calculation, hospital scoping, PDF report |
| `backend/src/schemas/lab.schema.ts` | Add sample schemas, update result schema for auto-flag |
| `frontend/src/features/lab/LabDashboard.jsx` | Bug fixes + delegate to sub-components |
| `backend/tests/lab.test.js` | Add business logic tests |

---

## 6. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Decomposition breaks existing functionality | Medium | Keep original file until new components are verified. Use git to compare before/after. |
| PDF generation adds dependency | Low | Use simple HTML print template + `window.print()` — no PDF library needed initially |
| Sample auto-create on order status change | Low | Only fires on IN_PROGRESS transition. Idempotent check (sample exists?). |
| Hospital scoping on lab tests | None | Tests are shared reference data — no hospitalId needed |

---

*This brief is based on: `docs/06-implementation-plan.md` (Phase 6), `docs/01-prd.md`, `docs/02-trd.md`, `docs/03-backend-schema.md`, `docs/04-ui-ux.md`, `docs/05-app-flow.md`, and a comprehensive codebase audit of `backend/src/modules/lab/`, `frontend/src/features/lab/`, `frontend/src/hooks/queries/useLab.js`, and Prisma schema lab models.*
