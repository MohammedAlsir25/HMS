# Phase 13 — Reports & Analytics: QA Report

**Author:** QA Engineer
**Date:** 2026-07-19
**Phase:** 13 — Reports & Analytics

---

## 1. Build Verification

| Check | Result |
|-------|--------|
| `backend tsc --noEmit` | PASS (0 errors) |
| `frontend tsc --noEmit` | PASS (0 errors) |
| `frontend vite build` | PASS (built in 6.76s) |

---

## 2. Acceptance Criteria Verification

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | `GET /reports/patient-volume` returns daily counts with new/returning split, hospital-scoped | PARTIAL | Backend returns `volumeByDate` but frontend expects `data.daily` — field name mismatch |
| 2 | `GET /reports/pharmacy-stock` returns top sellers, stock value, expiry alerts | PARTIAL | Backend returns `salesByCategory`/`monthlyTrend` but frontend expects `byCategory`/`trend` |
| 3 | `GET /reports/lab-turnaround` returns TAT by category and abnormal rate | PARTIAL | Backend nests data in `summary.*`, `turnaroundTime.*`, `abnormalRate.*` — frontend expects flat fields |
| 4 | `GET /reports/surgery-utilization` returns OR utilization, cancellation rate, avg duration | PARTIAL | Backend nests in `summary.totalSurgeries` — frontend expects flat `data.totalSurgeries`; `avgUtilization` not returned |
| 5 | `GET /reports/hr-summary` returns headcount, attendance rate, leave usage | PARTIAL | Backend returns `totalEmployees` / `headcountByDepartment` — frontend expects `totalHeadcount` / `byDepartment` |
| 6 | `GET /reports/kpis` returns role-appropriate KPI set | PARTIAL | Backend returns `{ role, kpis: [{ label, value, format }] }` — frontend expects flat keys like `data.revenueToday` |
| 7 | ReportsPage has 7 working tabs (Financial, Patient, Pharmacy, Lab, Surgery, HR, Insurance) | FAIL | 7 tabs exist but Insurance tab is missing; replaced by Occupancy. Tabs are: Revenue, Patients, Occupancy, Pharmacy, Lab, Surgery, HR |
| 8 | DateRangePicker works with presets and custom range | PASS | 7 presets (Today, This Week, This Month, Last Month, This Quarter, This Year, Last 30 Days) + custom date inputs |
| 9 | Each report tab has working "Export PDF" and "Export Excel" buttons | FAIL | PDF works (iframe print pattern). "Export CSV" exists instead of "Export Excel" and is a stub — exports dummy headers only, not actual report data |
| 10 | PDF export generates hospital-branded A4 document with print dialog | PASS | Hospital-branded header with Al Jawarih name, Arabic footer, styled table, print dialog via iframe |
| 11 | Excel export downloads a `.xlsx` file with formatted headers | FAIL | No xlsx export. Only stub CSV with dummy data |
| 12 | Dashboard shows role-appropriate KPI cards with real-time data | FAIL | `RoleWidgets.jsx` reads flat `data.revenueToday` etc. but backend returns nested `kpis[]` array — completely incompatible shapes |
| 13 | All report data is hospital-scoped (multi-tenant isolation) | PASS | Every route uses `req.user!.hospitalId!` and passes it to Prisma where clauses |
| 14 | All endpoints have `authenticate` + `requirePermission` middleware | PASS | All 8 route files use `authenticate` + `requirePermission(PERMISSIONS.*)` |
| 15 | No `JSON.stringify` usage | PASS | Zero `JSON.stringify` in new reports code. `safeStringify` not needed (no serialization in responses) |
| 16 | Frontend passes `tsc --noEmit` with zero errors | PASS | 0 errors |
| 17 | All new components have Loading, Empty, and Error states | PASS | All 7 report components + RoleWidgets implement loading skeleton, error message, and empty state |
| 18 | `reports:read` permission added to RBAC and mapped to all relevant roles | PASS | `REPORTS_READ: 'reports:read'` in PERMISSIONS; mapped to ADMIN, DOCTOR, NURSE, RECEPTIONIST, PHARMACIST, BILLING_OFFICER, HR_OFFICER, LAB_TECHNICIAN roles |

**Score: 10/18 PASS, 1 PARTIAL, 7 FAIL**

---

## 3. Critical: Frontend-Backend Response Shape Mismatches

Every single report component has field name mismatches between what the backend returns and what the frontend reads. These will result in blank screens or undefined values at runtime despite TypeScript passing (data is `any` in JSX).

### 3.1 RevenueReport.jsx

| Frontend Expects | Backend Returns | Severity |
|------------------|----------------|----------|
| `data.daily` | `data.dailyData` | CRITICAL |
| `data.byMethod` (top-level) | `data.totals.byMethod` (nested) | CRITICAL |
| `data.byDepartment` (top-level) | `data.totals.byDepartment` (nested) | CRITICAL |
| `data.previousTotals` (object) | `data.periodComparison` (number/null) | CRITICAL |
| `totals.revenue` | `totals.gross` | CRITICAL |
| `totals.cash` | Not in totals (only in dailyData rows) | CRITICAL |
| `totals.card` | Not in totals | CRITICAL |
| `totals.insurance` | Not in totals | CRITICAL |

**Result:** RevenueReport will render empty — `data.daily` is undefined, totals show `$undefined`.

### 3.2 PatientReport.jsx

| Frontend Expects | Backend Returns | Severity |
|------------------|----------------|----------|
| `data.daily` | `data.volumeByDate` | CRITICAL |
| `data.totalPatients` | Not returned (must sum) | CRITICAL |
| `data.totalNew` | Not returned (must sum) | CRITICAL |
| `data.totalReturning` | Not returned (must sum) | CRITICAL |
| `d.new` (in daily items) | `d.newPatients` | HIGH |
| `d.returning` (in daily items) | `d.returningPatients` | HIGH |

**Result:** Empty state shown (`!data.daily?.length`), KPI cards show 0.

### 3.3 PharmacyReport.jsx

| Frontend Expects | Backend Returns | Severity |
|------------------|----------------|----------|
| `data.byCategory` | `data.salesByCategory` | CRITICAL |
| `data.trend` | `data.monthlyTrend` | CRITICAL |
| `data.totalSales` (formatted as currency) | `data.totalSales` (is a count, not revenue) | HIGH |
| `data.topSelling` → `r.name` | `data.topSelling` → `r.item` | HIGH |

**Result:** Category table and trend table empty. Total Sales card shows count formatted as currency (e.g., "$42.00" for 42 transactions).

### 3.4 LabReport.jsx

| Frontend Expects | Backend Returns | Severity |
|------------------|----------------|----------|
| `data.totalTests` | `data.summary.totalTests` | CRITICAL |
| `data.avgTAT` | `data.turnaroundTime.avg` | CRITICAL |
| `data.abnormalRate` | `data.abnormalRate.overall` | CRITICAL |
| `data.completedToday` | `data.summary.completedOrders` | CRITICAL |
| `data.dailyTrend` | `data.testsPerDay` | CRITICAL |
| `data.byTestType` | `data.turnaroundTime.byTestType` | CRITICAL |
| `data.abnormalByType` | `data.abnormalRate.byTest` | CRITICAL |

**Result:** All 4 KPI cards show 0. All 4 tables empty.

### 3.5 SurgeryReport.jsx

| Frontend Expects | Backend Returns | Severity |
|------------------|----------------|----------|
| `data.totalSurgeries` | `data.summary.totalSurgeries` | CRITICAL |
| `data.avgUtilization` | Not returned (only `orUtilization` array) | HIGH |
| `data.dailyTrend` | `data.surgeriesPerDay` | CRITICAL |
| Column `r.avgDuration` (per type) | Not in `byType` items | HIGH |
| Column `r.totalRevenue` (per type) | Not in `byType` items | HIGH |
| Column `r.totalSurgeries` (OR table) | `r.totalSlots` in orUtilization | MEDIUM |

**Result:** Total Surgeries card shows 0. Daily trend table empty. OR table header mismatch.

### 3.6 HRReport.jsx

| Frontend Expects | Backend Returns | Severity |
|------------------|----------------|----------|
| `data.totalHeadcount` | `data.totalEmployees` | CRITICAL |
| `data.activeEmployees` | Not returned | HIGH |
| `data.byDepartment` | `data.headcountByDepartment` | CRITICAL |
| Column `r.headcount` (dept) | `r.count` | HIGH |
| Column `r.active` / `r.onLeave` (dept) | Not returned | HIGH |
| `data.newHires` (array of objects) | `data.newHires` (number) | CRITICAL |
| Column `r.count` (leave) | `r.total` | HIGH |
| Column `r.days` (leave) | Not returned | HIGH |
| Column `r.status` (leave) | `r.pending` (number) | HIGH |

**Result:** Headcount card 0. Department table has `undefined` in headcount column. New Hires section crashes (`.map()` on number).

### 3.7 OccupancyReport.jsx

| Frontend Expects | Backend Returns | Severity |
|------------------|----------------|----------|
| `data.currentRate` | `data.occupancyRate` | CRITICAL |
| `data.trend` | `data.trends` | CRITICAL |
| `data.lengthOfStay` | `data.lengthOfStayDistribution` | CRITICAL |
| Column `r.occupancyRate` (ward) | `r.rate` | HIGH |
| Column `r.avgStay` (ward) | `r.avgStayDays` | HIGH |

**Result:** Occupancy rate card shows 0%. Trend and LOS tables empty.

### 3.8 RoleWidgets.jsx (Dashboard)

| Frontend Expects | Backend Returns | Severity |
|------------------|----------------|----------|
| `data.revenueToday` | `data.kpis[0].value` (nested array) | CRITICAL |
| `data.revenueMonth` | `data.kpis[1].value` | CRITICAL |
| `data.patientsToday` | `data.kpis[3].value` | CRITICAL |
| `data.occupancyRate` | `data.kpis[4].value` | CRITICAL |
| `data.surgeriesToday` | `data.kpis[5].value` | CRITICAL |
| `data.pendingLeave` | `data.kpis[6].value` | CRITICAL |
| Same flat-key pattern for ALL other roles | All return `{ role, kpis[] }` | CRITICAL |

**Result:** Entire dashboard widget system shows $NaN / 0 for all cards on all roles. Complete data flow breakage.

---

## 4. Missing Features

### 4.1 Insurance Tab Missing
- **Brief requirement:** 7 tabs — Financial, Patient, Pharmacy, Lab, Surgery, HR, Insurance
- **Implementation:** 7 tabs — Revenue, Patients, Occupancy, Pharmacy, Lab, Surgery, HR
- **Gap:** No Insurance tab. Occupancy was added as a 7th tab in place of Insurance. The existing `InsuranceReportsPage.jsx` exists at `features/insurance/` but is not integrated into ReportsPage.

### 4.2 Excel Export Missing
- **Brief requirement:** "Export Excel" button downloads `.xlsx` file with formatted headers
- **Implementation:** "Export CSV" button exports a hardcoded dummy CSV with header `Report,Generated` and a single row of `[tabLabel, timestamp]`
- **Gap:** No SheetJS/xlsx integration. The `exportExcel.js` utility referenced in the tech spec was never created. The CSV stub does not export actual report data.

### 4.3 Export Buttons Are Stubs
- **PDF export:** Works correctly — captures `#report-content` innerHTML, wraps in hospital-branded HTML, triggers `window.print()` via hidden iframe.
- **CSV/Excel export:** Non-functional — exports dummy data, not the actual displayed report.

### 4.4 Report Data Not Passed to Export
The `handleExportCSV` function on line 62 receives generic arguments `['Report', 'Generated']` rather than actual report table data. Each tab component should provide its own export data or the reports page should extract table data from the DOM.

---

## 5. Minor / Non-Critical Issues

### 5.1 Surgery Route Permission
- `surgery.routes.ts:10` uses `PERMISSIONS.SURGERY_READ` instead of the expected `PERMISSIONS.REPORTS_READ` for a reports endpoint. While functional, it deviates from the tech spec which states all report endpoints should use `reports:read`.

### 5.2 Lab Route DiagnosticOrderTest Query
- `lab.routes.ts:109` queries `diagnosticOrderTest` with `where: { hospitalId, order: { createdAt: { gte: startToday } } }`. This filters tests by hospitalId but the order's createdAt filter is only for "today" — this may not align with the date range filter on the parent DiagnosticOrder query.

### 5.3 Revenue Date Range Casting
- `revenue.routes.ts:34` casts `where.createdAt` to `{ gte: Date; lte: Date }` which could be `undefined` if no date range is provided. The `buildDateWhere` always sets a default range (current month), so this is safe but fragile.

### 5.4 HR Route Leave Date Filter
- `hr.routes.ts:32` has a complex conditional spread for `createdAt` that may produce unexpected behavior if `where.createdAt` doesn't have the expected structure.

### 5.5 Occupancy Route Inlines Date Logic
- `occupancy.routes.ts:13-19` inlines the date range logic instead of using the shared `getDateRange` / `buildDateWhere` helpers from `reportHelpers.ts`. This duplicates logic and risks drift.

### 5.6 RoleWidgets Role Matching
- `RoleWidgets.jsx:16` uses `baseRole.includes('admin')` which matches "Administrator", "SuperAdmin", etc. but the actual role strings from the backend may differ (e.g., `ADMIN`, `SUPER_ADMIN`). The `replace(/_/g, '').toLowerCase()` normalization handles underscores but the widget component doesn't normalize — it compares raw `user.role` strings like `"Admin"` vs `"Super Admin"`, which won't match if the DB stores `"SUPER_ADMIN"`.

---

## 6. Code Quality Assessment

| Check | Status |
|-------|--------|
| Import paths correct | PASS — All `../../components/ui/*` and `../../hooks/queries/*` paths resolve |
| No JSX fragments unmatched | PASS — All ternaries have proper branches |
| No `JSON.stringify` in new code | PASS |
| No comments in new code | PASS |
| Loading states | PASS — All components show skeleton pulse during loading |
| Empty states | PASS — All components show "No data" message |
| Error states | PASS — All components show error message with retry implied via React Query |
| Hospital scoping (backend) | PASS — Every Prisma query includes `hospitalId` from `req.user!.hospitalId!` |
| Auth middleware | PASS — All routes wrapped with `authenticate` + `requirePermission` |
| React Query keys | PASS — Properly parameterized query keys for cache invalidation |
| Tab styling pattern | PASS — Uses `bg-lilac-bloom/20 text-obsidian` for active, `text-slate` for inactive |

---

## 7. Summary of Required Fixes (Priority Order)

| # | Fix | Impact | Files |
|---|-----|--------|-------|
| 1 | Align RoleWidgets data shape with `/reports/dashboard` response (or flatten backend response) | Dashboard completely broken | `RoleWidgets.jsx` or `dashboard.routes.ts` |
| 2 | Align RevenueReport field names with `/reports/revenue` response | Financial tab completely broken | `RevenueReport.jsx` or `revenue.routes.ts` |
| 3 | Align LabReport field names with `/reports/lab` response (flatten nested objects) | Lab tab completely broken | `LabReport.jsx` or `lab.routes.ts` |
| 4 | Align PatientReport field names (`daily`→`volumeByDate`, add computed totals) | Patient tab shows empty/zeroes | `PatientReport.jsx` or `patient.routes.ts` |
| 5 | Align PharmacyReport field names (`byCategory`→`salesByCategory`, `trend`→`monthlyTrend`, fix `totalSales`) | Pharmacy tab partially broken | `PharmacyReport.jsx` or `pharmacy.routes.ts` |
| 6 | Align HRReport field names + fix `newHires` type mismatch (number vs array) | HR tab partially broken, potential crash | `HRReport.jsx` or `hr.routes.ts` |
| 7 | Align OccupancyReport field names (`currentRate`→`occupancyRate`, etc.) | Occupancy tab partially broken | `OccupancyReport.jsx` or `occupancy.routes.ts` |
| 8 | Align SurgeryReport field names (`totalSurgeries` from `summary.*`, add `avgUtilization`) | Surgery tab partially broken | `SurgeryReport.jsx` or `surgery.routes.ts` |
| 9 | Implement Insurance tab in ReportsPage | Missing tab from brief | New `InsuranceReport.jsx`, modify `ReportsPage.jsx` |
| 10 | Implement real Excel export with SheetJS (dynamic import) | Export feature incomplete | New `exportExcel.js`, modify `ReportsPage.jsx` |
| 11 | Pass actual report data to export functions | Export stubs useless | `ReportsPage.jsx` + each report component |

---

## 8. Verdict

**Phase 13 is NOT ready for sign-off.** The build compiles and TypeScript passes, but there are **systematic frontend-backend response shape mismatches** across all 7 report components and the dashboard widgets. Every tab will render with $undefined, 0, or empty tables at runtime. Additionally, the Insurance tab is missing and Excel export is not implemented.

**Recommended next step:** Pick one side to be the source of truth (backend response or frontend expectations), then align the other side. The simplest fix is to modify the frontend components to match the existing backend response shapes, since the backend queries are functional and hospital-scoped.
