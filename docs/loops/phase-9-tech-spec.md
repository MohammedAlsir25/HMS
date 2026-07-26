# Phase 9 Tech Spec — Surgery / OT Management (Frontend Completion)

**Author:** Tech Lead
**Date:** 2026-07-17
**Status:** Ready for Implementation

---

## 1. Architecture Decisions

### Scope: Frontend-First Completion Phase

The backend is **~90% complete**. All Prisma models, most routes, and seed data exist. The frontend is **~75% complete** with 5 major components plus 1 pre-op page already built. This phase closes the remaining frontend gaps and patches a handful of backend edge cases.

**Key decisions:**

1. **No new Prisma models.** The existing schema fully covers surgery, preop, OR team, events, follow-ups, discharge, and wards. All work is route-level or UI-level.

2. **Two parallel work tracks** with clear ownership boundaries. Sr Dev owns backend edge cases + seed data + minor endpoints. Jr Dev owns all UI gap filling.

3. **All new frontend components go in `features/surgery/`** except pre-op which lives in `features/preoperative/`. Hooks go in `hooks/queries/`.

4. **No new routes in App.jsx.** All existing routes (`/surgery`, `/surgery/schedule`, `/surgery/dashboard`, `/surgery/:surgeryId/discharge`, `/preoperative`) already exist and map to the correct components. New sub-features are added as modals/tabs within existing pages.

5. **Follow the existing query hook pattern.** All hooks in `useSurgery.js` use `api.get`/`api.post`/`api.patch` from `../../lib/api` and React Query's `useQuery`/`useMutation`/`useQueryClient`.

---

## 2. Work Split

### Sr Dev — Backend Edge Cases, Seed Data & Minor Endpoints

| Task | File(s) | Description |
|------|---------|-------------|
| Fix POST /surgeries missing departmentId | `backend/src/modules/surgery/surgery.routes.ts` | The `POST /` endpoint validates `departmentId` is required but the frontend `SurgeryScheduler` never sends it. The Sr Dev must either make `departmentId` optional with a sensible default (fetch from user's assigned department), or add a departments dropdown to the backend validation. Verify the contract matches what the Jr Dev will send. |
| Add GET /surgery/or-roles endpoint | `backend/src/modules/surgery/surgery.routes.ts` | New endpoint to list OR roles for the team assignment dropdown. Query `ORRole` where `isActive: true`. Return `{ id, name }[]`. |
| Add GET /surgery/event-types endpoint | `backend/src/modules/surgery/surgery.routes.ts` | New endpoint to list intraoperative event types for the event logging dropdown. Query `IntraoperativeEventType` where `isActive: true`. Return `{ id, name }[]`. |
| Add GET /preoperative/operation-types endpoint fix | `backend/src/modules/preoperative/preoperative.routes.ts` | Already exists at `GET /operation-types`. Verify it works with `departmentId` query param and returns `{ id, name, nameAr, price, departmentId }`. If `departmentId` is required on the frontend, ensure it filters correctly. |
| Add seed data: Operation Types | `backend/prisma/seed.js` | Seed ~8-10 common operation types (e.g., "Cataract Surgery", "Vitrectomy", "LASIK", "Trabeculectomy", "Ptosis Repair", "Entropion Repair", "Enucleation", "Orbital Decompression"). Each needs a `departmentId` referencing the surgery department. Include `nameAr` values. Set sensible prices. |
| Add seed data: Ensure surgery dept exists | `backend/prisma/seed.js` | Already seeded as `surgery-dept`. Verify the slug matches and operation types reference it. Add the `price` field to seeded operation types. |
| Verify POST /:id/complete revenue flow | `backend/src/modules/surgery/surgery.routes.ts:153-187` | Already records a `SURGERY` transaction when completing a surgery with a priced `operationType`. Verify this works end-to-end. No code change expected — just validation. |
| Verify GET /:id/print and GET /:id/report | `backend/src/modules/surgery/surgery.routes.ts:297-343` | Both endpoints exist and include team members + events. Verify `generateSurgeryPrintHtml` handles empty arrays gracefully. |

### Jr Dev — All UI Gap Filling

| Task | File(s) | Description |
|------|---------|-------------|
| **Fix SurgeryScheduler: add departmentId + operationType** | `frontend/src/features/surgery/SurgeryScheduler.jsx` | The POST /surgeries endpoint requires `departmentId`. Add department dropdown (fetch from `/api/departments`), operation type dropdown (fetch from preoperative `/api/preoperative/operation-types?departmentId=X`), and anesthesia type text field. Update `handleSubmit` to send all required fields. This is the **highest priority** fix — the scheduler is currently broken for creating surgeries. |
| **Add team member management to SurgeryGantt** | `frontend/src/features/surgery/SurgeryGantt.jsx` | Add a "Team" tab/section to the surgery detail panel (below the status card). Show existing team members from `GET /:id/team`. Add form to add new member (name + role from OR roles endpoint). Add remove button per member. |
| **Add intraoperative event logging to SurgeryGantt** | `frontend/src/features/surgery/SurgeryGantt.jsx` | Add an "Events" tab/section to the surgery detail panel. Show existing events from `GET /:id/events`. Add form to log new event (event type from `/surgery/event-types`, optional description). Events display timestamp + type + description. |
| **Add follow-up management to SurgeryGantt** | `frontend/src/features/surgery/SurgeryGantt.jsx` | The "Schedule Follow-up" modal already exists (lines 306-332). Add a "Follow-ups" section to the detail panel showing existing follow-ups from `GET /surgery/follow-ups?surgeryId=X`. Add ability to mark follow-up as COMPLETED or MISSED. |
| **Add loading/empty/error states to SurgeryGantt** | `frontend/src/features/surgery/SurgeryGantt.jsx` | Currently has no loading state. Add: skeleton/spinner while `isLoading`, empty state when `surgeries.length === 0`, error state on fetch failure. Follow the pattern from `DischargeSummary.jsx:31-33`. |
| **Add loading/empty/error states to SurgeryDashboard** | `frontend/src/features/surgery/SurgeryDashboard.jsx` | Currently has no loading state for `stats` or `surgeries`. Add skeleton loaders and empty state messages. |
| **Enhance SurgeryScheduler: patient search UX** | `frontend/src/features/surgery/SurgeryScheduler.jsx` | The patient search currently uses raw `fetch` (line 49) instead of the `api` helper. Replace with the `api` helper or a dedicated hook. Add debounce or search-on-type instead of only on Enter. Add loading indicator during search. |
| **Complete PreoperativePage: full workflow** | `frontend/src/features/preoperative/PreoperativePage.jsx` | The existing page only shows the WAITING/IN_PROGRESS/CLEARED/FLAGGED board. It's missing the full preop workflow (REQUESTED → CONFIRMED → PAYMENT_DONE → INVESTIGATIONS_DONE → SCHEDULED). Add: (1) "New Request" form button + modal, (2) request list with full status workflow buttons, (3) consent waiver capture modal, (4) schedule surgery from cleared request. |
| **Add preoperative request creation form** | `frontend/src/features/preoperative/PreoperativePage.jsx` (or new file `PreopRequestForm.jsx` in same dir) | Modal form to create a new preoperative request: patient search, department select, operation type select (filtered by department), notes. Calls `POST /preoperative`. |
| **Add consent waiver capture modal** | `frontend/src/features/preoperative/PreoperativePage.jsx` (or new file `ConsentWaiverModal.jsx`) | Modal for capturing consent waiver: signedBy, relationship (SELF/PARENT/GUARDIAN select), optional witness. Calls `PATCH /preoperative/:id/waiver`. |
| **Add schedule-from-preop flow** | `frontend/src/features/preoperative/PreoperativePage.jsx` | Button on CLEARED requests to open a scheduling form: date picker, OR room select, end time. Calls `PATCH /preoperative/:id/schedule` which creates the Surgery and updates the request status. |
| **Extend useSurgery.js hooks** | `frontend/src/hooks/queries/useSurgery.js` | Add missing hooks: `useSurgeryTeam(surgeryId)`, `useAddTeamMember()`, `useRemoveTeamMember()`, `useSurgeryEvents(surgeryId)`, `useAddSurgeryEvent()`, `useSurgeryFollowUpDetails(filters)`, `useUpdateFollowUpStatus()`. |
| **Extend usePreoperative.js hooks** | `frontend/src/hooks/queries/usePreoperative.js` | Add: `usePreopStats()`, `useCreatePreopRequest()`, `useConfirmPreopRequest()`, `useRecordPreopWaiver()`, `useRecordPreopPayment()`, `useMarkLabDone()`, `useMarkImagingDone()`, `useScheduleFromPreop()`, `useCancelPreopRequest()`, `useOperationTypes(departmentId)`. |

---

## 3. Key Gotchas

### Import Path Rule (CRITICAL)

Files in `features/surgery/` are nested two directories deep from `src/`. UI component imports must use `../../components/ui/`, NOT `../ui/`.

```jsx
// CORRECT (from features/surgery/SomeComponent.jsx)
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

// WRONG
import { Card } from '../ui/Card';
```

The `features/preoperative/` directory has the same depth — same rule applies.

### Code Style Rules

1. **No code comments.** Ever. No `//`, no `/* */`, no JSDoc. The codebase has zero comments. If it needs a comment, the code is unclear — refactor instead.

2. **Never use `JSON.stringify`.** Use `safeStringify` from `@voltagent/internal`. This is in `AGENTS.md`.

3. **Zod v4:** If you need to validate record types, use `z.record(z.string(), z.unknown())`, NOT `z.record(z.string(), z.any())`.

4. **JSX fragments:** Every `<>` must have a matching `</>`. Linting will catch mismatches, but double-check in conditional renders.

5. **Run `tsc --noEmit` after all changes.** Fix ALL errors before handing off. The project is TypeScript-first (backend) and uses JSX (frontend). Run from project root.

### Component State Requirements

Every component that fetches data MUST have three states:
- **Loading:** Spinner or skeleton (use the `Spinner` pattern from `App.jsx:56-62`)
- **Empty:** Meaningful message when data is `[]` or `null`
- **Error:** Toast or inline error message

The existing `DischargeSummary.jsx:31-33` and `PreoperativePage.jsx:79-93` demonstrate these patterns.

### Surgery Routes Mounting

Surgery-related routes are split across two backend directories but mounted at different API prefixes:

| Backend Directory | API Prefix | Purpose |
|---|---|---|
| `modules/surgery/` | `/api/surgeries` | Surgery CRUD, status, team, events, notes, discharge, follow-ups |
| `modules/preoperative/` | `/api/preoperative` | Preoperative requests, consent waivers, operation types, scheduling |
| `modules/preoperative/` | `/api/wards` | Ward/bed management (also in this directory) |

The frontend hooks must hit the correct prefix. `useSurgery.js` hits `/surgeries/*`. `usePreoperative.js` hits `/preoperative/*`. `useWards.js` hits `/wards/*`.

### Status Flow

**Surgery status flow** (enforced backend at `PATCH /:id/complete`, frontend at `SurgeryGantt:21-26`):
```
SCHEDULED → PREP → IN_SURGERY → RECOVERY → COMPLETED
(any state except COMPLETED) → CANCELLED
```

**Preoperative status flow** (enforced at `PATCH /preoperative/:id/status`):
```
REQUESTED → CONFIRMED → PAYMENT_DONE → INVESTIGATIONS_DONE → SCHEDULED → WAITING → IN_PROGRESS → CLEARED
(any state) → CLEARED/FLAGGED (from IN_PROGRESS)
(any state except CANCELLED) → CANCELLED
```

### SurgeryScheduler departmentId Contract Mismatch

The `POST /surgeries` backend endpoint requires `departmentId` (line 84 of surgery.routes.ts), but the frontend `SurgeryScheduler` never sends it. This will cause a 400 error when trying to schedule. **This is the #1 bug to fix.** The solution: add a department dropdown to the scheduler form, fetch departments from `/api/departments?type=SURGERY`.

---

## 4. Exact File List

### Backend — Create

| File | Description |
|------|-------------|
| (none) | No new files needed. All changes are edits to existing files. |

### Backend — Modify

| File | Change |
|------|--------|
| `backend/src/modules/surgery/surgery.routes.ts` | Add `GET /or-roles` endpoint (list OR roles). Add `GET /event-types` endpoint (list intraop event types). Verify `POST /` handles `departmentId` correctly. |
| `backend/prisma/seed.js` | Seed ~8-10 operation types with names, nameAr, prices, and surgery department reference. Verify OR roles and event types are seeded correctly. |

### Frontend — Create

| File | Description |
|------|-------------|
| `frontend/src/features/preoperative/PreopRequestForm.jsx` | New request creation modal form (patient search, department, operation type, notes). |
| `frontend/src/features/preoperative/ConsentWaiverModal.jsx` | Consent waiver capture modal (signedBy, relationship, witness). |
| `frontend/src/features/preoperative/ScheduleSurgeryModal.jsx` | Schedule surgery from cleared preop request (date, OR room, end time). |

### Frontend — Modify

| File | Change |
|------|--------|
| `frontend/src/features/surgery/SurgeryScheduler.jsx` | Add department dropdown, operation type dropdown, anesthesia type field. Fix patient search to use `api` helper. Add loading state during patient search. |
| `frontend/src/features/surgery/SurgeryGantt.jsx` | Add team member management section. Add intraoperative event logging section. Add follow-up list + status management. Add loading/empty/error states. |
| `frontend/src/features/surgery/SurgeryDashboard.jsx` | Add loading states for stats and surgery list. Add empty state for no-surgery days. |
| `frontend/src/features/surgery/DischargeSummary.jsx` | Minor: add error state toast for fetch failure (currently only shows "Loading..." with no error handling). |
| `frontend/src/features/preoperative/PreoperativePage.jsx` | Add "New Request" button + modal. Add full status workflow buttons. Add consent waiver capture. Add schedule-from-preop button on CLEARED requests. Wire to new sub-components. |
| `frontend/src/hooks/queries/useSurgery.js` | Add 6 new hooks: team, events, follow-up detail, update follow-up status. |
| `frontend/src/hooks/queries/usePreoperative.js` | Add 10 new hooks: stats, create request, confirm, waiver, payment, lab-done, imaging-done, schedule, cancel, operation types. |

---

## 5. Pattern References

### Template Files to Follow

| What | File | Why |
|------|------|-----|
| Component structure (loading/empty/error) | `frontend/src/features/preoperative/PreoperativePage.jsx:79-93` | Shows loading spinner, empty state, and conditional rendering pattern. |
| Query hook pattern | `frontend/src/hooks/queries/useSurgery.js` | Every hook follows: `useQuery` with `queryKey` + `queryFn` using `api.get`, `useMutation` with `queryClient.invalidateQueries`. |
| Mutation with toast feedback | `frontend/src/features/surgery/SurgeryScheduler.jsx:66-91` | `createSurgery.mutate(data, { onSuccess, onError })` pattern with `toast.success`/`toast.error`. |
| Modal pattern | `frontend/src/features/surgery/SurgeryGantt.jsx:262-302` | `<Modal open={bool} onClose={fn} title="...">` with form inside. |
| Status badge colors | `frontend/src/features/surgery/SurgeryDashboard.jsx:7-14` | `statusConfig` object mapping status to color classes. |
| Patient search pattern | `frontend/src/features/surgery/SurgeryScheduler.jsx:46-55` | Search → results list → select → populate form. (But fix the raw `fetch` to use `api`.) |
| Backend route pattern | `backend/src/modules/surgery/surgery.routes.ts:12-31` | `router.get('/', authenticate, requirePermission(...), asyncHandler(...))` with Prisma query. |
| Print report integration | `frontend/src/features/surgery/SurgeryGantt.jsx:230-238` | Fetches `/api/surgeries/:id/print`, receives `{ htmlPrint }`, passes to `SurgeryPrintReport`. |
| Backend endpoint for dropdown data | `backend/src/modules/preoperative/preoperative.routes.ts:285-291` | `GET /operation-types` pattern — query with optional filter, return array. |
| Seed data pattern | `backend/prisma/seed.js:593-612` | OR roles and event types seeded with `findFirst` + `create` to avoid duplicates. |

### Design System Tokens

| Token | Usage |
|-------|-------|
| `bg-paper`, `bg-bone`, `bg-obsidian` | Backgrounds |
| `text-obsidian`, `text-graphite`, `text-slate` | Text hierarchy |
| `border-silver`, `border-lilac-bloom` | Borders |
| `bg-lilac-bloom`, `text-lilac-bloom` | Primary/accent |
| `text-heading-sm`, `text-body`, `text-caption`, `text-subheading` | Typography |
| `text-amber-600`, `text-green-600`, `text-red-600` | Status colors |

---

## 6. Validation Checklist

Before marking this phase complete:

- [ ] `POST /api/surgeries` works from the SurgeryScheduler (departmentId sent)
- [ ] All 5 existing pages load without errors
- [ ] Surgery Gantt shows team members and events for selected surgery
- [ ] PreoperativePage has full workflow from REQUESTED through SCHEDULED
- [ ] Consent waiver can be captured from the preop page
- [ ] All new hooks are in the correct files and follow the existing pattern
- [ ] All components have loading, empty, and error states
- [ ] `tsc --noEmit` passes with zero errors
- [ ] No `JSON.stringify` usage anywhere in changed files
- [ ] No code comments in any changed/created files
- [ ] All imports use correct relative paths (`../../components/ui/` from `features/surgery/`)
- [ ] Seed data runs successfully (`node prisma/seed.js`)
