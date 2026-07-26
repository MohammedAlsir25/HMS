# Phase 13 — Reports & Analytics

## 1. Phase Goal

Build a centralized reporting engine with pre-built reports across all clinical, financial, and operational modules; role-based dashboard KPI widgets; PDF and Excel export; and a shared date range picker. This phase converts raw data scattered across modules into actionable analytics for hospital administrators, department heads, and clinical staff.

---

## 2. What Already Exists

### Backend — Existing Report Endpoints

| Endpoint | Module | What It Returns | Usable in Phase 13? |
|----------|--------|-----------------|---------------------|
| `GET /accounting/summary` | accounting | Today/week/month/all-time revenue totals, counts, by-method breakdown | ✅ Yes — financial reports |
| `GET /accounting/revenue-by-day` | accounting | Daily revenue for last N days | ✅ Yes — revenue trend chart |
| `GET /accounting/revenue-by-type` | accounting | Revenue grouped by transaction type (RECEPTION, PHARMACY, etc.) | ✅ Yes — revenue by source |
| `GET /accounting/revenue-by-department` | accounting | Revenue grouped by department with date range filter | ✅ Yes — department comparison |
| `GET /accounting/pnl` | accounting | P&L by department (revenue, COGS, expenses, gross profit, net) | ✅ Yes — P&L report |
| `GET /accounting/balance-sheet` | accounting | Balance sheet as-of date | ✅ Yes — financial statement |
| `GET /insurance/reports/claims-by-company` | insurance | Claims grouped by insurance company | ✅ Yes — insurance analytics |
| `GET /insurance/reports/settlement-rate` | insurance | Settlement rate, avg processing days, totals | ✅ Yes — insurance KPI |
| `GET /insurance/reports/denial-analysis` | insurance | Top rejection reasons, denial rate by company | ✅ Yes — denial report |
| `GET /insurance/reports/revenue-by-insurance` | insurance | Revenue by payment method, insurance settled total | ✅ Yes — payer mix |
| `GET /pharmacy/sales-report` | pharmacy | Daily/weekly/monthly pharmacy sales aggregation | ✅ Yes — pharmacy reports |
| `GET /lab/stats` | lab | Lab statistics (counts by status) | ✅ Yes — lab KPI widget |
| `GET /lab/orders/:id/report` | lab | Individual order report (HTML) | ⚠️ Per-order, not aggregate |
| `GET /surgery/stats` | surgery | Surgery statistics with date filter | ✅ Yes — surgery KPI widget |
| `GET /surgery/:id/report` | surgery | Individual surgery report | ⚠️ Per-surgery, not aggregate |
| `GET /wards/dashboard` | wards | Bed occupancy stats (total, occupied, by-ward breakdown) | ✅ Yes — occupancy report |
| `GET /wards/dashboard/trends` | wards | Historical occupancy (admissions, discharges, occupied per day) | ✅ Yes — occupancy trend |
| `GET /preoperative/stats` | preoperative | Pre-op counts by status | ✅ Yes — surgical pipeline |

### Backend — Gaps

| Missing Endpoint | Description | Priority |
|-----------------|-------------|----------|
| `GET /reports/patient-volume` | Patient volume by day/clinic, new vs returning, demographics | P0 |
| `GET /reports/lab-turnaround` | Lab TAT per test type, abnormal rate | P1 |
| `GET /reports/surgery-utilization` | OR utilization by room, cancellation rate, avg duration | P1 |
| `GET /reports/pharmacy-stock` | Top selling items, stock value, expiry summary (aggregated) | P1 |
| `GET /reports/hr-summary` | Attendance summary, leave usage, headcount by department | P1 |
| `GET /reports/kpis` | Role-specific KPI cards for dashboard widgets | P0 |

### Frontend — Existing Screens & Hooks

| File | What It Does | Status |
|------|-------------|--------|
| `frontend/src/features/reports/ReportsPage.jsx` | Financial reports page (revenue bars, P&L table, date range) | ✅ Exists — extend |
| `frontend/src/features/pharmacy/PharmacySalesReport.jsx` | Pharmacy sales with CSV export | ✅ Exists — integrate |
| `frontend/src/features/insurance/InsuranceReportsPage.jsx` | Insurance claims, settlement, denial reports | ✅ Exists — integrate |
| `frontend/src/hooks/queries/useAccounting.js` | React Query hooks for accounting endpoints | ✅ Exists — extend |
| `frontend/src/hooks/queries/useSurgery.js` | `useSurgeryStats()` hook exists | ✅ Exists |
| `frontend/src/hooks/queries/useLab.js` | `useLabStats` key exists | ✅ Exists |
| `frontend/src/lib/printReceipt.js` | A4 and thermal receipt HTML generator + `window.print()` | ✅ Exists — pattern for PDF |
| `frontend/src/config/navigation.tsx` | "Reports" nav item exists under Finance group | ✅ Exists |
| `frontend/src/app/App.jsx` | `/reports` route exists, lazy-loaded | ✅ Exists |

### Frontend — Gaps

| Missing Component | Description | Priority |
|-------------------|-------------|----------|
| `DateRangePicker.jsx` | Shared date range component (currently raw `<input type="date">`) | P0 |
| Patient volume report UI | New vs returning, by clinic/day | P0 |
| Bed occupancy report UI | Ward utilization with chart | P1 |
| Lab turnaround time UI | TAT metrics, abnormal rate | P1 |
| Surgery utilization UI | OR utilization, cancellation rate | P1 |
| Pharmacy stock summary UI | Top sellers, stock value, expiry | P1 |
| HR summary UI | Attendance, leave, headcount | P1 |
| PDF export utility | Hospital-branded header, date range, tables, charts → PDF | P0 |
| Excel export utility | Formatted `.xlsx` with headers and data | P0 |
| Role-based dashboard widgets | KPI cards on `/dashboard` per role | P0 |
| `useReports.js` hooks | React Query hooks for new report endpoints | P0 |

---

## 3. Tasks

### Task 1 — Shared DateRangePicker Component
**Files:** `frontend/src/components/shared/DateRangePicker.jsx`
**Complexity:** S | **Dependencies:** None

Create a reusable date range picker with presets (Today, This Week, This Month, Last 30 Days, This Year, Custom). Uses existing Input styling. Returns `{ startDate, endDate }`.

---

### Task 2 — Backend: Patient Volume Report Endpoint
**Files:** `backend/src/modules/reports/reports.routes.ts` (new)
**Complexity:** M | **Dependencies:** None

`GET /reports/patient-volume?startDate=&endDate=&clinicId=` — returns daily patient counts, new vs returning breakdown, and demographics (gender, age group). Query `Appointment` and `Patient` tables grouped by date, clinic, visit type.

---

### Task 3 — Backend: Pharmacy Stock Summary Endpoint
**Files:** `backend/src/modules/reports/reports.routes.ts`
**Complexity:** M | **Dependencies:** None

`GET /reports/pharmacy-stock` — returns top selling items (last 30 days from Transaction + InventoryItem), total stock value, items expiring in 30/60/90 days, low stock count. Query `InventoryItem` + `InventoryTransaction`.

---

### Task 4 — Backend: Lab Turnaround Time Endpoint
**Files:** `backend/src/modules/reports/reports.routes.ts`
**Complexity:** M | **Dependencies:** None

`GET /reports/lab-turnaround?startDate=&endDate=` — returns average TAT per test category (submit → complete timestamps), abnormal result rate, tests per day trend. Query `DiagnosticOrder` + `DiagnosticOrderTest`.

---

### Task 5 — Backend: Surgery Utilization Endpoint
**Files:** `backend/src/modules/reports/reports.routes.ts`
**Complexity:** M | **Dependencies:** None

`GET /reports/surgery-utilization?startDate=&endDate=` — returns OR utilization by room (scheduled hours / available hours), cancellation rate, average surgery duration, surgeries per day trend. Query `Surgery` model.

---

### Task 6 — Backend: HR Summary Endpoint
**Files:** `backend/src/modules/reports/reports.routes.ts`
**Complexity:** M | **Dependencies:** None

`GET /reports/hr-summary` — returns headcount by department, attendance rate (last 30 days), leave usage by type, active employees. Query `Employee` + `Attendance` + `LeaveRequest`.

---

### Task 7 — Backend: Centralized KPI Endpoint
**Files:** `backend/src/modules/reports/reports.routes.ts`
**Complexity:** M | **Dependencies:** Tasks 2–6

`GET /reports/kpis?role=` — returns role-specific KPI cards. Admin gets revenue + patient count + bed occupancy. Doctor gets today's appointments + pending consultations. Pharmacist gets low stock + today's sales. Accountant gets revenue + outstanding. Aggregates from existing module data.

---

### Task 8 — Backend: Register Reports Routes
**Files:** `backend/src/app.ts`, `backend/src/modules/reports/reports.routes.ts`
**Complexity:** S | **Dependencies:** Tasks 2–7

Mount `router.use('/reports', reportsRoutes)` in `app.ts`. All endpoints require `authenticate` + appropriate permission (`accounting:read` or `admin:users` for cross-module reports).

---

### Task 9 — Frontend: useReports.js Query Hooks
**Files:** `frontend/src/hooks/queries/useReports.js` (new)
**Complexity:** S | **Dependencies:** Task 8

React Query hooks: `usePatientVolume(params)`, `usePharmacyStock()`, `useLabTurnaround(params)`, `useSurgeryUtilization(params)`, `useHrSummary()`, `useKpis(role)`. Follow `useAccounting.js` pattern.

---

### Task 10 — Frontend: Redesign ReportsPage with Tabs
**Files:** `frontend/src/features/reports/ReportsPage.jsx`
**Complexity:** L | **Dependencies:** Tasks 1, 9

Refactor existing `ReportsPage.jsx` into tabbed layout: Financial (existing content), Patient, Pharmacy, Lab, Surgery, HR, Insurance. Each tab loads its respective report component. Add shared `DateRangePicker` at top. Tab bar follows existing pattern (`flex gap-2` with `bg-lilac-bloom/20` active).

---

### Task 11 — Frontend: Patient Volume Report Component
**Files:** `frontend/src/features/reports/PatientVolumeReport.jsx` (new)
**Complexity:** M | **Dependencies:** Tasks 1, 9

Patient volume report: daily bar chart, new vs returning stacked bars, demographics pie (gender), clinic breakdown table. Uses `Bar` component pattern from existing `ReportsPage.jsx`.

---

### Task 12 — Frontend: Pharmacy Stock Report Component
**Files:** `frontend/src/features/reports/PharmacyStockReport.jsx` (new)
**Complexity:** M | **Dependencies:** Tasks 1, 9

Top selling items table (name, qty sold, revenue), stock value card, expiry alert cards (30/60/90 day buckets), low stock list. Pattern: Card + Table + Badge.

---

### Task 13 — Frontend: Lab TAT Report Component
**Files:** `frontend/src/features/reports/LabTurnaroundReport.jsx` (new)
**Complexity:** M | **Dependencies:** Tasks 1, 9

Average TAT by category (bar chart), abnormal rate card, tests-per-day trend line. Pattern: Cards + Bar chart + Table.

---

### Task 14 — Frontend: Surgery Utilization Report Component
**Files:** `frontend/src/features/reports/SurgeryUtilizationReport.jsx` (new)
**Complexity:** M | **Dependencies:** Tasks 1, 9

OR utilization by room (bar chart), cancellation rate card, average duration card, surgeries-per-day trend. Pattern: Cards + Bar chart.

---

### Task 15 — Frontend: HR Summary Report Component
**Files:** `frontend/src/features/reports/HRSummaryReport.jsx` (new)
**Complexity:** M | **Dependencies:** Tasks 1, 9

Headcount by department table, attendance rate card, leave usage by type (bar chart). Pattern: Cards + Table + Bar chart.

---

### Task 16 — Frontend: PDF Export Utility
**Files:** `frontend/src/lib/exportPdf.js` (new)
**Complexity:** L | **Dependencies:** None

Hospital-branded PDF generation using `window.print()` with styled HTML (same pattern as `printReceipt.js`). Takes report title, date range, data tables, and optional chart HTML. Generates A4 HTML with Al Jawarih header, opens print dialog.

---

### Task 17 — Frontend: Excel Export Utility
**Files:** `frontend/src/lib/exportExcel.js` (new)
**Complexity:** M | **Dependencies:** None

Excel export using `SheetJS` (xlsx). Takes headers array + rows array, generates `.xlsx` with formatted headers (bold, colored background), auto-column-width, and downloads. Add `xlsx` to `frontend/package.json`.

---

### Task 18 — Frontend: Add Export Buttons to ReportsPage
**Files:** `frontend/src/features/reports/ReportsPage.jsx`
**Complexity:** S | **Dependencies:** Tasks 10, 16, 17

Add "Export PDF" and "Export Excel" buttons to each report tab. Buttons use existing `Button` component with `variant="ghost"` and `FileText` / `Download` icons.

---

### Task 19 — Frontend: Role-Based Dashboard KPI Widgets
**Files:** `frontend/src/features/dashboard/DashboardKPIWidgets.jsx` (new), `frontend/src/app/App.jsx`
**Complexity:** L | **Dependencies:** Task 7

Create `DashboardKPIWidgets` component that calls `useKpis(role)` and renders relevant cards per role. Add to `DashboardRedirect` or individual role dashboards. Role mapping:
- **Admin/CEO:** Revenue today/week/month, patient count, bed occupancy %
- **Doctor:** Today's consultations, pending follow-ups, surgeries today
- **Receptionist:** Today's appointments, queue length, no-show rate
- **Pharmacist:** Low stock items, today's sales, expiring items
- **Accountant:** Revenue trend, outstanding balance, expense total
- **Lab Tech:** Pending orders, completed today, avg TAT
- **HR Manager:** Headcount, attendance rate, pending leave requests

---

### Task 20 — Backend: Seed Default Report Permissions
**Files:** `backend/src/middleware/rbac.ts`
**Complexity:** S | **Dependencies:** Task 8

Add `reports:read` permission to RBAC. Map to roles: Admin (full), Accountant (full), Doctor (dept only), Nurse (dept only), etc. All report endpoints use `requirePermission('reports:read')`.

---

## 4. Acceptance Criteria

- [ ] `GET /reports/patient-volume` returns accurate daily counts with new/returning split, scoped to hospital
- [ ] `GET /reports/pharmacy-stock` returns top sellers, stock value, expiry alerts
- [ ] `GET /reports/lab-turnaround` returns TAT by category and abnormal rate
- [ ] `GET /reports/surgery-utilization` returns OR utilization, cancellation rate, avg duration
- [ ] `GET /reports/hr-summary` returns headcount, attendance rate, leave usage
- [ ] `GET /reports/kpis` returns role-appropriate KPI set
- [ ] ReportsPage has 7 working tabs (Financial, Patient, Pharmacy, Lab, Surgery, HR, Insurance)
- [ ] DateRangePicker component works with presets and custom range
- [ ] Each report tab has working "Export PDF" and "Export Excel" buttons
- [ ] PDF export generates hospital-branded A4 document with print dialog
- [ ] Excel export downloads a `.xlsx` file with formatted headers
- [ ] Dashboard shows role-appropriate KPI cards with real-time data
- [ ] All report data is hospital-scoped (multi-tenant isolation)
- [ ] All endpoints have `authenticate` + `requirePermission` middleware
- [ ] No `JSON.stringify` usage — use `safeStringify` from `@voltagent/internal`
- [ ] Frontend passes `tsc --noEmit` with zero errors
- [ ] All new components have Loading, Empty, and Error states

---

## 5. Work Split

### Senior Developer (Tasks 2–8, 16, 17, 20)

| Task | Description | Complexity |
|------|-------------|-----------|
| 2 | Patient volume report endpoint | M |
| 3 | Pharmacy stock summary endpoint | M |
| 4 | Lab turnaround time endpoint | M |
| 5 | Surgery utilization endpoint | M |
| 6 | HR summary endpoint | M |
| 7 | Centralized KPI endpoint | M |
| 8 | Register reports routes in app.ts | S |
| 16 | PDF export utility (hospital-branded) | L |
| 17 | Excel export utility (SheetJS) | M |
| 20 | RBAC permissions for reports | S |

**Total:** 10 tasks — all backend + export utilities (most complex work)

### Junior Developer (Tasks 1, 9–15, 18, 19)

| Task | Description | Complexity |
|------|-------------|-----------|
| 1 | Shared DateRangePicker component | S |
| 9 | useReports.js query hooks | S |
| 10 | Redesign ReportsPage with tabs | L |
| 11 | Patient volume report component | M |
| 12 | Pharmacy stock report component | M |
| 13 | Lab TAT report component | M |
| 14 | Surgery utilization report component | M |
| 15 | HR summary report component | M |
| 18 | Add export buttons to ReportsPage | S |
| 19 | Role-based dashboard KPI widgets | L |

**Total:** 10 tasks — all frontend components + hooks

---

## 6. Files Likely Impacted

### New Files
```
backend/src/modules/reports/reports.routes.ts          # Centralized report endpoints
frontend/src/components/shared/DateRangePicker.jsx     # Shared date range picker
frontend/src/hooks/queries/useReports.js               # React Query hooks for reports
frontend/src/features/reports/PatientVolumeReport.jsx  # Patient volume report
frontend/src/features/reports/PharmacyStockReport.jsx  # Pharmacy stock report
frontend/src/features/reports/LabTurnaroundReport.jsx  # Lab TAT report
frontend/src/features/reports/SurgeryUtilizationReport.jsx  # Surgery utilization report
frontend/src/features/reports/HRSummaryReport.jsx      # HR summary report
frontend/src/features/dashboard/DashboardKPIWidgets.jsx # Role-based KPI cards
frontend/src/lib/exportPdf.js                          # PDF export utility
frontend/src/lib/exportExcel.js                        # Excel export utility
```

### Modified Files
```
backend/src/app.ts                                     # Mount /reports routes
backend/src/middleware/rbac.ts                          # Add reports:read permission
frontend/src/features/reports/ReportsPage.jsx          # Refactor to tabbed layout + exports
frontend/src/app/App.jsx                               # Add dashboard KPI widget import
frontend/package.json                                  # Add xlsx dependency
```

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **Complex SQL queries on large datasets** — patient volume and lab TAT queries may be slow on hospitals with 100K+ records | High | Medium | Add proper indexes on `createdAt` fields. Use `date_trunc` for grouping. Paginate results. Consider materialized views for heavy aggregates. |
| **SheetJS (xlsx) bundle size** — adding Excel export library may increase frontend bundle | Medium | High | Use dynamic import (`import('xlsx')`) so it only loads on export click. Check bundle size impact in build. |
| **PDF quality via window.print()** — browser print dialog is inconsistent across browsers/OS | Medium | Medium | Follow proven pattern from `printReceipt.js`. Test on Chrome (primary). Provide fallback "Save as PDF" instructions. |
| **Cross-module data aggregation** — KPI endpoint needs to query multiple Prisma models | Medium | Low | Use `Promise.all` for parallel queries. Keep individual queries simple (aggregate + count). |
| **Permission granularity** — "reports:read" is coarse; some roles should see only certain reports | Low | Medium | Use query-level filtering in service layer. Doctor sees only clinic-scoped reports. Nurse sees ward/bed reports only. |
| **Date handling across timezones** — date boundaries may shift depending on server timezone | Low | Low | Use UTC for all backend date math. Frontend sends local dates, backend parses as start/end of day in hospital timezone from settings. |

---

*Generated by PM agent — Phase 13 loop entry point.*
