# HMS — Hospital Management System

## Team Structure

| Role | Agent Type | Responsibility |
|------|-----------|---------------|
| Product Manager | task subagent | Define tasks + acceptance criteria per phase |
| Tech Lead | task subagent | Design approach, split work, write tech spec |
| Senior Developer | task subagent | Implement complex tasks (DB, auth, core logic) |
| Junior Developer | task subagent | Implement simpler tasks (UI, forms, CRUD) |
| QA / Scrum Master | task subagent | Verify, write tests, check acceptance criteria |
| DevOps | task subagent | Migrations, Docker, CI/CD, env setup |
| Checker (opencode) | Me | Final gate: lint, build, test, pattern review |

## Loop Engineering Flow

```
PM → Tech Lead → [Sr Dev || Jr Dev] → QA → DevOps → Checker (me)
```

See `docs/loops/prompts/` for role-specific prompt templates.

Phase artifacts go in `docs/loops/phase-{N}-*`.

## Gotchas

### Code Rules
- NEVER use `JSON.stringify` — import `safeStringify` from `@voltagent/internal`
- No code comments unless the WHY is non-obvious
- Follow existing code patterns exactly — read 2-3 neighboring files first
- TypeScript-first for backend (`.ts`), JSX for frontend (`.jsx`)
- Check `backend/.env.example` for new env vars

### File Write Reliability
- `general` task subagents may NOT persist file writes reliably. **Always READ files back after writing** to confirm they were created with correct content.
- If using general agent for file writing, include explicit "read the file back" instructions in the prompt.

### Import Path Rules (COMMON ERROR)
Frontend features in `frontend/src/features/X/` must use `../../components/ui/` NOT `../ui/`:
- `features/clinics/TemplateLoader.jsx` → `import { Button } from '../../components/ui/Button'`
- `features/pos/PharmacyPOS.jsx` → `import { Card } from '../../components/ui/Card'`

The `../ui/` path resolves to `features/ui/` which doesn't exist.

### JSX Structural Rules (COMMON ERROR)
1. Every ternary expression must have matching branches. If a branch has multiple elements, wrap BOTH in `<>...</>`:
   ```jsx
   // RIGHT:
   condition ? ( <Single /> ) : ( <><A /><B /></> )
   ```
2. Every `<>` MUST have a matching `</>`. Count them.
3. Don't nest IIFEs inside JSX without proper fragment closure.

### Dev Must Run `tsc --noEmit`
Every developer MUST run `tsc --noEmit` on their target directory (backend or frontend) after completing their changes and fix ALL errors before reporting done.

## Process Improvements (v2 — Applied from Phase 6)

| Improvement | Why | Where Applied |
|-------------|-----|---------------|
| Read-back verification after file write | Phase 1 Sr Dev files silently not persisted | Prompt templates section "File Writing" |
| Explicit import path rules in prompts | Phase 4: 3 files used wrong `../ui/` paths | Prompt templates section "Import Paths" |
| JSX structural checklist | Phase 4: OptometryDashboard broken JSX nesting | Prompt templates section "JSX Structural Rules" |
| Dev must run `tsc --noEmit` before reporting done | Multiple phases: Checker caught errors devs missed | Prompt templates section "After Implementation" |
| PM must audit actual codebase before writing brief | Phase 5: 70% of work already existed | PM prompt template step "Audit Before Planning" |
| Components must have Loading/Empty/Error states | Phase 2-3: some components missing states | Jr Dev prompt template section "Component Requirements" |
| QA checks import paths and JSX structure | Prior QA didn't catch common errors | QA prompt template "Code Quality Review" |

## Key Decisions (Phase 0 - Multi-Tenant Foundation)

- `hospitalId` is `String?` (optional) in Prisma schema — the `createTenantPrisma` extension auto-injects it at runtime.
- All `findUnique({ where: { singleField } })` changed to `findFirst({ where: { singleField } })` because composite uniques (`@@unique([hospitalId, email])` etc.) prevent single-field unique lookups.
- Express type augmentation lives in `src/types.d.ts` and `src/types/express.d.ts` — both must include `hospitalId?: string`.
- Zod v4: use `z.record(z.string(), z.unknown())` (2 args) instead of `z.record(z.unknown())`.

## Phase Memory

| Phase | Status | Key Decisions |
|-------|--------|---------------|
| 0 — Multi-Tenant & Auth | ✅ Complete | hospitalId String? in schema (extension injects at runtime). findUnique → findFirst for composite unique lookups. Two Express type files merged with hospitalId. |
| 1 — Core UI & Navigation | ✅ Complete | Navigation config in `frontend/src/config/navigation.tsx` (11 groups, 28 items, lucide-react icons). Persistent collapsible sidebar (w-72/w-16, mobile overlay). SidebarGroup collapsible accordion. RoleGuard permission check. Settings password wired + notification prefs. StaggeredMenu/TabletNav deleted. |
| 2 — Patient Management | ✅ Complete | Hospital scoping fix (all patient queries filter by `hospitalId`). Duplicate detection endpoint (`POST /patients/check-duplicates`). Patient merge with 9-table atomic transaction. Audit logging (CREATE/UPDATE/MERGE). Registration form with duplicate warnings. List page with gender/date filters. Detail page with Referrals/Preoperative tabs, expandable clinical records, file upload UI. Quick-search component. New schemas + query hooks. |
| 3 — Appointments & Reception | ✅ Complete | Calendar endpoint (`GET /appointments/calendar`). Appointment creation modal with quick-search, clinic/doctor selection, walk-in/reservation flows. Queue board with 4-column Kanban (WAITING/CALLED/IN_PROGRESS/COMPLETED) with status transitions. Token auto-assignment per clinic/day. Waiting room TV with current/pending display. Appointment stats endpoint + reminder service (30min interval). Hospital scoping on all endpoints. `calledAt`/`completedAt`/`remindedAt` fields on Appointment model. |
| 4 — Clinical Module | ✅ Complete | Consultation page with vital signs (abnormal flagging), symptom tracker, ICD-10 search, prescription writer (frequency/route/duration). Lab/imaging order modals from consultation. Clinical note templates (save/load per clinic type). Cross-referral modal. Encounter summary print layout. Hospital scoping audit on 13 clinic endpoints. `ClinicalTemplate` Prisma model. All 9 clinic dashboards integrated. |
| 5 — Pharmacy Module | ✅ Complete | Hospital scoping audit on all POS/inventory routes. Expiry tracking with 30/60/90 day buckets + expired-item block in `POST /transact`. `POST /pos/validate-items` endpoint. Barcode field on `InventoryItem` + search. Pharmacy dashboard endpoint (`GET /pharmacy/dashboard`) with todaySales, topSelling, stockValue, expiringCounts, lowStockCount, recentSales. Sales report endpoint with daily/weekly/monthly date-trunc aggregation. PO receipt audit trail (InventoryTransaction on receive). `PharmacyDashboard.jsx`, `LowStockWidget.jsx`, `PharmacySalesReport.jsx`. AlertPanel updated with 30/60/90 day categories. Barcode in product form and POS search. Dispensing from referral pre-fills cart from referral medications. |
| 6 — Laboratory Module | ✅ Complete | LabSample model + LabSampleStatus enum in Prisma. 5 sample CRUD endpoints + label generator. Result flag auto-calculation (H/L/N). PDF report (HTML+print). Hospital scoping audit on all lab endpoints. Monolithic 624-line LabDashboard.jsx decomposed into 8 components (LabDashboardShell, LabQueueTab, LabResultEntryModal, LabCatalogTab, LabPanelsTab, LabReportsTab, LabSampleTracker, NewRequestModal). 3 critical runtime bugs fixed (missing import, wrong field name, wrong status filter). All components with loading/empty/error states. |
| 7 — Imaging/Radiology | ✅ Complete | PM audit revealed ~80% already existed. Added: ImageViewer component (zoom/pan/contrast via CSS transforms + filters, no external libs). DICOM upload filter in multer (allow `application/dicom` + `.dcm`). Modality stub module (3 endpoints returning 501 for future DICOM worklist). `ImagingProcedureTypesPage.jsx` admin UI with inline price editing, toggle active/inactive, seed defaults. ImagingDashboard enhanced with ImageViewer modal + multi-image switching. Browser accept attr updated for `.dcm`. Route + nav item for procedure types admin. Zero new deps, zero schema changes. |
| 8 — Inpatient Management | ✅ Complete | PM audit revealed ~80% already existed. Added: `GET /wards/dashboard` occupancy stats endpoint (totalBeds, occupiedBeds, occupancyRate, byWard breakdown, admissionsToday, dischargesToday). `GET /wards/dashboard/trends` historical occupancy endpoint (daily admissions/discharges/occupiedCount). Enhanced `POST /beds/:id/assign` with optional `admissionDate`. Enhanced `PATCH /beds/:id/discharge` with optional `dischargeDate` + `dischargeNotes`. `GET /wards/:wardId/patients` endpoint (occupied beds with patient info + vitals). Visual bed map on WardsPage (color-coded grid per ward, green/red/yellow/gray tiles). InpatientPage summary stat cards (4-card grid). Discharge modal with date picker + notes (replaced `confirm()`). Optional admission date input in assign flow. Ward rounds patient list in InpatientPage. 40 i18n keys (en + ar). 471-line routes file. |
| 9 — Surgery/OT | ✅ Complete | PM audit revealed backend ~90%, frontend ~75% complete. Tech Lead identified #1 bug: SurgeryScheduler missing `departmentId`. Added: `GET /surgeries/or-roles` and `GET /surgeries/event-types` endpoints. Made `departmentId` optional in POST /surgeries (auto-defaults to surgery-dept). Seeded 8 operation types with Ar prices. 3 new preop modals (PreopRequestForm, ConsentWaiverModal, ScheduleSurgeryModal). 17 new React Query hooks across useSurgery.js (7) and usePreoperative.js (10). SurgeryScheduler fixed with department/operation type dropdowns + anesthesia type + debounced patient search. SurgeryGantt enhanced with Team/Events/Follow-ups tabs + loading/empty/error states. SurgeryDashboard loading states + error handling. PreoperativePage completed with full workflow (REQUESTED → CONFIRMED → PAYMENT_DONE → INVESTIGATIONS_DONE → SCHEDULED). 2063 modules, 7.92s build. |
| 10 — Billing & Accounting | ✅ Complete | XL phase — 16 tasks (8 backend + 8 frontend). 6 new Prisma models (ServiceItem, Invoice, InvoiceItem, Account, JournalEntry, JournalEntryLine). 3 new enums (ServiceItemCategory, SourceType, AccountType). 18 new API endpoints across 6 new route modules (serviceCatalog, invoices, journal, fixedAssets, costCenters, accounting summary). Auto journal entry generation from Transactions and Expenses via journalHelper.ts. Chart of accounts seeded (~28 accounts, 1xxx-5xxx). Balance sheet computed from journal lines. Fixed asset depreciation runner. Cost center CRUD + report. 6 new frontend pages (ServiceItemCatalog, InvoicePage, ChartOfAccounts, JournalEntryList, BalanceSheet, FixedAssetRegister). 5 new hook files (useServiceCatalog, useAccountingInvoices, useJournal, useBalanceSheet, useFixedAssets). Dual-format receipt (thermal + A4) in printReceipt.js. 2074 modules, 7.64s build. |
| 11 — Insurance & TPA | ✅ Complete | 14 tasks (9 backend + 5 frontend). 6 new Prisma models (InsuranceCompany, InsurancePolicy, InsurancePricingRule, PreAuthorization, InsuranceClaim, InsuranceSettlement) + 3 new enums (PreAuthorizationStatus, ClaimStatus, SettlementStatus). 8 new backend route files across insurance module with full CRUD, status workflow state machine, auto claim generation from invoices with clinical records, atomic settlement recording, insurance pricing integration in POS checkout. 11 new frontend files: useInsurance.js (31 React Query hooks), InsurancePage (tabbed companies/policies), PreAuthorizationPage (status workflow + detail with approve/reject), ClaimTrackingPage (dashboard + settlement recording), InsuranceReportsPage (4 report tabs). Permissions `insurance:read`/`insurance:write` added to RBAC. 2085 modules, 7.53s build. |
| 12 — HR & Staff | ✅ Complete | 15 tasks (7 backend + 8 frontend). Critical multi-tenancy fix: added `hospitalId` to all existing HR models (Employee, PayrollRecord, Attendance, Leave, EmployeeDocument) that were previously unscoped. 3 new Prisma models (ShiftTemplate, EmployeeShift, LeaveBalance). 20 new backend endpoints: shift scheduling (templates + roster + bulk assign), leave balance tracking (init + adjust + auto-integration with leave approval), payroll bulk generation + HTML payslip, HR dashboard stats (headcount, attendance rate, dept breakdown, birthdays), employee self-service (profile, attendance, leaves, payslips). Frontend: HRPage enhanced with 4 new tabs (Dashboard, Shifts, Leave Balances, enhanced Payroll). 2 new pages (EmployeeDetail.jsx at /hr/employees/:id with 5 tabs, MyHRPage.jsx at /hr/my with self-service). 16 new React Query hooks. 2087 modules, 7.88s build. |
| 13 — Reports & Analytics | ✅ Complete | 20+ tasks (10 backend + 10 frontend). New centralized reports module with 10 route files: revenue, patient volume/demographics, bed occupancy, pharmacy, lab, surgery, HR, role-based dashboard. PDF export (browser print HTML template), CSV export (dynamic DOM table extraction). 12 new frontend files: DateRangePicker (7 presets), useReports.js (10 hooks), 7 report components (RevenueReport, PatientReport, OccupancyReport, PharmacyReport, LabReport, SurgeryReport, HRReport, InsuranceReport), RoleWidgets (6 role-specific KPI groups). ReportsPage refactored from hardcoded financial page to 8-tab categorized layout. Shared DateRangePicker with per-tab parameterized queries. 2098 modules, 7.72s build. |
| 14 — Patient Portal | ✅ Complete | XL greenfield phase — 25 tasks (13 backend + 12 frontend). New `PatientUser` + `NotificationPreference` models. Separate patient auth system: `PATIENT_JWT_SECRET`, `authenticatePatient` middleware (no RBAC, just patientId verification). New `patient-portal` module with 7 route files: auth (register/login/password-reset), appointments (clinic list, doctor list, available slots, book/cancel), medical records (timeline, consultations, lab, prescriptions, imaging), billing (invoices, payment stub with 90% success rate), profile (edit, change password, notification preferences), admin (settings, stats). 15 new frontend components: PortalLayout (no sidebar), PortalLogin, PortalRegister (2-step MRN+phone→email+pass), PortalResetPassword, PortalDashboard, BookAppointment (4-step wizard), AppointmentsPage, MedicalRecordsPage, LabResultsPage, PrescriptionsPage, BillingPage (with pay modal), ProfilePage, PortalAdminPage, usePortalAuth context, usePortalApi. All routes under `/portal/` prefix. 2113 modules, 7.57s build. |
| 15 — Emergency & Triage | ✅ Complete | L phase — 16 tasks (9 backend + 7 frontend). New `AcuityLevel` enum (RESUSCITATION/EMERGENT/URGENT/LESS_URGENT/NON_URGENT) + `TriageAssessment` model with vitals JSON, disposition, relations to Patient/User. 7 backend route files under `/api/emergency/*`: register (rapid + check duplicate), triage (CRUD + active/history), dashboard (acuity summary, waiting patients, bed availability), admit (emergency → bed, auto-assign ICU for ESI 1-2), refer (→ consultation queue with priority derived from acuity), stats (overview + daily trend). ESI color mapping: 1=Red, 2=Orange, 3=Yellow, 4=Green, 5=Blue. 6 frontend components: EmergencyDashboard (acuity cards + waiting list + bed availability), TriageForm (5-level ESI selector + vitals), TriageWorkspace (3-column awaiting/active/completed), RapidRegistration (check existing + minimal form), EmergencyStats (daily trend table + acuity/disposition breakdown). 12 React Query hooks. `emergency:read`/`emergency:write` permissions. |
| 16 — Multi-Language & Polish | ✅ Complete | XL phase — 18 tasks (6 Sr Dev infra + 11 Jr Dev i18n + 1 QA). Keyboard shortcuts hook + registry + help modal (`Ctrl+K`, `Ctrl+N`, `Escape`, `?`). Skeleton + EmptyState reusable components. 404 + PermissionDenied error pages. Print CSS (hides chrome, clean typography). PWA manifest + service worker registration. RTL CSS utilities (.rtl-flip, sidebar/table inversions). Tours updated for 5 new roles (Doctor, Nurse, Insurance, Emergency, Accountant). TourManager web gate removed. i18n: en.json 924 keys, ar.json 924 keys (perfect parity). useTranslation added to 20 structural components. ARIA labels on all modified components. Backend/frontend tsc both 0 errors. |
| 17 — Production-Ready Foundation | ✅ Complete | XL phase — 28 tasks across 6 workstreams. CI: GitHub Actions (`.github/workflows/ci.yml`) for lint+typecheck+test on backend+frontend. `.env.example` with 15+ vars. `backup-schedule.sh` cron wrapper. All 26 pages given loading/empty/error states. Print added to 7 components (ConsentWaiverModal, PreopRequestForm, ClaimDetail, TriageForm, InpatientPage, WardsPage, MyHRPage). 10 N+1 queries fixed. 29 new Prisma indexes (hospitalId composites + FK). 3 unbounded queries bounded. PgBouncer in docker-compose.yml (port 6432). 2126 modules, 12.46s build. |
| 18 — FHIR R4 Interoperability | ✅ Complete | XL phase — 22 tasks. New Prisma model: `FhirEndpoint` + `GenderType` enum + `Patient.structuredName`. 15 FHIR R4 resources exposed via `/api/fhir/R4/` (Patient, Encounter, Observation, Condition, MedicationRequest, ServiceRequest, DiagnosticReport, Appointment, Procedure, Coverage, Claim, Location, Practitioner, DocumentReference) + `$merge` inbound handler. CapabilityStatement at `/metadata`. Content negotiation (JSON + XML). FHIR auth middleware (SMART on FHIR / JWT). C-CDA XML generator (patient summary + discharge summary). Inbound FHIR handler (receives external Patient/ServiceRequest/Observation). Admin CRUD for FhirEndpoint + connection test. RBAC: `fhir:read`, `fhir:write`, `integration:manage`. Frontend: IntegrationPage (endpoint management), FhirExplorer (test queries, view raw responses). 2133 modules, 17.39s build. |
| 19 — Revenue Cycle Management | ✅ Complete | XL phase — 28 tasks (14 backend + 14 frontend). 7 new Prisma models (PaymentPlan, PaymentInstallment, CreditMemo, Refund, BadDebtWriteOff, DenialAppeal, DenialReason) + 7 new enums. 30+ new backend endpoints: payment plan CRUD + installment payment, AR aging reports + DSO, credit memos, refund processing, bad debt write-offs, denial appeals workflow, denial reason taxonomy (20 Middle East reasons seeded), COB adjudication engine + claim generation, Tap payment gateway (checkout sessions + idempotent webhooks), multi-currency support (SDG/SAR/AED/EGP/EGP/USD + conversion), patient statements. BullMQ/Redis: 3 background workers (payment plan drafts, statement generation, denial reminder escalation). Frontend: 8 new pages (PaymentPlanPage, ARAgingDashboard, DenialAppealPage, DenialTrends, COBPage, CurrencySelect + hooks), InvoicePage enhanced with void/credit memo, InsuranceReportsPage with denial trends tab. Portal billing integrated with real Tap gateway. 3 Arabic HTML templates (invoice, receipt, patient statement) + template engine. 2130 modules, 10.40s build. |
| 20 — Testing & QA | ✅ Complete | 18 tasks (6 infrastructure + 6 backend + 5 frontend + 3 E2E). Infrastructure: test:ci/test:coverage scripts in both package.json, vitest step added to CI pipeline, backend test helpers (getAuthToken, authHeader, makeId), frontend test-utils (renderWithProviders, createMockQueryClient). Backend tests: 6 test files (patients-integration, appointments-integration, billing-integration, fhir-integration, insurance-integration, auth-unit) — 75 tests total using real DB via supertest. Frontend tests: 5 component test files (PatientDetailPage, InvoicePage, PaymentPlanPage, DenialAppealPage, FhirExplorer) — 33 tests passing, using mocked hooks with QueryClientProvider. E2E smoke tests: 3 Playwright test files (clinical-flow, pharmacy-flow, portal-flow) — 9 scenarios. All 33 new frontend tests pass. 8 pre-existing test failures (reception, surgery-referral, hr-phase12) not from Phase 20. Key test patterns: components need QueryClientProvider wrapper, isError property in mock data, firstName/lastName split columns, useTranslation mock returns fallback. |

## Validating Changes

```bash
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm run test:all
```
