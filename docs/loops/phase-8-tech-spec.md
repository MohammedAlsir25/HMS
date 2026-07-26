# Phase 8 Tech Spec: Inpatient Management

## 1. Architecture Decisions

This is an **enhancement pass**, not a new module. All backend changes live in a single existing route file (`wards.routes.ts`). Frontend changes are additions/modifications to existing components and hooks. No new Prisma models, no new directories, no new middleware.

The `preoperative/` directory is **not renamed** — routes are already mounted at `/api/wards` in `app.ts:114`. Keep the directory as-is.

---

## 2. Work Split

### Sr Dev (T1–T5) — Backend Routes + DB Logic

All tasks modify only `backend/src/modules/preoperative/wards.routes.ts` and `frontend/src/hooks/queries/useWards.js`.

| Task | Description | Files |
|------|-------------|-------|
| **T1** | `GET /wards/dashboard` — occupancy stats endpoint | `wards.routes.ts` (add route before export), `useWards.js` (add `useWardDashboard` hook + query key) |
| **T2** | `GET /wards/dashboard/trends` — historical occupancy (accepts `?days=N`, returns daily admissions/discharges/occupiedCount) | `wards.routes.ts` (add route) |
| **T3** | Enhance `PATCH /beds/:id/assign` — accept optional `admissionDate` in body, use instead of `new Date()` for `assignedAt` | `wards.routes.ts:89-111` (modify existing handler) |
| **T4** | Enhance `PATCH /beds/:id/discharge` — accept optional `dischargeDate` and `dischargeNotes`, use `dischargeDate` instead of `new Date()` for `dischargedAt`, calculate billing from provided date | `wards.routes.ts:113-154` (modify existing handler) |
| **T5** | `GET /wards/:wardId/patients` — return all OCCUPIED beds in a ward with patient info, vitals count, last vitals timestamp | `wards.routes.ts` (add route), `useWards.js` (add `useWardPatients` hook + query key) |

**Route ordering note:** T1 (`/wards/dashboard`) and T2 (`/wards/dashboard/trends`) must be registered **before** the generic `/wards/:id` routes, or Express will treat `dashboard` as an `:id` param. Place them right after the existing `GET /wards` route (line 22) and before `POST /wards` (line 24).

**Hook changes in `useWards.js`:** Add to the `wardKeys` factory:
- `dashboard: () => [...wardKeys.all(), 'dashboard']`
- `dashboardTrends: (days) => [...wardKeys.all(), 'dashboard', 'trends', days]`
- `wardPatients: (wardId) => [...wardKeys.all(), 'patients', wardId]`

### Jr Dev (T6–T11) — Frontend Components + i18n

| Task | Description | Files | Depends On |
|------|-------------|-------|------------|
| **T6** | Visual bed map on WardsPage — add "Bed Map" sub-tab showing per-ward color-coded grid of bed tiles. Green=VACANT, Red=OCCUPIED, Yellow=RESERVED, Gray=MAINTENANCE. Click occupied→BedDetailPanel, click vacant→assign modal | `WardsPage.jsx` | None (existing data) |
| **T7** | InpatientPage summary stat cards — 4 cards at top: Total Beds, Occupied, Admissions Today, Discharges Today. Data from `GET /wards/dashboard` | `InpatientPage.jsx`, `useWards.js` (Jr adds `useWardDashboard` import) | T1 |
| **T8** | Discharge modal with date/notes — replace `confirm()` dialog in `handleDischarge` with a Modal containing date picker (default: today) and optional notes textarea. Pass `dischargeDate` + `dischargeNotes` to API. Add `showDischargeModal` and `dischargeForm` state | `WardsPage.jsx`, `useWards.js` (update `useDischargeBed` mutation to accept body) | T4 |
| **T9** | Admission date input in assign modal — add optional date picker (default: today) to the Assign Patient to Bed modal. Pass `admissionDate` to API. Add `admissionDate` to `assignForm` state | `WardsPage.jsx`, `useWards.js` (update `useAssignBed` mutation to pass body) | T3 |
| **T10** | Ward rounds patient list — in Daily Rounds section of InpatientPage, add a list of admitted patients from `GET /wards/:wardId/patients` so doctor can see who to round on. Show patient name, bed number, admission date, last vitals timestamp | `InpatientPage.jsx`, `useWards.js` (Jr adds `useWardPatients` import) | T5 |
| **T11** | i18n translations — add `wards.*` and `inpatient.*` namespace keys to locale files. Follow existing flat dot-notation pattern (e.g., `wards.title`, `wards.bedMap`, `inpatient.admissionsToday`) | `frontend/src/locales/en.json`, `frontend/src/locales/ar.json` | None (start immediately) |

### File Ownership Matrix (Non-Overlapping)

| File | Sr Dev | Jr Dev |
|------|--------|--------|
| `wards.routes.ts` | ✅ T1–T5 | — |
| `useWards.js` | T1, T5 hooks + keys | T7, T8, T9, T10 imports + mutation sig changes |
| `WardsPage.jsx` | — | T6, T8, T9 |
| `InpatientPage.jsx` | — | T7, T10 |
| `en.json` | — | T11 |
| `ar.json` | — | T11 |

**Coordination:** Sr Dev writes all hooks/mutation changes first. Jr Dev imports them. `useWards.js` is the single shared file — Sr adds hooks, Jr updates mutation signatures for T3/T4 body params.

---

## 3. Key Gotchas

### Import Paths
- Files in `features/wards/` import UI components via `../../components/ui/` (two levels up). Do NOT use `../ui/` — the directory nesting requires the double parent.

### Code Style
- **No code comments** — ever. Zero.
- **Never `JSON.stringify`** — use `safeStringify` from `@voltagent/internal` if serialization is needed.
- **Zod v4** — `z.record(z.string(), z.unknown())` not `z.record(z.unknown())`.

### Component Requirements
- **Every component** must have loading, empty, and error states. No bare content without guards.
- **JSX fragments** — every `<>` must have a matching `</>`. Ternary branches with multiple elements must be wrapped in `<></>`.

### Type Checking
- **Must run `tsc --noEmit`** after all changes and fix ALL errors before marking tasks complete.

### Backend Routing
- Backend route file lives in `backend/src/modules/preoperative/` directory — **do not rename this directory**. Routes are mounted at `/api/wards` in `app.ts:114`.
- `GET /wards/dashboard` and `GET /wards/dashboard/trends` must be registered **before** the `GET /wards/:id` wildcard route in the router, or Express will intercept `dashboard` as an ID parameter.

### WardRound Model
- `WardRound` is **per-ward** (fields: `wardId`, `date`, `doctorId`, `notes`, `plan`). There is no `bedId` or `patientId`.
- **Do not change the model.** For T10, simply display the list of admitted patients from `GET /wards/:wardId/patients` alongside the existing round recording UI. The doctor sees the patient list for context when writing round notes.

### Billing Calculation
- Existing discharge billing at `wards.routes.ts:131-151` uses `Math.max(1, Math.ceil(...))` from `bed.assignedAt` to `Date.now()`.
- T4 changes this to use the provided `dischargeDate` instead of `Date.now()` when present. **Same-day admission/discharge must yield at least 1 day** (already handled by `Math.max(1, ...)`).
- Validate `admissionDate <= now()` on T3 to prevent future-dating.

### Bed Status Colors (for T6, T7)
- Use the `statusColors` map already defined in `InpatientPage.jsx:10-15` as the source of truth for color mapping. Do not duplicate it — extract or reference the same values.

---

## 4. Exact File List

### Backend (Sr Dev only)

| File | Changes |
|------|---------|
| `backend/src/modules/preoperative/wards.routes.ts` | Add 3 new routes (T1, T2, T5), modify 2 existing routes (T3, T4) |

### Frontend

| File | Changes |
|------|---------|
| `frontend/src/hooks/queries/useWards.js` | Add `useWardDashboard` (T1), `useWardPatients` (T5) hooks; update `useAssignBed` mutation to pass body (T9); update `useDischargeBed` mutation to accept body (T8); add query key factories |
| `frontend/src/features/wards/WardsPage.jsx` | Add bed map sub-tab with color-coded grid (T6); replace discharge `confirm()` with modal containing date picker + notes (T8); add admission date input to assign modal (T9) |
| `frontend/src/features/wards/InpatientPage.jsx` | Add 4 summary stat cards at top using dashboard endpoint (T7); add admitted patients list in rounds section (T10) |
| `frontend/src/locales/en.json` | Add `wards.*` and `inpatient.*` keys (T11) |
| `frontend/src/locales/ar.json` | Add `wards.*` and `inpatient.*` keys (T11) |

---

## 5. Pattern References

| Pattern | Reference File | Lines |
|---------|---------------|-------|
| Express route with auth + permission + asyncHandler | `wards.routes.ts` | Any route (e.g., L12-22) |
| Prisma aggregate queries | `backend/src/modules/preoperative/preoperative.routes.ts` | L277 (groupBy + count) |
| React Query hook factory | `useWards.js` | L4-12 (wardKeys) |
| Mutation with query invalidation | `useWards.js` | L32-38 (useCreateWard) |
| Bed status color map | `InpatientPage.jsx` | L10-15 (statusColors) |
| Bed grid rendering | `InpatientPage.jsx` | L104-119 |
| i18n flat key pattern | `frontend/src/locales/en.json` | L1-20 (namespace.dot.notation) |
| useTranslation hook | `frontend/src/features/accounting/AccountingPage.jsx` | L3, use via `const { t } = useTranslation()` |
| Modal pattern with form | `WardsPage.jsx` | L269-301 (ward modal) |
| Confirm + toast pattern | `WardsPage.jsx` | L139-145 (existing discharge) |
| Table with column config | `WardsPage.jsx` | L14-40 (bedColumns) |
| Badge with status variant | `WardsPage.jsx` | L20 (Badge variant logic) |

---

## 6. Acceptance Criteria

- [ ] `GET /wards/dashboard` returns `occupancyRate` (0–100), `admissionsToday`, `dischargesToday`, `byWard[]`
- [ ] `GET /wards/dashboard/trends?days=7` returns array of 7 daily entries with `date`, `admissions`, `discharges`, `occupiedCount`
- [ ] `POST /beds/:id/assign` with `admissionDate` sets `assignedAt` to the provided date
- [ ] `PATCH /beds/:id/discharge` with `dischargeDate` calculates billing from that date
- [ ] `GET /wards/:wardId/patients` returns occupied beds with patient info and last vital timestamp
- [ ] Bed map shows green/red/yellow/gray tiles per status
- [ ] InpatientPage shows 4 summary stat cards
- [ ] Discharge flow uses modal with date picker + notes (not `confirm()`)
- [ ] Assign modal includes optional admission date picker
- [ ] Ward rounds section shows list of admitted patients
- [ ] All responses include `hospitalId` scoping
- [ ] Zero `JSON.stringify` in new code; `safeStringify` used where needed
- [ ] `tsc --noEmit` passes with zero errors
- [ ] All ward pages show loading, empty, and error states
