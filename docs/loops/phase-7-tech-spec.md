# Phase 7 Tech Spec — Imaging / Radiology Module

**Author:** Tech Lead
**Status:** Ready for Implementation
**Date:** 2026-07-17
**Estimated Total Effort:** ~2.5 days combined

---

## 1. Architecture Decisions

### 1A. Image Viewer — CSS Transforms + Canvas (No Heavy Libraries)

**Decision:** Build a lightweight viewer using `useRef` + CSS `transform: scale() translate()` for zoom/pan and CSS `filter: brightness() contrast()` for adjustments. No cornerstone.js, no OpenSeadragon.

**Rationale:**
- This is an ophthalmology clinic — images are standard JPEG/PNG fundus photos and scan exports, not DICOM pixel data requiring windowing
- The existing upload pipeline stores standard image formats to Supabase Storage and serves them via signed URLs
- A 200-line React component with refs handles zoom/pan/contrast without a 500KB library dependency
- DICOM native viewer (cornerstone.js) would be needed for Phase 12+ when modality integration lands — defer that cost

**Implementation pattern:**
- Outer container `div` with `overflow: hidden`, `position: relative`, fixed aspect ratio
- Inner `div` wrapping `<img>` with `transform: scale(${zoom}) translate(${panX}px, ${panY}px)`
- `onWheel` → adjust zoom (clamped 0.25–4.0)
- `onMouseDown`/`onMouseMove`/`onMouseUp` → track drag delta for pan
- Two `<input type="range">` sliders for brightness (0.5–2.0) and contrast (0.5–2.0), applied as `filter: brightness(${b}) contrast(${c})`
- Fullscreen via the Fullscreen API on the container ref
- Reset button restores all state to defaults

### 1B. DICOM Upload — Extend Multer Filter Only

**Decision:** Add `'application/dicom'` to the multer `allowed` array. Accept `.dcm` extension in the frontend `<input accept>`.

**Rationale:**
- The backend stores files to Supabase Storage with their original mime type — no processing pipeline exists or is needed yet
- DICOM parsing/windowing is a Phase 12 concern; for now clinicians just need to upload and download `.dcm` files
- The frontend file list already shows non-image files by name (line 77 of `ImagingDashboard.jsx`) — DICOM files will naturally display that way

### 1C. Procedure Type Admin UI — Standalone Page (Not Inline Pricing)

**Decision:** Create `ImagingProcedureTypesPage.jsx` as a dedicated admin page with table, seed button, and inline price editing. Do NOT duplicate the pricing sub-tab in `AdminPage.jsx`.

**Rationale:**
- `AdminPage.jsx` already has an "Imaging Fees" pricing sub-tab (lines 348-375) with inline price editing via `useUpdateImagingProcedureTypePrice`
- The new page should provide the full CRUD view: list all types, show scan type, toggle `isActive`, and seed
- The existing pricing sub-tab can remain as a quick-access shortcut; the new page is the full management view
- Follow the same pattern as `AdminPage.jsx` — use the existing `useImagingProcedureTypes` hook from `useAdmin.js`

### 1D. Modality Stubs — Async Functions + Placeholder Endpoints

**Decision:** Create `imaging.modality.ts` with stub async functions that log "Not implemented" and return empty/throw. Add two routes: `GET /imaging/worklist` (returns `[]`) and `POST /imaging/:id/send-to-modality` (returns 501).

**Rationale:**
- These stubs establish the API contract for Phase 12+ DICOM worklist integration
- Returning 501 (Not Implemented) is the correct HTTP status for planned-but-unavailable features
- The stub module keeps the interface defined so future devs know the expected shape

---

## 2. Work Split

### Sr Dev Tasks (Backend + Core Infrastructure)

| Task | Files | Effort | Notes |
|------|-------|--------|-------|
| **T3. DICOM upload filter** | `backend/src/modules/imaging/imaging.routes.ts` | 15min | Add `'application/dicom'` to line 18 allowed array, update error message on line 20 |
| **T7. Modality placeholder module** | `backend/src/modules/imaging/imaging.modality.ts` (NEW) | 30min | Define `ModalityWorklistEntry` interface, stub `fetchWorklist` and `sendToModality` |
| **T8. Modality placeholder endpoints** | `backend/src/modules/imaging/imaging.routes.ts` | 15min | Add 2 routes before `export default router`. Import stubs from T7. |

**Sr Dev file ownership:**
- `backend/src/modules/imaging/imaging.routes.ts` (modify)
- `backend/src/modules/imaging/imaging.modality.ts` (create)

### Jr Dev Tasks (Frontend + UI)

| Task | Files | Effort | Notes |
|------|-------|--------|-------|
| **T1. ImageViewer component** | `frontend/src/components/imaging/ImageViewer.jsx` (NEW) | 1d | Pure component, no API calls, accepts `src`, `alt`, `onClose` props |
| **T2. Integrate into dashboard** | `frontend/src/features/clinics/ImagingDashboard.jsx` | 30min | Depends on T1. Replace `FileThumbnail` clicks with modal opening `ImageViewer` |
| **T4. Update upload accept attr** | `frontend/src/features/clinics/ImagingDashboard.jsx` | 5min | Add `.dcm` to line 210 accept attribute. Can be done in same edit as T2 |
| **T5. Procedure types admin page** | `frontend/src/features/admin/ImagingProcedureTypesPage.jsx` (NEW) | 30min | Table + seed button + inline price editing. No backend changes needed |
| **T6. Route + nav entry** | `frontend/src/app/App.jsx`, `frontend/src/config/navigation.tsx` | 15min | Depends on T5. Lazy import + route + nav item |

**Jr Dev file ownership:**
- `frontend/src/components/imaging/ImageViewer.jsx` (create)
- `frontend/src/features/clinics/ImagingDashboard.jsx` (modify)
- `frontend/src/features/admin/ImagingProcedureTypesPage.jsx` (create)
- `frontend/src/app/App.jsx` (modify)
- `frontend/src/config/navigation.tsx` (modify)

### Dependency Graph

```
Sr Dev T3 (DICOM filter) ──────────────── no dependency
Sr Dev T7 (modality stubs) ────────────── no dependency
Sr Dev T8 (modality routes) ──────────── depends on T7

Jr Dev T1 (ImageViewer) ──────────────── no dependency
Jr Dev T2 (integrate viewer) ─────────── depends on T1
Jr Dev T4 (upload accept) ─────────────── no dependency (batch with T2)
Jr Dev T5 (admin page) ────────────────── no dependency
Jr Dev T6 (route + nav) ───────────────── depends on T5
```

**No cross-dependencies between Sr Dev and Jr Dev work.** Both tracks can start simultaneously.

---

## 3. Key Gotchas

### Import Paths
- `features/clinics/` files MUST use `../../components/ui/` (two levels up) — NOT `../ui/`
- `features/admin/` files also use `../../components/ui/`
- `components/imaging/` files use `../ui/` (one level up)
- See existing pattern: `ImagingDashboard.jsx:5` → `import { Card } from '../../components/ui/Card'`

### Code Style
- **Zero code comments** — this is a strict rule. No `//` comments anywhere
- **No `JSON.stringify`** — use `safeStringify` from `@voltagent/internal` if stringification is ever needed
- **Zod v4** — `z.record(z.string(), z.unknown())` NOT `z.record(z.unknown())`

### JSX Rules
- Every `<>` must have a matching `</>`
- Ternary branches with multiple elements MUST wrap in `<>...</>`
- Every component must handle three states: loading, empty, and error
- Use `notifyError` from `../../utils/notify` for user-facing errors (NOT console.log)

### TypeScript Checking
- After ALL changes, run `tsc --noEmit` and fix EVERY error before marking done
- The frontend is `.jsx` (no type annotations) but TypeScript still type-checks it

### Backend Patterns
- Routes use `authenticate` + `requirePermission(PERMISSIONS.CLINICAL_READ)` middleware
- All route handlers wrapped in `asyncHandler()`
- Errors thrown as `NotFoundError`, `ValidationError` from `../../utils/errors.js`
- `req.user!.id` for current user access
- Use `prisma` directly (imported from `../../lib/prisma.js`)

### Frontend Patterns
- Data fetching via `@tanstack/react-query` hooks
- API calls via `api` from `../../lib/api` (axios instance)
- Mutations: `useMutation` + `queryClient.invalidateQueries()` on success
- UI components: `Card`, `Button`, `Badge`, `Input`, `Table`, `Modal` from `../../components/ui/`
- Toast notifications: `notifySuccess`, `notifyError` from `../../utils/notify`

---

## 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     IMAGE UPLOAD FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User clicks upload                                         │
│       │                                                     │
│       ▼                                                     │
│  <input type="file" accept="...,.dcm">                      │
│       │                                                     │
│       ▼                                                     │
│  FormData.append("files", file)                             │
│       │                                                     │
│       ▼                                                     │
│  POST /imaging/:id/upload                                   │
│       │  (multer: memoryStorage, 50MB limit)                │
│       │  (fileFilter: jpeg/png/webp/pdf/dicom)              │
│       ▼                                                     │
│  Supabase Storage → imaging/{orderId}/{ts}-{filename}       │
│       │                                                     │
│       ▼                                                     │
│  prisma.imagingFile.create({                                │
│    imagingOrderId, originalName, storedPath,                │
│    mimeType, size                                           │
│  })                                                         │
│       │                                                     │
│       ▼                                                     │
│  Response: 201 + file records                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                     IMAGE VIEW FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User clicks thumbnail in file grid                         │
│       │                                                     │
│       ▼                                                     │
│  Opens ImageViewerModal (new)                                │
│       │                                                     │
│       ▼                                                     │
│  GET /imaging/files/:fileId/download                        │
│       │                                                     │
│       ▼                                                     │
│  Supabase → createSignedUrl(path, 3600s)                    │
│       │                                                     │
│       ▼                                                     │
│  Response: { signedUrl, originalName, mimeType, size }      │
│       │                                                     │
│       ▼                                                     │
│  <img src={signedUrl} /> inside ImageViewer                 │
│       │                                                     │
│       ▼                                                     │
│  CSS transforms: scale() translate()                        │
│  CSS filters: brightness() contrast()                       │
│  User: wheel=zoom, drag=pan, sliders=adjust                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                  DICOM WORKLIST FLOW (Stub)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GET /imaging/worklist                                      │
│       │                                                     │
│       ▼                                                     │
│  fetchWorklist() → [] (not implemented)                     │
│       │                                                     │
│       ▼                                                     │
│  Response: 200 + [] + note "DICOM worklist not integrated"  │
│                                                             │
│  POST /imaging/:id/send-to-modality                         │
│       │                                                     │
│       ▼                                                     │
│  sendToModality() → throws "Not implemented"                │
│       │                                                     │
│       ▼                                                     │
│  Response: 501 "Modality integration not yet implemented"   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Exact File List

### New Files

| File | Owner | Description |
|------|-------|-------------|
| `frontend/src/components/imaging/ImageViewer.jsx` | Jr Dev | Lightweight image viewer: zoom (0.25x–4x), pan (drag), brightness/contrast sliders, fullscreen, reset. Pure CSS transforms, no external libs |
| `frontend/src/features/admin/ImagingProcedureTypesPage.jsx` | Jr Dev | Admin page: table of procedure types (name, nameAr, scanType, price, isActive), inline price editing, seed button. Uses existing `useImagingProcedureTypes` and `useUpdateImagingProcedureTypePrice` hooks |
| `backend/src/modules/imaging/imaging.modality.ts` | Sr Dev | Stub module: `ModalityWorklistEntry` interface, `fetchWorklist()` returning `[]`, `sendToModality()` throwing "Not implemented" |

### Modified Files

| File | Owner | Change |
|------|-------|--------|
| `backend/src/modules/imaging/imaging.routes.ts` | Sr Dev | (1) Add `'application/dicom'` to multer allowed array on line 18. (2) Update error message on line 20. (3) Add `GET /worklist` route returning `[]`. (4) Add `POST /:id/send-to-modality` returning 501. (5) Import from `./imaging.modality.js` |
| `frontend/src/features/clinics/ImagingDashboard.jsx` | Jr Dev | (1) Import `ImageViewer` and `Modal`. (2) Add `ImageViewerModal` component with file list sidebar + viewer. (3) Make `FileThumbnail` clickable to open modal. (4) Add `application/dicom,.dcm` to upload input `accept` on line 210 |
| `frontend/src/app/App.jsx` | Jr Dev | Add lazy import for `ImagingProcedureTypesPage` and route at `/admin/imaging-procedure-types` with `pricing:write` permission |
| `frontend/src/config/navigation.tsx` | Jr Dev | Add `Activity` icon import from lucide-react. Add nav item under `admin` group: `{ label: 'Imaging Procedures', icon: Activity, path: '/admin/imaging-procedure-types', requiredPermissions: ['pricing:write'] }` |

---

## 6. Pattern References

These existing files serve as templates for each piece of work:

| Pattern | Reference File | What to Follow |
|---------|---------------|----------------|
| **ImageViewer component** | `frontend/src/features/clinics/ImagingDashboard.jsx:60-84` (`FileThumbnail`) | Existing image loading via signed URL pattern. Expand this into full viewer |
| **Modal overlay** | `frontend/src/features/clinics/ImagingOrderModal.jsx` | Modal wrapper pattern with open/close props |
| **Admin CRUD table** | `frontend/src/features/admin/AdminPage.jsx:348-375` (Imaging Fees sub-tab) | Table with inline editing, using `useImagingProcedureTypes` hook |
| **Admin hook usage** | `frontend/src/hooks/queries/useAdmin.js:94-107` | Existing `useImagingProcedureTypes` and `useUpdateImagingProcedureTypePrice` hooks |
| **Multer filter** | `backend/src/modules/imaging/imaging.routes.ts:14-22` | Existing file filter — extend allowed array |
| **Route + permission** | `backend/src/modules/imaging/imaging.routes.ts:30` | `authenticate` + `requirePermission` + `asyncHandler` pattern |
| **Stub/placeholder** | `backend/src/modules/imaging/imaging.helpers.ts:129-147` | Clean async function pattern with error handling |
| **Lazy route** | `frontend/src/app/App.jsx:47` | `const X = lazy(() => import('...'))` + Route element pattern |
| **Nav item** | `frontend/src/config/navigation.tsx:128-136` | Admin group nav item structure with permissions |
| **Error/loading/empty states** | `frontend/src/features/clinics/ImagingDashboard.jsx:309-343` (`ImagingHistoryPanel`) | Loading spinner, empty message, and data rendering pattern |

---

## 7. Acceptance Criteria Checklist

- [ ] `ImageViewer` renders image from signed URL with zoom (0.25x–4x via wheel)
- [ ] Pan via click-and-drag when zoomed
- [ ] Brightness/contrast sliders adjust CSS filters
- [ ] Reset button restores all defaults
- [ ] Fullscreen toggle expands to viewport
- [ ] Clicking thumbnail opens modal with `ImageViewer`
- [ ] PDF files show as download links (not in viewer)
- [ ] File list sidebar in viewer for switching between images
- [ ] `POST /imaging/:id/upload` accepts `application/dicom`
- [ ] Frontend upload input accepts `.dcm`
- [ ] `/admin/imaging-procedure-types` renders procedure types page
- [ ] Table shows name, nameAr, scanType, price, isActive
- [ ] Inline price editing saves via PATCH
- [ ] Seed button calls existing seed endpoint
- [ ] `GET /imaging/worklist` returns `[]` with 200
- [ ] `POST /imaging/:id/send-to-modality` returns 501
- [ ] All imaging endpoints still require auth + permissions
- [ ] Existing order workflow (start → complete → dismiss) unaffected
- [ ] `tsc --noEmit` passes with zero errors
- [ ] No code comments in any new/modified file
