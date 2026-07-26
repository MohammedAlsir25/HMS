# Implementation Plan — Hospital Management System (HMS) SaaS

> **Version:** 1.1.0  
> **Status:** Active  
> **Last Updated:** 2026-07-17  
> **Audience:** AI agent subagents (makers & checkers), engineering leads

---

## 1. Development Approach

### 1.1 Loop Engineering

Each phase follows a **maker-checker** loop:

1. **Maker subagent** reads the spec docs (PRD, TRD, Schema, UI-UX, App Flow) relevant to the phase, then implements the backend endpoints, frontend pages, and database migrations.
2. **Checker subagent** independently verifies the implementation against the spec docs, runs tests, checks type safety, and validates acceptance criteria.
3. If the checker finds issues, the maker fixes them and the loop repeats until the checker signs off.

The checker must never be the same agent instance as the maker for the same phase.

### 1.2 Documentation-Driven

Every phase has corresponding spec docs written **before** implementation begins:

| Document | Location | Purpose |
|----------|----------|---------|
| PRD | `docs/01-prd.md` | Product requirements, user stories, business rules |
| TRD | `docs/02-trd.md` | Technical architecture, API contracts, data flow |
| Backend Schema | `docs/03-backend-schema.md` | Prisma schema additions, migrations, seed data |
| UI-UX | `docs/04-ui-ux.md` | Wireframes, component specs, interaction patterns |
| App Flow | `docs/05-app-flow.md` | Navigation structure, role-based routing, state management |

The maker **must** read the relevant spec doc sections before writing any code. The checker **must** validate against them.

### 1.3 Agent Task Format

Each phase is dispatched as a task to a subagent with this structure:

```
PHASE {N}: {Name}
CONTEXT: [links to spec docs]
GOAL: [1-2 sentences]
TASKS: [numbered list]
ACCEPTANCE CRITERIA: [checkbox list]
COMPLEXITY: {S|M|L|XL}
FOCUS ROLE: {backend|frontend|fullstack|devops}
```

---

## 2. Current State Assessment

### 2.1 What Exists (v1.0.0 baseline)

**Backend (Express + Prisma + PostgreSQL):**
- 21 module directories under `backend/src/modules/`
- JWT auth with `id`, `email`, `role`, `clinicId`, `clinicSlug`, `permissions` in payload
- RBAC middleware with 14 default roles and granular permission strings
- Multer + Supabase storage for file uploads
- Audit logging, rate limiting, validation middleware

**Frontend (React + Vite + Tailwind):**
- 19 feature directories under `frontend/src/features/`
- 49 routes defined in `App.jsx`
- Persistent collapsible Sidebar replacing StaggeredMenu with grouped, permission-filtered nav items (Phase 1)
- RoleGuard component wrapping all protected routes with permission checks (Phase 1)
- Breadcrumb navigation reflecting nav group > item hierarchy (Phase 1)
- AppShell with sticky header, notification bell, user dropdown, Tauri window controls
- Settings page with profile editing, password change, notification prefs, theme/language switching (Phase 1)
- Lazy-loaded routes with Suspense
- Dark/light theme, Arabic RTL support stub, Shepherd.js onboarding tours

**Database (Prisma schema):**
- ~55 tenant-scoped models + Hospital model
- `Hospital` model exists with `id`, `name`, `slug`, `address`, `phone`, `email`, `logoUrl`, `isActive` (Phase 0)
- `hospitalId` (String?) foreign key on all 55 tenant-scoped tables (Phase 0)
- Multi-tenant design: AsyncLocalStorage request context + Prisma extension auto-injects `hospitalId` (Phase 0)
- Hospital CRUD endpoints for super-admin with seeding of default roles/clinics (Phase 0)
- JWT carries `hospitalId` in payload; MRN scoped per hospital (Phase 0)

### 2.2 Resolved Gaps

The following gaps from the initial v1.0.0 baseline have been addressed by completed phases:

| Gap | Resolved In | Resolution |
|-----|-------------|-----------|
| No `Hospital` model | Phase 0 | Hospital model with all required fields |
| No `hospitalId` on tables | Phase 0 | hospitalId String? on 55 tenant-scoped tables |
| No super-admin onboarding flow | Phase 0 | Hospital CRUD + seeding default roles/clinics |
| JWT lacks `hospitalId` | Phase 0 | hospitalId in JWT payload + req.user |
| No Prisma middleware for tenant filtering | Phase 0 | createTenantPrisma extension auto-injects hospitalId on all CRUD |
| StaggeredMenu is admin-only overlay | Phase 1 | Persistent collapsible Sidebar for all roles |
| No role-based route guarding on frontend | Phase 1 | RoleGuard component wraps all protected routes |
| Patient MRN is globally unique, not per-hospital | Phase 0 | MRN format MRN-{YEAR}-{5-digit} scoped per hospital |

---

## 3. Phase Definitions

---

### Phase 0: Multi-Tenant Foundation & Auth ✅ Complete

**Goal:** Convert the single-tenant HMS into a multi-tenant SaaS by adding a Hospital model, hospitalId to all data tables, and tenant-scoped authentication.

**Dependencies:** None (first phase).

**Estimated Complexity:** XL

**Focus Role:** backend

#### Tasks

1. Add `Hospital` model to Prisma schema with fields: `id`, `name`, `slug` (unique), `address`, `phone`, `email`, `logoUrl`, `isActive`, `createdAt`, `updatedAt`, `is_deleted`
2. Add `hospitalId` (String, required) foreign key to every tenant-scoped table: `User`, `Role`, `Clinic`, `Department`, `Patient`, `Appointment`, `ClinicalRecord`, `VitalSign`, `Symptom`, `Medication`, `Referral`, `Surgery`, `Ward`, `Bed`, `InpatientVital`, `NursingNote`, `WardRound`, `InventoryItem`, `InventoryLocation`, `InventoryTransaction`, `DiagnosticTest`, `DiagnosticPanel`, `DiagnosticOrder`, `DiagnosticOrderTest`, `ImagingProcedureType`, `ImagingOrder`, `ImagingFile`, `Employee`, `Attendance`, `LeaveRequest`, `PayrollRecord`, `Shift`, `Transaction`, `CashMovement`, `Expense`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `Requisition`, `RequisitionItem`, `SupplierInvoice`, `SupplierInvoiceItem`, `CostCenter`, `FixedAsset`, `Notification`, `AuditLog`, `CrashLog`, `OpticLabJob`, `OperationType`, `ORRole`, `PreoperativeRequest`, `ConsentWaiver`, `SurgeryTeamMember`, `IntraoperativeEventType`, `IntraoperativeEvent`, `PostOpFollowUp`, `PostoperativeNote`, `DischargeSummary`, `AccountsPayable`, `PatientFile`, `Icd10Code`
3. Create a Prisma middleware (`backend/src/middleware/tenant.ts`) that automatically injects `hospitalId` into all queries based on the JWT payload
4. Update JWT `generateTokens` in `backend/src/modules/auth/auth.routes.ts` to include `hospitalId` in the signed payload
5. Update `authenticate` middleware in `backend/src/middleware/auth.ts` to extract and expose `hospitalId` on `req.user`
6. Add `Hospital` CRUD endpoints under `backend/src/modules/admin/hospital.routes.ts` (super-admin only): create hospital, list hospitals, update hospital, deactivate hospital
7. Create hospital onboarding flow: super admin endpoint to create a hospital, auto-create default roles (from `DEFAULT_ROLES` in `rbac.ts`), seed default clinics and departments
8. Update `generateMRN()` in `backend/src/modules/patients/patients.routes.ts` to scope MRN uniqueness per hospital (collision check within hospital)
9. Write a data migration script to assign all existing records to a default hospital (for backward compatibility of the single-tenant database)
10. Update all existing route handlers to pass `hospitalId` from `req.user` into Prisma queries (systematic audit of every `prisma.*.findMany`, `create`, `update`, `delete`)
11. Add integration tests verifying that Hospital A cannot read Hospital B's patients, appointments, or any data
12. Update `frontend/src/stores/authStore` to store and expose `hospitalId` from the JWT

#### Acceptance Criteria

- [ ] `Hospital` model exists in schema and is migrated to the database
- [ ] Every tenant-scoped table has a `hospitalId` column with a foreign key to `Hospital`
- [ ] JWT token contains `hospitalId` field
- [ ] Prisma middleware automatically injects `hospitalId` filter on all find/create/update/delete operations
- [ ] Super admin can create a new hospital via API, which seeds default roles and a default clinic
- [ ] MRN generation is scoped per hospital (same year + sequence can exist in different hospitals)
- [ ] Cross-tenant data isolation test passes: Hospital A users cannot see Hospital B data
- [ ] Existing single-tenant data is migrated to a default hospital
- [ ] All existing routes still function correctly after the migration

---

### Phase 1: Core UI & Navigation ✅ Complete

**Goal:** Replace the StaggeredMenu overlay with a persistent, collapsible sidebar that supports grouped navigation items filtered by user role, and add role-based route guarding on the frontend.

**Dependencies:** Phase 0 (hospitalId in auth context).

**Estimated Complexity:** L

**Focus Role:** frontend

#### Tasks

1. Create a navigation configuration file (`frontend/src/config/navigation.tsx`) defining all nav items with: label, icon, path, required permission(s), group (e.g., "Clinical", "Operations", "Finance"), and optional badge/callback
2. Build a new `Sidebar` component (`frontend/src/components/layout/Sidebar.jsx`) replacing StaggeredMenu: persistent left sidebar with collapse/expand toggle, grouped sections, active-route highlighting, role-filtered items using permissions from auth store
3. Build a `SidebarGroup` sub-component with collapsible sections and item count badges
4. Implement responsive behavior: sidebar collapses to icon-only on tablet (768-1024px), slides out as overlay on mobile (<768px), persistent on desktop (>1024px)
5. Update `AppShell.jsx` to use the new Sidebar instead of StaggeredMenu, adjust main content layout for sidebar offset
6. Add `RoleGuard` component (`frontend/src/components/auth/RoleGuard.jsx`) that accepts `requiredPermissions` and renders children or redirects to `/dashboard`
7. Wrap each `ProtectedRoute` in `App.jsx` with `RoleGuard` using the correct permission set per route
8. Extend existing user settings page (`frontend/src/features/settings/SettingsContent.jsx`) — wire password change form, add notification preferences section with toggle switches, verify theme/language selectors work with new sidebar layout
9. Add a breadcrumb component that reflects the current nav group > item hierarchy
10. Persist sidebar collapsed/expanded state to localStorage
11. Remove StaggeredMenu.jsx, StaggeredMenu.css, and TabletNav.jsx (or repurpose TabletNav for mobile sidebar)

#### Acceptance Criteria

- [ ] Sidebar is visible on all screen sizes with proper responsive breakpoints
- [ ] Navigation items are grouped (Clinical, Operations, Finance, Admin) with section headers
- [ ] Items are filtered based on user permissions — a Receptionist does not see Surgery or Accounting links
- [ ] Active route is highlighted in the sidebar
- [ ] Sidebar collapses to icon-only mode and can be toggled
- [ ] `RoleGuard` component prevents unauthorized route access and redirects to dashboard
- [ ] User settings page allows profile editing, password change, and theme/language switching
- [ ] StaggeredMenu is removed or deprecated
- [ ] Sidebar state persists across page reloads (localStorage)

---

### Phase 2: Patient Management

**Goal:** Build a complete patient registry with per-hospital MRN generation, advanced search, and a rich patient detail view with tabbed history.

**Dependencies:** Phase 0 (multi-tenant), Phase 1 (navigation + role guarding).

**Estimated Complexity:** L

**Focus Role:** fullstack

#### Tasks

1. Update `generateMRN()` to use format `MRN-{YEAR}-{5-digit-sequence}` scoped per hospital (atomic counter or random with uniqueness check within tenant)
2. Add patient duplicate detection endpoint: search by `nationalId`, `fullName` + `dateOfBirth`, or `phone` within the same hospital; return potential matches during registration
3. Build patient registration form (`frontend/src/features/patients/PatientRegistration.jsx`) with fields: full name, phone, national ID, email, DOB, gender, address, chronic conditions, diabetes type, notes; show duplicate warnings inline
4. Build patient list page (`frontend/src/features/patients/PatientListPage.jsx`) with: server-side search (name, MRN, phone, national ID), gender filter, date range filter, sort options, pagination (20/page default)
5. Build patient detail page (`frontend/src/features/patients/PatientDetailPage.jsx`) with tabs: Overview (demographics, summary stats), Medical History (clinical records timeline), Appointments (past + upcoming), Billing (transactions), Files (uploaded documents), Surgeries, Referrals
6. Add patient edit endpoint and inline-edit on the detail page
7. Add patient merge endpoint: merge two patient records (transfer all related records, mark source as merged/deleted); requires `patient:merge` permission in rbac.ts
8. Add patient audit log: track who created/modified a patient record
9. Add file upload/viewer integration on patient detail (reuse existing Supabase storage logic)
10. Add `hospitalId` to all patient query `where` clauses (`GET /patients`, `GET /patients/search`, `GET /patients/:id`, `PATCH /patients/:id`, `POST /patients/check-duplicates`) — critical for cross-tenant data isolation
11. Add patient quick-search component for use in reception, pharmacy, and clinical pages

#### Acceptance Criteria

- [ ] MRN format is `MRN-{YEAR}-{5-digit}` and unique within each hospital
- [ ] Registration form warns about potential duplicates before creating
- [ ] Patient list supports search, filter, sort, and pagination
- [ ] Patient detail page shows all tabs with correct data
- [ ] Patient records are scoped to hospital (hospital A cannot see hospital B patients)
- [ ] Patient merge transfers all related records and soft-deletes the source
- [ ] Quick-search component is reusable across modules

---

### Phase 3: Appointments & Reception ✅ Complete

**Goal:** Implement a full appointment scheduling system with calendar view, walk-in and pre-booked flows, real-time queue management, and per-clinic daily token numbering.

**Dependencies:** Phase 0, Phase 1, Phase 2 (patients).

**Estimated Complexity:** XL

**Focus Role:** fullstack

#### Tasks

1. Add `Appointment` calendar endpoint: return appointments grouped by date/clinic for a date range, including doctor name, patient name, status
2. Build appointment calendar/scheduler view (`frontend/src/features/appointments/AppointmentCalendar.jsx`) with: day/week/month views, drag-to-reschedule, color coding by status
3. Build appointment creation modal with: patient search (quick-search), clinic selection, doctor selection, date/time picker, visit type (new/follow-up), appointment type (walk-in/reservation)
4. Implement check-in flow: receptionist selects patient → creates appointment with WALKIN type → auto-assigns next token → updates queue
5. Implement pre-booked flow: patient arrives → receptionist finds reservation → checks in → status changes from RESERVED to WAITING
6. Build queue management dashboard (`frontend/src/features/reception/QueueBoard.jsx`) with: columns for WAITING, CALLED, IN_PROGRESS, COMPLETED; real-time updates (polling or WebSocket); drag cards between columns
7. Implement token system: per clinic, per day, auto-incrementing integer (existing `token` field on Appointment); display on WaitingRoomTV
8. Update WaitingRoomTV to show current queue position, called patient, and estimated wait
9. Add appointment statistics endpoint: today's count by clinic, no-show rate, average wait time
10. Add appointment reminder system (cron job to send notifications 24h before scheduled appointments)

#### Acceptance Criteria

- [ ] Calendar view shows appointments by day/week/month with correct status colors
- [ ] Walk-in flow: patient registered → appointment created with token → appears in queue
- [ ] Pre-booked flow: reservation found → checked in → moves to WAITING queue
- [ ] Queue board shows real-time status of all patients in the waiting pipeline
- [ ] Token numbers reset daily per clinic and increment correctly
- [ ] WaitingRoomTV displays current queue state
- [ ] All appointment data is scoped to the hospital

---

### Phase 4: Clinical Module ✅ Complete

**Goal:** Build a comprehensive EMR (Electronic Medical Record) consultation page with structured input for vitals, symptoms, diagnosis, prescriptions, and lab/imaging orders.

**Dependencies:** Phase 0, Phase 1, Phase 2, Phase 3.

**Estimated Complexity:** XL

**Focus Role:** fullstack

#### Tasks

1. Build consultation page (`frontend/src/features/clinics/ConsultationPage.jsx`) as the primary doctor workspace, linked from the appointment queue
2. Implement vital signs entry form with: BP (systolic/diastolic), heart rate, temperature, SpO2, blood glucose, weight; auto-flag abnormal values (e.g., temp > 38.3°C, BP > 140/90)
3. Implement symptom tracker: add/remove symptoms with body area, onset, duration, severity (1-10), description
4. Implement diagnosis section with ICD-10 code search (autocomplete from `Icd10Code` table), primary + secondary diagnosis
5. Build prescription writer: drug name (autocomplete), dosage, frequency, duration, route, notes; validate against known drug interactions (basic check)
6. Build lab order creation from consultation: select tests from `DiagnosticTest` catalog or panels, add clinical notes, submit order
7. Build imaging order creation from consultation: select procedure type from `ImagingProcedureType`, add clinical info, laterality, submit order
8. Implement clinical note templates (`backend/src/modules/clinics/templates/`): store templates per clinic type (e.g., ophthalmology exam template), allow doctors to load template and fill fields
9. Save complete consultation as `ClinicalRecord` with related `VitalSign`, `Symptom`, `Medication` records
10. Add consultation history view on patient detail page: timeline of all past consultations with expand/collapse
11. Add referral creation from consultation: refer patient to another clinic within the hospital

#### Acceptance Criteria

- [ ] Consultation page loads with patient context from appointment
- [ ] Vital signs form captures all fields and flags abnormal values visually
- [ ] Symptom tracker allows adding multiple symptoms with structured fields
- [ ] ICD-10 search provides autocomplete from the code database
- [ ] Prescription writer creates `Medication` records linked to the clinical record
- [ ] Lab and imaging orders can be placed directly from the consultation
- [ ] Clinical note templates are loadable and saveable per clinic type
- [ ] Complete consultation is persisted as a `ClinicalRecord` with all related data
- [ ] Consultation history is visible on the patient detail page

---

### Phase 5: Pharmacy Module ✅ Complete

**Goal:** Build a full pharmacy management system with product catalog, inventory tracking, point-of-sale, dispensing workflow, and low-stock alerts.

**Dependencies:** Phase 0, Phase 1, Phase 2.

**Estimated Complexity:** XL

**Focus Role:** fullstack

#### Tasks

1. Build product catalog page (`frontend/src/features/pos/PharmacyProducts.jsx` — extend existing) with: medicine name (brand + generic), SKU, category, price, cost price, pack size, expiry date, min stock level, active status
2. Add product CRUD endpoints with validation (unique SKU per hospital, expiry date required for medicines)
3. Build inventory management page: stock in (from purchase orders), stock out (to dispensing), stock adjustments, stock transfer between locations
4. Implement `InventoryLocation` tracking: per-warehouse quantity, low-stock threshold alerts
5. Build Pharmacy POS page (`frontend/src/features/pos/PharmacyPOS.jsx` — extend existing) with: patient search, product search (by name/SKU/barcode), cart with quantity adjustment, discount, total calculation, payment method selection (cash/card/insurance)
6. Implement dispensing workflow: after payment, create `Referral` with type `PHARMACY_DISPATCH`, update inventory quantities, mark items as dispensed
7. Add expiry tracking: flag items expiring within 30/60/90 days, generate expiry report, block dispensing of expired items
8. Build low stock alerts: notification when `quantity <= minStock`, dashboard widget showing critical items
9. Integrate with purchase orders: received PO items auto-increment inventory
10. Add pharmacy dashboard: daily sales, top selling items, stock value, expiring items count

#### Acceptance Criteria

- [ ] Product catalog supports full CRUD with hospital-scoped SKUs
- [ ] Inventory tracks quantity per location with transaction history
- [ ] POS flow: search product → add to cart → select patient → choose payment → complete sale → inventory decremented
- [ ] Dispensing creates a referral record linked to the patient and consultation
- [ ] Expired items are blocked from dispensing and flagged in reports
- [ ] Low stock alerts fire when quantity drops below minStock
- [ ] Pharmacy dashboard shows daily metrics
- [ ] All data is hospital-scoped

---

### Phase 6: Laboratory Module ✅ Complete

**Goal:** Build a complete lab workflow from order placement through sample tracking to results entry with abnormal value flagging.

**Dependencies:** Phase 0, Phase 1, Phase 2, Phase 4 (consultation orders).

**Estimated Complexity:** L

**Focus Role:** fullstack

#### Tasks

1. Build lab dashboard (`frontend/src/features/lab/LabDashboard.jsx` — extend existing) with: orders by status (SUBMITTED, IN_PROGRESS, COMPLETED), pending count, today's stats
2. Build lab test catalog management: add/edit/delete tests (`DiagnosticTest`) with reference ranges, units, categories, specimen type
3. Build lab panel management: create/edit panels (`DiagnosticPanel`) that group tests together
4. Implement sample tracking: when order is submitted, create sample record with barcode-style ID, track status (collected → in-progress → completed)
5. Build results entry page: lab technician selects order, enters values for each test in the order; auto-populate reference ranges from test definition
6. Implement abnormal value flagging: compare entered value against `refRangeLow`/`refRangeHigh`/`lowCritical`/`highCritical`; set `flag` field (NORMAL, HIGH, LOW, CRITICAL_HIGH, CRITICAL_LOW, ABNORMAL) and `isAbnormal` boolean
7. Build results review page for doctors: view results with color-coded flags, compare with previous results
8. Implement result PDF generation: formatted lab report with hospital header, patient info, test results, reference ranges, flag indicators
9. Add lab statistics endpoint: tests per day, turnaround time, abnormal rate by test type
10. Integrate lab orders with billing: auto-create `Transaction` when order is marked as paid

#### Acceptance Criteria

- [ ] Lab dashboard shows orders grouped by status with counts
- [ ] Test catalog supports CRUD with reference ranges and units
- [ ] Sample tracking follows the order through collection → processing → completion
- [ ] Results entry auto-fills reference ranges and flags abnormal values
- [ ] Doctor consultation page shows lab results with color-coded flags
- [ ] Lab report PDF can be generated and downloaded
- [ ] Lab statistics are available via API
- [ ] All lab data is hospital-scoped

---

### Phase 7: Imaging/Radiology ✅ Complete

**Goal:** Build imaging order management with image upload, DICOM-style viewer, and structured report entry.

**Dependencies:** Phase 0, Phase 1, Phase 2, Phase 4.

**Estimated Complexity:** L

**Focus Role:** fullstack

#### Tasks

1. Build imaging dashboard (`frontend/src/features/clinics/ImagingDashboard.jsx` — extend existing) with orders by status
2. Build imaging procedure type catalog: manage `ImagingProcedureType` with name, scan type, price
3. Implement image upload for imaging orders: accept DICOM, JPEG, PNG files; store via Supabase; link to `ImagingFile` records
4. Build image viewer component: basic zoom, pan, brightness/contrast controls for uploaded images (use a lightweight library like `cornerstone.js` or simple `<img>` with CSS transforms)
5. Build report entry page: radiologist enters findings (free text), impression (free text), marks completion
6. Implement report PDF generation: formatted report with images, findings, impression
7. Add imaging order status workflow: PENDING → IN_PROGRESS → COMPLETED → DISMISSED
8. Integrate imaging orders with billing: auto-create transaction on payment
9. Add modality integration hooks (placeholder for future DICOM worklist integration)

#### Acceptance Criteria

- [ ] Imaging dashboard shows orders by status
- [ ] Image upload supports DICOM and standard image formats
- [ ] Image viewer allows basic manipulation (zoom, pan, contrast)
- [ ] Radiologist can enter structured findings and impression
- [ ] Report PDF can be generated with embedded images
- [ ] Order status follows the defined workflow
- [ ] All imaging data is hospital-scoped

---

### Phase 8: Inpatient Management ✅ Complete

**Goal:** Build ward and bed management with visual bed maps, admission/discharge workflows, nursing documentation, and ward rounds.

**Dependencies:** Phase 0, Phase 1, Phase 2, Phase 3.

**Estimated Complexity:** L

**Focus Role:** fullstack

#### Tasks

1. Build ward management page (`frontend/src/features/wards/WardsPage.jsx` — extend existing): list wards with capacity, occupancy count, daily rate
2. Build visual bed map: grid of beds per ward, color-coded by status (VACANT=green, OCCUPIED=red, RESERVED=yellow, MAINTENANCE=gray); click bed to see patient info or admit
3. Implement admission workflow: select patient → select ward → select bed → set admission date → create bed assignment record
4. Implement discharge workflow: select occupied bed → enter discharge date → free bed → generate discharge summary if surgery-linked
5. Build inpatient page (`frontend/src/features/wards/InpatientPage.jsx` — extend existing) with: current inpatients list, bed occupancy stats, admissions today, discharges today
6. Implement daily nursing notes: nurse selects bed → enters note → stored as `NursingNote`
7. Implement inpatient vitals: nurse records vitals for a bed → stored as `InpatientVital` with timestamp
8. Build ward rounds page: doctor selects ward → sees list of patients → enters round notes and plan for each
9. Add bed occupancy tracking endpoint: occupancy rate by ward, by floor, hospital-wide; historical trends
10. Add admission/discharge transaction creation for billing integration

#### Acceptance Criteria

- [ ] Ward list shows capacity and current occupancy
- [ ] Visual bed map accurately reflects bed status with color coding
- [ ] Admission flow assigns a patient to a bed and updates status to OCCUPIED
- [ ] Discharge flow frees the bed and creates a discharge record
- [ ] Nursing notes and vitals can be recorded per bed
- [ ] Ward rounds page allows doctors to review all patients in a ward
- [ ] Bed occupancy statistics are available via API
- [ ] All ward data is hospital-scoped

---

### Phase 9: Surgery/OT ✅ Complete

**Goal:** Build comprehensive operating theater management with scheduling, pre-op checklists, intra-operative notes, and post-operative care tracking.

**Dependencies:** Phase 0, Phase 1, Phase 2, Phase 4, Phase 8 (inpatient).

**Estimated Complexity:** XL

**Focus Role:** fullstack

#### Tasks

1. Build surgery scheduling calendar (`frontend/src/features/surgery/SurgeryScheduler.jsx` — extend existing): Gantt chart or calendar view of OR rooms, time slots, surgeons
2. Implement surgery booking: select patient, operation type, department, OR room, date/time, anesthesia type, team members
3. Build pre-operative checklist workflow: confirmation steps (lab done, imaging done, consent signed, payment done, cleared); each step has status and who confirmed
4. Implement consent waiver recording: signer name, relationship, witness, signed date, optional document upload
5. Build intra-operative notes page: timeline of events during surgery (use `IntraoperativeEvent` model), event types, timestamps, descriptions
6. Implement team member assignment: assign doctors/nurses to surgery with roles (`SurgeryTeamMember` + `ORRole`)
7. Build post-operative care page: post-op notes (`PostoperativeNote`), follow-up scheduling (`PostOpFollowUp`), disposition decision (discharge home / admit to ward)
8. Implement discharge summary page (`frontend/src/features/surgery/DischargeSummary.jsx` — extend existing): discharge date, notes, medications, follow-up instructions
9. Build surgery dashboard (`frontend/src/features/surgery/SurgeryDashboard.jsx` — extend existing): today's surgeries, status distribution, OR utilization
10. Integrate surgery billing: auto-create transactions for surgery, anesthesia, and facility charges

#### Acceptance Criteria

- [ ] Surgery scheduler shows OR room availability on a calendar/Gantt
- [ ] Pre-operative checklist tracks all clearance steps with status
- [ ] Consent waivers are recorded with digital signatures
- [ ] Intra-operative events are logged as a timestamped timeline
- [ ] Post-operative notes and follow-up appointments are trackable
- [ ] Discharge summary captures all required fields
- [ ] Surgery dashboard shows today's schedule and utilization metrics
- [ ] All surgery data is hospital-scoped

---

### Phase 10: Billing & Accounting ✅ Complete

**Goal:** Build a comprehensive financial system with invoice generation from all service points, payment collection, expense tracking, and accounting reports.

**Dependencies:** Phase 0, Phase 1, Phase 2. (Integration with other modules happens incrementally as each module is built.)

**Estimated Complexity:** XL

**Focus Role:** fullstack

#### Tasks

1. Build service/item catalog: manage billable items with prices (consultations, surgeries, lab tests, imaging procedures, pharmacy items, ward charges)
2. Implement unified invoice generation: create invoice from any source (consultation, pharmacy sale, lab order, imaging order, surgery, admission) with line items
3. Build payment collection flow: select invoice → choose payment method (cash/card/insurance/bank_transfer) → record payment → generate receipt
4. Implement receipt generation: thermal printer format (80mm) and A4 format with hospital branding, line items, payment details, timestamp
5. Build shift management for cashiers: open shift with opening balance, close shift with actual total, denomination breakdown, cash movements (pickup/drop)
6. Implement expense tracking: create expenses by category (salary, supplies, utilities, rent, equipment, maintenance, marketing), link to department, attach receipts
7. Build accounting page (`frontend/src/features/accounting/AccountingPage.jsx` — extend existing) with: chart of accounts, journal entries, general ledger
8. Implement P&L statement generation: revenue by department, expenses by category, net profit
9. Build balance sheet: assets, liabilities, equity with depreciation calculations for fixed assets
10. Add accounts payable management: track creditors, due dates, payment status
11. Implement fixed asset register: acquisition cost, depreciation schedule, book value

#### Acceptance Criteria

- [ ] Service catalog contains all billable items with hospital-scoped pricing
- [ ] Invoices can be generated from any service point (consultation, pharmacy, lab, surgery, admission)
- [ ] Payment collection supports all payment methods with receipt generation
- [ ] Thermal and A4 receipts can be printed with hospital branding
- [ ] Shift management tracks opening/closing balances and cash movements
- [ ] Expenses are categorized and linked to departments
- [ ] P&L and balance sheet reports are generated accurately
- [ ] Fixed asset depreciation is calculated correctly
- [ ] All financial data is hospital-scoped

---

### Phase 11: Insurance & TPA ✅ Complete

**Goal:** Build insurance company management with pre-authorization workflows, claim submission, and TPA settlement tracking.

**Dependencies:** Phase 0, Phase 1, Phase 10 (billing).

**Estimated Complexity:** L

**Focus Role:** fullstack

#### Tasks

1. Add `InsuranceCompany` and `InsurancePolicy` models to schema: company name, policy number, patient link, coverage percentage, expiry, network status
2. Build insurance company management page: CRUD for insurance companies, network agreements, pricing rules
3. Implement patient insurance policy assignment: link insurance policy to patient during registration or separately
4. Build pre-authorization workflow: submit pre-auth request with diagnosis, planned procedures, estimated cost → insurance review → approve/reject
5. Implement claim generation: auto-populate from invoice, attach clinical records, generate claim document
6. Build claim tracking dashboard: claims by status (submitted, under review, approved, rejected, settled), aging report
7. Implement TPA settlement: record settlements, partial payments, rejection reasons
8. Add insurance pricing rules: override standard prices with insurance-agreed prices per item
9. Build insurance reports: claims by company, settlement rate, average processing time, revenue by insurance

#### Acceptance Criteria

- [ ] Insurance companies and patient policies can be managed
- [ ] Pre-authorization requests can be submitted and tracked
- [ ] Claims are auto-generated from invoices with clinical documentation
- [ ] Claim status is trackable through the full lifecycle
- [ ] TPA settlements are recorded with partial payment support
- [ ] Insurance-specific pricing overrides work correctly
- [ ] Insurance reports provide financial insights
- [ ] All insurance data is hospital-scoped

---

### Phase 12: HR & Staff ✅ Complete

**Goal:** Build human resources management with staff records, attendance tracking, shift scheduling, and payroll processing.

**Dependencies:** Phase 0, Phase 1.

**Estimated Complexity:** L

**Focus Role:** fullstack

#### Tasks

1. Build staff management page (`frontend/src/features/hr/HRPage.jsx` — extend existing): employee list with search, filter by department/status, add/edit employee profiles
2. Implement employee profile: personal info, position, department, hire date, salary, emergency contact, documents
3. Build attendance tracking: check-in/check-out with timestamp, daily attendance report, attendance calendar view
4. Implement shift scheduling: create shift templates, assign employees to shifts, visual weekly/monthly roster
5. Build leave management: submit leave request, approve/reject workflow, leave balance tracking, calendar view
6. Implement payroll processing: generate payroll for period, calculate gross/deductions/net, mark as paid, generate payslip
7. Build HR dashboard: headcount, attendance rate, leave pending, upcoming birthdays
8. Add employee self-service: view own attendance, submit leave, view payslips

#### Acceptance Criteria

- [ ] Employee list supports CRUD with department and status filtering
- [ ] Attendance tracking records check-in/out with daily summaries
- [ ] Shift roster is visual and supports drag-and-drop assignment
- [ ] Leave requests follow approval workflow
- [ ] Payroll can be generated per period with accurate calculations
- [ ] HR dashboard shows key workforce metrics
- [ ] All HR data is hospital-scoped

---

### Phase 13: Reports & Analytics ✅ Complete

**Goal:** Build a reporting engine with pre-built reports, role-based dashboard widgets, and export capabilities.

**Dependencies:** Phase 0, Phase 1, and ideally all feature phases (reports pull from all modules).

**Estimated Complexity:** L

**Focus Role:** fullstack

#### Tasks

1. Build reports page (`frontend/src/features/reports/ReportsPage.jsx` — extend existing) with categorized report list
2. Implement pre-built reports:
   - **Revenue:** daily/weekly/monthly revenue by department, payment method breakdown
   - **Patient:** patient volume by day/clinic, new vs returning, demographics
   - **Bed Occupancy:** occupancy rate by ward, average length of stay
   - **Pharmacy:** top selling items, stock value, expiry summary
   - **Lab:** tests per day, turnaround time, abnormal rate
   - **Surgery:** surgeries per day, OR utilization, cancellation rate
   - **HR:** attendance summary, leave usage, headcount by department
3. Build dashboard widgets per role: each role gets relevant KPI cards on `/dashboard` (receptionist sees today's appointments, doctor sees pending consultations, pharmacist sees low stock)
4. Implement PDF export for all reports: hospital-branded header, date range, data tables, charts
5. Implement Excel export for all reports: formatted .xlsx with headers and data
6. Build date range picker component shared across all reports
7. Add report scheduling (future placeholder): cron-based report generation and email delivery
8. Implement custom report builder (future placeholder): drag-and-drop field selection, filter builder, chart type selection

#### Acceptance Criteria

- [ ] At least 6 pre-built reports are available with accurate data
- [ ] Dashboard shows role-appropriate widgets with real-time KPIs
- [ ] Reports can be exported as PDF and Excel
- [ ] Date range picker works across all reports
- [ ] Report data is hospital-scoped
- [ ] Custom report builder placeholder exists for future development

---

### Phase 14: Patient Portal ✅ Complete

**Goal:** Build a patient-facing web portal for self-service appointment booking, medical record access, and online payment.

**Dependencies:** Phase 0, Phase 2, Phase 3, Phase 10.

**Estimated Complexity:** XL

**Focus Role:** fullstack

#### Tasks

1. Add `PatientUser` model: link to `Patient`, email, password hash, phone verification, active status
2. Build patient authentication: registration (by MRN + phone verification), login, password reset
3. Implement patient portal layout: separate from admin layout, patient-branded with hospital logo
4. Build self-service appointment booking: select clinic → select doctor → pick available slot → confirm booking → notification sent
5. Implement appointment management: view upcoming/past appointments, cancel, reschedule
6. Build medical records view: consultations timeline, lab results, prescriptions, imaging reports (read-only)
7. Implement online payment: pay outstanding invoices via card (integrate payment gateway stub)
8. Build messaging system (future placeholder): patient can send message to clinic, receive replies
9. Add notification preferences: email/SMS for appointment reminders, lab results ready
10. Build patient portal admin: manage portal settings, view portal usage stats

#### Acceptance Criteria

- [ ] Patients can register and authenticate to the portal
- [ ] Self-service booking shows available slots and creates appointments
- [ ] Patients can view their medical history, lab results, and prescriptions
- [ ] Online payment can settle outstanding invoices
- [ ] Portal is branded per hospital
- [ ] All patient portal data is hospital-scoped

---

### Phase 15: Emergency & Triage

**Goal:** Build emergency department workflow with rapid patient registration, triage assessment, and integration with admission and consultation flows.

**Dependencies:** Phase 0, Phase 2, Phase 3, Phase 4, Phase 8.

**Estimated Complexity:** L

**Focus Role:** fullstack

#### Tasks

1. Add triage assessment model: `TriageAssessment` with acuity score (1-5, ESI scale), chief complaint, vital signs snapshot, triage nurse, timestamp
2. Build emergency registration form: simplified rapid-entry version of patient registration, auto-create patient if new, link to existing if found
3. Implement triage assessment form: acuity level selection with color coding (1=resuscitation/red, 2=emergent/orange, 3=urgent/yellow, 4=less urgent/green, 5=non-urgent/blue)
4. Build emergency department dashboard: patients by acuity level, wait times, bed availability
5. Implement rapid admission workflow: triage → direct to bed (skip normal admission steps for critical patients)
6. Integrate with consultation queue: emergency patients appear in consultation queue with priority
7. Add emergency statistics: patient volume by acuity, average wait time, admission rate, discharge rate
8. Build triage nurse workspace: list of patients awaiting triage, active triage, completed triage

#### Acceptance Criteria

- [ ] Emergency registration is faster than standard registration (< 30 seconds)
- [ ] Triage assessment captures acuity level with visual color coding
- [ ] Emergency dashboard shows real-time patient status by acuity
- [ ] Critical patients can bypass normal queue to bed admission
- [ ] Emergency patients appear in consultation queue with priority
- [ ] Emergency statistics are available via API
- [ ] All emergency data is hospital-scoped

---

### Phase 16: Multi-Language & Polish

**Goal:** Complete Arabic translations, implement full RTL layout support, add accessibility features, onboarding tours, keyboard shortcuts, and performance optimization.

**Dependencies:** All previous phases (this is the polish phase).

**Estimated Complexity:** L

**Focus Role:** frontend

#### Tasks

1. Complete Arabic translation for all UI strings: extract all hardcoded strings from components, create translation files (`frontend/src/i18n/ar.json`, `en.json`), implement i18n library (react-i18next or similar)
2. Implement RTL layout support: test all pages in RTL mode, fix layout breaks, ensure sidebar mirrors correctly, icons flip where appropriate
3. Build onboarding tours per role: using Shepherd.js (already integrated), create tour sequences for Receptionist, Doctor, Nurse, Pharmacist, Lab Technician, Accountant
4. Implement keyboard shortcuts: global shortcuts (Ctrl+K for search, Ctrl+N for new patient, Escape to close modals), module-specific shortcuts
5. Conduct accessibility audit: ARIA labels on all interactive elements, keyboard navigation, color contrast compliance (WCAG 2.1 AA), screen reader testing
6. Performance optimization: implement virtual scrolling for large lists, optimize bundle splitting, add service worker for offline support (PWA), lazy-load heavy components
7. Add loading skeletons for all data-fetching pages
8. Implement error states: empty states, network error states, 404 page, permission denied page
9. Add print styles: ensure all printable pages (receipts, reports, prescriptions) have clean print layouts
10. Conduct cross-browser testing: Chrome, Firefox, Safari, Edge; document and fix any rendering issues

#### Acceptance Criteria

- [ ] All UI strings are translatable (English and Arabic)
- [ ] RTL layout works correctly on all pages
- [ ] Onboarding tours exist for at least 4 roles
- [ ] Keyboard shortcuts work for common actions
- [ ] WCAG 2.1 AA compliance is met
- [ ] Lighthouse performance score is > 85
- [ ] All pages have proper loading, empty, and error states
- [ ] Print layouts are clean for receipts, reports, and prescriptions
- [ ] No rendering issues on major browsers

---

## 4. Phase Dependency Graph

```
Phase 0 (Multi-Tenant)
├── Phase 1 (Core UI)
│   ├── Phase 2 (Patients)
│   │   ├── Phase 3 (Appointments)
│   │   │   ├── Phase 4 (Clinical)
│   │   │   │   ├── Phase 6 (Laboratory)
│   │   │   │   ├── Phase 7 (Imaging)
│   │   │   │   └── Phase 9 (Surgery)
│   │   │   └── Phase 8 (Inpatient)
│   │   └── Phase 5 (Pharmacy)
│   └── Phase 12 (HR & Staff)
├── Phase 10 (Billing) ──→ Phase 11 (Insurance)
├── Phase 13 (Reports) ← [all feature phases]
├── Phase 14 (Patient Portal) ← Phases 2, 3, 10
├── Phase 15 (Emergency) ← Phases 2, 3, 4, 8
└── Phase 16 (Polish) ← [all phases]
```

## 5. Complexity Summary

| Phase | Name | Complexity | Estimated Effort |
|-------|------|-----------|-----------------|
| 0 | Multi-Tenant Foundation | XL | 5-7 days |
| 1 | Core UI & Navigation | L | 3-4 days |
| 2 | Patient Management | L | 3-4 days |
| 3 | Appointments & Reception | XL | 5-7 days |
| 4 | Clinical Module | XL | 5-7 days |
| 5 | Pharmacy Module | XL | 5-7 days |
| 6 | Laboratory Module | L | 3-4 days |
| 7 | Imaging/Radiology | L | 3-4 days |
| 8 | Inpatient Management | L | 3-4 days |
| 9 | Surgery/OT | XL | 5-7 days |
| 10 | Billing & Accounting | XL | 5-7 days |
| 11 | Insurance & TPA | L | 3-4 days |
| 12 | HR & Staff | L | 3-4 days |
| 13 | Reports & Analytics | L | 3-4 days |
| 14 | Patient Portal | XL | 5-7 days |
| 15 | Emergency & Triage | L | 3-4 days |
| 16 | Multi-Language & Polish | L | 3-4 days |

**Total estimated effort:** 65-89 days

## 6. Maker Subagent Focus Roles

| Phase | Primary Focus | Secondary Focus |
|-------|--------------|-----------------|
| 0 | Backend | — |
| 1 | Frontend | — |
| 2 | Fullstack | — |
| 3 | Fullstack | Frontend |
| 4 | Fullstack | Backend |
| 5 | Fullstack | Backend |
| 6 | Fullstack | Backend |
| 7 | Fullstack | Backend |
| 8 | Fullstack | Backend |
| 9 | Fullstack | Backend |
| 10 | Fullstack | Backend |
| 11 | Fullstack | Backend |
| 12 | Fullstack | Backend |
| 13 | Fullstack | Frontend |
| 14 | Fullstack | Frontend |
| 15 | Fullstack | Backend |
| 16 | Frontend | — |

## 7. Execution Rules

1. **No phase starts without its dependencies being checker-approved.**
2. **Maker reads spec docs before coding.** Each task entry in the spec doc links to the relevant section.
3. **Checker validates against acceptance criteria, not just "it works."** Every checkbox in the acceptance criteria must be explicitly verified.
4. **Database migrations are reviewed by the checker for correctness, performance, and rollback safety.**
5. **All new endpoints must include:** input validation (Zod schemas), permission checks (`requirePermission`), error handling (`asyncHandler`), and audit logging.
6. **All new frontend pages must include:** loading states, empty states, error states, responsive layout, and RTL support.
7. **No `JSON.stringify` in the codebase.** Use `safeStringify` from `@voltagent/internal`.
8. **Commit messages follow conventional format:** `feat(module): description` or `fix(module): description`.
9. **Each phase must include integration tests covering the acceptance criteria.** Minimum: 1 test per acceptance criterion. Tests must verify both happy path and error states (unauthorized access, validation failure, not-found).
