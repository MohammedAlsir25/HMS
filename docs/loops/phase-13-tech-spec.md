# Phase 13 — Reports & Analytics: Tech Spec

**Author:** Tech Lead  
**Date:** 2026-07-19  
**Status:** Draft  
**Phase:** 13 — Reports & Analytics

---

## 1. Architecture Decisions

### 1.1 New Centralized Reports Module

**Decision:** Create `backend/src/modules/reports/` as a standalone module with sub-routers per report category, following the existing `accounting.routes.ts` pattern.

**Rationale:** The existing accounting module already has summary/reports sub-routes (`accounting/routes/summary.routes.ts`, `accounting/routes/reports.routes.ts`). However, Phase 13 reports span ALL modules (patient, pharmacy, lab, surgery, HR, ward) so a centralized `reports` module is cleaner than scattering endpoints across 6+ existing modules. The existing accounting/insurance report endpoints are LEFT in place (no duplication). The new module only adds cross-cutting reports that don't belong to a single module.

**Module structure:**
```
backend/src/modules/reports/
  reports.routes.ts              # Mounts sub-routers
  reports.service.ts             # Shared query helpers (date range builder, hospital scoping)
  reports.validation.ts          # Zod schemas for date params, role, clinicId
  routes/
    patient-volume.routes.ts     # GET /reports/patient-volume
    pharmacy-stock.routes.ts     # GET /reports/pharmacy-stock
    lab-turnaround.routes.ts     # GET /reports/lab-turnaround
    surgery-utilization.routes.ts # GET /reports/surgery-utilization
    hr-summary.routes.ts         # GET /reports/hr-summary
    kpis.routes.ts              # GET /reports/kpis
```

### 1.2 PDF Export Approach

**Decision:** Use browser `window.print()` via hidden iframe — same proven pattern as `frontend/src/lib/printReceipt.js:177-202`.

**Implementation:** Create `frontend/src/lib/exportPdf.js` that:
1. Takes `{ title, dateRange, hospitalName, hospitalLogo, sections: [{ title, htmlTable }] }` 
2. Builds A4 HTML with Al Jawarih header (reuse existing header markup from `printReceipt.js:58-71`)
3. Injects into hidden iframe → calls `iframe.contentWindow.print()`
4. Removes iframe after 1s delay

**Rationale:** Zero new dependencies. Proven in production for receipts. User gets native "Save as PDF" from Chrome print dialog. No jsPDF, no Puppeteer.

### 1.3 Excel Export Approach

**Decision:** Use `xlsx` (SheetJS) with dynamic import via `import()`.

**Implementation:** Create `frontend/src/lib/exportExcel.js` that:
1. Takes `{ filename, sheets: [{ name, headers: [{ key, label, width? }], rows: [[]] }] }`
2. Dynamically imports `xlsx` only when export is triggered: `const XLSX = await import('xlsx')`
3. Creates workbook with formatted headers (bold, colored background, auto-column-width)
4. Triggers browser download via `XLSX.writeFile()`

**Dependency:** Add `"xlsx": "^0.18.5"` to `frontend/package.json`. Dynamic import ensures zero bundle size impact until user clicks export.

**Alternative considered:** Manual CSV. Rejected because `.xlsx` is the expected format for hospital admin exports and `xlsx` is a well-established lightweight library (~40KB gzipped, dynamic loaded).

### 1.4 Role-Based Dashboard Widgets

**Decision:** Single backend endpoint `GET /reports/kpis?role=` returns role-specific KPI set. Frontend `DashboardKPIWidgets.jsx` conditionally renders cards based on role.

**KPI mapping per role:**

| Role | KPI Cards |
|------|-----------|
| ADMIN / SUPER_ADMIN | Revenue today, Revenue month, Patient count today, Bed occupancy %, Surgeries today, Pending leave requests |
| DOCTOR | Today's consultations, Pending follow-ups, Surgeries today, Patient count (clinic-scoped) |
| RECEPTIONIST | Today's appointments, Queue length, No-show rate, Patients registered today |
| PHARMACIST | Low stock items, Today's sales, Expiring items (30d), Stock value |
| NURSE | Bed occupancy (ward-scoped), Patients in ward, Pending nursing notes |
| LAB_TECHNICIAN | Pending orders, Completed today, Avg TAT (hours), Abnormal rate % |
| HR_OFFICER | Total headcount, Attendance rate %, Pending leave requests, Active employees |
| BILLING_OFFICER / ACCOUNTANT | Revenue trend, Outstanding balance, Expense total, Insurance settlements pending |

**Rationale:** Single endpoint avoids N+1 waterfall calls from dashboard. Backend assembles role-appropriate set based on JWT role.

### 1.5 Shared Date Range Picker

**Decision:** Create `frontend/src/components/shared/DateRangePicker.jsx` with preset buttons + custom date inputs.

**Presets:** Today, This Week, This Month, Last 30 Days, Last 90 Days, This Year, Custom  
**Props:** `onChange({ startDate, endDate })`, `value?`, `className?`  
**Pattern:** Uses existing `Input` component for date fields. Preset buttons use existing `Button` with `variant="ghost"` / `variant="secondary"` active state.

### 1.6 Report Data Aggregation Strategy

**Decision:** Pure SQL aggregations via Prisma `groupBy`, `aggregate`, and `$queryRaw` against existing tables. No new database tables needed.

**Approach per report:**
- **Patient Volume:** `Appointment.groupBy` by `scheduledAt` (date_trunc day) + `Patient` join for demographics (gender, age group computed from `dateOfBirth`)
- **Pharmacy Stock:** `InventoryItem` aggregate for stock value, `InventoryTransaction` groupBy for top sellers, expiry bucket queries on `InventoryItem.expiryDate`
- **Lab Turnaround:** `$queryRaw` with `date_diff` between order `createdAt` and latest `DiagnosticOrderTest.completedAt`, grouped by test category
- **Surgery Utilization:** `Surgery` groupBy room + status for utilization, duration computed from `startTime`/`endTime`, cancellation rate from `status = 'CANCELLED'`
- **HR Summary:** `Employee.count` by department, `Attendance.groupBy` for attendance rate, `LeaveRequest.groupBy` by leave type
- **KPIs:** `Promise.all` of lightweight aggregates from each module (reuse existing summary patterns from `summary.routes.ts`)

---

## 2. Work Split

### Sr Dev (Backend) — Tasks T1–T11

| Task | Description | Files | Complexity | Est. Hours |
|------|-------------|-------|-----------|-----------|
| **T1** | Reports module scaffold + shared helpers + Zod validation schemas | `reports.routes.ts`, `reports.service.ts`, `reports.validation.ts` | S | 2h |
| **T2** | Patient volume report endpoint | `routes/patient-volume.routes.ts` | M | 3h |
| **T3** | Pharmacy stock summary endpoint | `routes/pharmacy-stock.routes.ts` | M | 3h |
| **T4** | Lab turnaround time endpoint | `routes/lab-turnaround.routes.ts` | M | 4h |
| **T5** | Surgery utilization endpoint | `routes/surgery-utilization.routes.ts` | M | 3h |
| **T6** | HR summary endpoint | `routes/hr-summary.routes.ts` | M | 3h |
| **T7** | Centralized KPI endpoint | `routes/kpis.routes.ts` | M | 4h |
| **T8** | Register reports routes in `app.ts` + add `REPORTS_READ` to RBAC | `app.ts`, `rbac.ts` | S | 1h |
| **T9** | PDF export helper (browser print) | `frontend/src/lib/exportPdf.js` | L | 4h |
| **T10** | Excel export helper (SheetJS dynamic import) | `frontend/src/lib/exportExcel.js` | M | 3h |
| **T11** | Insurance reports dedup check + cross-reference map | Verify no overlap with `insurance/reports.routes.ts` | S | 1h |

**Total Sr Dev:** ~31h (4 days)

### Jr Dev (Frontend) — Tasks T12–T22

| Task | Description | Files | Complexity | Est. Hours |
|------|-------------|-------|-----------|-----------|
| **T12** | DateRangePicker shared component | `components/shared/DateRangePicker.jsx` | S | 2h |
| **T13** | useReports.js React Query hooks | `hooks/queries/useReports.js` | S | 2h |
| **T14** | ReportsPage redesign with categorized tabs | `features/reports/ReportsPage.jsx` (modify) | L | 5h |
| **T15** | Patient Volume report tab | `features/reports/PatientVolumeReport.jsx` | M | 3h |
| **T16** | Pharmacy Stock report tab | `features/reports/PharmacyStockReport.jsx` | M | 3h |
| **T17** | Lab Turnaround report tab | `features/reports/LabTurnaroundReport.jsx` | M | 3h |
| **T18** | Surgery Utilization report tab | `features/reports/SurgeryUtilizationReport.jsx` | M | 3h |
| **T19** | HR Summary report tab | `features/reports/HRSummaryReport.jsx` | M | 3h |
| **T20** | PDF/Excel export buttons (per-tab) | Modify each report component | S | 2h |
| **T21** | Role-based dashboard KPI widgets | `features/dashboard/DashboardKPIWidgets.jsx`, modify `App.jsx` | L | 4h |
| **T22** | Report scheduling placeholder UI | `features/reports/ReportSchedulerPlaceholder.jsx` | S | 1h |

**Total Jr Dev:** ~34h (4.25 days)

---

## 3. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                     │
│                                                                      │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────────┐  │
│  │ DateRange     │──▶│ ReportsPage.jsx  │──▶│ Report Tab Component│  │
│  │ Picker        │   │ (7 tabs)         │   │ (Patient/Pharma/etc)│  │
│  └──────────────┘   └──────────────────┘   └─────────┬───────────┘  │
│                              │                        │               │
│                     ┌────────▼────────┐     ┌────────▼────────┐     │
│                     │ Export Buttons   │     │ useReports.js   │     │
│                     │ PDF / Excel      │     │ React Query     │     │
│                     └────────┬────────┘     └────────┬────────┘     │
│                              │                        │               │
│  ┌───────────────────────────▼──┐   ┌────────────────▼───────────┐  │
│  │ exportPdf.js                │   │  api.get('/reports/...')     │  │
│  │ (iframe → window.print())   │   └────────────────┬───────────┘  │
│  └─────────────────────────────┘                    │               │
│                                                     │               │
│  ┌───────────────────────────┐                      │               │
│  │ exportExcel.js            │                      │               │
│  │ (dynamic import xlsx)     │                      │               │
│  └───────────────────────────┘                      │               │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ HTTP GET
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND                                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Express Router: /api/reports                                   ││
│  │                                                                 ││
│  │  ┌──────────────┐   ┌──────────────────┐                       ││
│  │  │ authenticate  │──▶│ requirePermission │──▶ reports.routes.ts ││
│  │  │ middleware     │   │ ('reports:read')  │   (sub-router)      ││
│  │  └──────────────┘   └──────────────────┘                       ││
│  └──────────────────────────┬──────────────────────────────────────┘│
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────────┐│
│  │  Sub-routes:                                                    ││
│  │  GET /reports/patient-volume?startDate=&endDate=&clinicId=     ││
│  │  GET /reports/pharmacy-stock?startDate=&endDate=               ││
│  │  GET /reports/lab-turnaround?startDate=&endDate=               ││
│  │  GET /reports/surgery-utilization?startDate=&endDate=          ││
│  │  GET /reports/hr-summary                                       ││
│  │  GET /reports/kpis?role=                                       ││
│  └──────────────────────────┬─────────────────────────────────────┘│
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────────┐│
│  │  reports.service.ts                                             ││
│  │  - buildDateFilter(startDate, endDate) → Prisma where clause   ││
│  │  - getHospitalId(req) → extracts from req.user                 ││
│  │  - All queries scoped by hospitalId                            ││
│  └──────────────────────────┬─────────────────────────────────────┘│
│                              │                                       │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL (via Prisma)                         │
│                                                                      │
│  Existing tables (NO new tables):                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐          │
│  │ Appointment  │  │ Patient      │  │ Transaction      │          │
│  │ (patient     │  │ (demographics│  │ (revenue)        │          │
│  │  volume)     │  │  gender,DOB) │  │                  │          │
│  └─────────────┘  └──────────────┘  └──────────────────┘          │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐          │
│  │ Surgery     │  │ Diagnostic   │  │ InventoryItem    │          │
│  │ (OR util,   │  │ Order/Test   │  │ (stock value,    │          │
│  │  cancel%)   │  │ (TAT)        │  │  expiry)         │          │
│  └─────────────┘  └──────────────┘  └──────────────────┘          │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐          │
│  │ Employee    │  │ Attendance   │  │ LeaveRequest     │          │
│  │ (headcount) │  │ (attend rate)│  │ (leave usage)    │          │
│  └─────────────┘  └──────────────┘  └──────────────────┘          │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────────────────┐            │
│  │ Ward / Bed       │  │ InventoryTransaction         │            │
│  │ (occupancy)      │  │ (pharmacy sales aggregation) │            │
│  └──────────────────┘  └──────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Exact File List

### New Backend Files

```
backend/src/modules/reports/
  reports.routes.ts                    # Sub-router aggregator (like accounting.routes.ts)
  reports.service.ts                   # Shared: buildDateFilter(), getHospitalId(), helpers
  reports.validation.ts                # Zod: dateRangeSchema, roleParamSchema, clinicFilterSchema
  routes/
    patient-volume.routes.ts           # GET /patient-volume
    pharmacy-stock.routes.ts           # GET /pharmacy-stock
    lab-turnaround.routes.ts           # GET /lab-turnaround
    surgery-utilization.routes.ts      # GET /surgery-utilization
    hr-summary.routes.ts              # GET /hr-summary
    kpis.routes.ts                    # GET /kpis
```

### New Frontend Files

```
frontend/src/lib/
  exportPdf.js                         # PDF export via browser print
  exportExcel.js                       # Excel export via dynamic xlsx import

frontend/src/components/shared/
  DateRangePicker.jsx                  # Shared date range with presets

frontend/src/hooks/queries/
  useReports.js                        # React Query hooks for all report endpoints

frontend/src/features/reports/
  PatientVolumeReport.jsx              # Patient volume tab
  PharmacyStockReport.jsx              # Pharmacy stock tab
  LabTurnaroundReport.jsx              # Lab TAT tab
  SurgeryUtilizationReport.jsx         # Surgery utilization tab
  HRSummaryReport.jsx                  # HR summary tab
  ReportSchedulerPlaceholder.jsx       # Future placeholder

frontend/src/features/dashboard/
  DashboardKPIWidgets.jsx              # Role-based KPI cards
```

### Modified Backend Files

```
backend/src/app.ts                     # Add: import reportsRoutes + app.use('/api/reports', reportsRoutes)
backend/src/middleware/rbac.ts          # Add: REPORTS_READ = 'reports:read' to PERMISSIONS + DEFAULT_ROLES
```

### Modified Frontend Files

```
frontend/src/features/reports/ReportsPage.jsx  # Refactor to tabbed layout with 7 tabs
frontend/src/app/App.jsx                       # Add DashboardKPIWidgets import + render on dashboard
frontend/package.json                          # Add "xlsx": "^0.18.5" dependency
```

---

## 5. Pattern References

### Backend Route Pattern (from `accounting/routes/summary.routes.ts`)

```typescript
// Follow this EXACT pattern for every new report endpoint:
import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/patient-volume', authenticate, requirePermission(PERMISSIONS.REPORTS_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  // ... query logic
  res.json(result);
}));

export default router;
```

### Backend Date Range Filter Pattern (from `insurance/reports.routes.ts:11-21`)

```typescript
// Reuse this pattern via reports.service.ts:
const where: Record<string, unknown> = { hospitalId };
if (startDate || endDate) {
  where.createdAt = {} as Record<string, unknown>;
  if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    (where.createdAt as Record<string, unknown>).lte = end;
  }
}
```

### Frontend Hook Pattern (from `hooks/queries/useAccounting.js`)

```typescript
// Follow this pattern for useReports.js:
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const reportKeys = {
  patientVolume: (params) => ['reports', 'patient-volume', params],
  pharmacyStock: (params) => ['reports', 'pharmacy-stock', params],
  labTurnaround: (params) => ['reports', 'lab-turnaround', params],
  surgeryUtilization: (params) => ['reports', 'surgery-utilization', params],
  hrSummary: ['reports', 'hr-summary'],
  kpis: (role) => ['reports', 'kpis', role],
};

export function usePatientVolume(params) {
  return useQuery({
    queryKey: reportKeys.patientVolume(params),
    queryFn: () => api.get(`/reports/patient-volume?${params}`),
    enabled: !!params,
  });
}
```

### Frontend PDF Export Pattern (from `lib/printReceipt.js:177-202`)

```javascript
// Reuse iframe + window.print() pattern:
export function exportReportPdf({ title, html }) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 500);
}
```

### Frontend Tab Pattern (ReportsPage redesign)

```jsx
// Tab bar follows existing pattern from other tabbed pages:
const tabs = ['Financial', 'Patient', 'Pharmacy', 'Lab', 'Surgery', 'HR', 'Insurance'];
// Active tab: bg-lilac-bloom/20 text-obsidian
// Inactive tab: text-slate hover:text-obsidian
```

### Sub-router Aggregator Pattern (from `accounting/accounting.routes.ts`)

```typescript
// reports.routes.ts aggregates sub-routers:
import { Router } from 'express';
import patientVolumeRoutes from './routes/patient-volume.routes.js';
import pharmacyStockRoutes from './routes/pharmacy-stock.routes.js';
// ...
const router = Router();
router.use('/', patientVolumeRoutes);
router.use('/', pharmacyStockRoutes);
// ...
export default router;
```

---

## 6. Key Gotchas

### Don't Duplicate Existing Report Endpoints

The following endpoints already exist and must NOT be re-implemented:

| Existing Endpoint | Module | Phase 13 Action |
|-------------------|--------|-----------------|
| `GET /accounting/summary` | accounting | Reference only — used in Financial tab |
| `GET /accounting/revenue-by-day` | accounting | Reference only — used in Financial tab |
| `GET /accounting/revenue-by-type` | accounting | Reference only — used in Financial tab |
| `GET /accounting/revenue-by-department` | accounting | Reference only — used in Financial tab |
| `GET /accounting/pnl` | accounting | Reference only — used in Financial tab |
| `GET /accounting/balance-sheet` | accounting | Reference only — not in reports |
| `GET /insurance/reports/claims-by-company` | insurance | Reference only — Insurance tab |
| `GET /insurance/reports/settlement-rate` | insurance | Reference only — Insurance tab |
| `GET /insurance/reports/denial-analysis` | insurance | Reference only — Insurance tab |
| `GET /insurance/reports/revenue-by-insurance` | insurance | Reference only — Insurance tab |
| `GET /pharmacy/sales-report` | pharmacy | Reference only — Pharmacy tab |
| `GET /lab/stats` | lab | Reference only — Lab tab |
| `GET /surgery/stats` | surgery | Reference only — Surgery tab |
| `GET /wards/dashboard` | wards | Reference only — Bed Occupancy tab |
| `GET /wards/dashboard/trends` | wards | Reference only — Bed Occupancy tab |
| `GET /preoperative/stats` | preoperative | Reference only — Surgery tab |

**The Financial tab and Insurance tab in ReportsPage.jsx should consume existing endpoints.** Only Patient, Pharmacy Stock, Lab TAT, Surgery Utilization, and HR reports need NEW endpoints.

### ReportsPage Currently Has Hardcoded Financial Data

The current `ReportsPage.jsx` (lines 30-155) is a single-view financial report with hardcoded `<input type="date">` fields. This must be REFACTORED into a tabbed layout, not deleted. The existing financial content moves to the "Financial" tab. Other tabs are new.

### Hospital Scoping on Every Report Query

Every single Prisma query in every report endpoint MUST include `hospitalId` in its `where` clause. The `hospitalId` comes from `req.user!.hospitalId!` (extracted from JWT). Pattern from `insurance/reports.routes.ts:10`:

```typescript
const hospitalId = req.user!.hospitalId!;
const where = { hospitalId, ...otherFilters };
```

### PDF Export Must NOT Add jsPDF Dependency

Use browser `window.print()` via iframe pattern from `printReceipt.js`. No jsPDF, no Puppeteer, no server-side PDF generation. The print dialog gives users "Save as PDF" natively.

### Excel Export Must NOT Add Heavy Dependency

Use `xlsx` (SheetJS) via dynamic `import()`. The library is only loaded when the user clicks "Export Excel", not at page load. Alternative: if bundle size is a concern, fall back to CSV generation with manual blob download.

### No `JSON.stringify` — Use `safeStringify`

Per `AGENTS.md` gotcha: import `safeStringify` from `@voltagent/internal` if any serialization is needed. In practice, report endpoints return plain objects so this is rarely needed, but if logging debug output, use `safeStringify`.

### Import Path Rules (Frontend)

All frontend features use `../../components/ui/` NOT `../ui/`:
- `features/reports/PatientVolumeReport.jsx` → `import { Card } from '../../components/ui/Card'`

### JSX Structural Rules

- Every ternary must have matching branches (wrap multi-element branches in `<>...</>`)
- Every `<>` must have a matching `</>`

### All New Components Must Have Loading/Empty/Error States

Every report tab component must handle:
1. **Loading:** Skeleton or spinner while `useQuery` is fetching
2. **Empty:** "No data for selected period" message
3. **Error:** Error state with retry option

### tsc --noEmit Required

After all changes, run `cd frontend && npx tsc --noEmit` and `cd backend && npx tsc --noEmit`. Fix ALL errors before marking tasks complete.

### RBAC Permission

Add `REPORTS_READ: 'reports:read'` to `PERMISSIONS` in `rbac.ts`. Map it into `DEFAULT_ROLES`:
- SUPER_ADMIN: ✅
- ADMIN: ✅
- DOCTOR: ✅ (can see own clinic reports)
- NURSE: ✅ (ward/bed reports only)
- RECEPTIONIST: ✅ (patient volume only)
- PHARMACIST: ✅ (pharmacy stock only)
- LAB_TECHNICIAN: ✅ (lab TAT only)
- HR_OFFICER: ✅ (HR summary only)
- BILLING_OFFICER: ✅ (financial reports)
- ACCOUNTANT: ✅ (financial reports)
- VIEWER: ✅ (read-only)

### Route Registration

Mount reports routes in `app.ts` AFTER existing module routes:
```typescript
import reportsRoutes from './modules/reports/reports.routes.js';
// ... after other routes:
app.use('/api/reports', reportsRoutes);
```

### Frontend Route Permission

The existing `/reports` route in `App.jsx:163` requires `accounting:read`. This should be changed to `reports:read` (or kept as-is if RBAC update is deferred):
```jsx
<Route path="/reports" element={<ProtectedRoute><RoleGuard requiredPermissions={['reports:read']}><ReportsPage /></RoleGuard></ProtectedRoute>} />
```

### Date Handling

- Backend: All date math in UTC. Use `new Date(startDate)` at start of day, `new Date(endDate).setHours(23,59,59,999)` at end of day.
- Frontend: Send ISO date strings (`YYYY-MM-DD`). The `DateRangePicker` returns these directly from `<input type="date">`.

### Performance Considerations

- Patient volume queries on large datasets (100K+ appointments): Use `date_trunc` for grouping, add `@@index([hospitalId, scheduledAt])` if not present.
- Pharmacy stock expiry queries: Index on `InventoryItem.expiryDate` if not present.
- KPI endpoint uses `Promise.all` for parallel queries — each individual query should be lightweight (aggregate + count, not findMany).
- Consider adding `staleTime: 300_000` (5 min) for report queries since data doesn't change rapidly.

---

## 7. Acceptance Criteria (Cross-Reference with Phase Brief)

| # | Criterion | Owner | Verified By |
|---|-----------|-------|------------|
| 1 | `GET /reports/patient-volume` returns daily counts with new/returning split, hospital-scoped | Sr Dev | QA |
| 2 | `GET /reports/pharmacy-stock` returns top sellers, stock value, expiry alerts | Sr Dev | QA |
| 3 | `GET /reports/lab-turnaround` returns TAT by category and abnormal rate | Sr Dev | QA |
| 4 | `GET /reports/surgery-utilization` returns OR utilization, cancellation rate, avg duration | Sr Dev | QA |
| 5 | `GET /reports/hr-summary` returns headcount, attendance rate, leave usage | Sr Dev | QA |
| 6 | `GET /reports/kpis` returns role-appropriate KPI set | Sr Dev | QA |
| 7 | ReportsPage has 7 working tabs | Jr Dev | QA |
| 8 | DateRangePicker works with presets and custom range | Jr Dev | QA |
| 9 | Each report tab has working "Export PDF" and "Export Excel" buttons | Jr Dev + Sr Dev | QA |
| 10 | PDF export generates hospital-branded A4 document with print dialog | Sr Dev | QA |
| 11 | Excel export downloads a `.xlsx` file with formatted headers | Sr Dev | QA |
| 12 | Dashboard shows role-appropriate KPI cards with real-time data | Jr Dev | QA |
| 13 | All report data is hospital-scoped (multi-tenant isolation) | Sr Dev | QA |
| 14 | All endpoints have `authenticate` + `requirePermission` middleware | Sr Dev | Checker |
| 15 | No `JSON.stringify` usage | Sr Dev | Checker |
| 16 | Frontend passes `tsc --noEmit` with zero errors | Both | Checker |
| 17 | All new components have Loading, Empty, and Error states | Jr Dev | QA |
| 18 | `reports:read` permission added to RBAC and mapped to all relevant roles | Sr Dev | Checker |
