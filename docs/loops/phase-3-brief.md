# Phase 3 Brief: Appointments & Reception

**Date:** 2026-07-16
**Complexity:** XL | **Estimated Effort:** 5–7 days
**Focus Role:** fullstack
**Dependencies:** Phase 0 (multi-tenant), Phase 1 (navigation + role guarding), Phase 2 (patients)

---

## 1. Phase Goal

Complete the appointment scheduling system with a calendar/scheduler view, enhanced queue management with a Kanban-style board, appointment statistics, and an appointment reminder system. Most reception backend endpoints (check-in, reservations, queue, follow-ups) and the ReceptionPage frontend already exist — this phase focuses on the missing calendar view, queue board improvements, stats, and reminders.

---

## 2. Tasks

### 2.1 Appointment Calendar Endpoint — `backend/src/modules/appointments/appointments.routes.ts`

Add a `GET /appointments/calendar` endpoint that returns appointments grouped by date/clinic for a date range. The endpoint should:

- Accept query params: `startDate` (required), `endDate` (required), `clinicId?`, `doctorId?`
- Return appointments with: patient name, doctor name, clinic name, status, type, token, scheduledAt, duration
- Group results by date, then by clinic
- Must be hospital-scoped (use `req.user.hospitalId`)
- Requires `appointment:read` permission

**Complexity:** S

### 2.2 Appointment Statistics Endpoint — `backend/src/modules/appointments/appointments.routes.ts`

Add a `GET /appointments/stats` endpoint that returns today's appointment statistics:

- Accept query params: `clinicId?` (filter to specific clinic)
- Return: total today, count by status (WAITING, CALLED, IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED), count by type (WALKIN, RESERVATION), average wait time (time from creation to IN_PROGRESS), no-show rate
- Must be hospital-scoped
- Requires `appointment:read` permission

**Complexity:** S

### 2.3 Appointment Calendar/Scheduler View — `frontend/src/features/appointments/AppointmentCalendar.jsx`

Build the appointment calendar/scheduler page. This is a **new page** (no `frontend/src/features/appointments/` directory exists yet). The calendar should:

- Show a day/week toggle view with time slots on the Y-axis and clinics/doctors on the X-axis
- Fetch appointments via `GET /appointments/calendar`
- Color-code appointments by status: WAITING=amber, CALLED=sky, IN_PROGRESS=green, COMPLETED=gray, CANCELLED=red, RESERVED=lilac
- Click on an appointment slot to view/edit appointment details
- "New Appointment" button that opens the appointment creation modal (task 2.4)
- Date navigation: previous/next day/week, "Today" button
- Clinic filter dropdown to focus on one clinic
- Register the route `/appointments` in `App.jsx` with `RoleGuard requiredPermissions={['appointment:read']}`

**Complexity:** L

### 2.4 Appointment Creation Modal — `frontend/src/features/appointments/AppointmentModal.jsx`

Build a modal form for creating/editing appointments:

- Patient quick-search (reuse `PatientQuickSearch` from Phase 2 or inline search)
- Clinic selection dropdown (from `useClinics`)
- Doctor selection dropdown (filtered by selected clinic)
- Date/time picker for scheduled appointments
- Visit type toggle: NEW_VISIT / FOLLOW_UP
- Appointment type: WALKIN / RESERVATION
- Optional notes field
- Optional priority selector (0-5)
- On submit: for WALKIN → call `POST /reception/check-in`; for RESERVATION → call `POST /reception/reervations`
- On success: invalidate calendar query, show success toast

**Complexity:** M

### 2.5 Enhanced Queue Board — `frontend/src/features/reception/QueueBoard.jsx`

Build a Kanban-style queue board component to replace or enhance the existing queue display in `ReceptionPage.jsx`. The board should:

- Four columns: WAITING | CALLED | IN_PROGRESS | COMPLETED
- Each column shows appointment cards with: token number, patient name, MRN, age, priority badge, appointment type badge
- "Call Next" button in the WAITING column header
- Status transition buttons on each card (WAITING→CALLED, CALLED→IN_PROGRESS, IN_PROGRESS→COMPLETED)
- Cancel and No-Show buttons on WAITING/CALLED cards
- Priority dropdown on each card (0-5)
- Estimated wait time displayed per card in WAITING column
- Search/filter input to find patients by name or MRN
- Auto-refresh every 10 seconds (polling)
- Integrate into `ReceptionPage.jsx` as a new tab or replace the existing queue tab

**Complexity:** L

### 2.6 Appointment Reminder System — `backend/src/modules/appointments/appointment-reminder.job.ts`

Build a cron-based appointment reminder system:

- Create a job file that runs every hour
- Query appointments where `scheduledAt` is within the next 24 hours and status is RESERVED
- For each appointment: log a reminder (console.log for now, SMS/email integration placeholder)
- Mark appointment as reminded (add optional `remindedAt` field to Appointment model or use a separate `Notification` record)
- Add a Prisma migration if a new field is needed on Appointment
- The job should be importable and callable from the backend entry point

**Complexity:** M

### 2.7 Appointment Hooks — `frontend/src/hooks/queries/useAppointments.js`

Create React Query hooks for the new appointment endpoints:

- `useAppointmentsCalendar(params)` — fetches calendar data
- `useAppointmentStats(clinicId?)` — fetches appointment statistics
- `useCreateAppointment()` — mutation for creating appointments
- `useAppointmentReminders()` — query for pending reminders (if exposed via API)
- Follow existing hook patterns from `useReception.js`

**Complexity:** S

### 2.8 Fix Hospital Scoping on Appointment Queries — `backend/src/modules/reception/routes/queue.routes.ts` & `appointments.routes.ts`

Audit and fix hospital scoping on all appointment-related queries:

- `GET /queue/stats` (line 11 of `queue.routes.ts`): add `hospitalId` filter — currently queries ALL appointments across all hospitals
- `GET /queue/:clinicId` (line 33): add `hospitalId` verification
- `GET /waiting-room` (line 78): add `hospitalId` filter
- `GET /reservations` (line 178 of `appointments.routes.ts`): add `hospitalId` filter
- `GET /follow-ups` (line 241): add `hospitalId` filter
- New endpoints from tasks 2.1 and 2.2: must include `hospitalId` from the start
- This is a **critical security fix** — without it, one hospital can see another hospital's queue data

**Complexity:** S

### 2.9 Appointment History on Patient Detail — `frontend/src/features/patients/PatientDetailPage.jsx`

Enhance the existing Appointments tab on the patient detail page to show a richer appointment history:

- Show appointment type (Walk-in/Reservation), clinic name, doctor name, status with color-coded badge, token number, date/time
- Sort by date descending (most recent first)
- Allow filtering by status and date range
- Link to the appointment calendar view when clicking an appointment

**Complexity:** S

### 2.10 Waiting Room TV Improvements — `frontend/src/features/reception/WaitingRoomTV.jsx` & `backend/src/modules/reception/routes/queue.routes.ts`

Improve the Waiting Room TV display:

- Add "Now Serving" patient name (not just token number) — update the `GET /waiting-room` endpoint to include patient name for CALLED/IN_PROGRESS appointments
- Add estimated wait time per clinic
- Add a "Last Updated" timestamp
- Improve visual hierarchy: larger token numbers, clearer status labels
- Add sound/beep notification when a new patient is called (optional, browser notification)

**Complexity:** S

---

## 3. Acceptance Criteria

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
- [ ] All new endpoints include input validation (Zod), permission checks, and error handling
- [ ] All new frontend pages include loading, empty, and error states

---

## 4. Work Split

### Sr Dev — Backend Endpoints & Security (estimated 2.5–3 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.1 Calendar Endpoint | `backend/src/modules/appointments/appointments.routes.ts` | S | New endpoint. Group appointments by date/clinic. Must include `hospitalId` from start. |
| 2.2 Statistics Endpoint | `backend/src/modules/appointments/appointments.routes.ts` | S | Aggregation query. Count by status/type, calculate avg wait time from timestamps. |
| 2.6 Reminder System | `backend/src/modules/appointments/appointment-reminder.job.ts` | M | New file. Cron job querying upcoming RESERVED appointments. May need Prisma migration for `remindedAt` field. |
| 2.8 Hospital Scoping Fix | `backend/src/modules/reception/routes/queue.routes.ts`, `appointments.routes.ts` | S | Critical security fix. Add `hospitalId` to all appointment/queue queries. Audit every endpoint. |
| 2.10 Waiting Room Endpoint Fix | `backend/src/modules/reception/routes/queue.routes.ts` | S | Update `GET /waiting-room` to include patient name for CALLED/IN_PROGRESS. |

### Jr Dev — Frontend Calendar, Queue Board & UI (estimated 2.5–3 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.3 Calendar View | `frontend/src/features/appointments/AppointmentCalendar.jsx` | L | New feature directory. Day/week view with time slots. Date navigation, clinic filter. Register route in App.jsx. |
| 2.4 Appointment Modal | `frontend/src/features/appointments/AppointmentModal.jsx` | M | Modal form with patient search, clinic/doctor select, date/time picker. Wire to existing check-in/reservation endpoints. |
| 2.5 Queue Board | `frontend/src/features/reception/QueueBoard.jsx` | L | Kanban board with 4 columns. Status transition buttons, priority dropdown, auto-refresh. Integrate into ReceptionPage. |
| 2.7 Appointment Hooks | `frontend/src/hooks/queries/useAppointments.js` | S | React Query hooks for calendar, stats, create appointment mutations. Follow useReception.js patterns. |
| 2.9 Patient Appointment History | `frontend/src/features/patients/PatientDetailPage.jsx` | S | Enhance existing Appointments tab with richer data display and filters. |
| 2.10 Waiting Room TV | `frontend/src/features/reception/WaitingRoomTV.jsx` | S | Add patient names, estimated wait, last updated timestamp. Minor visual improvements. |

**Coordination point:** The Jr Dev should start with task 2.7 (hooks — no backend dependency), task 2.9 (patient detail — uses existing data), and task 2.10 (waiting room TV — endpoint already exists) in parallel while the Sr Dev builds the backend endpoints (2.1, 2.2, 2.6, 2.8). Task 2.3 (calendar view) depends on task 2.1 (calendar endpoint). Task 2.4 (appointment modal) can be built anytime (wires to existing endpoints). Task 2.5 (queue board) depends on task 2.8 (hospital scoping fix) for correctness.

---

## 5. Files Likely Impacted

### New Files (4)

| File | Description |
|------|-------------|
| `frontend/src/features/appointments/AppointmentCalendar.jsx` | Calendar/scheduler view with day/week toggle |
| `frontend/src/features/appointments/AppointmentModal.jsx` | Appointment creation/editing modal |
| `frontend/src/features/reception/QueueBoard.jsx` | Kanban-style queue management board |
| `backend/src/modules/appointments/appointment-reminder.job.ts` | Cron job for appointment reminders |

### Modified Files (7)

| File | Changes |
|------|---------|
| `backend/src/modules/appointments/appointments.routes.ts` | Add calendar endpoint, stats endpoint |
| `backend/src/modules/reception/routes/queue.routes.ts` | Hospital scoping fix, add patient name to waiting-room endpoint |
| `backend/src/modules/reception/routes/appointments.routes.ts` | Hospital scoping fix on reservations, follow-ups queries |
| `frontend/src/app/App.jsx` | Register `/appointments` route with RoleGuard |
| `frontend/src/features/reception/ReceptionPage.jsx` | Integrate QueueBoard component (replace or add as tab) |
| `frontend/src/features/reception/WaitingRoomTV.jsx` | Add patient names, estimated wait, last updated |
| `frontend/src/features/patients/PatientDetailPage.jsx` | Enhance Appointments tab with richer data |
| `frontend/src/hooks/queries/useAppointments.js` | New hooks file for calendar, stats, create appointment |

### Reference Files (read-only)

| File | Purpose |
|------|---------|
| `backend/src/modules/reception/reception.utils.ts` | `nextToken()`, `resolveClinic()` utilities |
| `backend/src/modules/reception/routes/appointments.routes.ts` | Existing check-in/reservation logic to wire modal to |
| `backend/src/modules/reception/routes/queue.routes.ts` | Existing queue logic to enhance |
| `frontend/src/hooks/queries/useReception.js` | Existing reception hooks (pattern reference) |
| `frontend/src/hooks/queries/useClinics.js` | Clinic data hook |
| `backend/src/middleware/rbac.ts` | Permission constants (`APPOINTMENT_READ`, `APPOINTMENT_WRITE`) |
| `backend/src/middleware/auth.ts` | `authenticate` and `requirePermission` middleware |
| `backend/src/schemas/reception.schema.js` | Existing `checkInSchema` validation |
| `frontend/src/components/ui/Card.jsx` | Reusable Card component |
| `frontend/src/components/ui/Badge.jsx` | Reusable Badge component |
| `frontend/src/components/ui/Button.jsx` | Reusable Button component |
| `frontend/src/components/ui/Modal.jsx` | Reusable Modal component |
| `frontend/src/components/shared/PatientQuickSearch.jsx` | Patient search component (from Phase 2) |
| `frontend/src/lib/api.js` | API client |

---

*This brief is based on: `docs/01-prd.md` (Appointments section 5.2, Receptionist stories section 4.4), `docs/02-trd.md` (Reception API section 3.7, Appointments API section 3.8), `docs/03-backend-schema.md` (Appointment model section 2.4, Enums section 1.3), `docs/04-ui-ux.md` (Reception section 3.5, Calendar section 3.6, Waiting Room TV section 3.23), `docs/05-app-flow.md` (Reception routes, Flow 1), `docs/06-implementation-plan.md` (Phase 3, lines 216-248), and inspection of existing codebase files.*
