# Phase 12 Tech Spec — HR & Staff Management

## 1. Architecture Decisions

### 1.1 Extend Single Routes File
`hr.routes.ts` is 207 lines with 7 endpoints. Adding ~12 more endpoints brings it to ~600 lines — still manageable in one file. No sub-route files needed. This follows the pattern of `pharmacy.routes.ts` (~500 lines) which stayed monolithic.

### 1.2 Hospital Scoping — CRITICAL Multi-Tenancy Fix
**Current state:** ZERO of 7 HR endpoints filter by `hospitalId`. Every other module (patients, appointments, pharmacy, insurance) does `req.user!.hospitalId!`. This is the #1 priority.

Every existing endpoint must add:
```ts
const hospitalId = req.user!.hospitalId!;
// then in every Prisma query:
where: { ...existingFilters, hospitalId }
```

Affected endpoints (all 7 existing):
- `GET /employees` — add `hospitalId` to `where` object (line 15)
- `POST /employees` — add `hospitalId` to create data (lines 57, 63)
- `PATCH /employees/:id` — add `hospitalId` to where clause (line 84)
- `GET /payroll` — add `hospitalId` to `where` (line 94)
- `POST /payroll` — add `hospitalId` to create data (line 113)
- `PATCH /payroll/:id/status` — add `hospitalId` to where on find (line 124) and update (line 142)
- `GET /attendance` — add `hospitalId` to `where` (line 148)
- `POST /attendance` — add `hospitalId` to upsert create (line 165)
- `GET /leaves` — add `hospitalId` to `where` (line 172)
- `POST /leaves` — add `hospitalId` to create data (line 191)
- `PATCH /leaves/:id/status` — add `hospitalId` to where (line 199)

### 1.3 New Prisma Models

```prisma
model ShiftTemplate {
  id           String               @id @default(uuid())
  name         String
  startTime    DateTime             @db.Time
  endTime      DateTime             @db.Time
  recurrence   WeeklyShiftPattern   @default(MON_FRI)
  days         Json?                // CUSTOM: [0,1,2,3,4] (0=Mon..6=Sun)
  isActive     Boolean              @default(true)
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
  hospitalId   String?
  hospital     Hospital?            @relation(fields: [hospitalId], references: [id])
  shifts       EmployeeShift[]

  @@unique([hospitalId, name])
  @@index([hospitalId])
  @@map("shift_templates")
}

model EmployeeShift {
  id               String                @id @default(uuid())
  date             DateTime
  status           ShiftAssignmentStatus @default(SCHEDULED)
  notes            String?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt
  employeeId       String
  shiftTemplateId  String
  hospitalId       String?
  employee         Employee              @relation(fields: [employeeId], references: [id])
  shiftTemplate    ShiftTemplate         @relation(fields: [shiftTemplateId], references: [id])
  hospital         Hospital?             @relation(fields: [hospitalId], references: [id])

  @@unique([employeeId, date])
  @@index([employeeId])
  @@index([date])
  @@index([shiftTemplateId])
  @@index([hospitalId])
  @@map("employee_shifts")
}

model LeaveBalance {
  id         String     @id @default(uuid())
  year       Int
  leaveType  LeaveType
  entitled   Int        @default(0)
  used       Int        @default(0)
  carried    Int        @default(0)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  employeeId String
  hospitalId String?
  employee   Employee   @relation(fields: [employeeId], references: [id])
  hospital   Hospital?  @relation(fields: [hospitalId], references: [id])

  @@unique([employeeId, year, leaveType])
  @@index([employeeId])
  @@index([year])
  @@index([hospitalId])
  @@map("leave_balances")
}
```

Employee model additions:
```prisma
model Employee {
  // ... existing fields ...
  emergencyContact  Json?              // { name, phone, relationship }
  documents         Json?              // [{ name, url, uploadedAt }]
  employeeShifts    EmployeeShift[]
  leaveBalances     LeaveBalance[]
}
```

New enums:
```prisma
enum WeeklyShiftPattern {
  MON_FRI
  MON_SAT
  CUSTOM
}

enum ShiftAssignmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  SWAPPED
}
```

### 1.4 Shift Scheduling Approach — Template-Based Weekly Roster
- **ShiftTemplate** defines reusable shift definitions (Morning 08:00-16:00, Night 20:00-08:00, etc.)
- **EmployeeShift** is the assignment: which employee works which shift on which date
- Bulk assign: POST `/shifts/assign` takes `{ employeeIds[], shiftTemplateId, startDate, endDate }`, generates `EmployeeShift` per employee × per applicable day (filtered by template recurrence days)
- Roster view: GET `/shifts/roster?startDate=X&endDate=Y&departmentId=Z` returns assignments grouped by date
- Template recurrence: `MON_FRI` → skip Sat/Sun, `MON_SAT` → skip Sun, `CUSTOM` → use `days` JSON array

### 1.5 Payroll Bulk Generation
POST `/payroll/generate` body: `{ period: "2026-07", departmentId?: string }`
1. Fetch all active employees (filtered by departmentId if provided)
2. For each employee: `grossPay = baseSalary`
3. Query attendance for the period → count ABSENT days → deduction = (baseSalary / workingDaysInMonth) × absentDays
4. Calculate `netPay = grossPay - deductions`
5. Create PayrollRecord per employee in a `$transaction`
6. Return generated records

### 1.6 Employee Self-Service
Endpoints prefixed with `/hr/my/` auto-resolve employeeId from authenticated user:
```ts
const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id, hospitalId } });
if (!employee) throw new NotFoundError('No employee profile linked to your account');
```

### 1.7 Payslip HTML Generation (follows `printReceipt.js` pattern)
Backend: `GET /payroll/:id/payslip` returns HTML string
- Structure: hospital header, employee info, period, earnings table (baseSalary + allowances), deductions table, net pay
- Frontend: renders in iframe or `window.open()`, then `window.print()`
- Follows the exact pattern in `frontend/src/lib/printReceipt.js:177-203`

---

## 2. Work Split

### Sr Dev Tasks (7 tasks)

#### T1 — Schema: New Models + Employee Extensions
**Files:** `backend/prisma/schema.prisma`
**Depends on:** Nothing

- Add `emergencyContact Json?` and `documents Json?` to Employee model
- Add `ShiftTemplate`, `EmployeeShift`, `LeaveBalance` models
- Add `WeeklyShiftPattern`, `ShiftAssignmentStatus` enums
- Add relation fields on Employee (`employeeShifts`, `leaveBalances`)
- Run `prisma migrate dev --name phase12_hr_shifts_leave_balance`
- Verify with `npx prisma validate`

#### T2 — Hospital-Scope ALL Existing Endpoints
**Files:** `backend/src/modules/hr/hr.routes.ts`
**Depends on:** T1

- Extract `hospitalId` from `req.user!.hospitalId!` in every endpoint
- Add `hospitalId` to every `where` filter and every `create` data object
- Add `hospitalId` to the Employee POST create data (both createUser and non-createUser paths)
- Fix `findUnique` → `findFirst` for `employeeCode` check (line 38) since `@@unique([hospitalId, employeeCode])` means single-field lookup fails
- Verify every Prisma query includes hospitalId

#### T3 — Shift Scheduling Endpoints
**Files:** `backend/src/modules/hr/hr.routes.ts`
**Depends on:** T1

New endpoints (~80 lines):
- `GET /shift-templates` — list templates, scoped by hospitalId
- `POST /shift-templates` — create template, attach hospitalId
- `PATCH /shift-templates/:id` — update template (scoped)
- `DELETE /shift-templates/:id` — soft delete (set isActive=false)
- `POST /shifts/assign` — bulk assign: iterate employees × days, respect recurrence, skip duplicates via `findFirst` + upsert
- `GET /shifts/roster?startDate&endDate&departmentId?` — return EmployeeShift[] with employee and template included
- `PATCH /shifts/:id` — update status (SWAPPED, CANCELLED)

Bulk assign algorithm:
```
for each employeeId:
  for each day in [startDate..endDate]:
    if day matches template recurrence:
      upsert EmployeeShift { employeeId, date, shiftTemplateId, hospitalId }
```

#### T4 — Leave Balance + Enhanced Leave Workflow
**Files:** `backend/src/modules/hr/hr.routes.ts`
**Depends on:** T1

New endpoints (~50 lines):
- `GET /leave-balances?employeeId&year` — returns LeaveBalance[]
- `POST /leave-balances` — upsert entitlements (admin sets annual quota)
- `PATCH /leave-balances/:id` — adjust balance manually

Modified endpoints:
- `PATCH /leaves/:id/status`: when status → APPROVED, decrement `LeaveBalance.used` for the matching type/year; when reversed from APPROVED → REJECTED/CANCELLED, increment back. Use `$transaction`.
- `GET /leaves/calendar?month&year` — return approved leaves grouped by date for calendar display

#### T5 — Payroll Bulk Generation + Payslip
**Files:** `backend/src/modules/hr/hr.routes.ts`
**Depends on:** T2

New endpoints (~60 lines):
- `POST /payroll/generate` — bulk generate with attendance-based deductions
- `GET /payroll/:id/payslip` — returns HTML payslip string (follow `printReceipt.js` pattern)
- Enhance existing `POST /payroll` to accept `earnings` and `deductions` as JSON arrays `[{label, amount}]`

Payslip HTML structure:
```
Hospital header → Employee info → Period
Earnings table: Base Salary, Allowances (from earnings JSON), Total Gross
Deductions table: Absent Deductions, Other (from deductions JSON), Total Deductions
Net Pay highlight
Footer with signatures
```

#### T6 — HR Dashboard Endpoint
**Files:** `backend/src/modules/hr/hr.routes.ts`
**Depends on:** T1, T2

Single endpoint `GET /hr/dashboard` returning:
```ts
{
  totalEmployees: number,        // count where isActive=true
  attendanceRate: number,        // today: present / total × 100
  pendingLeaves: number,         // count where status=PENDING
  upcomingBirthdays: Employee[], // hireDate in next 30 days (celebration proxy)
  departmentBreakdown: { dept: string, count: number }[],
  recentJoinees: Employee[]     // hireDate in last 30 days
}
```

All queries scoped by hospitalId.

#### T7 — Employee Self-Service Endpoints
**Files:** `backend/src/modules/hr/hr.routes.ts`
**Depends on:** T4

New endpoints (~30 lines):
- `GET /hr/my/attendance?month&year` — own attendance via userId→employee lookup
- `GET /hr/my/leaves` — own leave requests
- `POST /hr/my/leaves` — submit own leave (auto-resolves employeeId)
- `GET /hr/my/payslips?year` — own payroll records

All resolve employeeId: `prisma.employee.findFirst({ where: { userId: req.user!.id, hospitalId } })`

### Jr Dev Tasks (8 tasks)

#### T8 — Employee Detail / Profile Page
**Files:** `frontend/src/features/hr/EmployeeDetailPage.jsx` (NEW)
**Depends on:** T2

- Tabbed layout: Profile | Attendance | Leave | Payslips | Documents
- Route: `/hr/employees/:id` (params via `useParams()`)
- Profile tab: all fields including emergency contact, user account link
- Attendance tab: monthly table with check-in/out and status badges
- Leave tab: list of requests with status, balance summary
- Payslips tab: payroll records with print button
- Documents tab: list with upload action
- Loading/empty/error states on every tab
- Import from `../../components/ui/*` (NOT `../ui/`)

#### T9 — Shift Scheduling UI
**Files:** `frontend/src/features/hr/ShiftTemplatePage.jsx` (NEW), `frontend/src/features/hr/ShiftRoster.jsx` (NEW)
**Depends on:** T3

ShiftTemplatePage:
- List of templates with name, time range, recurrence, active toggle
- Create/edit modal

ShiftRoster:
- Weekly grid: rows = employees, columns = days of week
- Cells color-coded by shift template
- Bulk assign modal: select employees, template, date range
- Swap button per cell (at minimum; drag-and-drop is future)

Integration: Add "Shifts" tab to HRPage.jsx, or separate sub-route `/hr/shifts`
New hooks: `useShiftTemplates`, `useShiftRoster`, `useAssignShifts`

#### T10 — Attendance Calendar View
**Files:** `frontend/src/features/hr/AttendanceCalendar.jsx` (NEW)
**Depends on:** T4 (calendar endpoint)

- Monthly grid: rows = employees, columns = days
- Color-coded: green=present, red=absent, yellow=late, gray=half-day
- Daily summary stats bar
- Integrate as sub-tab on Attendance tab (table vs calendar toggle)
- New hook: `useHRAttendanceCalendar`

#### T11 — Leave Balance + Calendar View
**Files:** `frontend/src/features/hr/LeaveBalancePanel.jsx` (NEW), `frontend/src/features/hr/LeaveCalendar.jsx` (NEW)
**Depends on:** T4

LeaveBalancePanel:
- Grid: each leave type with entitled/used/remaining
- Admin adjust entitlements form

LeaveCalendar:
- Monthly calendar with color-coded leave overlays

Integration: Leaves tab → sub-tabs "Requests" | "Balances" | "Calendar"
New hooks: `useLeaveBalances`, `useLeaveCalendar`

#### T12 — Payroll Bulk Generation + Payslip
**Files:** `frontend/src/features/hr/PayrollGenerateModal.jsx` (NEW), `frontend/src/features/hr/PayslipView.jsx` (NEW)
**Depends on:** T5

PayrollGenerateModal:
- Select period, optional department filter
- Preview table: employees with calculated gross/deductions/net
- Generate button

PayslipView:
- Renders HTML payslip from GET endpoint
- Print button (opens in iframe, calls `window.print()`)

New hooks: `useGeneratePayroll`, `usePayslip`

#### T13 — HR Dashboard
**Files:** `frontend/src/features/hr/HRDashboard.jsx` (NEW)
**Depends on:** T6

- Stat cards: Total Employees, Attendance Rate (%), Pending Leaves, Recent Joinees
- Department breakdown bar chart (div-based, no chart lib)
- Upcoming birthdays list
- Quick action links: Add Employee, Generate Payroll, View Roster
- New hook: `useHRDashboard`
- Integrate as first tab on HRPage or standalone at top

#### T14 — Employee Self-Service Portal
**Files:** `frontend/src/features/hr/SelfServicePage.jsx` (NEW)
**Depends on:** T7, T8

- Own attendance view (table or calendar)
- Submit leave request (auto-fills from logged-in user)
- Own payslip list with print
- Route: `/hr/self-service`
- New hooks: `useMyAttendance`, `useMyLeaves`, `useMyPayslips`
- Loading/empty/error states

#### T15 — Navigation + Route Integration
**Files:** `frontend/src/config/navigation.tsx`, `frontend/src/app/App.jsx`
**Depends on:** T8–T14

Navigation updates (in Administration group, after existing HR item):
```tsx
{ label: 'HR Dashboard', icon: LayoutDashboard, path: '/hr/dashboard', requiredPermissions: ['hr:read'] },
{ label: 'HR', icon: UsersRound, path: '/hr', requiredPermissions: ['hr:read'] },
{ label: 'Shift Roster', icon: Calendar, path: '/hr/shifts', requiredPermissions: ['hr:read'] },
{ label: 'Self Service', icon: ClipboardCheck, path: '/hr/self-service', requiredPermissions: [] },
```

Route additions in App.jsx:
```tsx
const HRDashboard = lazy(() => import('../features/hr/HRDashboard'));
const EmployeeDetailPage = lazy(() => import('../features/hr/EmployeeDetailPage'));
const ShiftTemplatePage = lazy(() => import('../features/hr/ShiftTemplatePage'));
const ShiftRoster = lazy(() => import('../features/hr/ShiftRoster'));
const SelfServicePage = lazy(() => import('../features/hr/SelfServicePage'));

// Routes (all under RoleGuard hr:read):
/hr/dashboard → HRDashboard
/hr/employees/:id → EmployeeDetailPage
/hr/shifts → ShiftRoster
/hr/shift-templates → ShiftTemplatePage
/hr/self-service → SelfServicePage
```

---

## 3. Data Flow Diagrams

### 3.1 Shift Scheduling Flow
```
Admin creates ShiftTemplate
  ┌─────────────────────────────┐
  │  POST /shift-templates      │
  │  name, startTime, endTime,  │
  │  recurrence, days?          │
  └──────────┬──────────────────┘
             │
             v
Admin bulk-assigns shifts
  ┌─────────────────────────────┐
  │  POST /shifts/assign        │
  │  employeeIds[], templateId, │
  │  startDate, endDate         │
  └──────────┬──────────────────┘
             │
    ┌────────┴────────┐
    │ For each employee │
    │ × each day in     │
    │ [start..end]      │
    │ matching template  │
    │ recurrence days:   │
    └────────┬────────┘
             │
             v
  ┌─────────────────────────────┐
  │  Upsert EmployeeShift       │
  │  { employeeId, date,        │
  │    shiftTemplateId,         │
  │    hospitalId,              │
  │    status: SCHEDULED }      │
  └──────────┬──────────────────┘
             │
             v
Admin views roster
  ┌─────────────────────────────┐
  │  GET /shifts/roster         │
  │  ?startDate=X&endDate=Y     │
  │                             │
  │  Returns: {                 │
  │    "2026-07-14": [          │
  │      { employee, template,  │
  │        status }             │
  │    ],                       │
  │    "2026-07-15": [...]      │
  │  }                          │
  └─────────────────────────────┘
```

### 3.2 Leave Workflow with Balance Validation
```
Employee submits leave
  ┌─────────────────────────────┐
  │  POST /hr/my/leaves         │
  │  (or POST /leaves for admin)│
  │  type, startDate, endDate   │
  └──────────┬──────────────────┘
             │
             v
  ┌─────────────────────────────┐
  │  Check LeaveBalance:        │
  │  entitled - used - carried  │
  │  >= days requested?         │
  │  (warn but allow if not)    │
  └──────────┬──────────────────┘
             │
             v
  ┌─────────────────────────────┐
  │  Create LeaveRequest        │
  │  status: PENDING            │
  └──────────┬──────────────────┘
             │
Admin reviews
  ┌──────────┴──────────────────┐
  │  PATCH /leaves/:id/status   │
  │  status: APPROVED/REJECTED  │
  └──────────┬──────────────────┘
             │
    ┌────────┴────────┐
    │  $transaction:   │
    │  1. Update status│
    │  2. If APPROVED: │
    │     decrement    │
    │     LeaveBalance │
    │     .used count  │
    │  3. If reversed  │
    │     from APPROVED│
    │     → increment  │
    │     back         │
    └─────────────────┘
```

### 3.3 Payroll Bulk Generation Flow
```
Admin triggers bulk generation
  ┌─────────────────────────────┐
  │  POST /payroll/generate     │
  │  { period: "2026-07",       │
  │    departmentId?: "..." }   │
  └──────────┬──────────────────┘
             │
             v
  ┌─────────────────────────────┐
  │  1. Fetch active employees  │
  │     (filter by dept if set) │
  │  2. Calculate working days  │
  │     in month                │
  └──────────┬──────────────────┘
             │
    ┌────────┴────────┐
    │ For each employee │
    └────────┬────────┘
             │
             v
  ┌─────────────────────────────┐
  │  3. Count ABSENT attendance │
  │     for this employee/month│
  │                             │
  │  4. grossPay = baseSalary   │
  │                             │
  │  5. absentDeduction =       │
  │     (baseSalary / workDays) │
  │     × absentDays            │
  │                             │
  │  6. netPay = gross - deduct  │
  └──────────┬──────────────────┘
             │
             v
  ┌─────────────────────────────┐
  │  $transaction:              │
  │  Create PayrollRecord per   │
  │  employee with calculated   │
  │  amounts + earnings/deduction│
  │  breakdown as JSON          │
  └──────────┬──────────────────┘
             │
             v
  ┌─────────────────────────────┐
  │  Returns generated records  │
  │  Frontend displays in table │
  │  Admin clicks "Mark Paid"   │
  │  → creates Expense entry    │
  └─────────────────────────────┘
```

---

## 4. Exact File List

### New Files
| # | File | Type | Created By |
|---|------|------|-----------|
| 1 | `backend/prisma/migrations/.../migration.sql` | Migration | T1 (auto) |
| 2 | `frontend/src/features/hr/EmployeeDetailPage.jsx` | React | T8 |
| 3 | `frontend/src/features/hr/ShiftTemplatePage.jsx` | React | T9 |
| 4 | `frontend/src/features/hr/ShiftRoster.jsx` | React | T9 |
| 5 | `frontend/src/features/hr/AttendanceCalendar.jsx` | React | T10 |
| 6 | `frontend/src/features/hr/LeaveBalancePanel.jsx` | React | T11 |
| 7 | `frontend/src/features/hr/LeaveCalendar.jsx` | React | T11 |
| 8 | `frontend/src/features/hr/PayrollGenerateModal.jsx` | React | T12 |
| 9 | `frontend/src/features/hr/PayslipView.jsx` | React | T12 |
| 10 | `frontend/src/features/hr/HRDashboard.jsx` | React | T13 |
| 11 | `frontend/src/features/hr/SelfServicePage.jsx` | React | T14 |

### Modified Files
| # | File | Changes | Modified By |
|---|------|---------|-------------|
| 1 | `backend/prisma/schema.prisma` | Add 3 models, 2 enums, 2 fields on Employee | T1 |
| 2 | `backend/src/modules/hr/hr.routes.ts` | hospitalId scoping on all endpoints + ~12 new endpoints | T2–T7 |
| 3 | `frontend/src/features/hr/HRPage.jsx` | Add Dashboard/Shifts tabs, convert to tab shell | T13, T15 |
| 4 | `frontend/src/hooks/queries/useHR.js` | Add ~10 new hooks + query keys | T8–T14 |
| 5 | `frontend/src/config/navigation.tsx` | Add HR sub-items | T15 |
| 6 | `frontend/src/app/App.jsx` | Add 5 new routes | T15 |

---

## 5. Pattern References

| Pattern | Reference File | Line(s) | What to Follow |
|---------|---------------|---------|----------------|
| hospitalId scoping | `backend/src/modules/patients/patients.routes.ts` | 48, 77, 151 | `const hospitalId = req.user!.hospitalId!;` then `where: { ...filters, hospitalId }` |
| findUnique → findFirst | `backend/src/modules/patients/patients.routes.ts` | 77, 151 | Use `findFirst` when composite unique exists |
| CRUD endpoint pattern | `backend/src/modules/insurance/routes/insuranceCompany.routes.ts` | 12–106 | GET list, POST create, PATCH update, soft-delete |
| Audit middleware | `backend/src/modules/hr/hr.routes.ts` | 119 | `auditMiddleware('PAYROLL_PAY', 'PayrollRecord')` |
| Expense auto-creation | `backend/src/modules/hr/hr.routes.ts` | 128–140 | On PAYROLL status→PAID, create Expense |
| React Query hooks | `frontend/src/hooks/queries/useHR.js` | 1–64 | `hrKeys` factory, `useQuery`/`useMutation` pattern |
| Tabbed page layout | `frontend/src/features/hr/HRPage.jsx` | 158–163 | Button group for tab switching, conditional render |
| HTML print pattern | `frontend/src/lib/printReceipt.js` | 177–203 | Build HTML → iframe → `window.print()` |
| Modal pattern | `frontend/src/features/hr/HRPage.jsx` | 356–426 | `<Modal open={show} onClose={...} title="...">` |
| Form + mutation | `frontend/src/features/hr/HRPage.jsx` | 62–80 | `handleCreate` with loading/error state, queryClient.invalidateQueries |
| Loading/empty states | `frontend/src/features/hr/HRPage.jsx` | 174–178 | Three branches: loading → empty → data |
| Route pattern | `frontend/src/app/App.jsx` | 157 | `<Route path="/hr" element={<ProtectedRoute><RoleGuard requiredPermissions={['hr:read']}><HRPage /></RoleGuard></ProtectedRoute>} />` |
| Lazy import pattern | `frontend/src/app/App.jsx` | 42 | `const HRPage = lazy(() => import('../features/hr/HRPage'));` |

---

## 6. Key Gotchas

### G1: hospitalId Must Be Added to ALL Existing Queries
**Severity: CRITICAL.** Currently 0/7 endpoints scope by hospitalId. This means Hospital A can see Hospital B's employees. T2 is the highest priority task. Every `findMany`, `findFirst`, `create`, `update`, `upsert` must include `hospitalId` in the `where` clause or `create` data.

### G2: findUnique → findFirst for Single-Record Lookups
The `Employee` model has `@@unique([hospitalId, employeeCode])`. This means `prisma.employee.findFirst({ where: { employeeCode } })` must be used instead of `findUnique`. The existing code at line 38 already uses `findFirst` — verify this pattern holds for all new lookups too.

### G3: Existing Shift Model is POS, NOT HR
`Shift` (schema line 1077) is a POS cash register shift with `openingBalance`, `denominations`, etc. New HR scheduling models are named `ShiftTemplate` and `EmployeeShift` to avoid any collision. Never reference the POS `Shift` model from HR code.

### G4: HRPage.jsx Tab Architecture
The existing page (548 lines) uses 4 tabs. New features (Dashboard, Shifts) should ADD tabs to this shell, not replace it. Eventually the page becomes a thin shell with tab routing. Don't let it grow beyond ~200 lines — extract tab content into separate components.

### G5: Leave Approval Balance Integration
The existing `PATCH /leaves/:id/status` (line 197) directly updates status. This MUST be wrapped in `$transaction` to atomically update both the LeaveRequest status AND the LeaveBalance used count. Failing to do this risks race conditions where concurrent approvals could double-decrement.

### G6: Payslip HTML Must Be Self-Contained
The payslip endpoint returns a full HTML document (not a React component) so it can be rendered in an iframe and printed. Follow the `printReceipt.js` pattern exactly: complete `<!DOCTYPE html>` with inline styles, no external CSS dependencies.

### G7: Bulk Shift Assignment Must Handle Duplicates
When assigning shifts for a date range, the upsert on `@@unique([employeeId, date])` means re-running assignment won't create duplicates — it updates existing ones. Use `findFirst` to check, then upsert.

### G8: Payroll Bulk Generation Edge Cases
- Employees hired mid-period: pro-rate salary based on working days since hireDate
- Skip employees with `isActive = false`
- If no attendance data exists for an employee, assume full attendance (no deductions)
- Working days in month: count Mon–Fri (or Mon–Sat if hospital standard)

### G9: Frontend Import Paths
All new HR components in `frontend/src/features/hr/` must import UI from `../../components/ui/` NOT `../ui/`. This is a documented recurring error (AGENTS.md line 39).

### G10: Self-Service Employee Resolution
Self-service endpoints must resolve employeeId from the authenticated user's `userId`. If no Employee record is linked to the logged-in user, return a clear error message, not a generic 500.

---

## 7. Execution Order

```
T1 (Sr) ─── Schema migration ───┐
                                  │
         ┌────────────────────────┤
         │                        │
    T2 (Sr)                  T3 (Sr)
    Hospital scoping          Shifts CRUD
         │                        │
    ┌────┴────┐              ┌────┴────┐
    │         │              │         │
  T4 (Sr)  T6 (Sr)        T7 (Sr)  T5 (Sr)
  Leave     Dashboard     Self-    Payroll
  Balance                Service    Bulk
    │         │              │         │
    │    T13 (Jr)            │    T12 (Jr)
    │    HRDashboard         │    Payroll UI
    │         │              │         │
  T10(T4→Jr) T11(T4→Jr)  T14(Jr)
  Att Cal    Leave Cal    Self-Service UI
    │         │              │
    └─────────┴──────────────┘
              │
         T15 (Jr) ── Routes + Nav
```

Parallel safe after T1: T2, T3 can run simultaneously.
T4, T5, T6, T7 can all run in parallel after T2.
Jr Dev tasks can start as soon as their Sr Dev dependency completes.
T15 is always last — integration pass.
