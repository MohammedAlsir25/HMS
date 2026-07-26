# Phase 7 Brief — Imaging / Radiology Module

**Status:** Ready for Implementation
**Estimated Complexity:** L (revised down from plan estimate — most work already exists)
**Focus Role:** fullstack
**Dependencies:** Phase 0, Phase 1, Phase 2, Phase 4

---

## 1. Phase Goal

Complete the imaging/radiology module by filling the remaining gaps: building an interactive image viewer with zoom/pan/contrast controls, adding DICOM file upload support, and creating a procedure type catalog management UI. The backend order workflow, file upload, billing integration, and report generation are already fully operational.

---

## 2. Executive Summary — What Already Exists

The codebase audit reveals that **~80% of the Phase 7 plan is already built**. The backend is essentially complete, and the frontend dashboard with order management, findings entry, and report printing is functional.

### Existing Functionality

| Area | Status | Details |
|------|--------|---------|
| **Prisma models** | ✅ Done | `ImagingProcedureType`, `ImagingOrder`, `ImagingFile` — all with `hospitalId`, indexes, relations |
| **Enums** | ✅ Done | `ImagingScanType` (A_SCAN, B_SCAN, OTT, BIOMETRY), `ImagingOrderStatus` (PENDING → IN_PROGRESS → COMPLETED → DISMISSED) |
| **Backend CRUD** | ✅ Done | `imaging.routes.ts` — GET list, GET by ID, POST start, POST complete, POST dismiss, POST upload, GET files, GET download signed URL |
| **Billing integration** | ✅ Done | Auto-creates `Transaction` (type: IMAGING) on order completion with price from `ImagingProcedureType` |
| **Report generation** | ✅ Done | `imaging.helpers.ts` — HTML print report + thermal text output, clinical record creation on completion |
| **Order creation from clinics** | ✅ Done | `clinics.routes.ts` POST `/:slug/imaging-order` with referral auto-creation |
| **Procedure type admin API** | ✅ Done | GET/PATCH/seed in `admin.routes.ts` |
| **Frontend dashboard** | ✅ Done | `ImagingDashboard.jsx` — tab-based queue (Pending/In Progress/Completed), order detail panel, findings/impression entry, file thumbnails, status workflow buttons, history panel |
| **Order creation modal** | ✅ Done | `ImagingOrderModal.jsx` — integrated into 6 clinic dashboards (Retina, Glaucoma, Orbit, PedsOphth, GenOphth, Optometry) |
| **Route + navigation** | ✅ Done | `/clinic/imaging` route in `App.jsx`, nav item in `navigation.tsx`, clinic slug mapping in `router.js` |
| **File upload** | ✅ Done | Multer + Supabase Storage, up to 50MB, JPEG/PNG/WebP/PDF |
| **Hospital scoping** | ✅ Done | `hospitalId` on `ImagingOrder` and `ImagingFile` |

### Gaps (What Needs Building)

| Gap | Priority | Complexity |
|-----|----------|------------|
| **Image viewer component** — zoom, pan, brightness/contrast controls (currently only thumbnails + download) | P1 | L |
| **DICOM file upload support** — accept `.dcm` files in upload filter and handle DICOM metadata | P1 | M |
| **Procedure type catalog UI** — admin page to list/create/edit/delete `ImagingProcedureType` (backend API exists but no frontend) | P2 | S |
| **Modality integration hooks** — placeholder for DICOM worklist integration (Phase 12+) | P2 | S |

---

## 3. Tasks

### T1. Build interactive image viewer component
- **File to create:** `frontend/src/components/imaging/ImageViewer.jsx`
- **Description:** Build a lightweight image viewer that accepts a signed URL and renders the image with:
  - Zoom in/out (mouse wheel or buttons, range 0.25x–4x)
  - Pan (click and drag to move around when zoomed)
  - Brightness/contrast CSS filter controls (sliders)
  - Fullscreen toggle
  - Reset button (returns to default zoom/position/filters)
  - Image dimensions display
- **Implementation:** Use CSS `transform: scale() translate()` for zoom/pan, CSS `filter: brightness() contrast()` for adjustments. No heavy library needed — pure React + refs. Wrap in a `div` with `overflow: hidden` and track mouse/touch events via `onMouseDown`, `onMouseMove`, `onMouseUp`.
- **Complexity:** L
- **Dependencies:** None (start immediately)

### T2. Integrate ImageViewer into ImagingDetailPanel
- **File to modify:** `frontend/src/features/clinics/ImagingDashboard.jsx`
- **Description:** Replace the `FileThumbnail` component with the new `ImageViewer`. When a user clicks an image thumbnail in the file grid, open a modal/overlay that renders `ImageViewer` with the full-size signed URL. PDF files should still show as a download link (not in the viewer). Add a file list sidebar within the viewer so the user can switch between images on the same order.
- **Specific change:** In `ImagingDetailPanel`, replace the `FileThumbnail` grid (lines 215–221) with clickable thumbnails that open an `ImageViewerModal`. Create a new `ImageViewerModal` component wrapping `ImageViewer` + file list.
- **Complexity:** M
- **Dependencies:** T1

### T3. Add DICOM file type to upload filter
- **File to modify:** `backend/src/modules/imaging/imaging.routes.ts`
- **Description:** Add `application/dicom` and `.dcm` file handling to the multer `fileFilter` (line 18). Currently the filter only allows `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Add `application/dicom` to the allowed list.
- **Specific change:** Update the `allowed` array on line 18 to include `'application/dicom'`. Update the error message to include DICOM in the list of accepted formats.
- **Complexity:** S
- **Dependencies:** None (start immediately)

### T4. Update frontend upload input to accept DICOM
- **File to modify:** `frontend/src/features/clinics/ImagingDashboard.jsx`
- **Description:** Update the `<input type="file">` in `ImagingDetailPanel` (line 210) to accept `.dcm` files. Add `application/dicom,.dcm` to the `accept` attribute. The current accept is `image/jpeg,image/png,image/webp`.
- **Specific change:** Change `accept="image/jpeg,image/png,image/webp"` to `accept="image/jpeg,image/png,image/webp,application/dicom,.dcm"`.
- **Complexity:** S
- **Dependencies:** T3

### T5. Build ImagingProcedureType catalog management page
- **File to create:** `frontend/src/features/admin/ImagingProcedureTypesPage.jsx`
- **Description:** Build a simple admin page for managing imaging procedure types. Features:
  - Table listing all procedure types (name, nameAr, scanType, price, isActive)
  - Inline price editing (calls existing `PATCH /admin/pricing/imaging-procedure-types/:id`)
  - Seed button (calls existing `POST /admin/pricing/imaging-procedure-types/seed`)
  - Follow the pattern of other admin catalog pages (e.g., `DiagnosticTestsPage` if it exists, or similar CRUD pages)
- **Complexity:** S
- **Dependencies:** None (start immediately — backend API already exists)

### T6. Add route and nav entry for ImagingProcedureTypesPage
- **File to modify:** `frontend/src/app/App.jsx`
- **File to modify:** `frontend/src/config/navigation.tsx`
- **Description:** Add a lazy import for `ImagingProcedureTypesPage` and a route at `/admin/imaging-procedure-types` inside the admin route group. Add a navigation item under the "Administration" group in `navigation.tsx` with label "Imaging Procedures", icon `Activity`, path `/admin/imaging-procedure-types`, and `requiredPermissions: ['pricing:write']`.
- **Complexity:** S
- **Dependencies:** T5

### T7. Add modality integration placeholder
- **File to create:** `backend/src/modules/imaging/imaging.modality.ts`
- **Description:** Create a placeholder module with exported async functions that are stubs for future DICOM worklist integration:
  - `fetchWorklist(studyDate?: string): Promise<ModalityWorklistEntry[]>` — returns empty array, logs "Not implemented"
  - `sendToModality(orderId: string, modalityAet: string): Promise<void>` — throws "Not implemented"
  - Define `ModalityWorklistEntry` interface with fields: `studyInstanceUid`, `patientName`, `patientId`, `studyDate`, `modality`, `accessionNumber`, `referringPhysician`
- **Complexity:** S
- **Dependencies:** None (start immediately)

### T8. Add modality placeholder endpoint
- **File to modify:** `backend/src/modules/imaging/imaging.routes.ts`
- **Description:** Add two placeholder routes that call the stub functions from T7:
  - `GET /imaging/worklist` — returns `[]` with a note that DICOM worklist is not yet integrated
  - `POST /imaging/:id/send-to-modality` — returns 501 with message "Modality integration not yet implemented"
- **Complexity:** S
- **Dependencies:** T7

---

## 4. Acceptance Criteria

- [ ] `ImageViewer` component renders an image from a signed URL and is importable
- [ ] Zoom in/out works via mouse wheel, range is clamped between 0.25x and 4x
- [ ] Pan works by click-and-drag when image is zoomed beyond 1x
- [ ] Brightness slider adjusts image brightness via CSS filter
- [ ] Contrast slider adjusts image contrast via CSS filter
- [ ] Reset button restores zoom to 1x, position to (0,0), and filters to defaults
- [ ] Fullscreen toggle expands viewer to full viewport
- [ ] Clicking an image thumbnail in the order detail opens the ImageViewer modal
- [ ] PDF files show as download links, not in the image viewer
- [ ] `POST /imaging/:id/upload` accepts files with `mimeType` `application/dicom`
- [ ] Frontend upload input accept attribute includes `.dcm`
- [ ] `/admin/imaging-procedure-types` route renders the ImagingProcedureTypesPage
- [ ] ImagingProcedureTypesPage displays a table of procedure types with name, scanType, price
- [ ] Price can be edited inline and saved via PATCH endpoint
- [ ] Seed button creates the 4 default procedure types if missing
- [ ] `GET /imaging/worklist` returns `[]` with status 200
- [ ] `POST /imaging/:id/send-to-modality` returns status 501
- [ ] All imaging endpoints still require authentication and `clinical:read`/`clinical:write` permissions
- [ ] Existing imaging order workflow (start → complete → dismiss) is unaffected

---

## 5. Work Split

### Jr Dev Tasks (start immediately, no backend dependency)

| Task | Description | Est. |
|------|-------------|------|
| T1 | Build `ImageViewer.jsx` component | 1d |
| T4 | Update upload input `accept` attribute | 15min |
| T5 | Build `ImagingProcedureTypesPage.jsx` | 0.5d |
| T6 | Add route + nav entry | 15min |

### Sr Dev Tasks (start immediately, no Jr Dev dependency)

| Task | Description | Est. |
|------|-------------|------|
| T3 | Add DICOM mime type to multer filter | 15min |
| T7 | Build modality placeholder module | 0.5d |
| T8 | Add placeholder endpoints | 15min |

### Coordination Points

- **T2 (Jr Dev):** Depends on T1. Once `ImageViewer.jsx` is complete, integrate it into `ImagingDashboard.jsx` detail panel. Sr Dev should review the integration for correct signed URL handling and error states.
- **T6 (Jr Dev):** Depends on T5. Trivial — just wiring. No Sr Dev coordination needed.

---

## 6. Files Likely Impacted

### New Files

| File | Owner | Description |
|------|-------|-------------|
| `frontend/src/components/imaging/ImageViewer.jsx` | Jr Dev | Interactive image viewer with zoom/pan/contrast |
| `frontend/src/features/admin/ImagingProcedureTypesPage.jsx` | Jr Dev | Admin catalog management page |
| `backend/src/modules/imaging/imaging.modality.ts` | Sr Dev | DICOM worklist placeholder stubs |

### Modified Files

| File | Owner | Change |
|------|-------|--------|
| `frontend/src/features/clinics/ImagingDashboard.jsx` | Jr Dev | Replace thumbnails with ImageViewer modal, update upload accept |
| `frontend/src/app/App.jsx` | Jr Dev | Add lazy import + route for ImagingProcedureTypesPage |
| `frontend/src/config/navigation.tsx` | Jr Dev | Add nav item for Imaging Procedures admin page |
| `backend/src/modules/imaging/imaging.routes.ts` | Sr Dev | Add DICOM to multer filter, add worklist + send-to-modality endpoints |

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **ImageViewer performance with large images** | Medium | Medium | Use `loading="lazy"` on `<img>`, consider image preloading in modal only. Large DICOM files may need server-side thumbnail generation in a future phase. |
| **DICOM mime type detection** | Low | Low | Browsers may not recognize `.dcm` mime type. Accept both by extension and mime type in multer filter. User may need to rename files. |
| **CSS filter approach limits** | Low | Low | CSS `brightness()`/`contrast()` filters are sufficient for basic viewing. Full DICOM windowing (window width/center) is out of scope — defer to DICOM viewer in Phase 12+. |
| **Breaking existing order workflow** | Low | High | All changes are additive — new components, new endpoints, extended file filter. No existing logic is modified. Run `pnpm lint` and manual test of order start → complete → dismiss flow. |
| **Modality placeholder confusion** | Low | Low | Clearly mark endpoints as "not implemented" with 501 status. Document in API response that DICOM worklist integration is planned for Phase 12+. |
