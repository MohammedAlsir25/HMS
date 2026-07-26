# Phase 11 Tech Spec: Insurance & TPA

**Author:** Tech Lead
**Date:** 2026-07-17
**Status:** Draft
**Brief:** `docs/loops/phase-11-brief.md` (14 tasks, T1-T14)

---

## 1. Architecture Decisions

### 1.1 Module Structure — Follow `accounting/` Pattern

The `backend/src/modules/accounting/` module uses a barrel router that delegates to sub-route files in `routes/`. Insurance will follow the identical pattern:

```
backend/src/modules/insurance/
  index.ts                         ← barrel router (re-exports all sub-routers)
  routes/
    insuranceCompany.routes.ts     ← T1
    insurancePolicy.routes.ts      ← T2
    pricingRules.routes.ts         ← T3
    preAuthorization.routes.ts     ← T4
    insuranceClaim.routes.ts       ← T5 + T6 (dashboard)
    insuranceSettlement.routes.ts  ← T7
    reports.routes.ts              ← T9
  utils/
    pricingHelper.ts               ← T8 (insurance pricing at POS checkout)
    claimNumberGenerator.ts        ← auto-generate CLM-YYYY-NNNNN
    preAuthRefGenerator.ts         ← auto-generate reference numbers
```

Each route file will contain: `router.use(authenticate)`, Zod validation middleware, and `authorize('insurance:read')` / `authorize('insurance:write')` guards.

### 1.2 Prisma Model Design Approach

- All 6 new models added in a single migration to avoid schema drift
- Every model includes `hospitalId String?` for multi-tenancy (consistent with existing `Transaction`, `Invoice`, etc.)
- Timestamps use `created_at DateTime? @default(now()) @db.Timestamptz(6)` / `updated_at DateTime @updatedAt` (matching `Transaction` pattern)
- Soft deletes: `is_deleted Boolean? @default(false)` where appropriate
- Foreign key references use `@relation(fields: [...], references: [id])` with explicit field mappings
- Composite unique constraints scoped by `hospitalId` (e.g., `@@unique([hospitalId, name])`)

### 1.3 Insurance Pricing Integration into POS — Non-Breaking

**Strategy:** Extract pricing logic into `backend/src/modules/insurance/utils/pricingHelper.ts`. The POS routes (`pharmacy.routes.ts`, `optics.routes.ts`) will call this helper **only** when `paymentMethod === 'INSURANCE'`. All existing CASH/CARD/BANK_TRANSFER flows remain completely untouched.

```typescript
// pricingHelper.ts — the only new code path in POS
export async function applyInsurancePricing(hospitalId: string, patientId: string, cartItems: CartItem[]) {
  // 1. Look up patient's active primary policy
  // 2. For each cart item, look up InsurancePricingRule
  // 3. Return { items: pricedItems, totalStandard, totalInsurance, patientPays, insurancePays }
}

// pharmacy.routes.ts — modification is guarded:
if (paymentMethod === 'INSURANCE' && patientId) {
  const pricing = await applyInsurancePricing(hospitalId, patientId, cartItems);
  // Use pricing.patientPays as the transaction amount
  // Store insurancePolicyId in description field
} else {
  // EXISTING CODE PATH — UNTOUCHED
}
```

**Safety:** The `if` block wraps ONLY the insurance branch. The else-branch is the existing checkout logic, unchanged.

### 1.4 Claim Auto-Generation Strategy

When `POST /insurance/claims` is called with an `invoiceId`:

1. Fetch the Invoice with its InvoiceItems
2. Fetch the patient's recent clinical records (last 3 months, limit 10)
3. Fetch the patient's recent lab results (last 3 months)
4. Auto-populate: `claimAmount = invoice.total`, `clinicalRecords = [...]`, `labResults = [...]`
5. Auto-generate `claimNumber` via `CLM-YYYY-NNNNN` format (unique per hospital)
6. Default status: `DRAFT`

### 1.5 Settlement Auto-Update — Atomic Increment

When recording a settlement, update the claim's `paidAmount` using Prisma's atomic `increment` to prevent race conditions:

```typescript
await prisma.insuranceClaim.update({
  where: { id: claimId },
  data: {
    paidAmount: { increment: settlementAmount },
    status: updatedPaidAmount >= claim.approvedAmount ? 'SETTLED' : 'PARTIALLY_APPROVED',
  },
});
```

The status check happens inside a `prisma.$transaction` block so the read-and-update is atomic.

### 1.6 Status State Machine Validation

Status transitions are validated server-side. Invalid transitions return `400 VALIDATION_ERROR`:

| Model | Valid Transitions |
|---|---|
| PreAuthorizationStatus | SUBMITTED→UNDER_REVIEW, UNDER_REVIEW→APPROVED/PARTIALLY_APPROVED/REJECTED, *→CANCELLED |
| ClaimStatus | DRAFT→SUBMITTED, SUBMITTED→UNDER_REVIEW, UNDER_REVIEW→APPROVED/PARTIALLY_APPROVED/REJECTED, APPROVED/PARTIALLY_APPROVED→SETTLED, any→CLOSED |
| SettlementStatus | PENDING→COMPLETED/PARTIAL/DISPUTED |

Validation runs as a helper function in the route handler before the database update.

### 1.7 Hospital Scoping

All queries include `hospitalId` filter. All writes include `hospitalId` from JWT (`req.user.hospitalId`). This is enforced at the route-handler level (not middleware) to match the existing accounting pattern.

---

## 2. Work Split

### Sr Dev — Backend (Tasks A–E)

#### Task A: T1–T3 — Infrastructure Models (Estimated: 4–5h)

**Goal:** Prisma schema changes + 3 route files + barrel router + app.ts registration.

**T1: InsuranceCompany model + CRUD**
- `backend/prisma/schema.prisma` — Add `InsuranceCompany` model (see brief T1 for full schema)
- `backend/src/modules/insurance/routes/insuranceCompany.routes.ts` — Full CRUD
- Approach: Follow `backend/src/modules/accounting/routes/expenses.routes.ts` for router structure (authenticate, paginate, search, soft-delete)
- GET list: pagination + `search` (name ILIKE) + `isTpa` filter + `isActive` filter
- POST create: Zod validation for `name` (required), optional fields
- PATCH update: partial update
- DELETE: soft-delete (`is_deleted = true`)
- All endpoints protected with `authorize('insurance:read')` / `authorize('insurance:write')`

**T2: InsurancePolicy model + patient policy endpoints**
- `backend/prisma/schema.prisma` — Add `InsurancePolicy` model (see brief T2)
- Add `insurancePolicies InsurancePolicy[]` relation to `Patient` model
- `backend/src/modules/insurance/routes/insurancePolicy.routes.ts`
- Standard CRUD + `GET /insurance/patients/:patientId/policies` (returns active policies for checkout use)
- Validate that `insuranceCompanyId` and `patientId` reference existing records on create

**T3: InsurancePricingRule model + pricing endpoints**
- `backend/prisma/schema.prisma` — Add `InsurancePricingRule` model (see brief T3)
- `backend/src/modules/insurance/routes/pricingRules.routes.ts`
- Standard CRUD + bulk create endpoint (`POST /insurance/pricing-rules/bulk`) + `GET /insurance/pricing-rules/lookup` (the checkout-time lookup endpoint)

**T1→T2/T3 dependency:** T2 and T3 can start in parallel once T1's model is in schema.

#### Task B: T4 — PreAuthorization Workflow (Estimated: 2–3h)

- `backend/prisma/schema.prisma` — Add `PreAuthorizationStatus` enum + `PreAuthorization` model
- `backend/src/modules/insurance/routes/preAuthorization.routes.ts`
- `backend/src/modules/insurance/utils/preAuthRefGenerator.ts` — auto-generate reference numbers
- Follow `backend/src/modules/preoperative/preoperative.routes.ts` for status-workflow pattern (status transitions with action endpoints)
- Key endpoints: `POST /` (create), `PATCH /:id/approve`, `PATCH /:id/partial-approve`, `PATCH /:id/reject`, `PATCH /:id/cancel`
- Validate status transitions before DB update

#### Task C: T5–T7 — Claims + Settlements + Dashboard (Estimated: 5–6h)

**T5: InsuranceClaim model + claim generation**
- `backend/prisma/schema.prisma` — Add `ClaimStatus` enum + `InsuranceClaim` model
- Add `claims InsuranceClaim[]` relation to `Invoice` model
- `backend/src/modules/insurance/routes/insuranceClaim.routes.ts`
- `backend/src/modules/insurance/utils/claimNumberGenerator.ts` — `CLM-YYYY-NNNNN`
- `POST /insurance/claims` — create from invoice with auto-population (clinical records, lab results)
- Status action endpoints: `submit`, `approve`, `partial-approve`, `reject`, `settle`

**T6: Claim dashboard endpoint**
- Extend `insuranceClaim.routes.ts` with:
  - `GET /insurance/claims/dashboard` — aggregate by status, amounts, aging buckets, rejection rate
  - `GET /insurance/claims/pending-reviews` — quick access to claims awaiting review
- Use Prisma `groupBy` and `aggregate` for stats

**T7: InsuranceSettlement model + settlement endpoints**
- `backend/prisma/schema.prisma` — Add `SettlementStatus` enum + `InsuranceSettlement` model
- Add `settlements InsuranceSettlement[]` relation to `InsuranceClaim` model
- `backend/src/modules/insurance/routes/insuranceSettlement.routes.ts`
- `POST /insurance/settlements` — record settlement, atomic increment `claim.paidAmount`, auto-update claim status
- Use `prisma.$transaction` for atomicity
- `GET /insurance/settlements/aging` — unsettled claims grouped by age

**Dependency chain:** T5 depends on T1+T2+T4. T6 depends on T5. T7 depends on T5.

#### Task D: T8 — POS Insurance Pricing Integration (Estimated: 2–3h)

- `backend/src/modules/insurance/utils/pricingHelper.ts` — new file with `applyInsurancePricing()` function
- `backend/src/modules/pos/routes/pharmacy.routes.ts` — modify: add `if (paymentMethod === 'INSURANCE')` block before transaction creation
- `backend/src/modules/pos/routes/optics.routes.ts` — same modification
- Add `GET /insurance/checkout-preview` endpoint in pricingRules routes (for frontend preview before checkout)
- **Critical:** Only the `INSURANCE` branch is new code; all existing payment method paths remain identical

#### Task E: T9 — Insurance Reports Endpoints (Estimated: 1–2h)

- `backend/src/modules/insurance/routes/reports.routes.ts`
- 4 report endpoints:
  - `GET /insurance/reports/claims-by-company` — group by company, counts, amounts, date range
  - `GET /insurance/reports/settlement-rate` — settled/total %, avg processing time
  - `GET /insurance/reports/revenue-by-insurance` — INSURANCE transactions vs other methods
  - `GET /insurance/reports/denial-analysis` — rejection reasons breakdown, denial rate by company
- Use Prisma `groupBy` + `aggregate` with date range filters

**Dependency:** T5+T7 must be done first.

---

### Jr Dev — Frontend (Tasks F–J)

#### Task F: T14 — useInsurance.js + Navigation + Routes (Estimated: 2–3h, START IMMEDIATELY)

- `frontend/src/hooks/queries/useInsurance.js` — React Query hooks (follow `useAccounting.js` pattern exactly)
- `frontend/src/config/navigation.tsx` — add Insurance nav group between Finance and Administration
- `frontend/src/app/App.jsx` — add lazy imports + routes for all 4 insurance pages

**useInsurance.js hook structure** (follow `useAccounting.js` exactly):
```javascript
export const insuranceKeys = {
  companies: (params) => ['insurance', 'companies', params],
  company: (id) => ['insurance', 'company', id],
  policies: (params) => ['insurance', 'policies', params],
  patientPolicies: (patientId) => ['insurance', 'patient-policies', patientId],
  pricingRules: (params) => ['insurance', 'pricing-rules', params],
  preAuthorizations: (params) => ['insurance', 'pre-authorizations', params],
  preAuthorization: (id) => ['insurance', 'pre-authorization', id],
  claims: (params) => ['insurance', 'claims', params],
  claim: (id) => ['insurance', 'claim', id],
  claimDashboard: ['insurance', 'claims', 'dashboard'],
  settlements: (params) => ['insurance', 'settlements', params],
  reports: (type, params) => ['insurance', 'reports', type, params],
};
```

Each query hook uses `api.get(...)`, each mutation hook uses `api.post/patch/put(...)` with `queryClient.invalidateQueries` on success.

**Navigation** — add to `NAV_GROUPS` array:
```typescript
{
  key: 'insurance',
  label: 'Insurance',
  requiredPermissions: ['insurance:read'],
  items: [
    { label: 'Companies', icon: Shield, path: '/insurance/companies', requiredPermissions: [] },
    { label: 'Policies', icon: FileCheck, path: '/insurance/policies', requiredPermissions: [] },
    { label: 'Pre-Authorizations', icon: ClipboardCheck, path: '/insurance/pre-authorizations', requiredPermissions: [] },
    { label: 'Claims', icon: ReceiptText, path: '/insurance/claims', requiredPermissions: [] },
    { label: 'Settlements', icon: Banknote, path: '/insurance/settlements', requiredPermissions: [] },
    { label: 'Reports', icon: BarChart3, path: '/insurance/reports', requiredPermissions: [] },
  ],
},
```

Import `Shield`, `FileCheck`, `ReceiptText`, `Banknote` from `lucide-react`.

**Routes** — add to `App.jsx`:
```jsx
const InsurancePage = lazy(() => import('../features/insurance/InsurancePage'));
const PreAuthorizationPage = lazy(() => import('../features/insurance/PreAuthorizationPage'));
const ClaimTrackingPage = lazy(() => import('../features/insurance/ClaimTrackingPage'));
const InsuranceReportsPage = lazy(() => import('../features/insurance/InsuranceReportsPage'));

// Then in <Routes>:
<Route path="/insurance/companies" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><InsurancePage /></RoleGuard></ProtectedRoute>} />
<Route path="/insurance/policies" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><InsurancePage /></RoleGuard></ProtectedRoute>} />
<Route path="/insurance/pre-authorizations" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><PreAuthorizationPage /></RoleGuard></ProtectedRoute>} />
<Route path="/insurance/claims" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><ClaimTrackingPage /></RoleGuard></ProtectedRoute>} />
<Route path="/insurance/settlements" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><ClaimTrackingPage /></RoleGuard></ProtectedRoute>} />
<Route path="/insurance/reports" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><InsuranceReportsPage /></RoleGuard></ProtectedRoute>} />
```

#### Task G: T10 — InsurancePage + CompanyForm + PolicyAssignmentForm (Estimated: 3–4h)

- `frontend/src/features/insurance/InsurancePage.jsx` — tabbed layout (Companies tab + Policies tab)
- `frontend/src/features/insurance/CompanyForm.jsx` — modal form for create/edit company
- `frontend/src/features/insurance/PolicyAssignmentForm.jsx` — modal form for assigning policy to patient

**InsurancePage structure** (follow `AccountingPage.jsx`):
- `useState` for active tab, modals, form state
- `useQuery` hooks for data fetching
- Loading state: skeleton/spinner
- Empty state: "No companies found" / "No policies found"
- Error state: error banner
- Companies tab: `Table` component with columns (name, contact, TPA badge, active status, actions)
- Policies tab: `Table` with columns (patient name/MRN, company, policy number, coverage %, expiry, active status, actions)
- "Add Company" / "Assign Policy" buttons → modal with form

**Import rules:**
- All UI imports from `../../components/ui/` (NOT `../ui/`)
- Use `safeStringify` from `@voltagent/internal`, NEVER `JSON.stringify`
- JSX: wrap multi-element ternary branches in fragments

#### Task H: T11 — PreAuthorizationPage + PreAuthForm + PreAuthDetail (Estimated: 3–4h)

- `frontend/src/features/insurance/PreAuthorizationPage.jsx`
- `frontend/src/features/insurance/PreAuthForm.jsx`
- `frontend/src/features/insurance/PreAuthDetail.jsx`

**PreAuthorizationPage:**
- Status filter tabs (All, Submitted, Under Review, Approved, Rejected)
- Patient search input
- Company filter dropdown
- Table with: reference number, patient name, company name, estimated cost, status badge, submitted date
- "New Pre-Auth" button → PreAuthForm modal

**PreAuthForm:**
- Patient search (autocomplete using `GET /patients/search`)
- Insurance policy dropdown (filtered by selected patient via `GET /insurance/patients/:patientId/policies`)
- Dynamic procedure list (add/remove rows with name + estimated cost)
- Diagnosis text input + ICD-10 code input
- Clinical notes textarea

**PreAuthDetail:**
- Slide-in panel or modal with full pre-auth info
- Status timeline showing all transitions
- Approve/Reject buttons (with approved amount input for approval)
- Only visible to users with `insurance:write` permission

#### Task I: T12 — ClaimTrackingPage + ClaimDetail + ClaimForm (Estimated: 4–5h)

- `frontend/src/features/insurance/ClaimTrackingPage.jsx`
- `frontend/src/features/insurance/ClaimDetail.jsx`
- `frontend/src/features/insurance/ClaimForm.jsx`

**ClaimTrackingPage:**
- Dashboard stat cards (total claims, pending, approved, rejected, settled counts + total amounts)
- Status filter tabs
- Claims table: claim number, patient, company, claim amount, approved amount, paid amount, status badge, submission date, aging color coding (green <30d, amber 30-60d, red >60d)
- "Create Claim" button → ClaimForm

**ClaimForm:**
- Invoice search (autocomplete)
- Patient auto-fill from invoice
- Policy selection dropdown
- Clinical records auto-attachment (fetched from patient's recent records)

**ClaimDetail:**
- Full claim info with linked invoice, linked pre-auth
- Clinical attachments (records, lab results)
- Status timeline
- Approve/Reject/Settle actions
- "Record Settlement" button → settlement form inline or modal

#### Task J: T13 — InsuranceReportsPage (Estimated: 2–3h)

- `frontend/src/features/insurance/InsuranceReportsPage.jsx`

**Tabbed reports page:**
- "Claims by Company" tab: table + bar chart (claims count and amounts per company)
- "Settlement Rate" tab: KPI cards (settlement rate %, avg processing days, total settled amount)
- "Revenue by Insurance" tab: breakdown of revenue by payment method with insurance highlighted
- "Denial Analysis" tab: top rejection reasons, denial rate by company
- Date range picker at top
- Print/export button
- Follow `ReportsPage.jsx` pattern

---

## 3. Data Flow Diagrams (ASCII)

### 3.1 Insurance Pricing at POS Checkout

```
┌──────────┐    ┌──────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Patient   │    │ Cashier  │    │ Pharmacy POS     │    │ Insurance        │
│ presents  │───>│ selects  │───>│ detects          │───>│ pricingHelper.ts │
│ insurance │    │ INSURANCE│    │ paymentMethod    │    │                  │
│ card      │    │ method   │    │ === 'INSURANCE'  │    │ 1. Lookup active │
└──────────┘    └──────────┘    └─────────────────┘    │    primary policy │
                                                        │ 2. For each cart │
                                                        │    item, lookup  │
                                                        │    PricingRule   │
                                                        │ 3. Calc:         │
                                                        │    patientPays   │
                                                        │    insurancePays │
                                                        └────────┬─────────┘
                                                                 │
                                                                 v
                                                        ┌─────────────────┐
                                                        │ Checkout Preview │
                                                        │ - Standard total │
                                                        │ - Insurance total│
                                                        │ - Patient pays   │
                                                        │ - Insurer pays   │
                                                        └────────┬─────────┘
                                                                 │
                                                                 v
                                                        ┌─────────────────┐
                                                        │ Create           │
                                                        │ Transaction      │
                                                        │ amount=patientPays│
                                                        │ method=INSURANCE  │
                                                        │ description=      │
                                                        │  policyId + info  │
                                                        └─────────────────┘
```

### 3.2 Pre-Authorization Workflow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Doctor/   │    │ Insurance    │    │ PreAuth      │    │ Database     │
│ Billing   │───>│ module       │───>│ Status       │───>│              │
│ submits   │    │ validates    │    │ Machine      │    │ Write record │
│ pre-auth  │    │ policy exists│    │              │    │              │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                      │
                    ┌─────────────────────────────────┘
                    v
              SUBMITTED ──> UNDER_REVIEW ──> APPROVED
                                    │         (approvedAmount set)
                                    │
                                    ├──> PARTIALLY_APPROVED
                                    │    (approvedAmount set, lower)
                                    │
                                    └──> REJECTED
                                         (rejectionReason set)

              Any status ──> CANCELLED (by submitter)
```

### 3.3 Claim Generation from Invoice

```
┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────┐
│ Billing   │    │ POST         │    │ Claim          │    │ Invoice  │
│ officer   │───>│ /insurance/  │───>│ auto-gen       │<───│ (source  │
│ clicks    │    │ claims       │    │                │    │  data)   │
│ "Create   │    │ {invoiceId,  │    │ - claimNumber  │    └──────────┘
│  Claim"   │    │  patientId,  │    │   CLM-YYYY-NNN │
└──────────┘    │  policyId,   │    │ - claimAmount  │
                │  companyId}  │    │   = invoice.   │
                └──────────────┘    │     total       │
                                    │ - clinicalRecs  │
                                    │   (last 3 mo)   │
                                    │ - labResults    │
                                    │   (last 3 mo)   │
                                    │ - status: DRAFT │
                                    └────────┬────────┘
                                             │
                                             v
                                    ┌────────────────┐
                                    │ Status Flow     │
                                    │ DRAFT ──>       │
                                    │ SUBMITTED ──>   │
                                    │ UNDER_REVIEW ──>│
                                    │ APPROVED ──>    │
                                    │ SETTLED         │
                                    └────────────────┘
```

### 3.4 Settlement Recording

```
┌──────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────┐
│ Billing   │    │ POST         │    │ prisma.$         │    │ Insurance│
│ officer   │───>│ /insurance/  │───>│ transaction      │───>│ Claim    │
│ records   │    │ settlements  │    │                  │    │ model    │
│ payment   │    │ {claimId,    │    │ 1. Create         │    │          │
│ from TPA  │    │  amount,     │    │    Settlement     │    │ Update:  │
│           │    │  date,       │    │ 2. Update Claim:  │    │ paidAmt  │
└──────────┘    │  refNumber}  │    │    paidAmount +=  │    │ += amount│
                └──────────────┘    │    amount (atomic) │    │          │
                                    │ 3. If paidAmount   │    │ status   │
                                    │    >= approvedAmt  │    │ auto-set │
                                    │    → status=SETTLED│    │          │
                                    │    Else → PARTIAL  │    └──────────┘
                                    └─────────────────┘
```

---

## 4. Exact File List

### New Files to Create

| # | File Path | Description |
|---|-----------|-------------|
| 1 | `backend/src/modules/insurance/index.ts` | Barrel router — registers all sub-routers under `/api/insurance` |
| 2 | `backend/src/modules/insurance/routes/insuranceCompany.routes.ts` | Company CRUD (T1) |
| 3 | `backend/src/modules/insurance/routes/insurancePolicy.routes.ts` | Policy CRUD + patient lookup (T2) |
| 4 | `backend/src/modules/insurance/routes/pricingRules.routes.ts` | Pricing rules CRUD + bulk + lookup (T3) |
| 5 | `backend/src/modules/insurance/routes/preAuthorization.routes.ts` | Pre-auth workflow (T4) |
| 6 | `backend/src/modules/insurance/routes/insuranceClaim.routes.ts` | Claim lifecycle + dashboard (T5+T6) |
| 7 | `backend/src/modules/insurance/routes/insuranceSettlement.routes.ts` | Settlement recording (T7) |
| 8 | `backend/src/modules/insurance/routes/reports.routes.ts` | Insurance reports (T9) |
| 9 | `backend/src/modules/insurance/utils/pricingHelper.ts` | Insurance pricing at POS checkout (T8) |
| 10 | `backend/src/modules/insurance/utils/claimNumberGenerator.ts` | Auto-generate CLM-YYYY-NNNNN |
| 11 | `backend/src/modules/insurance/utils/preAuthRefGenerator.ts` | Auto-generate pre-auth reference numbers |
| 12 | `frontend/src/features/insurance/InsurancePage.jsx` | Company list + policy list (T10) |
| 13 | `frontend/src/features/insurance/CompanyForm.jsx` | Company create/edit modal (T10) |
| 14 | `frontend/src/features/insurance/PolicyAssignmentForm.jsx` | Policy assignment modal (T10) |
| 15 | `frontend/src/features/insurance/PreAuthorizationPage.jsx` | Pre-auth list + actions (T11) |
| 16 | `frontend/src/features/insurance/PreAuthForm.jsx` | Pre-auth create form (T11) |
| 17 | `frontend/src/features/insurance/PreAuthDetail.jsx` | Pre-auth detail panel (T11) |
| 18 | `frontend/src/features/insurance/ClaimTrackingPage.jsx` | Claim dashboard + table (T12) |
| 19 | `frontend/src/features/insurance/ClaimDetail.jsx` | Claim detail panel (T12) |
| 20 | `frontend/src/features/insurance/ClaimForm.jsx` | Claim create form (T12) |
| 21 | `frontend/src/features/insurance/InsuranceReportsPage.jsx` | Insurance reports (T13) |
| 22 | `frontend/src/hooks/queries/useInsurance.js` | React Query hooks (T14) |

### Files to Modify

| # | File Path | Change |
|---|-----------|--------|
| 1 | `backend/prisma/schema.prisma` | Add 6 models + 3 enums + relations to Patient, Invoice, User, Hospital |
| 2 | `backend/src/app.ts` | Register insurance router: `app.use('/api/insurance', insuranceRoutes)` |
| 3 | `backend/src/modules/pos/routes/pharmacy.routes.ts` | Add `if (paymentMethod === 'INSURANCE')` pricing block |
| 4 | `backend/src/modules/pos/routes/optics.routes.ts` | Add `if (paymentMethod === 'INSURANCE')` pricing block |
| 5 | `frontend/src/config/navigation.tsx` | Add Insurance nav group with 6 items, import Shield/FileCheck/ReceiptText/Banknote icons |
| 6 | `frontend/src/app/App.jsx` | Add lazy imports + 6 route entries for insurance pages |

---

## 5. Pattern References

| What to Build | Follow This Existing File | Key Patterns |
|---|---|---|
| Backend route structure | `backend/src/modules/accounting/accounting.routes.ts` | Barrel router with `router.use('/', subRoutes)` |
| Sub-route file | `backend/src/modules/accounting/routes/expenses.routes.ts` | `router.use(authenticate)`, pagination, `authorize()`, Zod validation |
| Prisma model patterns | `backend/prisma/schema.prisma:980-1024` (Transaction model) | `hospitalId String?`, `created_at`, `updated_at`, `is_deleted`, `@@index` |
| Invoice model relations | `backend/prisma/schema.prisma:2042-2069` (Invoice) | FK patterns, `@@unique([hospitalId, ...])` |
| App.ts router registration | `backend/src/app.ts:90-114` | `import ... from './modules/...'; app.use('/api/...', routes)` |
| Frontend page structure | `frontend/src/features/accounting/AccountingPage.jsx` | Tabbed layout, `useQuery`/`useMutation`, Table component, modals, loading/empty/error states |
| React Query hooks | `frontend/src/hooks/queries/useAccounting.js` | `apiKeys` factory, `useQuery` for reads, `useMutation` with `invalidateQueries` |
| Navigation config | `frontend/src/config/navigation.tsx:25-147` | `NAV_GROUPS` array, `NavItem` with `icon`, `path`, `requiredPermissions` |
| Route registration | `frontend/src/app/App.jsx:106-156` | `lazy(() => import(...))`, `<ProtectedRoute><RoleGuard>...</RoleGuard></ProtectedRoute>` |
| Component imports | `frontend/src/features/accounting/AccountingPage.jsx:7-13` | `import { Button } from '../../components/ui/Button'` (2 levels up) |
| Status workflow | `backend/src/modules/preoperative/preoperative.routes.ts` | PATCH endpoints for status transitions, validation before DB write |
| POS checkout | `backend/src/modules/pos/routes/pharmacy.routes.ts` | Transaction creation flow, `paymentMethod` branching |

---

## 6. Key Gotchas

### 6.1 Transaction Model — Backward Compatibility

The `Transaction` model already has `paymentMethod PaymentMethod` with `INSURANCE` as an enum value. We are NOT changing the Transaction model. Instead, insurance pricing is handled by:
- Setting the `amount` to `patientPays` (not total)
- Storing `insurancePolicyId` in the `description` field (or a new optional JSON `metadata` field if schema allows)
- The `paymentMethod` stays as `INSURANCE`

**Risk:** If someone adds a `metadata` JSON field to Transaction, it must be optional and default null to avoid breaking existing records.

### 6.2 POS Checkout — Must Not Break Existing Flows

The insurance pricing logic is strictly guarded behind `if (paymentMethod === 'INSURANCE')`. The existing CASH/CARD/BANK_TRANSFER code paths must remain byte-for-byte identical. Test by running through each payment method after the change.

### 6.3 Multi-Tenancy on All Queries

Every `findMany`, `findFirst`, `count`, `groupBy`, `aggregate` must include `hospitalId` in the `where` clause. This applies to:
- Dashboard aggregation queries (T6)
- Report queries (T9)
- Settlement aging queries (T7)
- Pricing rule lookups (T3)

### 6.4 Status Transition Validation

Never allow invalid transitions. Examples of invalid transitions that must be rejected:
- REJECTED → APPROVED (must go through a new pre-auth or resubmit)
- SETTLED → DRAFT (settlement is terminal for that claim)
- CANCELLED → any active status

### 6.5 Concurrent Settlement Recording — Atomic Increment

Multiple settlements could be recorded simultaneously. Use `prisma.insuranceClaim.update({ data: { paidAmount: { increment: amount } } })` instead of reading the current value and then updating. The status check (SETTLED vs PARTIAL) must happen inside the same transaction.

### 6.6 Import Path Rules

Frontend files in `frontend/src/features/insurance/` must import from `../../components/ui/` (NOT `../ui/`). The `../ui/` path resolves to `features/ui/` which does not exist.

### 6.7 JSON.stringify Prohibition

NEVER use `JSON.stringify` anywhere. Import `safeStringify` from `@voltagent/internal` for any serialization needs.

### 6.8 JSX Structural Rules

- Every ternary must have matching branches; wrap multi-element branches in `<>...</>`
- Every `<>` must have a matching `</>`
- Count fragment pairs before committing

### 6.9 `tsc --noEmit` After Completion

Both Sr Dev and Jr Dev MUST run `tsc --noEmit` on their target directory and fix ALL errors before reporting done:
- Backend: `cd backend && npx tsc --noEmit`
- Frontend: `cd frontend && npx tsc --noEmit`

### 6.10 Hospital Scoping on All Insurance Models

All 6 new models have `hospitalId String?`. The `createTenantPrisma` extension auto-injects it at runtime, but the explicit `hospitalId` filter must still be present in all queries for correctness.

---

## Coordination Timeline

```
Day 1:  Sr Dev: T1 (schema + InsuranceCompany CRUD)
        Jr Dev: T14 (useInsurance.js hooks scaffolding + navigation + routes)

Day 2:  Sr Dev: T2 + T3 (Policy + PricingRule models + routes, parallel)
        Jr Dev: T14 (finalize hooks), T10 (InsurancePage with mock data)

Day 3:  Sr Dev: T4 (PreAuthorization workflow)
        Jr Dev: T10 (wire InsurancePage to real API)

Day 4:  Sr Dev: T5 + T6 (Claims + dashboard)
        Jr Dev: T11 (PreAuthorizationPage, waits for T4)

Day 5:  Sr Dev: T7 (Settlements) + T8 (POS integration)
        Jr Dev: T12 (ClaimTrackingPage, waits for T5+T6)

Day 6:  Sr Dev: T9 (Reports)
        Jr Dev: T13 (InsuranceReportsPage, waits for T9)

Day 7:  Both: Integration testing, `tsc --noEmit`, lint, fix issues
```

---

## Acceptance Criteria Checklist (from Brief)

- [ ] `InsuranceCompany` model exists with hospital-scoped CRUD + search + TPA filter
- [ ] `InsurancePolicy` model exists; patient can have multiple active policies
- [ ] GET `/insurance/patients/:patientId/policies` returns active policies for checkout
- [ ] `InsurancePricingRule` model exists; lookup endpoint returns insurance-agreed price
- [ ] `PreAuthorization` model with status workflow (SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED)
- [ ] Pre-auth approval records approved amount, reviewer, timestamp
- [ ] `InsuranceClaim` model; POST creates claim from invoice with auto-populated clinical records
- [ ] Claim status lifecycle works end-to-end
- [ ] Dashboard endpoint returns counts, amounts, aging, rejection rate
- [ ] `InsuranceSettlement` model; recording updates claim paidAmount and status
- [ ] `paidAmount >= approvedAmount` → status auto-updates to SETTLED
- [ ] Insurance pricing overrides integrate into pharmacy POS when paymentMethod is INSURANCE
- [ ] Patient responsibility calculated correctly based on coverage percentage
- [ ] Insurance reports return claims by company, settlement rate, revenue, denial analysis
- [ ] InsurancePage with company list, policy list, create/edit modals, loading/empty/error
- [ ] PreAuthorizationPage with status tabs, dynamic procedure list, approval/rejection
- [ ] ClaimTrackingPage with stat cards, aging color coding, create from invoice, settlement
- [ ] InsuranceReportsPage with four report tabs, date range, print
- [ ] All insurance pages have routes with `PermissionGuard` requiring `insurance:read`
- [ ] All pages in navigation under "Insurance" group
- [ ] `useInsurance.js` follows existing hook pattern
- [ ] All new backend endpoints hospital-scoped
- [ ] All endpoints use `insurance:read` / `insurance:write` permissions
- [ ] `tsc --noEmit` passes with zero errors (backend + frontend)
