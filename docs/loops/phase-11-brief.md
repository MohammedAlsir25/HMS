# Phase 11 Brief: Insurance & TPA

## 1. Phase Goal

Build insurance company management with patient policy assignment, pre-authorization workflows, claim lifecycle tracking, TPA settlement recording, and insurance-specific pricing overrides — extending a foundation that currently only has an `INSURANCE` payment method enum value with zero insurance domain logic.

---

## 2. Executive Summary — What Already Exists

| Functionality | Status | Location |
|---|---|---|
| `PaymentMethod.INSURANCE` enum value in Prisma schema | ✅ Built | `backend/prisma/schema.prisma:1883` |
| `PaymentMethod.INSURANCE` accepted in POS pharmacy payment | ✅ Built | `frontend/src/features/pos/PharmacyPOS.jsx:18` |
| `PaymentMethod.INSURANCE` accepted in POS optics payment | ✅ Built | `frontend/src/features/pos/OpticsPOS.jsx:21` |
| `PaymentMethod.INSURANCE` accepted in reception check-in | ✅ Built | `frontend/src/features/reception/ReceptionPage.jsx:317` |
| `PaymentMethod.INSURANCE` accepted in accounting manual transaction | ✅ Built | `frontend/src/features/accounting/AccountingPage.jsx:749,893` |
| `PaymentMethod.INSURANCE` accepted in lab checkout | ✅ Built | `backend/src/modules/lab/lab.routes.ts:460` |
| `PaymentMethod.INSURANCE` accepted in ward discharge billing | ✅ Built | `backend/src/modules/preoperative/wards.routes.ts:253` |
| `PaymentMethod.INSURANCE` accepted in reception lab payments | ✅ Built | `backend/src/modules/reception/routes/labPayments.routes.ts:15` |
| INSURANCE payment option in reception/POS Zod schemas | ✅ Built | `backend/src/schemas/pos.schema.ts:3`, `reception.schema.ts:21` |
| Billing & Accounting system (ServiceItem, Invoice, InvoiceItem, Transaction, Account, JournalEntry models) | ✅ Built | `schema.prisma:2021-2137` |
| AccountsPayable model for tracking debts | ✅ Built | `schema.prisma:1393-1412` |
| Patient model with full demographics | ✅ Built | `schema.prisma:255-294` |
| Invoice model (can be linked to insurance claims) | ✅ Built | `schema.prisma:2042-2069` |
| Insurance claim flow documented in app-flow.md | ✅ Documented | `docs/05-app-flow.md:556-585` |
| PRD Section 5.16 — Insurance & TPA Claims feature spec | ✅ Documented | `docs/01-prd.md:460-476` |
| User stories US-A08, US-AC03, US-P06, US-PT06 | ✅ Documented | `docs/01-prd.md` |
| BILLING_OFFICER role already has `insurance:read`, `insurance:write` permissions defined in TRD | ✅ Documented | `docs/02-trd.md:1453-1456` |

| Gap | Status | Impact |
|---|---|---|
| InsuranceCompany model (company name, contact, TPA flag, network status, pricing rules) | ❌ Missing | High — plan task #1 |
| InsurancePolicy model (policy number, patient link, coverage %, expiry, network status) | ❌ Missing | High — plan task #2 |
| PreAuthorization model (request with diagnosis, procedures, estimated cost → approve/reject) | ❌ Missing | High — plan task #4 |
| InsuranceClaim model (linked to invoice, status lifecycle, amounts, clinical records) | ❌ Missing | High — plan task #5 |
| InsuranceSettlement model (settlement records, partial payments, rejection reasons) | ❌ Missing | High — plan task #7 |
| InsurancePricingRule model (per-company per-service price overrides) | ❌ Missing | Medium — plan task #3 |
| Insurance company CRUD backend endpoints | ❌ Missing | High — plan task #1 |
| Patient policy assignment backend (link policy to patient) | ❌ Missing | High — plan task #2 |
| Pre-authorization workflow endpoints (submit → review → approve/reject) | ❌ Missing | High — plan task #4 |
| Claim generation from invoice + clinical records | ❌ Missing | High — plan task #5 |
| Claim tracking dashboard endpoint (by status, aging) | ❌ Missing | High — plan task #6 |
| TPA settlement recording endpoints (record payment, partial, rejection) | ❌ Missing | High — plan task #7 |
| Insurance pricing override logic (apply company-agreed price at checkout) | ❌ Missing | Medium — plan task #8 |
| Insurance reports endpoint (claims by company, settlement rate, avg processing time) | ❌ Missing | Medium — plan task #9 |
| InsurancePage.jsx (company management, policy assignment) | ❌ Missing | High — plan task #10 |
| PreAuthorizationPage.jsx (submit and track pre-auth requests) | ❌ Missing | High — plan task #11 |
| ClaimTrackingPage.jsx (claim dashboard by status, aging) | ❌ Missing | High — plan task #12 |
| InsuranceReportsPage.jsx (insurance-specific financial reports) | ❌ Missing | Medium — plan task #13 |
| useInsurance.js React Query hooks | ❌ Missing | High — plan task #14 |
| Navigation items for insurance section | ❌ Missing | Medium — plan task #14 |
| Insurance nav group + route registration in App.jsx | ❌ Missing | Medium — plan task #14 |
| `insurance:read` / `insurance:write` permission enforcement on new endpoints | ❌ Missing | Medium — plan task #1 |

---

## 3. Tasks

### Backend Tasks

#### T1: Add InsuranceCompany model + CRUD endpoints
- **File:** `backend/prisma/schema.prisma` (add model), `backend/src/modules/insurance/insuranceCompany.routes.ts` (new), `backend/src/modules/insurance/index.ts` (new router barrel)
- **Change:** Add `InsuranceCompany` model: `id` (UUID PK), `name` (String), `nameAr` (String?), `contactPerson` (String?), `phone` (String?), `email` (String?), `address` (String?), `isTpa` (Boolean, default false — marks if this company acts as a TPA), `isActive` (Boolean, default true), `notes` (String?), `hospitalId` (String?), `created_at`, `updated_at`. Add unique constraint `@@unique([hospitalId, name])`. Add index on `hospitalId`, `isActive`. Create full CRUD endpoints: GET /insurance/companies (list with pagination, search by name, filter by isTpa/isActive), POST /insurance/companies (create), GET /insurance/companies/:id (get single), PATCH /insurance/companies/:id (update), DELETE /insurance/companies/:id (soft-delete). All endpoints hospital-scoped, protected with `insurance:write` for mutations and `insurance:read` for reads. Register router in `backend/src/app.ts` under `/api/insurance`. Follow existing module pattern from `backend/src/modules/accounting/`.
- **Complexity:** M
- **Dependencies:** None

#### T2: Add InsurancePolicy model + patient policy assignment endpoints
- **File:** `backend/prisma/schema.prisma` (add model), `backend/src/modules/insurance/insurancePolicy.routes.ts` (new)
- **Change:** Add `InsurancePolicy` model: `id` (UUID PK), `policyNumber` (String), `patientId` (String FK → Patient), `insuranceCompanyId` (String FK → InsuranceCompany), `coveragePercent` (Decimal — e.g. 80.00 for 80% coverage), `maxCoverageAmount` (Decimal?, optional cap), `effectiveFrom` (DateTime), `effectiveTo` (DateTime), `networkType` (String? — e.g. "Gold", "Silver", "Basic"), `cardNumber` (String?, insurance card number), `groupNumber` (String?, group policy number), `isPrimary` (Boolean, default true — patient may have multiple policies), `isActive` (Boolean, default true), `notes` (String?), `hospitalId` (String?), `created_at`, `updated_at`. Add `Patient` relation: `insurancePolicies InsurancePolicy[]` in Patient model. Add unique constraint `@@unique([hospitalId, patientId, insuranceCompanyId, policyNumber])`. Add indexes on `patientId`, `insuranceCompanyId`, `hospitalId`. Create endpoints: GET /insurance/policies (list with filters: patientId, insuranceCompanyId, isActive, pagination), POST /insurance/policies (create — validate company exists and patient exists), GET /insurance/policies/:id, PATCH /insurance/policies/:id, DELETE /insurance/policies/:id (soft). Add GET /insurance/patients/:patientId/policies (get all active policies for a patient — used at checkout). All hospital-scoped.
- **Complexity:** L
- **Dependencies:** T1 (references InsuranceCompany)

#### T3: Add InsurancePricingRule model + pricing override endpoints
- **File:** `backend/prisma/schema.prisma` (add model), `backend/src/modules/insurance/pricingRules.routes.ts` (new)
- **Change:** Add `InsurancePricingRule` model: `id` (UUID PK), `insuranceCompanyId` (String FK → InsuranceCompany), `serviceItemId` (String FK → ServiceItem, nullable), `itemType` (String — "CONSULTATION", "SURGERY", "LAB", "IMAGING", "PHARMACY", "WARD", "GENERAL"), `itemName` (String — human-readable name of the service), `standardPrice` (Decimal), `insurancePrice` (Decimal — the agreed price for this company), `isActive` (Boolean, default true), `hospitalId` (String?), `created_at`, `updated_at`. Add unique constraint `@@unique([hospitalId, insuranceCompanyId, itemType, itemName])`. Add index on `insuranceCompanyId`, `hospitalId`. Create endpoints: GET /insurance/pricing-rules (list with filter: insuranceCompanyId, itemType), POST /insurance/pricing-rules (create bulk — accepts array of rules for a company), PATCH /insurance/pricing-rules/:id, DELETE /insurance/pricing-rules/:id. Add GET /insurance/pricing-rules/lookup?insuranceCompanyId=X&itemName=Y&itemType=Z (returns the insurance-agreed price if a rule exists, otherwise null — used at checkout time). All hospital-scoped.
- **Complexity:** M
- **Dependencies:** T1

#### T4: Add PreAuthorization model + workflow endpoints
- **File:** `backend/prisma/schema.prisma` (add model + enum), `backend/src/modules/insurance/preAuthorization.routes.ts` (new)
- **Change:** Add `PreAuthorizationStatus` enum: `SUBMITTED, UNDER_REVIEW, APPROVED, PARTIALLY_APPROVED, REJECTED, CANCELLED, EXPIRED`. Add `PreAuthorization` model: `id` (UUID PK), `referenceNumber` (String, auto-generated, unique per hospital), `patientId` (String FK → Patient), `insurancePolicyId` (String FK → InsurancePolicy), `insuranceCompanyId` (String FK → InsuranceCompany), `status` (PreAuthorizationStatus, default SUBMITTED), `diagnosis` (String — clinical diagnosis), `diagnosisCode` (String? — ICD-10 code), `plannedProcedures` (Json — array of planned procedure items with names and estimated costs), `estimatedTotalCost` (Decimal), `approvedAmount` (Decimal? — set on approval), `clinicalNotes` (String?), `rejectionReason` (String? — set on rejection), `submittedById` (String FK → User), `reviewedById` (String? FK → User), `submittedAt` (DateTime, default now()), `reviewedAt` (DateTime?), `expiresAt` (DateTime? — validity window), `hospitalId` (String?), `created_at`, `updated_at`. Add indexes on `patientId`, `insuranceCompanyId`, `status`, `hospitalId`. Create endpoints: GET /insurance/pre-authorizations (list with filters: patientId, insuranceCompanyId, status, date range, pagination), POST /insurance/pre-authorizations (create — auto-generate referenceNumber, set submittedById from JWT), GET /insurance/pre-authorizations/:id (with patient, policy, company details), PATCH /insurance/pre-authorizations/:id/approve (set APPROVED + approvedAmount + reviewedById + reviewedAt), PATCH /insurance/pre-authorizations/:id/partial-approve (set PARTIALLY_APPROVED + approvedAmount), PATCH /insurance/pre-authorizations/:id/reject (set REJECTED + rejectionReason + reviewedById + reviewedAt), PATCH /insurance/pre-authorizations/:id/cancel. All hospital-scoped, `insurance:write` for mutations.
- **Complexity:** L
- **Dependencies:** T1, T2

#### T5: Add InsuranceClaim model + claim generation endpoint
- **File:** `backend/prisma/schema.prisma` (add model + enum), `backend/src/modules/insurance/insuranceClaim.routes.ts` (new)
- **Change:** Add `ClaimStatus` enum: `DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, PARTIALLY_APPROVED, REJECTED, SETTLED, CLOSED`. Add `InsuranceClaim` model: `id` (UUID PK), `claimNumber` (String, auto-generated `CLM-YYYY-NNNNN`, unique per hospital), `patientId` (String FK → Patient), `insurancePolicyId` (String FK → InsurancePolicy), `insuranceCompanyId` (String FK → InsuranceCompany), `invoiceId` (String? FK → Invoice — the billed invoice), `preAuthorizationId` (String? FK → PreAuthorization — linked pre-auth if any), `status` (ClaimStatus, default DRAFT), `claimAmount` (Decimal — total amount claimed), `approvedAmount` (Decimal? — insurer-approved amount), `paidAmount` (Decimal?, default 0 — amount actually paid by insurer), `rejectionReason` (String?), `clinicalRecords` (Json? — array of clinical record summaries attached to the claim), `labResults` (Json? — attached lab results), `imagingResults` (Json? — attached imaging results), `submittedAt` (DateTime?), `settledAt` (DateTime?), `notes` (String?), `createdById` (String FK → User), `hospitalId` (String?), `created_at`, `updated_at`. Add `Invoice` relation: `claims InsuranceClaim[]` in Invoice model. Add `PreAuthorization` relation: `claims InsuranceClaim[]` in PreAuthorization model. Add indexes on `patientId`, `insuranceCompanyId`, `status`, `invoiceId`, `hospitalId`. Create endpoints: GET /insurance/claims (list with filters: patientId, insuranceCompanyId, status, date range, pagination), POST /insurance/claims (create from invoice — auto-populate claimAmount from invoice.total, attach clinical records and lab results from patient), GET /insurance/claims/:id (full detail with patient, policy, company, invoice, pre-auth), PATCH /insurance/claims/:id/submit (DRAFT → SUBMITTED, set submittedAt), PATCH /insurance/claims/:id/approve (set APPROVED + approvedAmount), PATCH /insurance/claims/:id/partial-approve (set PARTIALLY_APPROVED + approvedAmount), PATCH /insurance/claims/:id/reject (set REJECTED + rejectionReason), PATCH /insurance/claims/:id/close (set CLOSED). All hospital-scoped.
- **Complexity:** XL
- **Dependencies:** T1, T2, T4

#### T6: Add claim tracking dashboard endpoint
- **File:** `backend/src/modules/insurance/insuranceClaim.routes.ts` (extend)
- **Change:** Add `GET /insurance/claims/dashboard` that returns: total claims by status (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, PARTIALLY_APPROVED, REJECTED, SETTLED, CLOSED), total claimed amount vs approved vs paid, claims aging (0-30 days, 31-60 days, 61-90 days, 90+ days since submission), top insurance companies by claim volume, rejection rate percentage. All hospital-scoped with optional date range filter. Add `GET /insurance/claims/pending-reviews` for quick access to claims awaiting review.
- **Complexity:** M
- **Dependencies:** T5

#### T7: Add InsuranceSettlement model + settlement recording endpoints
- **File:** `backend/prisma/schema.prisma` (add model + enum), `backend/src/modules/insurance/insuranceSettlement.routes.ts` (new)
- **Change:** Add `SettlementStatus` enum: `PENDING, PARTIAL, COMPLETED, DISPUTED`. Add `InsuranceSettlement` model: `id` (UUID PK), `claimId` (String FK → InsuranceClaim), `insuranceCompanyId` (String FK → InsuranceCompany), `amount` (Decimal — settlement amount), `settlementDate` (DateTime), `referenceNumber` (String? — insurer payment reference), `paymentMethod` (String? — how the TPA paid), `notes` (String?), `adjustmentReason` (String? — for deductions/adjustments), `createdById` (String FK → User), `hospitalId` (String?), `created_at`, `updated_at`. Add `InsuranceClaim` relation: `settlements InsuranceSettlement[]`. Add indexes on `claimId`, `insuranceCompanyId`, `settlementDate`, `hospitalId`. Create endpoints: GET /insurance/settlements (list with filters: claimId, insuranceCompanyId, date range, pagination), POST /insurance/settlements (record settlement — validate claim exists, update claim.paidAmount += amount, update claim status to SETTLED if paidAmount >= approvedAmount, or PARTIAL if less), GET /insurance/settlements/:id. Add `GET /insurance/settlements/aging` that returns unsettled claims grouped by age. All hospital-scoped.
- **Complexity:** L
- **Dependencies:** T5

#### T8: Integrate insurance pricing into POS checkout flow
- **File:** `backend/src/modules/pos/routes/pharmacy.routes.ts` (modify), `backend/src/modules/pos/routes/optics.routes.ts` (modify)
- **Change:** In the pharmacy POS transaction endpoint, when `paymentMethod === 'INSURANCE'`, look up the patient's active primary policy → look up InsurancePricingRule for each cart item → apply insurance-agreed prices instead of standard prices. Calculate coverage: `patientPays = total * (100 - coveragePercent) / 100`, `insurancePays = total - patientPays`. Add `insurancePolicyId` optional field to the transaction creation payload. When creating the Transaction, store the `insurancePolicyId` as metadata (can use `description` field or add an optional `metadata` JSON field to Transaction). Apply same logic to optics POS. Add a new endpoint `GET /insurance/checkout-preview?patientId=X&items=[...]` that returns the price breakdown (standard total, insurance total, patient responsibility, insurance responsibility) for preview before checkout.
- **Complexity:** L
- **Dependencies:** T2, T3, existing POS endpoints

#### T9: Add insurance reports endpoint
- **File:** `backend/src/modules/insurance/reports.routes.ts` (new)
- **Change:** Add endpoints: `GET /insurance/reports/claims-by-company` (group claims by insurance company with counts and amounts for a date range), `GET /insurance/reports/settlement-rate` (percentage of claims settled vs total, average processing time from submission to settlement), `GET /insurance/reports/revenue-by-insurance` (total revenue from insurance payments vs cash vs other methods — join Transaction where paymentMethod=INSURANCE with InsuranceClaim), `GET /insurance/reports/denial-analysis` (rejection reasons breakdown, denial rate by company). All hospital-scoped with date range filters. Register in insurance router.
- **Complexity:** M
- **Dependencies:** T5, T7

### Frontend Tasks

#### T10: Build InsurancePage — insurance company management + patient policy assignment
- **File:** `frontend/src/features/insurance/InsurancePage.jsx` (new), `frontend/src/features/insurance/CompanyForm.jsx` (new), `frontend/src/features/insurance/PolicyAssignmentForm.jsx` (new)
- **Change:** InsurancePage with tabbed layout: "Companies" tab and "Policies" tab. Companies tab: table of insurance companies (name, contact, TPA badge, active status), "Add Company" button → modal form (CompanyForm) with fields: name, nameAr, contactPerson, phone, email, address, isTpa toggle, isActive toggle. Edit inline or via modal. Policy tab: table of patient insurance policies (patient name/MRN, company name, policy number, coverage %, expiry, network type, active status). "Assign Policy" button → modal form (PolicyAssignmentForm) with patient search (autocomplete), company dropdown, policy number, coverage percent, max coverage amount, effective dates, network type, card number, group number, isPrimary toggle. Each component must have loading, empty, and error states. Follow HMS conventions: import from `../../components/ui/`, use `safeStringify` not `JSON.stringify`, ternary branches with multiple elements wrap in fragments.
- **Complexity:** L
- **Dependencies:** T1, T2

#### T11: Build PreAuthorizationPage — submit and track pre-auth requests
- **File:** `frontend/src/features/insurance/PreAuthorizationPage.jsx` (new), `frontend/src/features/insurance/PreAuthForm.jsx` (new), `frontend/src/features/insurance/PreAuthDetail.jsx` (new)
- **Change:** PreAuthorizationPage: list of pre-auth requests with status filter tabs (All, Submitted, Under Review, Approved, Rejected), patient search, company filter, date range. Each row shows: reference number, patient name, company name, estimated cost, status badge, submitted date. "New Pre-Auth" button → PreAuthForm: patient search, insurance policy dropdown (filtered by selected patient), planned procedures (dynamic list of items with name and estimated cost), diagnosis text, ICD-10 code, clinical notes. PreAuthDetail panel (slide-in or modal): full pre-auth info, status timeline, approve/reject actions for authorized users (with approved amount input for approval). Loading/empty/error states required.
- **Complexity:** L
- **Dependencies:** T4, T10 (needs policies to exist)

#### T12: Build ClaimTrackingPage — claim lifecycle dashboard
- **File:** `frontend/src/features/insurance/ClaimTrackingPage.jsx` (new), `frontend/src/features/insurance/ClaimDetail.jsx` (new), `frontend/src/features/insurance/ClaimForm.jsx` (new)
- **Change:** ClaimTrackingPage: dashboard-style layout with stat cards (total claims, pending, approved, rejected, settled counts + total amounts). Status filter tabs. Table of claims: claim number, patient, company, claim amount, approved amount, paid amount, status badge, submission date, days since submission (aging color: green <30d, amber 30-60d, red >60d). "Create Claim" button → ClaimForm: invoice search, patient auto-fill, policy selection, clinical records auto-attachment from patient's recent records. ClaimDetail: full claim info, linked invoice, linked pre-auth, clinical attachments, status timeline, approve/reject/settle actions. "Record Settlement" button within detail view → form for settlement amount, date, reference number, notes. Loading/empty/error states.
- **Complexity:** XL
- **Dependencies:** T5, T6, T10

#### T13: Build InsuranceReportsPage — insurance financial reports
- **File:** `frontend/src/features/insurance/InsuranceReportsPage.jsx` (new)
- **Change:** Tabbed reports page: "Claims by Company" (table + bar chart — claims count and amounts per company), "Settlement Rate" (KPI cards: settlement rate %, avg processing days, total settled amount), "Revenue by Insurance" (breakdown of revenue by payment method with insurance highlighted), "Denial Analysis" (top rejection reasons, denial rate by company). Date range picker. Print/export button. Follow existing ReportsPage.jsx pattern. Loading/empty/error states.
- **Complexity:** M
- **Dependencies:** T9

#### T14: Create useInsurance.js hooks + navigation + route integration
- **File:** `frontend/src/hooks/queries/useInsurance.js` (new), `frontend/src/config/navigation.tsx` (modify), `frontend/src/app/App.jsx` (modify)
- **Change:** useInsurance.js: React Query hooks — `useInsuranceCompanies(params)`, `useInsuranceCompany(id)`, `useCreateInsuranceCompany()`, `useUpdateInsuranceCompany()`, `useInsurancePolicies(params)`, `useCreateInsurancePolicy()`, `useUpdateInsurancePolicy()`, `usePatientPolicies(patientId)`, `useInsurancePricingRules(params)`, `useCreateInsurancePricingRules()`, `usePreAuthorizations(params)`, `usePreAuthorization(id)`, `useCreatePreAuthorization()`, `useApprovePreAuthorization()`, `useRejectPreAuthorization()`, `useInsuranceClaims(params)`, `useInsuranceClaim(id)`, `useClaimDashboard()`, `useCreateInsuranceClaim()`, `useSubmitClaim()`, `useApproveClaim()`, `useRejectClaim()`, `useInsuranceSettlements(params)`, `useCreateSettlement()`, `useInsuranceReports(type, params)`. Follow existing pattern from useAccounting.js. Navigation: add Insurance group to `NAV_GROUPS` with items: Insurance Companies (`/insurance/companies`, icon: Shield, permissions: `insurance:read`), Policies (`/insurance/policies`, icon: FileCheck, permissions: `insurance:read`), Pre-Authorizations (`/insurance/pre-authorizations`, icon: ClipboardCheck, permissions: `insurance:read`), Claims (`/insurance/claims`, icon: ReceiptText, permissions: `insurance:read`), Settlements (`/insurance/settlements`, icon: Banknote, permissions: `insurance:read`), Reports (`/insurance/reports`, icon: BarChart3, permissions: `insurance:read`). Routes: lazy-load InsurancePage, PreAuthorizationPage, ClaimTrackingPage, InsuranceReportsPage. Add PermissionGuard with `insurance:read` on all insurance routes. Position Insurance nav group between Finance and Administration.
- **Complexity:** L
- **Dependencies:** T10, T11, T12, T13 (can start hook structure immediately, finalize wiring when pages are done)

---

## 4. Acceptance Criteria

- [ ] `InsuranceCompany` model exists in schema with hospital-scoped CRUD endpoints; GET /insurance/companies returns paginated list with search and TPA filter
- [ ] `InsurancePolicy` model exists; patient can have multiple active policies linked to different companies
- [ ] GET /insurance/patients/:patientId/policies returns all active policies for a patient (used at checkout)
- [ ] `InsurancePricingRule` model exists; GET /insurance/pricing-rules/lookup returns insurance-agreed price for a given item/company combination
- [ ] `PreAuthorization` model exists with status workflow (SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED)
- [ ] Pre-authorization approval records the approved amount, reviewer, and timestamp
- [ ] `InsuranceClaim` model exists; POST /insurance/claims creates claim from invoice with auto-populated clinical records
- [ ] Claim status lifecycle works: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → SETTLED/CLOSED
- [ ] GET /insurance/claims/dashboard returns counts by status, amounts, aging buckets, and rejection rate
- [ ] `InsuranceSettlement` model exists; recording a settlement updates the claim's paidAmount and status
- [ ] When paidAmount >= approvedAmount, claim status auto-updates to SETTLED
- [ ] Insurance pricing overrides integrate into pharmacy POS checkout when paymentMethod is INSURANCE
- [ ] Patient responsibility is correctly calculated based on coverage percentage
- [ ] Insurance reports return claims by company, settlement rate, revenue by insurance, and denial analysis
- [ ] InsurancePage renders company list and policy list with create/edit modals, loading/empty/error states
- [ ] PreAuthorizationPage renders pre-auth list with status tabs, create form with dynamic procedure list, approval/rejection actions
- [ ] ClaimTrackingPage renders stat cards, claims table with aging color coding, create claim from invoice, settlement recording
- [ ] InsuranceReportsPage renders four report tabs with date range filters and print support
- [ ] All insurance pages have routes in App.jsx with PermissionGuard requiring `insurance:read`
- [ ] All insurance pages appear in navigation under a new "Insurance" group
- [ ] useInsurance.js follows existing hook pattern (api helper, React Query, query key factories, invalidation)
- [ ] All new backend endpoints are hospital-scoped (filter by `hospitalId`)
- [ ] All new endpoints use `insurance:read` / `insurance:write` permissions
- [ ] `tsc --noEmit` passes with zero errors for both backend and frontend

---

## 5. Work Split

### Sr Dev — Database, Core Logic, Backend Endpoints

| Task | File(s) | Description |
|------|---------|-------------|
| T1: InsuranceCompany model + CRUD | `schema.prisma`, `insuranceCompany.routes.ts`, `index.ts` | New model, full CRUD, router barrel, register in app.ts |
| T2: InsurancePolicy model + patient policy endpoints | `schema.prisma`, `insurancePolicy.routes.ts` | New model with patient/company FKs, CRUD + patient lookup |
| T3: InsurancePricingRule model + pricing endpoints | `schema.prisma`, `pricingRules.routes.ts` | Pricing override model, bulk create, lookup endpoint |
| T4: PreAuthorization model + workflow endpoints | `schema.prisma`, `preAuthorization.routes.ts` | Status workflow with approve/reject actions |
| T5: InsuranceClaim model + claim generation | `schema.prisma`, `insuranceClaim.routes.ts` | Claim lifecycle, auto-population from invoice, clinical attachment |
| T6: Claim dashboard endpoint | `insuranceClaim.routes.ts` | Stats aggregation endpoint |
| T7: InsuranceSettlement model + settlement endpoints | `schema.prisma`, `insuranceSettlement.routes.ts` | Settlement recording with auto claim status update |
| T8: Insurance pricing integration in POS | `pharmacy.routes.ts`, `optics.routes.ts` | Modify existing POS to apply insurance pricing |
| T9: Insurance reports endpoints | `reports.routes.ts` | Four report aggregation endpoints |

**Coordination points:** T2 depends on T1. T3 depends on T1. T4 depends on T1, T2. T5 depends on T1, T2, T4. T6 depends on T5. T7 depends on T5. T8 depends on T2, T3. T9 depends on T5, T7. T1 → T2/T3 can start in parallel. T4/T5 are sequential after T1+T2. T8 and T9 can proceed once T2/T3 and T5/T7 are ready respectively.

### Jr Dev — UI Components, Pages, Route Integration

| Task | File(s) | Description |
|------|---------|-------------|
| T10: InsurancePage + CompanyForm + PolicyAssignmentForm | `InsurancePage.jsx`, `CompanyForm.jsx`, `PolicyAssignmentForm.jsx` | Start immediately with mock data, finalize when T1/T2 are done |
| T11: PreAuthorizationPage + PreAuthForm + PreAuthDetail | `PreAuthorizationPage.jsx`, `PreAuthForm.jsx`, `PreAuthDetail.jsx` | Depends on T4 (needs policies to exist from T2) |
| T12: ClaimTrackingPage + ClaimDetail + ClaimForm | `ClaimTrackingPage.jsx`, `ClaimDetail.jsx`, `ClaimForm.jsx` | Depends on T5, T6 |
| T13: InsuranceReportsPage | `InsuranceReportsPage.jsx` | Depends on T9 |
| T14: useInsurance.js + navigation + routes | `useInsurance.js`, `navigation.tsx`, `App.jsx` | Start hook structure immediately; wire pages when ready |

**Coordination points:** Jr Dev can start T10 immediately with mock data and T14 hook scaffolding. T11 waits for T4 (PreAuthorization backend). T12 waits for T5/T6 (Claims backend). T13 waits for T9 (Reports backend). All Jr Dev tasks use the same import patterns, component library, and page structure as existing AccountingPage.jsx and HRPage.jsx.

---

## 6. Files Likely Impacted

### New Files
- `backend/prisma/schema.prisma` (modified — add 6 new models + 3 new enums)
- `backend/src/modules/insurance/index.ts` (router barrel — registers all insurance sub-routers)
- `backend/src/modules/insurance/insuranceCompany.routes.ts`
- `backend/src/modules/insurance/insurancePolicy.routes.ts`
- `backend/src/modules/insurance/pricingRules.routes.ts`
- `backend/src/modules/insurance/preAuthorization.routes.ts`
- `backend/src/modules/insurance/insuranceClaim.routes.ts`
- `backend/src/modules/insurance/insuranceSettlement.routes.ts`
- `backend/src/modules/insurance/reports.routes.ts`
- `frontend/src/features/insurance/InsurancePage.jsx`
- `frontend/src/features/insurance/CompanyForm.jsx`
- `frontend/src/features/insurance/PolicyAssignmentForm.jsx`
- `frontend/src/features/insurance/PreAuthorizationPage.jsx`
- `frontend/src/features/insurance/PreAuthForm.jsx`
- `frontend/src/features/insurance/PreAuthDetail.jsx`
- `frontend/src/features/insurance/ClaimTrackingPage.jsx`
- `frontend/src/features/insurance/ClaimDetail.jsx`
- `frontend/src/features/insurance/ClaimForm.jsx`
- `frontend/src/features/insurance/InsuranceReportsPage.jsx`
- `frontend/src/hooks/queries/useInsurance.js`

### Modified Files
- `backend/prisma/schema.prisma` (add InsuranceCompany, InsurancePolicy, InsurancePricingRule, PreAuthorization, InsuranceClaim, InsuranceSettlement models + PreAuthorizationStatus, ClaimStatus, SettlementStatus enums; add relations to Patient, Hospital, Invoice, User models)
- `backend/src/app.ts` (register insurance router under `/api/insurance`)
- `backend/src/modules/pos/routes/pharmacy.routes.ts` (add insurance pricing lookup at checkout)
- `backend/src/modules/pos/routes/optics.routes.ts` (add insurance pricing lookup at checkout)
- `frontend/src/features/pos/PharmacyPOS.jsx` (add insurance price preview when INSURANCE payment selected)
- `frontend/src/features/pos/OpticsPOS.jsx` (add insurance price preview when INSURANCE payment selected)
- `frontend/src/app/App.jsx` (add lazy imports + routes for all insurance pages)
- `frontend/src/config/navigation.tsx` (add Insurance nav group with 6 items, add Shield/FileCheck/ReceiptText/Banknote icons)

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| 6 new Prisma models + migration could cause schema drift or long migration time | Medium | Run `prisma migrate dev` in development first; ensure no data conflicts; add all models in a single migration |
| Claim auto-generation from invoice requires fetching clinical records, lab results, and imaging results — could be slow with large patient histories | Medium | Limit clinical attachment to the most recent N records (e.g., last 3 months); use indexed queries on patientId + encounterDate |
| Insurance pricing integration in POS requires modifying existing, battle-tested checkout flows | High | Extract insurance pricing logic into a helper function `backend/src/modules/insurance/utils/pricingHelper.ts`; call it only when paymentMethod === 'INSURANCE'; add feature flag in hospital settings to enable/disable insurance at checkout |
| Settlement recording auto-updates claim paidAmount — concurrent settlements could cause race conditions | Low | Use Prisma `update` with `paidAmount: { increment: amount }` atomic operation instead of read-modify-write |
| Pre-authorization and claim workflows involve many status transitions — incorrect transitions could corrupt data | Medium | Validate status transitions in service layer (e.g., cannot go from REJECTED to APPROVED); add server-side state machine validation |
| InsurancePage.jsx could become large with two tab panels (Companies + Policies) | Medium | Extract CompaniesTab and PoliciesTab into separate component files |
| `insurance:read` / `insurance:write` permissions need to be added to relevant roles | Low | Update existing seed script or admin RBAC management; BILLING_OFFICER already has these permissions per TRD |
| POS checkout modification for insurance pricing could break existing CASH/CARD/BANK_TRANSFER flows | High | Only apply insurance pricing logic inside an `if (paymentMethod === 'INSURANCE')` block; ensure the else-branch remains identical to current behavior |
