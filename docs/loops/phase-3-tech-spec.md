# Phase 3 Tech Spec: Appointments & Reception

**Date:** 2026-07-16  
**Author:** Tech Lead  
**Status:** Ready for implementation  
**Depends on:** Phase 0 (hospitalId in auth context), Phase 1 (navigation + role guarding), Phase 2 (patients)

---

## 1. Key Architectural Decisions

### 1.1 Calendar Data Fetched as a Flat Array, Grouped Client-Side

**Decision:** `GET /appointments/calendar` returns a flat array of appointments. Grouping by date then by clinic happens in the frontend.

**Rationale:** Grouping at the query level (SQL GROUP BY) would require raw queries or a nested JSON structure that Prisma doesn't produce natively. A flat array is simpler to cache, paginate, and debug. The frontend calendar component already needs to rearrange data for its time-slot grid — a flat array fits naturally.

### 1.2 Stats Use Prisma Aggregation (Not Raw SQL)

**Decision:** `GET /appointments/stats` computes counts via `prisma.appointment.count()` for each status and type individually, then calculates average wait time from fetched `CALLED`/`IN_PROGRESS` timestamps. No raw SQL, no GROUP BY.

**Rationale:** The dataset is bounded (today's appointments, < 1000 rows per hospital). Running 8-10 individual `count()` queries is fast, readable, and avoids raw SQL. Average wait time is computed as `NOW() - createdAt` for appointments that entered `IN_PROGRESS` today — this is a simple `findMany` + JS reduce.

### 1.3 Queue Board Uses Existing `GET /queue/:clinicId` Data

**Decision:** The Kanban queue board (`QueueBoard.jsx`) polls the same `GET /reception/queue/:clinicId` endpoint that already exists — no new backend endpoint needed for the board. The endpoint already returns appointments grouped by clinic with patient data.

**Rationale:** The existing queue endpoint already returns all queue items with `patient` includes. Adding a separate "board" endpoint would duplicate logic. The four Kanban columns are just a re-rendering (client-side filter by `appointment.status`) of the same data.

### 1.4 `remindedAt` Field via Prisma Migration, Not a New Table

**Decision:** Add an optional `remindedAt` DateTime field to the `Appointment` model. No separate `Notification` or `Reminder` table.

**Rationale:** A boolean/timestamp on the appointment itself is the simplest tracking mechanism. A separate table adds join complexity for zero benefit — reminders are per-appointment, one-to-one. The field defaults to `null`; after a reminder is sent, the job sets `remindedAt` to `new Date()`.

### 1.5 Reminder Job Runs as a Module Import, Not a Separate Cron Process

**Decision:** The reminder job is a plain async function exported from `appointment-reminder.job.ts`. It is imported and scheduled in the backend entry point (`src/index.ts` or equivalent) using `setInterval` with hourly checking. The job itself does not install OS-level cron.

**Rationale:** The codebase has no cron scheduler (no `node-cron`, no `bull`, no `agenda`). Adding one for a single job is over-engineering. A `setInterval` at startup checks every hour whether the job should run (simple time math: check if 60+ minutes have passed since last run). If the backend is restarted, the interval resets — acceptable for an SMS/email placeholder.

### 1.6 Hospital Scoping Fix — Explicit `hospitalId` in Every Query

**Decision:** Every appointment and queue query in `queue.routes.ts` and `appointments.routes.ts` (reception module) gets an explicit `hospitalId: req.user!.hospitalId!` filter. Following the Phase 2 approach.

**Rationale:** Same as Phase 2 S5. Prisma middleware only validates writes. Read queries must filter explicitly. The existing endpoints query across all hospitals — this is a data leak.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Calendar grouping | Flat array, grouped client-side | Simplest API shape; Prisma doesn't natively GROUP BY into nested JSON |
| Stats aggregation | Multiple `prisma.appointment.count()` calls | Dataset is bounded (< 1000/day); readable; no raw SQL |
| Queue board data source | Existing `GET /queue/:clinicId` | No new endpoint needed; board is just a re-rendering of existing data |
| `remindedAt` storage | New optional field on `Appointment` model | One-to-one with appointment; no join needed |
| Reminder scheduling | `setInterval` at startup, not OS cron | No cron library in codebase; acceptable for placeholder |
| Hospital scoping | Explicit `hospitalId` filter on every query | Follows Phase 2 pattern; middleware only validates writes |
| New appointment route | Register in `App.jsx` at `/appointments` | Consistent with Phase 1 route registration pattern |
| Appointment modal wire logic | Conditional endpoint: WALKIN → `POST /reception/check-in`, RESERVATION → `POST /reception/reservations` | Both endpoints exist; no new backend endpoint for create |
| Waiting room patient names | Update `GET /waiting-room` include to always include `patient.fullName` | Currently returns token + status; brief asks for patient name in "Now Serving" |
| Estimated wait time | Computed client-side from `createdAt` of WAITING appointments | No server-side wait-time tracking needed; simple JS Date math |

---

## 3. Work Split

### 3.1 Sr Dev — Backend Endpoints & Security (estimated 2.5–3 days)

**Order:** 2.8 (hospital scoping — critical security, unblocks everything) → 2.1 (calendar endpoint) → 2.2 (stats endpoint) → 2.6 (reminder job + migration) → 2.10 (waiting room endpoint fix).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.1 | Calendar Endpoint | `appointments.routes.ts` | S | Flat array query with date range, clinic/doctor filter. Hospital-scoped from start. |
| 2.2 | Statistics Endpoint | `appointments.routes.ts` | S | Multiple count queries + average wait time calculation. Hospital-scoped. |
| 2.6 | Reminder System | `appointment-reminder.job.ts` + migration | M | New file. Hourly job. Prisma migration for `remindedAt` field. |
| 2.8 | Hospital Scoping Fix | `queue.routes.ts`, `appointments.routes.ts` (reception) | S | Add `hospitalId` to 5+ existing endpoints. Audit every query. |
| 2.10 | Waiting Room Endpoint Fix | `queue.routes.ts` | S | Update `GET /waiting-room` include to add `patient: { select: { fullName: true } }`. |

### 3.2 Jr Dev — Frontend Calendar, Queue Board & UI (estimated 2.5–3 days)

**Start immediately:** 2.7 (hooks — no backend dependency), 2.9 (patient detail — uses existing data), 2.10 waiting room TV — endpoint already exists).  
**After 2.1 complete:** 2.3 (calendar view depends on calendar endpoint).  
**After 2.8 complete:** 2.5 (queue board — needs hospital-scoped queue data for correctness).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.3 | Calendar View | `AppointmentCalendar.jsx` | L | New feature directory. Day/week toggle, time-slot grid, status colors, date nav, clinic filter. |
| 2.4 | Appointment Modal | `AppointmentModal.jsx` | M | Modal with patient search, clinic/doctor select, date/time, conditional endpoint wiring. |
| 2.5 | Queue Board | `QueueBoard.jsx` | L | Kanban with 4 columns. Status transitions, priority, search, auto-refresh. Integrate into ReceptionPage. |
| 2.7 | Appointment Hooks | `useAppointments.js` | S | React Query hooks following `useReception.js` patterns. |
| 2.9 | Patient Appointment History | `PatientDetailPage.jsx` | S | Richer appointment display. Status badges, filters, link to calendar. |
| 2.10 | Waiting Room TV | `WaitingRoomTV.jsx` | S | Patient names, estimated wait, last updated timestamp. |

---

## 4. Exact File Lists

### Sr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| 2.6 | `backend/src/modules/appointments/appointment-reminder.job.ts` | Hourly cron job for appointment reminders |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| 2.1/2.2 | `backend/src/modules/appointments/appointments.routes.ts` | Add `GET /appointments/calendar` (2.1), `GET /appointments/stats` (2.2) |
| 2.6 | `backend/prisma/schema.prisma` | Add `remindedAt DateTime?` field to Appointment model |
| 2.6 | New Prisma migration file | Schema sync + migration for `remindedAt` |
| 2.8 | `backend/src/modules/reception/routes/queue.routes.ts` | Add `hospitalId` to `GET /queue/stats`, `GET /queue/:clinicId`, `GET /waiting-room` |
| 2.8 | `backend/src/modules/reception/routes/appointments.routes.ts` | Add `hospitalId` to `GET /reservations`, `GET /follow-ups` |
| 2.10 | `backend/src/modules/reception/routes/queue.routes.ts` | Update `GET /waiting-room` includes |

### Jr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| 2.3 | `frontend/src/features/appointments/AppointmentCalendar.jsx` | Calendar/scheduler day/week view |
| 2.4 | `frontend/src/features/appointments/AppointmentModal.jsx` | Appointment creation/editing modal |
| 2.5 | `frontend/src/features/reception/QueueBoard.jsx` | Kanban-style queue board |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| 2.3 | `frontend/src/app/App.jsx` | Register `/appointments` route with RoleGuard |
| 2.5 | `frontend/src/features/reception/ReceptionPage.jsx` | Integrate QueueBoard as new tab or replace existing queue tab |
| 2.7 | `frontend/src/hooks/queries/useAppointments.js` | New hooks file |
| 2.9 | `frontend/src/features/patients/PatientDetailPage.jsx` | Enhance Appointments tab |
| 2.10 | `frontend/src/features/reception/WaitingRoomTV.jsx` | Patient names, estimated wait, last updated timestamp |

---

## 5. Implementation Details — Sr Dev

### 2.1 Appointment Calendar Endpoint — `appointments.routes.ts`

**Route:** `GET /appointments/calendar`  
**Permission:** `appointment:read`  
**Validation:** Query params validated inline (no Zod schema — all optional except startDate/endDate)

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string (ISO) | Yes | Start of date range |
| `endDate` | string (ISO) | Yes | End of date range |
| `clinicId` | string (uuid) | No | Filter to specific clinic |
| `doctorId` | string (uuid) | No | Filter to specific doctor |

#### Implementation

```ts
router.get('/calendar',
  authenticate,
  requirePermission(PERMISSIONS.APPOINTMENT_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, clinicId, doctorId } = req.query as Record<string, string | undefined>;

    if (!startDate || !endDate) {
      throw new ValidationError('startDate and endDate are required');
    }

    const hospitalId = req.user!.hospitalId!;
    const where: Prisma.AppointmentWhereInput = {
      hospitalId,
      scheduledAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (clinicId) where.clinicId = clinicId;
    if (doctorId) where.doctorId = doctorId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        doctor: { select: { id: true, fullName: true } },
        clinic: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ scheduledAt: 'asc' }, { token: 'asc' }],
    });

    res.json(appointments);
  })
);
```

#### Response Shape

```ts
Array<{
  id: string;
  token: number;
  type: 'WALKIN' | 'RESERVATION';
  status: AppointmentStatus;
  priority: number;
  scheduledAt: string | null;
  duration: number | null;
  notes: string | null;
  patient: { id: string; fullName: string; mrn: string };
  doctor: { id: string; fullName: string };
  clinic: { id: string; name: string; slug: string };
}>
```

Note: `duration` is not in the model yet. The field exists in the Prisma schema as `duration Int? @default(30)` — confirmed by schema inspection. Include it in the response.

#### Edge Cases

- **No appointments in range:** Return `[]` (empty array)
- **Missing startDate or endDate:** Throw `ValidationError`
- **Invalid date strings:** `new Date(invalid)` returns `Invalid Date` — Prisma query will throw. Wrap in try/catch or validate with a simple `isNaN()` check
- **Cross-hospital:** `hospitalId` is in the `where` — data is safely scoped

---

### 2.2 Appointment Statistics Endpoint — `appointments.routes.ts`

**Route:** `GET /appointments/stats`  
**Permission:** `appointment:read`  
**Query params:** `clinicId?` (optional filter)

#### Implementation

```ts
router.get('/stats',
  authenticate,
  requirePermission(PERMISSIONS.APPOINTMENT_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId!;
    const clinicId = req.query.clinicId as string | undefined;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const baseWhere: Prisma.AppointmentWhereInput = {
      hospitalId,
      createdAt: { gte: today, lt: tomorrow },
    };
    if (clinicId) baseWhere.clinicId = clinicId;

    const statuses: AppointmentStatus[] = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
    const statusCounts: Record<string, number> = {};

    for (const s of statuses) {
      statusCounts[s] = await prisma.appointment.count({
        where: { ...baseWhere, status: s },
      });
    }

    const typeCounts = {
      WALKIN: await prisma.appointment.count({
        where: { ...baseWhere, type: 'WALKIN' },
      }),
      RESERVATION: await prisma.appointment.count({
        where: { ...baseWhere, type: 'RESERVATION' },
      }),
    };

    const total = await prisma.appointment.count({ where: baseWhere });

    // Average wait time: appointments that entered IN_PROGRESS today
    const inProgressToday = await prisma.appointment.findMany({
      where: { ...baseWhere, status: 'IN_PROGRESS' },
      select: { createdAt: true },
    });

    let avgWaitTimeMinutes = 0;
    if (inProgressToday.length > 0) {
      const now = Date.now();
      const totalMs = inProgressToday.reduce((sum, a) => sum + (now - a.createdAt.getTime()), 0);
      avgWaitTimeMinutes = Math.round(totalMs / inProgressToday.length / 60000);
    }

    const noShowRate = total > 0
      ? Math.round((statusCounts['NO_SHOW'] / total) * 100)
      : 0;

    res.json({
      total,
      byStatus: statusCounts,
      byType: typeCounts,
      avgWaitTimeMinutes,
      noShowRate,
    });
  })
);
```

#### Response Shape

```ts
{
  total: number;
  byStatus: {
    WAITING: number;
    CALLED: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    NO_SHOW: number;
    CANCELLED: number;
  };
  byType: {
    WALKIN: number;
    RESERVATION: number;
  };
  avgWaitTimeMinutes: number;
  noShowRate: number; // percentage 0-100
}
```

#### Edge Cases

- **No appointments today:** Return all zero counts, `avgWaitTimeMinutes: 0`, `noShowRate: 0`
- **No IN_PROGRESS appointments:** `avgWaitTimeMinutes: 0`
- **Division by zero:** Guarded by `total > 0` check for noShowRate

---

### 2.6 Reminder System — `appointment-reminder.job.ts` + Migration

#### Prisma Migration

Add `remindedAt` field to Appointment model:

```prisma
model Appointment {
  // ... existing fields ...
  remindedAt       DateTime?
  // ... existing fields ...
}
```

#### Job File — `backend/src/modules/appointments/appointment-reminder.job.ts`

```ts
import prisma from '../../lib/prisma.js';

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startReminderJob() {
  console.log('[ReminderJob] Started (interval: 60 minutes)');
  runReminderCheck();
  setInterval(runReminderCheck, INTERVAL_MS);
}

async function runReminderCheck() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await prisma.appointment.findMany({
      where: {
        status: 'RESERVED',
        remindedAt: null,
        scheduledAt: {
          gte: now,
          lte: in24h,
        },
      },
      include: {
        patient: { select: { fullName: true, phone: true } },
        clinic: { select: { name: true } },
      },
    });

    for (const appointment of upcoming) {
      // Placeholder: console.log reminder
      // Future: send SMS via integration, send email, push notification
      console.log(
        `[ReminderJob] Reminder for ${appointment.patient.fullName} ` +
        `(phone: ${appointment.patient.phone}) ` +
        `at ${appointment.clinic.name} on ${appointment.scheduledAt?.toISOString()}`
      );

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { remindedAt: now },
      });
    }

    if (upcoming.length > 0) {
      console.log(`[ReminderJob] Sent ${upcoming.length} reminder(s)`);
    }
  } catch (err) {
    console.error('[ReminderJob] Error:', err);
  }
}
```

#### Backend Entry Point Integration

In `src/index.ts` or the equivalent entry point:

```ts
import { startReminderJob } from './modules/appointments/appointment-reminder.job.js';

// After server starts:
startReminderJob();
```

#### Edge Cases

- **No upcoming reservations:** Job runs but `findMany` returns `[]` — no updates, no errors
- **Appointment already reminded:** Filtered by `remindedAt: null`
- **ScheduledAt in the past:** Filtered by `scheduledAt: { gte: now }`
- **Job crashes mid-batch:** Each update is independent. On next run, un-reminded appointments are picked up again. Idempotent by design.

---

### 2.8 Hospital Scoping Fix — `queue.routes.ts` & `appointments.routes.ts`

#### Changes to `queue.routes.ts`

**1. `GET /queue/stats`:**

Current query aggregates across all hospitals. Add `hospitalId` filter:

```ts
const stats = await prisma.appointment.groupBy({
  by: ['clinicId'],
  where: {
    hospitalId: req.user!.hospitalId!, // NEW
    // ... existing date filter ...
  },
  // ... existing aggregation ...
});
```

If the existing code uses individual `count()` calls instead of `groupBy`, add `hospitalId` to each `where`:

```ts
const waiting = await prisma.appointment.count({
  where: {
    hospitalId: req.user!.hospitalId!, // NEW
    clinicId: someClinicId,
    status: 'WAITING',
    // ... existing date filter ...
  },
});
```

**2. `GET /queue/:clinicId`:**

Add `hospitalId` to the query where clause. The clinic already has a `hospitalId`, so joining through clinic is another option — but explicit filter is simpler:

```ts
const appointments = await prisma.appointment.findMany({
  where: {
    hospitalId: req.user!.hospitalId!, // NEW
    clinicId: req.params.clinicId,
    status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
  },
  // ... existing includes ...
});
```

**3. `GET /waiting-room`:**

```ts
const appointments = await prisma.appointment.findMany({
  where: {
    hospitalId: req.user!.hospitalId!, // NEW
    status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
  },
  // ... existing includes ...
});
```

Note: `GET /waiting-room` might not have `req.user` in the current implementation (public endpoint). If so, add hospital scoping via query param `?hospitalId=` or a default hospital. Verify by reading the actual endpoint.

#### Changes to `appointments.routes.ts` (reception module)

**4. `GET /reservations`:**

```ts
const where: Record<string, unknown> = {
  status: 'RESERVED',
  hospitalId: req.user!.hospitalId!, // NEW
};
```

**5. `GET /follow-ups`:**

```ts
const where: Record<string, unknown> = {
  status: 'RESERVED',
  visitType: 'FOLLOW_UP',
  hospitalId: req.user!.hospitalId!, // NEW
};
```

#### Verification Checklist

- [ ] `GET /queue/stats` — includes `hospitalId` filter
- [ ] `GET /queue/:clinicId` — includes `hospitalId` filter
- [ ] `GET /waiting-room` — includes `hospitalId` filter
- [ ] `GET /reservations` — includes `hospitalId` filter
- [ ] `GET /follow-ups` — includes `hospitalId` filter
- [ ] `POST /check-in` (appointment creation) — already creates with hospitalId from req.user? Verify
- [ ] `POST /reservations` (reservation creation) — already creates with hospitalId? Verify

---

### 2.10 Waiting Room Endpoint Fix — `queue.routes.ts`

**Current behavior:** `GET /waiting-room` returns appointments with token, status, and clinic data but may not include patient name.

**Fix:** Add `patient: { select: { fullName: true } }` to the include clause.

```ts
// In GET /waiting-room handler:
const appointments = await prisma.appointment.findMany({
  where: { /* ... */ },
  include: {
    clinic: { select: { name: true, slug: true } },
    patient: { select: { fullName: true, mrn: true } }, // ADD patient fullName
  },
});
```

---

## 6. Implementation Details — Jr Dev

### 2.7 Appointment Hooks — `useAppointments.js`

**File:** `frontend/src/hooks/queries/useAppointments.js`

Follow the pattern from `useReception.js`:

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const appointmentKeys = {
  calendar: (params) => ['appointments', 'calendar', params],
  stats: (clinicId) => ['appointments', 'stats', clinicId],
};

export function useAppointmentsCalendar(params) {
  return useQuery({
    queryKey: appointmentKeys.calendar(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.set('startDate', params.startDate);
      if (params.endDate) searchParams.set('endDate', params.endDate);
      if (params.clinicId) searchParams.set('clinicId', params.clinicId);
      if (params.doctorId) searchParams.set('doctorId', params.doctorId);
      return api.get(`/appointments/calendar?${searchParams.toString()}`);
    },
    enabled: !!params.startDate && !!params.endDate,
  });
}

export function useAppointmentStats(clinicId) {
  return useQuery({
    queryKey: appointmentKeys.stats(clinicId),
    queryFn: () => {
      const path = clinicId
        ? `/appointments/stats?clinicId=${clinicId}`
        : '/appointments/stats';
      return api.get(path);
    },
    refetchInterval: 30000, // refresh every 30s for live stats
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, data }) => {
      const endpoint = type === 'WALKIN'
        ? '/reception/check-in'
        : '/reception/reservations';
      return api.post(endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.calendar });
      queryClient.invalidateQueries({ queryKey: ['reception', 'queue'] });
    },
  });
}
```

---

### 2.3 Calendar View — `AppointmentCalendar.jsx`

**File:** `frontend/src/features/appointments/AppointmentCalendar.jsx`

#### Component Structure

```jsx
export default function AppointmentCalendar() {
  // State: viewMode ('day' | 'week'), currentDate, selectedClinic, selectedAppointment
  // Uses: useAppointmentsCalendar(params), useClinics()
  // Renders: calendar grid, date navigation, clinic filter, appointment slots
}
```

#### State Management

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `viewMode` | `'day' \| 'week'` | `'day'` | Toggle between day and week view |
| `currentDate` | `Date` | `new Date()` | Currently viewed date (day view) or start of week (week view) |
| `selectedClinic` | `string \| ''` | `''` | Clinic filter (empty = all clinics) |
| `selectedAppointment` | `object \| null` | `null` | Clicked appointment for detail view/edit |
| `showNewModal` | `boolean` | `false` | Show appointment creation modal |

#### Date Navigation

```
Prev Day/Week button:  currentDate = addDays(currentDate, viewMode === 'day' ? -1 : -7)
Next Day/Week button:  currentDate = addDays(currentDate, viewMode === 'day' ? 1 : 7)
Today button:          currentDate = new Date()
```

#### Calendar Grid Layout

**Day view:** Y-axis = time slots (30-min intervals, 08:00–17:00), X-axis = clinics (one column per clinic). Each cell shows appointment cards stacked vertically.

**Week view:** Y-axis = time slots, X-axis = days of week (Mon–Fri). Each cell shows appointments by clinic (grouped vertically within the day column).

#### Appointment Card Colors

```js
const statusColors = {
  WAITING: 'bg-amber-100 border-amber-300 text-amber-800',
  CALLED: 'bg-sky-100 border-sky-300 text-sky-800',
  IN_PROGRESS: 'bg-green-100 border-green-300 text-green-800',
  COMPLETED: 'bg-gray-100 border-gray-300 text-gray-500',
  CANCELLED: 'bg-red-100 border-red-300 text-red-800',
  RESERVED: 'bg-lilac-bloom/20 border-lilac-bloom text-lilac-bloom',
};
```

Each card shows:
- Token number (bold, large)
- Patient name
- Status badge
- Click handler → opens detail view or edit modal

#### Loading State

```jsx
{isLoading && (
  <div className="flex items-center justify-center h-64">
    <p className="text-slate">Loading appointments...</p>
  </div>
)}
```

#### Empty State

```jsx
{data?.length === 0 && (
  <div className="flex flex-col items-center justify-center h-64 gap-2">
    <p className="text-slate">No appointments for this period</p>
    <Button onClick={() => setShowNewModal(true)}>Create Appointment</Button>
  </div>
)}
```

#### Error State

```jsx
{isError && (
  <div className="flex items-center justify-center h-64">
    <p className="text-red-500">Failed to load appointments. Please try again.</p>
  </div>
)}
```

#### Date Helper Functions

Use plain JS Date math (no date library needed):

```js
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```

#### Clinic Filter Dropdown

Use `useClinics()` hook (already exists, returns clinic list). Render as `<select>`:

```jsx
<select
  value={selectedClinic}
  onChange={(e) => setSelectedClinic(e.target.value)}
  className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian"
>
  <option value="">All Clinics</option>
  {clinics.map((c) => (
    <option key={c.id} value={c.slug}>{c.name}</option>
  ))}
</select>
```

#### Route Registration in `App.jsx`

```jsx
import AppointmentCalendar from '../features/appointments/AppointmentCalendar';

// Add to routes:
<Route
  path="/appointments"
  element={
    <RoleGuard requiredPermissions={['appointment:read']}>
      <AppointmentCalendar />
    </RoleGuard>
  }
/>
```

---

### 2.4 Appointment Creation Modal — `AppointmentModal.jsx`

**File:** `frontend/src/features/appointments/AppointmentModal.jsx`

#### Component API

```jsx
<AppointmentModal
  isOpen={boolean}
  onClose={() => void}
  onSuccess={() => void}      // invalidate queries callback
  defaultClinicId={string}    // optional: pre-select a clinic
/>
```

#### Form Fields

| Field | Type | Required | Component |
|-------|------|----------|-----------|
| Patient | search | Yes | PatientQuickSearch or inline search |
| Clinic | select | Yes | `<select>` from `useClinics` |
| Doctor | select | Yes | `<select>` filtered by selected clinic |
| Appointment type | toggle | Yes | WALKIN / RESERVATION radio |
| Visit type | toggle | Yes | NEW_VISIT / FOLLOW_UP radio |
| Scheduled date/time | datetime-local | Yes | `<input type="datetime-local">` |
| Priority | select | No | `<select>` 0-5 |
| Notes | textarea | No | `<textarea>` |

#### State

```jsx
const [step, setStep] = useState('patient'); // 'patient' | 'details' | 'confirm'
const [selectedPatient, setSelectedPatient] = useState(null);
const [selectedClinic, setSelectedClinic] = useState('');
const [selectedDoctor, setSelectedDoctor] = useState('');
const [appointmentType, setAppointmentType] = useState('WALKIN');
const [visitType, setVisitType] = useState('NEW_VISIT');
const [scheduledAt, setScheduledAt] = useState('');
const [priority, setPriority] = useState(0);
const [notes, setNotes] = useState('');
const [submitting, setSubmitting] = useState(false);
```

#### Multi-Step Flow

**Step 1 — Patient Selection:**
- Use `PatientQuickSearch` component (reuse from Phase 2)
- On select: set `selectedPatient`, advance to step 2

**Step 2 — Appointment Details:**
- Clinic dropdown (fetched from `useClinics`)
- Doctor dropdown (fetched from clinic — use a query filtered by selected clinic)
- Appointment type radio: WALKIN / RESERVATION
- Visit type radio: NEW_VISIT / FOLLOW_UP
- Date/time picker (shown for RESERVATION only — WALKIN doesn't need scheduledAt)
- Priority selector (0-5)
- Notes textarea
- Submit button

**Step 3 — Confirmation (optional):**
- Show summary of what will be created
- Confirm button or auto-submit

#### API Call Logic

```js
const createAppointment = useCreateAppointment(); // from useAppointments.js

const handleSubmit = async () => {
  setSubmitting(true);
  try {
    const data = {
      patientId: selectedPatient.id,
      clinicId: selectedClinic,
      ...(appointmentType === 'WALKIN'
        ? { type: 'WALKIN', visitType }
        : {
            type: 'RESERVATION',
            scheduledAt: new Date(scheduledAt).toISOString(),
            doctorId: selectedDoctor,
            visitType,
          }),
      priority,
      notes: notes || undefined,
    };

    await createAppointment.mutateAsync({ type: appointmentType, data });
    notifySuccess('Appointment created');
    onSuccess();
    onClose();
  } catch (err) {
    notifyError(err.message);
  } finally {
    setSubmitting(false);
  }
};
```

---

### 2.5 Queue Board — `QueueBoard.jsx`

**File:** `frontend/src/features/reception/QueueBoard.jsx`

#### Component API

```jsx
<QueueBoard clinicId={string} />
```

#### Kanban Columns

| Column | Status | Card Actions |
|--------|--------|-------------|
| Waiting | WAITING | Call, Cancel, No-Show, Priority change |
| Called | CALLED | Start (→ IN_PROGRESS), Cancel, No-Show |
| In Progress | IN_PROGRESS | Complete (→ COMPLETED) |
| Completed | COMPLETED | (none — read-only) |

#### Data Source

Uses existing `useReceptionQueue(clinicId)` hook (polls every 10 seconds). Client-side filtered by `appointment.status`.

```js
const { data: queue = [], isLoading } = useReceptionQueue(clinicId, 10000);

const columns = {
  WAITING: queue.filter(a => a.status === 'WAITING'),
  CALLED: queue.filter(a => a.status === 'CALLED'),
  IN_PROGRESS: queue.filter(a => a.status === 'IN_PROGRESS'),
  COMPLETED: queue.filter(a => a.status === 'COMPLETED'),
};
```

#### Board Layout

```jsx
<div className="grid grid-cols-4 gap-4">
  {['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
    <div key={status} className="bg-bone/50 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-body font-medium text-obsidian">
          {statusLabels[status]}
        </h3>
        {status === 'WAITING' && (
          <Button size="sm" onClick={() => callNext.mutate(clinicId)}>
            Call Next
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {columns[status].map((appt) => (
          <AppointmentCard
            key={appt.id}
            appointment={appt}
            status={status}
          />
        ))}
      </div>
    </div>
  ))}
</div>
```

#### Appointment Card

```jsx
function AppointmentCard({ appointment, status }) {
  const age = calcAge(appointment.patient?.dateOfBirth);

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-h3 font-bold text-obsidian">
          #{appointment.token}
        </span>
        <Badge variant={priorityVariant(appointment.priority)}>
          P{appointment.priority}
        </Badge>
      </div>
      <div>
        <p className="text-body font-medium text-obsidian truncate">
          {appointment.patient?.fullName}
        </p>
        <p className="text-caption text-slate">
          {appointment.patient?.mrn}
          {age !== null ? ` · ${age}y` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Badge size="sm" variant={typeVariant(appointment.type)}>
          {appointment.type === 'WALKIN' ? 'Walk-in' : 'Reservation'}
        </Badge>
        {status === 'WAITING' && appointment.createdAt && (
          <span className="text-caption text-slate ml-auto">
            {formatWaitTime(appointment.createdAt)}
          </span>
        )}
      </div>
      <div className="flex gap-1 flex-wrap">
        {statusTransitions[status].map((action) => (
          <Button
            key={action.status}
            size="sm"
            variant={action.variant || 'ghost'}
            onClick={() => updateStatus.mutate({ id: appointment.id, status: action.status })}
          >
            {action.label}
          </Button>
        ))}
      </div>
      {['WAITING', 'CALLED'].includes(status) && (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: appointment.id, status: 'CANCELLED' })}>
            Cancel
          </Button>
          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: appointment.id, status: 'NO_SHOW' })}>
            No Show
          </Button>
        </div>
      )}
      <select
        value={appointment.priority}
        onChange={(e) => updatePriority.mutate({ id: appointment.id, priority: parseInt(e.target.value) })}
        className="w-full px-2 py-1 text-caption bg-paper border border-silver rounded"
      >
        {[0, 1, 2, 3, 4, 5].map((p) => (
          <option key={p} value={p}>Priority {p}</option>
        ))}
      </select>
    </Card>
  );
}
```

#### Status Transition Map

```js
const statusLabels = {
  WAITING: 'Waiting',
  CALLED: 'Called',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const statusTransitions = {
  WAITING: [
    { label: 'Call', status: 'CALLED', variant: 'primary' },
  ],
  CALLED: [
    { label: 'Start', status: 'IN_PROGRESS', variant: 'primary' },
  ],
  IN_PROGRESS: [
    { label: 'Complete', status: 'COMPLETED', variant: 'success' },
  ],
  COMPLETED: [],
};
```

#### Search/Filter Input

```jsx
<Input
  placeholder="Search by name or MRN..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

Filter logic: client-side filter on `columns[status]`:

```js
const filteredColumns = useMemo(() => {
  if (!searchQuery) return columns;
  const q = searchQuery.toLowerCase();
  return Object.fromEntries(
    Object.entries(columns).map(([status, items]) => [
      status,
      items.filter(
        (a) =>
          a.patient?.fullName?.toLowerCase().includes(q) ||
          a.patient?.mrn?.toLowerCase().includes(q)
      ),
    ])
  );
}, [columns, searchQuery]);
```

#### Estimated Wait Time

```js
function formatWaitTime(createdAt) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${h}h ${minutes % 60}m`;
}
```

#### Integration into ReceptionPage.jsx

Replace the existing queue tab content or add as a new tab:

Option A — Replace existing queue tab (simpler):
```jsx
// In TABS array, keep 'queue' tab but render QueueBoard instead of existing queue list:
{tab === 'queue' && (
  <QueueBoard clinicId={queueClinicFilter} />
)}
```

Option B — Add as separate "Board" tab:
```jsx
const TABS = ['checkin', 'reservations', 'queue', 'board', 'followUps', 'labPayments'];
// ...
{tab === 'board' && (
  <QueueBoard clinicId={queueClinicFilter} />
)}
```

---

### 2.9 Patient Appointment History — `PatientDetailPage.jsx`

Enhance the existing Appointments tab (already rendered when `activeTab === 'Appointments'`).

**Current state:** Shows appointments in a basic table. The data comes from `patient.appointments` included in the detail query.

**Enhancements:**

1. **Status badges with color:**
```js
const appointmentStatusVariant = {
  WAITING: 'warning',
  CALLED: 'info',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  NO_SHOW: 'danger',
  CANCELLED: 'danger',
  RESERVED: 'info',
};
```

2. **Richer row display per appointment:**
- Token number (`#123`)
- Type badge: "Walk-in" or "Reservation"
- Clinic name
- Doctor name
- Status badge (color-coded)
- Date/time (formatted)
- Visit type (NEW_VISIT / FOLLOW_UP)
- Click to navigate to calendar view at `/appointments`

3. **Filters:**
- Status filter dropdown
- Date range filter (from/to date inputs)

4. **Empty state:**
```jsx
{filteredAppointments.length === 0 && (
  <p className="text-caption text-slate text-center py-8">No appointments found</p>
)}
```

---

### 2.10 Waiting Room TV Improvements — `WaitingRoomTV.jsx`

#### Add Patient Name to "Now Serving"

The `GET /waiting-room` endpoint now returns patient names (task 2.10 backend). Update the TV display:

```jsx
// In the CALLED/IN_PROGRESS section:
{clinicsWithCalleds[slug].map(appt => (
  <div key={appt.id} className="text-center">
    <p className="text-4xl font-bold text-green-400">#{appt.token}</p>
    <p className="text-2xl text-paper mt-1">{appt.patient?.fullName}</p>
    <p className="text-lg text-slate">{appt.clinic.name}</p>
  </div>
))}
```

#### Add Estimated Wait Time per Clinic

```jsx
{clinicSlugs.map(slug => {
  const waitingCount = queues[slug].queue.filter(a => a.status === 'WAITING').length;
  const avgWait = waitingCount * 15; // 15 min per patient estimate
  return (
    <div key={slug} className="flex items-center justify-between">
      <span>{queues[slug].clinic?.name}</span>
      <span className={waitingCount > 0 ? 'text-amber-400' : 'text-green-400'}>
        {waitingCount > 0 ? `~${avgWait} min wait` : 'No wait'}
      </span>
    </div>
  );
})}
```

#### Add "Last Updated" Timestamp

```jsx
const [lastUpdated, setLastUpdated] = useState(null);

// In fetchQueue callback:
.then((data) => {
  setQueues(data);
  setLastUpdated(new Date());
  // ...
})

// Display:
<p className="text-caption text-slate">
  Last updated: {lastUpdated?.toLocaleTimeString()}
</p>
```

---

## 7. Coordination Points

### Dependency Graph

```
2.8 (Hospital Scoping)  ──────> 2.5 (Queue Board)
      │
      ├──────────────────────────> 2.3 (Calendar View) — via 2.1
      │
      v
2.1 (Calendar Endpoint) ──────> 2.3 (Calendar View)
      │
      v
2.2 (Stats Endpoint)   ──────> (standalone, no frontend dependency)
      │
      v
2.6 (Reminder Job)     ──────> (standalone, backend-only)
      │
      v
2.10 (Waiting Room Fix) ──────> 2.10 (Waiting Room TV)

2.7 (Appointment Hooks) ──────> (no backend dependency, start immediately)
2.9 (Patient History)   ──────> (no backend dependency, start immediately)
```

### Parallel Execution Plan

**Day 1 (morning):**
- Sr Dev: 2.8 (hospital scoping fix — critical security, unblocks everything)
- Jr Dev: 2.7 (appointment hooks), 2.9 (patient appointment history), start 2.10 (waiting room TV)

**Day 1 (afternoon):**
- Sr Dev: 2.1 (calendar endpoint) + 2.10 (waiting room endpoint fix)
- Jr Dev: Start 2.4 (appointment modal — wires to existing endpoints, no backend dependency)

**Day 2 (morning):**
- Sr Dev: 2.2 (stats endpoint) + 2.6 (reminder job + migration)
- Jr Dev: Start 2.3 (calendar view — calendar endpoint now available)

**Day 2 (afternoon):**
- Sr Dev: Finish 2.6, review all endpoints for hospital scoping
- Jr Dev: Start 2.5 (queue board — hospital scoping now fixed)

**Day 3-4:**
- Sr Dev: Review/code review, assist with frontend integration
- Jr Dev: Finish 2.3, 2.5, 2.10, route registration in App.jsx
- Both: Integration testing, edge cases, responsive layout verification

### Coordination Rules

1. **2.7 + 2.9 can start immediately** — hooks and patient detail enhancements use existing data
2. **2.4 can start immediately** — modal wires to existing `POST /reception/check-in` and `POST /reception/reservations`
3. **2.3 needs 2.1** — calendar view needs `GET /appointments/calendar`
4. **2.5 needs 2.8** — queue board needs hospital-scoped queue data
5. **2.10 (frontend) can start immediately** — endpoint already returns data; patient name field will be available after 2.10 backend fix

---

## 8. Acceptance Criteria Checklist

- [ ] Calendar view shows appointments by day/week with correct status colors and clinic grouping
- [ ] "New Appointment" modal creates walk-in or reservation appointments via existing reception endpoints
- [ ] Walk-in flow works end-to-end: patient search → clinic select → check-in → token assigned → appears in queue
- [ ] Pre-booked flow works: reservation created → patient arrives → checked in → moves to WAITING queue
- [ ] Queue board displays four Kanban columns (WAITING, CALLED, IN_PROGRESS, COMPLETED) with real-time updates
- [ ] Queue board supports status transitions, priority changes, cancel, and no-show
- [ ] Token numbers reset daily per clinic and increment correctly (verified — already works)
- [ ] WaitingRoomTV displays patient names, token numbers, estimated wait times, and last updated timestamp
- [ ] Appointment statistics endpoint returns today's counts by status, type, average wait time, and no-show rate
- [ ] Appointment reminder system runs hourly and identifies appointments within 24 hours
- [ ] All appointment/queue queries are hospital-scoped (Hospital A cannot see Hospital B queue data)
- [ ] Appointment history tab on patient detail shows rich appointment data with filters
- [ ] Calendar and queue board routes are registered in App.jsx with correct RoleGuard permissions
- [ ] All new endpoints include input validation, permission checks, and error handling
- [ ] All new frontend pages include loading, empty, and error states
- [ ] No TypeScript/ESLint errors introduced
- [ ] All existing reception functionality continues to work (check-in, queue, reservations, follow-ups, lab payments)
