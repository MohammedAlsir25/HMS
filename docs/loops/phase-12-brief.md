# Phase 12 Brief — HR & Staff Management

## 1. Phase Goal

Complete the HR & Staff module by building the missing subsystems — shift scheduling, attendance calendar/report, leave balance tracking, payroll bulk generation, payslip PDF, HR dashboard, and employee self-service — on top of a solid existing foundation of employee CRUD, basic attendance, basic payroll, and leave request/approval.

---

## 2. Executive Summary — What Already Exists

| Area | Status | What Exists | File Path | What's Missing |
|------|--------|-------------|-----------|----------------|
| **Employee CRUD** | ~80% | List with search/filter, create (with optional user account link), edit modal, department/position dropdowns | `backend/src/modules/hr/hr.routes.ts:13-90`, `frontend/src/features/hr/HRPage.jsx` | Emergency contact fields, document upload, employee detail/profile page |
| **Attendance** | ~60% | Check-in/check-out per employee per date, status dropdown (PRESENT/ABSENT/LATE/HALF_DAY), notes, upsert by employeeId+date | `backend/src/modules/hr/hr.routes.ts:146-168`, `HRPage.jsx:220-314` | Daily attendance report endpoint, calendar view (monthly grid), attendance summary stats |
| **Payroll** | ~50% | Manual single-record create, list by period, mark PAID (auto-creates Expense), net pay calculation | `backend/src/modules/hr/hr.routes.ts:92-144`, `HRPage.jsx:185-218` | Bulk payroll generation for all employees in a period, automatic gross calculation from baseSalary + attendance, payslip PDF/HTML generation |
| **Leave Management** | ~50% | Submit request, approve/reject workflow, list with status filter | `backend/src/modules/hr/hr.routes.ts:170-204`, `HRPage.jsx:317-354` | Leave balance tracking (earned/used/remaining per type per employee), calendar view of approved leaves, leave policy (annual quota per type) |
| **Shift Scheduling** | 0% | Nothing (existing `Shift` model is POS cash register shift, NOT HR shift scheduling) | — | Shift templates, shift assignments, weekly/monthly roster view |
| **HR Dashboard** | 0% | Nothing | — | Headcount, attendance rate, pending leaves, upcoming birthdays, department breakdown |
| **Employee Self-Service** | 0% | Nothing | — | Own attendance view, own leave submission, own payslip viewing |
| **Backend Hooks** | ~60% | 7 hooks: useHREmployees, useHRPayroll, useHRLeaves, useHRAttendance, useUpdatePayrollStatus, useUpdateLeaveStatus, useUpsertAttendance | `frontend/src/hooks/queries/useHR.js` | Hooks for shifts, leave balance, bulk payroll, payslip, dashboard, self-service |
| **Navigation & Route** | ✅ Done | HR item in Administration sidebar, `/hr` route with RoleGuard `hr:read` | `frontend/src/config/navigation.tsx:157`, `App.jsx:157` | Additional routes for sub-pages (self-service, shifts roster) |
| **Prisma Models** | ~70% | Employee, PayrollRecord, Attendance, LeaveRequest (all with hospitalId scoping) | `backend/prisma/schema.prisma:1280-1380` | Shift template model, EmployeeShift assignment model, LeaveBalance model, emergency contact + documents fields on Employee |
| **Enums** | ~80% | PayrollStatus, AttendanceStatus, LeaveType, LeaveStatus | `schema.prisma:1952-1980` | ShiftTemplate recurrence pattern enum |

---

## 3. Tasks

### T1 — DB Schema Changes: New Models + Employee Extensions
**Complexity:** L | **Depends on:** Nothing | **Who:** Sr Dev

- `backend/prisma/schema.prisma` — Add fields to Employee: `emergencyContact Json?`, `documents Json?` (array of {name, url, uploadedAt})
- Add new model `ShiftTemplate` with fields: id, hospitalId, name (e.g. "Morning Shift"), startTime (Time), endTime (Time), recurrence (WeeklyShiftPattern enum: MON_FRI, MON_SAT, CUSTOM), days Json? (for CUSTOM: array of day indices), isActive, createdAt, updatedAt
- Add new model `EmployeeShift` with fields: id, hospitalId, employeeId (FK→Employee), shiftTemplateId (FK→ShiftTemplate), date (DateTime), status (ShiftAssignmentStatus enum: SCHEDULED, COMPLETED, CANCELLED, SWAPPED), notes, createdAt, updatedAt. Unique constraint on [employeeId, date]
- Add new model `LeaveBalance` with fields: id, hospitalId, employeeId (FK→Employee), year (Int), leaveType (LeaveType), entitled (Int default 0), used (Int default 0), carried (Int default 0). Unique constraint on [employeeId, year, leaveType]
- Add enums: `WeeklyShiftPattern` (MON_FRI, MON_SAT, CUSTOM), `ShiftAssignmentStatus` (SCHEDULED, COMPLETED, CANCELLED, SWAPPED)
- Run `prisma migrate dev --name phase12_hr_shifts_leave_balance`
- Verify with `npx prisma validate`

### T2 — Backend: Employee Profile Enhancements
**Complexity:** M | **Depends on:** T1 | **Who:** Sr Dev

- `backend/src/modules/hr/hr.routes.ts` — Enhance POST /employees and PATCH /employees/:id to accept `emergencyContact` (JSON: {name, phone, relationship}) and `documents` (JSON array)
- Add GET /employees/:id endpoint returning full employee profile with relations (dept, user, recent attendance, active leaves)
- Add hospitalId scoping to ALL existing employee queries (currently missing — critical multi-tenant gap)
- Add hospitalId scoping to ALL payroll, attendance, and leave queries

### T3 — Backend: Shift Scheduling Endpoints
**Complexity:** L | **Depends on:** T1 | **Who:** Sr Dev

- `backend/src/modules/hr/hr.routes.ts` — Add full CRUD endpoints:
  - GET /shift-templates — list all shift templates for hospital
  - POST /shift-templates — create template
  - PATCH /shift-templates/:id — update template
  - DELETE /shift-templates/:id — soft delete
  - POST /shifts/assign — bulk assign shifts: takes {employeeIds[], shiftTemplateId, startDate, endDate} and generates EmployeeShift records for each employee × each day in range (respecting template recurrence)
  - GET /shifts/roster — query params: startDate, endDate, departmentId? — returns EmployeeShift[] grouped by date for roster view
  - PATCH /shifts/:id — update assignment status (swap, cancel)
- All endpoints: `authenticate`, `requirePermission(PERMISSIONS.HR_WRITE)` for writes, `HR_READ` for reads
- All queries scoped by hospitalId

### T4 — Backend: Leave Balance + Enhanced Leave Endpoints
**Complexity:** M | **Depends on:** T1 | **Who:** Sr Dev

- `backend/src/modules/hr/hr.routes.ts` — Add:
  - GET /leave-balances?employeeId&year — returns LeaveBalance[] for the employee/year
  - POST /leave-balances — initialize/update leave entitlements (admin sets annual quota per type)
  - PATCH /leave-balances/:id — adjust balance
  - Modify POST /leaves: auto-decrement `used` count on LeaveBalance when leave is APPROVED
  - Modify PATCH /leaves/:id/status: when status changes to APPROVED, decrement LeaveBalance.used; when changed from APPROVED to REJECTED/CANCELLED, increment back
  - GET /leaves/calendar?month&year — returns approved leaves formatted for calendar display (grouped by date)

### T5 — Backend: Payroll Bulk Generation + Payslip
**Complexity:** L | **Depends on:** T2 | **Who:** Sr Dev

- `backend/src/modules/hr/hr.routes.ts` — Add:
  - POST /payroll/generate — body: {period, departmentId?}. Fetches all active employees (optionally filtered by department), calculates grossPay from baseSalary, fetches attendance count for the period to calculate absent deductions (configurable per-day rate), creates PayrollRecord for each employee. Returns list of generated records.
  - GET /payroll/:id/payslip — generates HTML payslip (employee info, period, earnings breakdown, deductions breakdown, net pay). Returns HTML string for print.
- Enhancement to existing POST /payroll: accept `earnings` and `deductions` as JSON arrays [{label, amount}] for detailed breakdown instead of just flat numbers
- Add Zod validation schemas for all new endpoints

### T6 — Backend: HR Dashboard Endpoint
**Complexity:** S | **Depends on:** T1, T2 | **Who:** Sr Dev

- `backend/src/modules/hr/hr.routes.ts` — Add:
  - GET /hr/dashboard — returns:
    - `totalEmployees` (active count)
    - `attendanceRate` (today: present / total active employees × 100)
    - `pendingLeaves` (count of PENDING LeaveRequests)
    - `upcomingBirthdays` (employees with hireDate in next 30 days — for celebration; alternatively store a dateOfBirth field)
    - `departmentBreakdown` (employee count grouped by department)
    - `recentJoinees` (employees hired in last 30 days)
  - All queries scoped by hospitalId

### T7 — Backend: Employee Self-Service Endpoints
**Complexity:** S | **Depends on:** T4 | **Who:** Sr Dev

- `backend/src/modules/hr/hr.routes.ts` — Add:
  - GET /hr/my/attendance?month&year — authenticated employee sees own attendance
  - GET /hr/my/leaves — employee sees own leave requests
  - POST /hr/my/leaves — employee submits own leave (auto-resolves employeeId from user)
  - GET /hr/my/payslips?year — employee sees own payroll records
- All endpoints resolve employeeId from `req.user.id` via User→Employee link (userId FK)

### T8 — Frontend: Employee Detail / Profile Page
**Complexity:** M | **Depends on:** T2 | **Who:** Jr Dev

- Create `frontend/src/features/hr/EmployeeDetailPage.jsx` — separate page (not just modal):
  - Tabbed layout: Profile | Attendance | Leave | Payslips | Documents
  - Profile tab: all employee fields, emergency contact display/edit, user account link
  - Attendance tab: monthly calendar grid showing check-in/out per day, status badges
  - Leave tab: list of own leave requests with status, balance summary
  - Payslips tab: list of payroll records with print/download
  - Documents tab: list of uploaded documents with upload action
- Loading/empty/error states on every tab
- Route: `/hr/employees/:id`

### T9 — Frontend: Shift Scheduling UI
**Complexity:** XL | **Depends on:** T3 | **Who:** Sr Dev

- Create `frontend/src/features/hr/ShiftTemplatePage.jsx`:
  - List of shift templates with name, time range, recurrence, active toggle
  - Create/edit modal for templates
- Create `frontend/src/features/hr/ShiftRoster.jsx`:
  - Weekly/monthly grid view (rows = employees, columns = days)
  - Cells show assigned shift color-coded by template
  - Bulk assign modal: select employees, select template, date range → generates assignments
  - Drag-and-drop to swap assignments (future enhancement — at minimum, swap button per cell)
- Add tabs to HRPage: "Shifts" tab showing ShiftRoster, or separate sub-routes
- New React Query hooks: `useShiftTemplates`, `useShiftRoster`, `useAssignShifts` in `useHR.js`
- Loading/empty/error states

### T10 — Frontend: Attendance Calendar View + Daily Report
**Complexity:** M | **Depends on:** T4 (backend calendar endpoint) | **Who:** Jr Dev

- Create `frontend/src/features/hr/AttendanceCalendar.jsx`:
  - Monthly grid showing attendance status per employee per day
  - Color-coded cells: green=present, red=absent, yellow=late, gray=half-day
  - Click cell to see details / edit
- Add daily summary stats bar: total present, absent, late, half-day counts
- Integrate as sub-tab or view toggle (table vs calendar) on the Attendance tab
- New hook: `useHRAttendanceCalendar` in `useHR.js`

### T11 — Frontend: Leave Balance + Calendar View
**Complexity:** M | **Depends on:** T4 | **Who:** Jr Dev

- Create `frontend/src/features/hr/LeaveBalancePanel.jsx`:
  - Grid showing each leave type with entitled/used/remaining for selected employee
  - Admin can set/adjust entitlements
- Create `frontend/src/features/hr/LeaveCalendar.jsx`:
  - Monthly calendar with color-coded leave overlays per employee
- Integrate into Leaves tab of HRPage as sub-tabs: "Requests" | "Balances" | "Calendar"
- New hooks: `useLeaveBalances`, `useLeaveCalendar` in `useHR.js`

### T12 — Frontend: Payroll Bulk Generation + Payslip
**Complexity:** M | **Depends on:** T5 | **Who:** Jr Dev

- Create `frontend/src/features/hr/PayrollGenerateModal.jsx`:
  - Select period, optional department filter
  - Preview: shows list of employees with calculated gross, deductions, net before confirming
  - Generate button → calls POST /payroll/generate
- Create `frontend/src/features/hr/PayslipView.jsx`:
  - Renders HTML payslip from GET /payroll/:id/payslip
  - Print button
- Add "Generate Payroll" button to Payroll tab of HRPage
- New hooks: `useGeneratePayroll`, `usePayslip` in `useHR.js`

### T13 — Frontend: HR Dashboard
**Complexity:** M | **Depends on:** T6 | **Who:** Jr Dev

- Create `frontend/src/features/hr/HRDashboard.jsx`:
  - Stat cards: Total Employees, Today Attendance Rate (%), Pending Leave Requests, Recent Joinees
  - Department breakdown bar chart (simple div-based, no chart lib needed)
  - Upcoming birthdays / work anniversaries list
  - Quick action links: Add Employee, Generate Payroll, View Roster
- New hook: `useHRDashboard` in `useHR.js`
- Integrate as first tab on HRPage or as standalone widget at top of HRPage

### T14 — Frontend: Employee Self-Service Portal
**Complexity:** L | **Depends on:** T7, T8 | **Who:** Jr Dev

- Create `frontend/src/features/hr/SelfServicePage.jsx`:
  - Own attendance view (calendar or table)
  - Submit leave request form (same as existing but auto-fills employee from logged-in user)
  - Own payslip list with print
  - Route: `/hr/self-service` or accessible from HR page when logged-in user has linked Employee record
- Navigation item: add "My HR" or "Self Service" sub-item under HR group
- New hooks: `useMyAttendance`, `useMyLeaves`, `useMyPayslips` in `useHR.js`
- Loading/empty/error states

### T15 — Navigation + Route Integration
**Complexity:** S | **Depends on:** T8-T14 | **Who:** Jr Dev

- `frontend/src/config/navigation.tsx` — Update HR nav group:
  - Add items: Dashboard, Shift Roster, Self Service
- `frontend/src/app/App.jsx` — Add routes:
  - `/hr/dashboard` → HRDashboard
  - `/hr/employees/:id` → EmployeeDetailPage
  - `/hr/shifts` → ShiftRoster
  - `/hr/shift-templates` → ShiftTemplatePage
  - `/hr/self-service` → SelfServicePage

---

## 4. Acceptance Criteria

- [ ] Employee profile page shows personal info, emergency contact, department, hire date, salary, documents, and linked user account
- [ ] Employee list supports CRUD with department and status filtering (exists — verify hospital scoping)
- [ ] Attendance tracking records check-in/out with daily summaries and monthly calendar view
- [ ] Attendance calendar shows color-coded status per employee per day
- [ ] Shift templates can be created with name, start/end time, and recurrence pattern
- [ ] Shift roster shows weekly/monthly grid of employee assignments
- [ ] Bulk shift assignment generates correct EmployeeShift records respecting template recurrence
- [ ] Leave requests follow approval workflow (exists — verify balance tracking integration)
- [ ] Leave balance shows entitled/used/remaining per type per employee
- [ ] Leave calendar shows approved leaves on monthly grid
- [ ] Payroll can be bulk-generated for a period with accurate gross/deductions/net calculations
- [ ] Payslip renders as printable HTML with earnings and deductions breakdown
- [ ] HR dashboard shows headcount, attendance rate, pending leaves, department breakdown
- [ ] Employee self-service allows viewing own attendance, submitting leaves, viewing payslips
- [ ] All HR data is hospital-scoped (every query filters by hospitalId)
- [ ] All new components have loading, empty, and error states
- [ ] `tsc --noEmit` passes with zero errors on both frontend and backend
- [ ] `npm run build` succeeds on frontend

---

## 5. Work Split

### Sr Dev Tasks (7 tasks)
| Task | Description | Complexity | Dependencies |
|------|-------------|------------|--------------|
| T1 | DB schema changes: new models + Employee extensions | L | None |
| T2 | Employee profile enhancement + hospitalId scoping audit | M | T1 |
| T3 | Shift scheduling CRUD + bulk assign endpoints | L | T1 |
| T4 | Leave balance model + enhanced leave workflow | M | T1 |
| T5 | Payroll bulk generation + payslip HTML endpoint | L | T2 |
| T6 | HR dashboard endpoint | S | T1, T2 |
| T7 | Employee self-service endpoints | S | T4 |

### Jr Dev Tasks (8 tasks)
| Task | Description | Complexity | Dependencies |
|------|-------------|------------|--------------|
| T8 | Employee detail/profile page with tabs | M | T2 |
| T9 | Shift scheduling UI (templates + roster grid) | XL | T3 |
| T10 | Attendance calendar view + daily report | M | T4 |
| T11 | Leave balance panel + leave calendar | M | T4 |
| T12 | Payroll bulk generation modal + payslip view | M | T5 |
| T13 | HR dashboard component | M | T6 |
| T14 | Employee self-service portal | L | T7, T8 |
| T15 | Navigation + route integration | S | T8-T14 |

### Coordination Points
1. **T1→All**: Schema must be migrated before any Jr Dev frontend work begins
2. **T2→T8**: Employee detail page needs the profile endpoint from T2
3. **T3→T9**: Roster UI depends on shift endpoints being stable
4. **T4→T10, T11**: Calendar endpoints needed for attendance and leave calendar views
5. **T5→T12**: Payslip HTML format must be agreed upon before frontend renders it
6. **T6→T13**: Dashboard data shape must match what HRDashboard expects
7. **T7+T8→T14**: Self-service needs both backend endpoints and the Employee link resolution
8. **All→T15**: Routes/navigation added last after all pages exist

### Execution Order
```
T1 (Sr) → [T2, T3, T4, T6, T7] can run in parallel (Sr)
                ↓
[T8, T9, T10, T11, T12, T13] can run in parallel (Jr, after their Sr deps)
                ↓
T14 (Jr, needs T7 + T8)
                ↓
T15 (Jr, integration — last)
```

---

## 6. Files Likely Impacted

### New Files
| File | Description |
|------|-------------|
| `backend/prisma/migrations/.../migration.sql` | Schema migration for new models |
| `frontend/src/features/hr/EmployeeDetailPage.jsx` | Employee profile/detail page |
| `frontend/src/features/hr/ShiftTemplatePage.jsx` | Shift template management |
| `frontend/src/features/hr/ShiftRoster.jsx` | Weekly/monthly shift roster grid |
| `frontend/src/features/hr/AttendanceCalendar.jsx` | Monthly attendance calendar |
| `frontend/src/features/hr/LeaveBalancePanel.jsx` | Leave balance display + admin adjust |
| `frontend/src/features/hr/LeaveCalendar.jsx` | Monthly leave calendar |
| `frontend/src/features/hr/PayrollGenerateModal.jsx` | Bulk payroll generation UI |
| `frontend/src/features/hr/PayslipView.jsx` | Printable payslip component |
| `frontend/src/features/hr/HRDashboard.jsx` | HR dashboard with stat cards |
| `frontend/src/features/hr/SelfServicePage.jsx` | Employee self-service portal |

### Modified Files
| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Add ShiftTemplate, EmployeeShift, LeaveBalance models; add fields to Employee; add enums |
| `backend/src/modules/hr/hr.routes.ts` | Add ~12 new endpoints; hospitalId scoping audit on all existing endpoints; enhanced leave/payroll logic |
| `frontend/src/features/hr/HRPage.jsx` | Add new tabs (Dashboard, Shifts), restructure as shell that routes to sub-pages |
| `frontend/src/hooks/queries/useHR.js` | Add ~10 new React Query hooks for shifts, balances, dashboard, self-service, bulk payroll, payslip |
| `frontend/src/config/navigation.tsx` | Add HR sub-items (Dashboard, Shifts, Self Service) |
| `frontend/src/app/App.jsx` | Add 5 new routes under /hr/* |

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **HospitalId scoping gap** — Existing HR endpoints may not filter by hospitalId, causing data leakage across tenants | Critical | High | T2 includes explicit audit of ALL existing queries; must verify every findMany/findFirst has hospitalId filter |
| **Existing Shift model confusion** — The `Shift` model in schema.prisma is a POS cash register shift, NOT an HR shift. New model names must be unambiguous | Medium | High | Named new models `ShiftTemplate` and `EmployeeShift` to avoid collision |
| **HRPage.jsx bloat** — Current page is 548 lines with 4 tabs already; adding more will be unmaintainable | Medium | Medium | T8-T14 create separate page files; HRPage becomes a tab shell routing to sub-components |
| **Payroll bulk generation edge cases** — Employees hired mid-period, terminated employees, employees with no attendance records | Medium | Medium | T5 must handle: pro-rated salary for mid-month hires, skip inactive employees, default to full salary when no attendance data |
| **Leave balance race condition** — Concurrent approve/reject requests could double-decrement balance | Low | Low | Use Prisma $transaction for leave status change + balance update |
| **Large roster grid performance** — Monthly roster with 50+ employees × 30 days could be slow to render | Low | Medium | Virtualize grid if needed; lazy-load cells outside viewport |
| **File write reliability** — Per AGENTS.md, subagents may not persist writes reliably | Medium | Medium | All file writes must be read back to verify; include explicit read-back instructions in prompts |
