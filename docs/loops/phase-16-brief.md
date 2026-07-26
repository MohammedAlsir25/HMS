# Phase 16 — Multi-Language & Polish

## 1. Phase Goal

Complete Arabic translations for all UI strings, implement robust RTL layout support, add accessibility features (WCAG 2.1 AA), build role-based onboarding tours, implement keyboard shortcuts, add loading skeletons, 404 page, print styles for all printable pages, and conduct cross-browser polish.

---

## 2. What Already Exists

| Component | Exists? | Details |
|-----------|---------|---------|
| i18n library (i18next) | ✅ | `frontend/src/lib/i18n.js` — i18next + react-i18next configured with en/ar resources, localStorage persistence |
| en.json keys | ✅ | ~466 keys covering: app, nav, clinics, login, settings, reception, waitingRoom, surgery, referrals, pharmacy, optics, inventory, accounting, admin, hr, common, pharmacyProducts, opticsProducts, lab, followUp, wards, inpatient |
| ar.json keys | ⚠️ | ~402 keys — 64 fewer than en.json; missing some sections (emergency, insurance, reports, patient portal, surgery detail, preoptic, optic lab, clinical modules) |
| useTranslation adoption | ⚠️ | Only 32 of ~233 JSX/JS files (~14%) import useTranslation; ~86% of components still have hardcoded strings |
| RTL support (basic) | ✅ | `App.jsx:129` sets `dir={language === 'ar' ? 'rtl' : 'ltr'}` on root div |
| RTL Tailwind utilities | ❌ | No `tailwindcss-rtl` or similar plugin; no tailwind.config file (Tailwind v4 via `@tailwindcss/vite`); no explicit RTL-aware layout utilities |
| Shepherd.js | ✅ | v15.2.2 installed in `package.json:41`; CSS imported in `App.jsx:4` |
| Tour definitions | ✅ | `frontend/src/lib/tours/index.js` — step definitions for: Super Admin (14-step dashboard tour), Receptionist, Pharmacist, Accounting, HR, Lab, Inventory, Optician (simple), Procurement Manager |
| TourManager component | ⚠️ | `frontend/src/components/ui/TourManager.jsx` — only renders on native platforms (Tauri/Capacitor) via `isNativePlatform()` check at line 81; hidden on web |
| Keyboard shortcuts | ❌ | None found across entire codebase |
| Service worker / PWA | ❌ | No `manifest.json`, no service worker file, no PWA setup |
| 404 page | ❌ | Catch-all route `App.jsx:216` redirects `*` to `/dashboard` — no dedicated 404 page |
| Print styles | ⚠️ | 7 files have `@media print` rules: `printReceipt.js` (thermal+A4), `EncounterSummary.jsx`, `DeliveryModal.jsx`, `BalanceSheet.jsx`, `SurgeryPrintReport.jsx`, `ReportsPage.jsx`, `OptometryReportPrint.jsx`. Missing on: Insurance pages, Lab reports, HR payslips, Preoperative, many others |
| ARIA labels | ⚠️ | 14 aria-label instances across ~15 files (AppShell, Modal, StripCounter, PortalLayout, PatientDetail, UserProfileDropdown, SyncStatusBadge). Most interactive elements lack ARIA |
| Loading skeletons | ⚠️ | Only `SurgeryDashboard.jsx` has StatSkeleton + SurgeryListSkeleton; no shared Skeleton component; all other pages use inline spinners |
| Shared Skeleton component | ❌ | No `Skeleton.jsx` in `components/ui/` |
| Empty states | ⚠️ | Many components have empty states but inconsistent; no shared EmptyState component |
| Error states | ⚠️ | `ErrorBoundary.jsx` exists; individual components have error states but no shared pattern |
| Cross-browser testing | ❌ | No documented testing or known fixes |

---

## 3. Gap Analysis

### Critical Gaps
1. **i18n coverage**: ~86% of components still use hardcoded English strings. Only 32 files import `useTranslation`. All feature modules (emergency, insurance, reports, patient portal, surgery detail, preoptic, optic-lab, clinic dashboards, wards, inpatient, procurement, HR detail) need extraction and translation.
2. **ar.json is 64 keys short** of en.json — emergency module, insurance module, reports module, patient portal strings are missing entirely.
3. **No shared Skeleton component** — loading states are inconsistent spinners across most pages.
4. **No 404 page** — unknown routes silently redirect to dashboard.
5. **No keyboard shortcuts** — plan requires Ctrl+K search, Ctrl+N new patient, Escape close modals.
6. **No PWA/service worker** — plan requires offline support and installability.
7. **TourManager is web-inaccessible** — the `isNativePlatform()` gate means web users never see the tour button.

### Major Gaps
8. **No RTL Tailwind utilities** — while `dir="rtl"` is set, CSS logical properties and Tailwind RTL-aware classes are not used; sidebar, icons, text alignment likely break in RTL.
9. **ARIA coverage is ~6%** — only 14 aria-labels across entire codebase; buttons, forms, tables, modals, navigation all largely lack accessibility attributes.
10. **Missing Doctor/Nurse tour sequences** — 2 most-used clinical roles have no onboarding tour.
11. **Print styles incomplete** — Insurance, Lab, HR, Preoptic, many pages lack `@media print` rules.
12. **No shared EmptyState component** — empty state UX varies per page.

---

## 4. Tasks

| # | Task | File Paths | Complexity | Dependencies | Owner |
|---|------|-----------|------------|--------------|-------|
| 1 | Create shared `Skeleton` component | `frontend/src/components/ui/Skeleton.jsx` | S | None | Jr Dev |
| 2 | Create shared `EmptyState` component | `frontend/src/components/ui/EmptyState.jsx` | S | None | Jr Dev |
| 3 | Create 404 page + update catch-all route | `frontend/src/features/errors/NotFoundPage.jsx`, `frontend/src/app/App.jsx:216` | S | None | Jr Dev |
| 4 | Extract hardcoded strings from all feature modules → add to en.json | `frontend/src/locales/en.json` + ~100+ component files across `features/` | XL | None | Jr Dev |
| 5 | Translate all new keys to Arabic in ar.json | `frontend/src/locales/ar.json` | L | Task 4 | Jr Dev |
| 6 | Add `useTranslation()` hook to all components with extracted strings | ~100+ files across `features/` | XL | Tasks 4, 5 | Jr Dev |
| 7 | Audit and fix RTL layout for all pages (sidebar mirror, text alignment, icons, tables, forms) | `frontend/src/app/App.jsx`, `frontend/src/components/layout/AppShell.jsx`, all page components | L | Task 6 | Sr Dev |
| 8 | Make TourManager visible on web (remove `isNativePlatform()` gate) | `frontend/src/components/ui/TourManager.jsx:81` | S | None | Jr Dev |
| 9 | Add Doctor and Nurse onboarding tour sequences | `frontend/src/lib/tours/index.js` | S | None | Jr Dev |
| 10 | Internationalize tour step text (ar/en) | `frontend/src/lib/tours/index.js`, `frontend/src/components/ui/TourManager.jsx` | M | Tasks 6, 9 | Sr Dev |
| 11 | Implement keyboard shortcut system (Ctrl+K search, Ctrl+N new patient, Escape close modals) | `frontend/src/lib/shortcuts.js`, `frontend/src/components/ui/ShortcutProvider.jsx`, update App.jsx | L | Task 6 | Sr Dev |
| 12 | Add ARIA labels to all interactive elements (buttons, forms, tables, modals, navigation) | All component files across `frontend/src/` | L | None | Sr Dev |
| 13 | Ensure keyboard navigation works across all interactive components | All modal, dropdown, and form components | M | Task 12 | Sr Dev |
| 14 | Add print styles for: Insurance pages, Lab reports, HR payslips, Preoptic page, Patient records, Emergency triage | Multiple feature files | M | None | Jr Dev |
| 15 | Add loading skeletons to all data-fetching pages (replace inline spinners) | All *Page*.jsx files (~30 pages), `Skeleton.jsx` | L | Task 1 | Jr Dev |
| 16 | Set up PWA manifest.json + service worker for offline support | `frontend/public/manifest.json`, `frontend/public/sw.js`, `frontend/src/lib/registerSW.js`, `index.html` | L | None | Sr Dev |
| 17 | Cross-browser testing and fix rendering issues | All pages | M | All above | QA |
| 18 | Run `npm run lint` + `npm run typecheck` on all changed files | — | S | All above | Dev |

---

## 5. Acceptance Criteria

- [ ] All UI strings in English locale file (`en.json`) and translated to Arabic (`ar.json`) with matching key counts
- [ ] At least 90% of feature components import and use `useTranslation()` hook
- [ ] RTL layout renders correctly on every page (sidebar mirrored, text right-aligned, icons flipped where appropriate)
- [ ] Onboarding tours exist for at least 6 roles (Super Admin, Receptionist, Doctor, Nurse, Pharmacist, Lab Technician)
- [ ] Onboarding tours are accessible from both web and native platforms
- [ ] Tour text is internationalized (English and Arabic)
- [ ] Keyboard shortcuts: Ctrl+K opens search, Ctrl+N opens new patient, Escape closes active modal
- [ ] WCAG 2.1 AA: all interactive elements have ARIA labels, full keyboard navigation works, color contrast >= 4.5:1
- [ ] Lighthouse performance score > 85
- [ ] All pages have loading skeleton state (not just spinner), empty state, and error state
- [ ] 404 page exists and renders for unknown routes
- [ ] Print layouts are clean for: receipts (thermal + A4), reports, prescriptions, insurance docs, lab reports, HR payslips
- [ ] No rendering issues on Chrome, Firefox, Safari, Edge
- [ ] `npm run lint` passes with zero errors
- [ ] `tsc --noEmit` passes with zero errors (frontend)

---

## 6. Work Split

### Sr Dev (Complex / Architectural)
- Task 7: RTL layout audit and fixes (requires deep understanding of layout system)
- Task 10: Internationalize tour step text
- Task 11: Keyboard shortcut system (new architecture: ShortcutProvider, hotkey registry, modal Escape handling)
- Task 12: ARIA audit and implementation (requires accessibility expertise)
- Task 13: Keyboard navigation across components
- Task 16: PWA setup (service worker, manifest, offline strategy)

### Jr Dev (UI / Repetitive / Lower Risk)
- Task 1: Shared Skeleton component
- Task 2: Shared EmptyState component
- Task 3: 404 page
- Task 4: String extraction to en.json (mechanical grep-and-replace)
- Task 5: Arabic translations
- Task 6: Adding `useTranslation()` calls (pattern is simple: destructure `t` and replace strings)
- Task 8: TourManager web visibility fix
- Task 9: Add Doctor/Nurse tour sequences
- Task 14: Print styles (CSS-only work)
- Task 15: Loading skeletons per page (uses shared Skeleton component)
- Task 18: Lint + typecheck

### QA
- Task 17: Cross-browser testing

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| String extraction misses hardcoded strings in some components | High — broken translations | Medium | Use grep `"` across all JSX files; QA pass to toggle language and screenshot every page |
| RTL breaks complex layouts (sidebar, Gantt chart, calendar, Kanban queue) | High — unusable in Arabic | High | Prioritize RTL audit on complex components first; test sidebar, queue board, Gantt |
| Keyboard shortcuts conflict with browser/OS defaults | Medium — user frustration | Low | Use Ctrl (not Cmd) modifier; avoid Ctrl+C/V/X; document shortcut map |
| Service worker caches stale assets | Medium — users see old version | Medium | Use cache-busting strategy; implement versioned cache names; skip on dev |
| Shepherd.js v15 API changes break tour rendering | Medium — broken onboarding | Low | Already installed and working; pin version; test after upgrade |
| i18n key naming inconsistencies between en/ar | Low — fallback to English | Low | Script to diff keys between en.json and ar.json; enforce naming convention `module.submodule.key` |
| Large PR size for string extraction (~100+ files) | Medium — hard to review | High | Split into 2 PRs: (a) shared components + 404 + tour fixes, (b) i18n extraction |
| Print CSS varies per browser | Medium — ugly prints | Medium | Test print preview in Chrome, Firefox, Safari; use `@page` directives |

---

**Estimated Complexity:** XL  
**Total Tasks:** 18  
**Estimated Duration:** 3–4 sprints (Sr Dev: 6 tasks, Jr Dev: 11 tasks, QA: 1 task)  
**Focus Roles:** frontend (all tasks), backend (none)
