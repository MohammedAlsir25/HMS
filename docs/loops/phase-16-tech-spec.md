# Phase 16 — Tech Spec: Multi-Language & Polish

> **Written by:** Tech Lead  
> **Date:** 2026-07-20  
> **Status:** Ready for Sr Dev + Jr Dev dispatch  
> **Codebase baseline:** 2113 modules, Tailwind v4 (`@tailwindcss/vite`), i18next v26, Shepherd.js v15.2.2

---

## 1. Architecture Decisions

### 1.1 i18n Gap Filling

**Current state:** `frontend/src/lib/i18n.js` configures i18next with `en`/`ar` resources. `en.json` has ~466 keys; `ar.json` has ~402 keys (64 missing). Only 32 of ~233 JSX files import `useTranslation`.

**Approach:** Systematic grep-based extraction. For every hardcoded string in JSX, create a key under the appropriate module namespace (e.g., `emergency.triage.acuityLevel`). Add both `en` and `ar` keys. Replace the string with `t('key')`.

**Key convention:** `{module}.{component}.{element}` — e.g., `surgery.scheduler.orRoom`, `emergency.triage.level1`.

**Dependency:** Jr Dev tasks T7–T12 handle extraction. T11 fills missing `ar.json` keys. T12 validates key parity.

### 1.2 RTL Support

**Current state:** `App.jsx:129` sets `dir={language === 'ar' ? 'rtl' : 'ltr'}` on root div. No RTL-aware CSS utilities exist. Tailwind v4 uses `@tailwindcss/vite` — no `tailwind.config.js`, no `tailwindcss-rtl` plugin.

**Approach:** CSS logical properties + custom utility layer. No plugin needed. Add RTL-aware classes in `frontend/src/styles/rtl.css` using CSS logical properties (`margin-inline-start`, `padding-inline-end`, `border-start-start-radius`, etc.). For Tailwind utilities that use physical properties (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`), add `.rtl-*` overrides or use the existing `[dir="rtl"]` selector in CSS.

**Specific fixes:**
- Sidebar: `transform: scaleX(-1)` on the entire sidebar container when RTL, OR use logical properties for all sidebar spacing
- Icons from `lucide-react`: most are direction-agnostic. For directional icons (arrows, chevrons), add `rtl:rotate-180` class
- Tables: use `text-align: start` instead of `text-align: left/right`
- Forms: use `margin-inline-start` / `padding-inline-end` for labels and helpers

**Tailwind v4 CSS approach:**
```css
/* In styles/rtl.css */
[dir="rtl"] .rtl-flip { transform: scaleX(-1); }
[dir="rtl"] .rtl-mirror { transform: rotate(180deg); }
```

### 1.3 Keyboard Shortcuts

**Current state:** Zero keyboard shortcuts in entire codebase.

**Approach:** Create `frontend/src/lib/shortcuts.js` as a central registry. Create `frontend/src/components/ui/ShortcutProvider.jsx` as a React context provider with a global `keydown` listener. Register in `App.jsx` above `BrowserRouter`.

**Registry format:**
```js
// lib/shortcuts.js
export const SHORTCUTS = [
  { id: 'global-search',   keys: 'ctrl+k',        action: 'openSearch',    scope: 'global' },
  { id: 'new-patient',     keys: 'ctrl+n',        action: 'newPatient',    scope: 'global' },
  { id: 'escape-modal',    keys: 'escape',         action: 'closeModal',    scope: 'modal' },
  { id: 'goto-dashboard',  keys: 'ctrl+shift+d',  action: 'gotoDashboard', scope: 'global' },
];
```

- `ShortcutProvider` listens on `document` for `keydown`, checks modifier keys, matches against registry, calls action via a context callback
- Actions are registered by consuming components (e.g., `Modal` registers its own `closeModal` action)
- Shortcuts are configurable: user can override via Settings (persisted in `uiStore`)

### 1.4 Skeleton Component

**Current state:** Only `SurgeryDashboard.jsx` has inline `StatSkeleton` + `SurgeryListSkeleton`. No shared component.

**Approach:** Create `frontend/src/components/ui/Skeleton.jsx` with variants:
- `Skeleton` — base animated pulse div
- `SkeletonText` — N lines of text placeholder
- `SkeletonCard` — card-shaped placeholder
- `SkeletonTable` — table row placeholder

All use the design system's `bone` color (light) / `silver/20` (dark) with `animate-pulse`. Pattern matches existing `LoadingOverlay.jsx` style.

### 1.5 404 & Permission Denied Pages

**Current state:** `App.jsx:216` — `<Route path="*" element={<Navigate to="/dashboard" replace />} />` silently redirects unknown routes.

**Approach:** Create `frontend/src/features/errors/NotFoundPage.jsx` and `frontend/src/features/errors/PermissionDeniedPage.jsx`. Both lazy-loaded in `App.jsx`. Replace the catch-all route with `<NotFoundPage />`. Add a `PermissionDeniedPage` route at `/access-denied` (used by `RoleGuard`).

### 1.6 Print Styles

**Current state:** 7 files have `@media print` rules. Missing on insurance, lab reports (standalone), HR payslips, preoperative, emergency, patient records, most clinic pages.

**Approach:** Create `frontend/src/styles/print.css` with shared print rules:
- `@page { margin: 1cm; size: A4; }`
- Hide sidebar, header, nav, buttons, modals
- Force white background, black text
- Ensure tables break across pages properly
- Module-specific overrides via `@media print` within each page component

### 1.7 PWA Setup

**Current state:** No manifest, no service worker, no PWA icons.

**Approach:**
- `frontend/public/manifest.json` — app name, icons, theme color, display: standalone
- `frontend/public/sw.js` — cache-first for static assets, network-first for API calls
- `frontend/src/lib/registerSW.js` — `navigator.serviceWorker.register()` in App.jsx
- PWA icons in `frontend/public/icons/` (192x192, 512x512)

### 1.8 Accessibility

**Current state:** 14 `aria-label` instances across ~15 files (~6% coverage).

**Approach:**
- Create `frontend/src/lib/a11y.js` with ARIA helper constants (e.g., `ARIA_LABELS = { search: 'Search', close: 'Close', menu: 'Menu', ... }`)
- Systematic audit: add `aria-label` to all buttons, inputs, links, modals, dropdowns, tables
- Add `role` attributes where semantic HTML is insufficient
- Ensure all interactive elements are keyboard-focusable with visible focus rings

### 1.9 Tour Manager Web Fix

**Current state:** `TourManager.jsx:81` — `if (!isNativePlatform()) return null;` hides tour on web.

**Approach:** Remove the `isNativePlatform()` guard. Tour should render on both web and native. The button is already conditionally rendered based on `tourDef` and `location.pathname` match.

---

## 2. Work Split

### Sr Dev — 6 Architectural Tasks

#### T1: Keyboard Shortcuts Hook + Registry
- **Files:** `frontend/src/lib/shortcuts.js` (new), `frontend/src/components/ui/ShortcutProvider.jsx` (new), `frontend/src/app/App.jsx` (update)
- **Scope:** Central registry with `SHORTCUTS` array. `ShortcutProvider` wraps `BrowserRouter`. Global `keydown` listener with modifier detection. `useKeyboardShortcuts` hook for component-level shortcut registration. Wire `Ctrl+K` → open search modal, `Ctrl+N` → navigate to `/patients` with new-patient intent, `Escape` → close active modal.
- **Pattern:** Registry pattern similar to `navigation.tsx` — declarative config, imperative listener.

#### T2: Skeleton Component + EmptyState Component
- **Files:** `frontend/src/components/ui/Skeleton.jsx` (new), `frontend/src/components/ui/EmptyState.jsx` (new)
- **Scope:** `Skeleton` with variants (text, card, table, circle). `EmptyState` with icon, title, description, optional action button. Both match existing design system (bone/paper colors, rounded-3xl). Export from `components/ui/index.js`.

#### T3: 404 Page + Permission Denied Page + Route Updates
- **Files:** `frontend/src/features/errors/NotFoundPage.jsx` (new), `frontend/src/features/errors/PermissionDeniedPage.jsx` (new), `frontend/src/app/App.jsx` (update lines 216, RoleGuard)
- **Scope:** NotFoundPage with illustration, "Back to Dashboard" link. PermissionDeniedPage with lock icon, role info. Replace catch-all `<Navigate>` with `<NotFoundPage />`. Add `/access-denied` route. Update `RoleGuard` to redirect to `/access-denied` instead of `/dashboard`.

#### T4: Print Styles + PWA Setup
- **Files:** `frontend/src/styles/print.css` (new), `frontend/public/manifest.json` (new), `frontend/public/sw.js` (new), `frontend/src/lib/registerSW.js` (new), `frontend/src/styles/index.css` (import print.css), `frontend/index.html` (link manifest)
- **Scope:** Shared print CSS with `@page`, hide chrome, typography overrides. PWA manifest with hospital branding. Service worker with cache versioning. Register SW in App init.

#### T5: RTL CSS Utilities + Tour Manager Fix
- **Files:** `frontend/src/styles/rtl.css` (new), `frontend/src/components/ui/TourManager.jsx` (update line 81), `frontend/src/styles/index.css` (import rtl.css)
- **Scope:** RTL utility classes: `.rtl-flip`, `.rtl-mirror`, logical property overrides for sidebar. Fix `TourManager.jsx` to remove `isNativePlatform()` gate — render tour button on all platforms. Ensure Shepherd.js styles work in RTL context.

#### T6: Missing Tour Definitions (Phase 10-15 Roles)
- **Files:** `frontend/src/lib/tours/index.js` (update)
- **Scope:** Add tour sequences for: Doctor (consultation page flow), Nurse (ward rounds + vitals), Insurance Clerk (pre-auth + claims), Patient Portal (portal walkthrough). Each with 2-4 steps pointing to `data-tour` attributes. Ensure role mapping in `TOURS` object covers all new roles.

---

### Jr Dev — 11 UI/Repetitive Tasks

#### T7: Add `useTranslation` + `t()` to Phase 0-3 Components
- **Files:** `frontend/src/features/auth/LoginPage.jsx`, `frontend/src/features/settings/SettingsContent.jsx`, `frontend/src/features/reception/ReceptionPage.jsx`, `frontend/src/features/reception/WaitingRoomTV.jsx`, `frontend/src/features/patients/PatientListPage.jsx`, `frontend/src/features/patients/PatientDetailPage.jsx`, `frontend/src/features/appointments/AppointmentCalendar.jsx`, `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/components/layout/AppShell.jsx`, plus any other Phase 0-3 files
- **Scope:** Import `useTranslation` from `react-i18next`. Destructure `t` from `useTranslation()`. Replace all hardcoded English strings with `t('module.key')`. Add new keys to `en.json` and `ar.json` as needed.

#### T8: Add `useTranslation` + `t()` to Phase 4-7 Components
- **Files:** All files in `features/clinics/`, `features/pos/` (PharmacyPOS, PharmacyProducts), `features/pharmacy/`, `features/lab/`, `features/optic-lab/`, `features/wards/`
- **Scope:** Same pattern as T7.

#### T9: Add `useTranslation` + `t()` to Phase 8-11 Components
- **Files:** All files in `features/surgery/`, `features/wards/InpatientPage.jsx`, `features/accounting/`, `features/insurance/`, `features/preoperative/`
- **Scope:** Same pattern as T7.

#### T10: Add `useTranslation` + `t()` to Phase 12-15 Components
- **Files:** All files in `features/hr/`, `features/admin/`, `features/reports/`, `features/emergency/`, `features/patient-portal/`, `features/referral/`, `features/procurement/`, `features/dashboard/`, `components/dashboard/RoleWidgets.jsx`
- **Scope:** Same pattern as T7.

#### T11: Fill Missing `ar.json` Keys
- **Files:** `frontend/src/locales/ar.json`
- **Scope:** Identify all keys in `en.json` not present in `ar.json`. Add Arabic translations for each missing key. Missing modules include: emergency, insurance, reports, patient portal, surgery detail, preoptic, optic-lab, clinical modules.

#### T12: Ensure en.json and ar.json Key Parity
- **Files:** `frontend/src/locales/en.json`, `frontend/src/locales/ar.json`
- **Scope:** After T7-T11, diff both files. Ensure every key in `en.json` has a corresponding key in `ar.json` and vice versa. Fix any mismatches. Sort keys alphabetically within each namespace.

#### T13: Add ARIA Labels to Phase 0-5 Interactive Elements
- **Files:** All button, input, select, table, modal, link components in `features/auth/`, `features/settings/`, `features/reception/`, `features/patients/`, `features/appointments/`, `features/clinics/`, `features/pos/`, `components/ui/Modal.jsx`, `components/ui/Button.jsx`, `components/layout/Sidebar.jsx`
- **Scope:** Add `aria-label` to every interactive element. Add `role` attributes where needed. Ensure all modals have `role="dialog"` and `aria-modal="true"`. All tables get `role="table"` or use semantic `<table>`.

#### T14: Add ARIA Labels to Phase 6-11 Interactive Elements
- **Files:** All files in `features/lab/`, `features/pharmacy/`, `features/surgery/`, `features/wards/`, `features/accounting/`, `features/insurance/`, `features/preoperative/`, `features/optic-lab/`
- **Scope:** Same pattern as T13.

#### T15: Add ARIA Labels to Phase 12-15 Interactive Elements
- **Files:** All files in `features/hr/`, `features/admin/`, `features/reports/`, `features/emergency/`, `features/patient-portal/`, `features/referral/`, `features/procurement/`, `features/dashboard/`
- **Scope:** Same pattern as T13.

#### T16: Add `data-tour` Attributes to Phase 10-15 Component Roots
- **Files:** All page-level components in `features/accounting/`, `features/insurance/`, `features/hr/`, `features/reports/`, `features/emergency/`, `features/patient-portal/`, `features/preoperative/`
- **Scope:** Add `data-tour="module-page"` attribute to the root `<div>` of each page component. Required for Shepherd.js tour step `attachTo` to work.

#### T17: Cross-Browser Testing Notes
- **Files:** `docs/loops/phase-16-cross-browser.md` (new)
- **Scope:** Test on Chrome, Firefox, Safari, Edge. Document any rendering issues, CSS compatibility, JS API differences. Note fixes applied.

---

### QA — 1 Task

#### T18: Accessibility Audit + Lighthouse Score
- **Files:** Run Lighthouse on all major pages. Run axe-core audit.
- **Scope:** Verify WCAG 2.1 AA compliance. Check color contrast (≥4.5:1), keyboard navigation, screen reader compatibility. Document any violations. Target Lighthouse performance > 85.

---

## 3. Data Flow Diagrams

### 3.1 i18n Translation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Component    │────▶│ useTranslation│────▶│  i18next.js  │
│  renders t()  │     │   hook        │     │  (lib/i18n)  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                           ┌──────▼───────┐
                                           │  en.json /   │
                                           │  ar.json     │
                                           └──────────────┘
                                                  │
                                           ┌──────▼───────┐
                                           │  uiStore     │
                                           │  .language   │
                                           │  (persisted) │
                                           └──────────────┘
```

### 3.2 Keyboard Shortcut Flow

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  User presses │────▶│ ShortcutProvider  │────▶│  shortcuts.js│
│  key combo    │     │  (keydown listener)│    │  (registry)  │
└──────────────┘     └──────────────────┘     └──────┬───────┘
                                                      │
                                               ┌──────▼───────┐
                                               │ Action fires  │
                                               │ (context fn)  │
                                               └──────────────┘
                                                      │
                                    ┌─────────────────┼─────────────────┐
                                    ▼                 ▼                 ▼
                             ┌────────────┐   ┌────────────┐   ┌────────────┐
                             │ SearchModal │   │ Navigate   │   │ CloseModal │
                             │ .open()    │   │ /patients  │   │ active     │
                             └────────────┘   └────────────┘   └────────────┘
```

### 3.3 RTL Rendering Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  uiStore     │────▶│  App.jsx     │────▶│  <div dir=   │
│  .language   │     │  reads       │     │  "rtl">      │
│  = 'ar'      │     │  language    │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼                           ▼
                             ┌────────────┐            ┌────────────┐
                             │  CSS       │            │ Tailwind   │
                             │  logical   │            │ utilities  │
                             │  props     │            │ override   │
                             └────────────┘            └────────────┘
                                    │                           │
                                    ▼                           ▼
                             ┌────────────────────────────────────┐
                             │  Rendered RTL layout                │
                             │  - sidebar mirrored                │
                             │  - text right-aligned              │
                             │  - icons flipped where needed      │
                             └────────────────────────────────────┘
```

### 3.4 Tour Flow (Post-Fix)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  User logs in │────▶│ TourManager      │────▶│ getTour(role)│
│  (any platform)│    │  renders button  │     │ from tours/  │
└──────────────┘     │  (no platform    │     └──────┬───────┘
                     │   guard anymore)  │            │
                     └──────────────────┘     ┌──────▼───────┐
                                              │ Shepherd.js  │
                                              │ Tour starts  │
                                              │ (4-14 steps) │
                                              └──────────────┘
```

---

## 4. Exact File List

### New Files (15)
| # | Path | Purpose |
|---|------|---------|
| 1 | `frontend/src/lib/shortcuts.js` | Keyboard shortcut registry |
| 2 | `frontend/src/components/ui/ShortcutProvider.jsx` | Global shortcut context provider |
| 3 | `frontend/src/components/ui/Skeleton.jsx` | Reusable skeleton loading component |
| 4 | `frontend/src/components/ui/EmptyState.jsx` | Reusable empty state component |
| 5 | `frontend/src/features/errors/NotFoundPage.jsx` | 404 page |
| 6 | `frontend/src/features/errors/PermissionDeniedPage.jsx` | 403 page |
| 7 | `frontend/src/styles/print.css` | Shared print styles |
| 8 | `frontend/src/styles/rtl.css` | RTL utility classes |
| 9 | `frontend/src/lib/a11y.js` | ARIA helper constants |
| 10 | `frontend/public/manifest.json` | PWA manifest |
| 11 | `frontend/public/sw.js` | Service worker |
| 12 | `frontend/src/lib/registerSW.js` | SW registration |
| 13 | `frontend/public/icons/icon-192.png` | PWA icon 192 |
| 14 | `frontend/public/icons/icon-512.png` | PWA icon 512 |
| 15 | `docs/loops/phase-16-cross-browser.md` | Cross-browser testing notes |

### Modified Files (Core — 6)
| # | Path | Change |
|---|------|--------|
| 1 | `frontend/src/app/App.jsx` | Add ShortcutProvider, lazy-load NotFoundPage/PermissionDeniedPage, replace catch-all route, import print.css/rtl.css, register SW |
| 2 | `frontend/src/components/ui/TourManager.jsx` | Remove `isNativePlatform()` guard at line 81 |
| 3 | `frontend/src/lib/tours/index.js` | Add Doctor, Nurse, Insurance, Patient Portal tour sequences |
| 4 | `frontend/src/styles/index.css` | Import print.css and rtl.css |
| 5 | `frontend/index.html` | Add `<link rel="manifest">`, meta theme-color |
| 6 | `frontend/src/components/ui/index.js` | Export Skeleton, EmptyState |

### Modified Files (Locale — 2)
| # | Path | Change |
|---|------|--------|
| 1 | `frontend/src/locales/en.json` | Add ~200+ new keys for missing modules |
| 2 | `frontend/src/locales/ar.json` | Add ~260+ new keys (64 existing missing + ~200 new module keys) |

### Modified Files (Components — ~200+ JSX)
All JSX files across `frontend/src/features/` and `frontend/src/components/` that contain hardcoded strings (T7-T10) or lack ARIA attributes (T13-T15). Estimated ~200 files total.

---

## 5. Pattern References

| Pattern | Reference File | Line(s) | What to Follow |
|---------|---------------|---------|----------------|
| useTranslation import | Any of the 32 existing files that already use it | — | `const { t } = useTranslation();` destructuring pattern |
| Lazy-loaded route | `frontend/src/app/App.jsx` | 15-86 | `const X = lazy(() => import('../features/X/XPage'))` pattern |
| Shared UI component | `frontend/src/components/ui/Button.jsx` | — | Export from `components/ui/index.js`, use design system tokens |
| Tour step definition | `frontend/src/lib/tours/index.js` | 1-91 | `{ id, title, text, attachTo: { element, on } }` shape |
| CSS logical properties | `theme.css` | 1-100 | Use `--color-*` tokens, not hardcoded hex |
| Store pattern | `frontend/src/stores/uiStore.js` | 1-29 | `create(persist(...))` with `partialize` |
| Nav config pattern | `frontend/src/config/navigation.tsx` | 26-173 | Declarative config array with typed shapes |
| ErrorBoundary pattern | `frontend/src/components/ui/ErrorBoundary.jsx` | — | Class component with `getDerivedStateFromError` |

---

## 6. Gotchas

### Critical
1. **en.json and ar.json must have identical key structures.** After every extraction pass, run a diff. Missing keys cause silent fallback to English — users won't see Arabic for those strings.

2. **RTL flips icons.** Directional icons from `lucide-react` (ArrowLeft, ChevronRight, ArrowUpRight, etc.) must be CSS-flipped in RTL. Use `[dir="rtl"] .rtl-mirror { transform: rotate(180deg); }` on icon containers. Non-directional icons (Home, Settings, Users) are fine.

3. **Keyboard shortcuts must not conflict with browser defaults.** Avoid `Ctrl+C/V/X/A/Z`. Use `Ctrl+K`, `Ctrl+N`, `Ctrl+Shift+D` etc. For `Escape`, only intercept when a modal is open (don't prevent browser's natural behavior).

4. **TourManager.jsx `isNativePlatform()` gate at line 81** must be removed. Currently returns `null` on web — this blocks ALL tour functionality for web users.

5. **Import paths for features must use `../../components/ui/`** (two levels up from `features/X/`). The `../ui/` path resolves to `features/ui/` which doesn't exist. (Per AGENTS.md.)

### High Priority
6. **Tailwind v4 has no tailwind.config.js.** All customization is in `theme.css` via `@theme` directive. RTL utilities must be CSS-only (no plugin).

7. **i18n key naming:** Use dot-notation `{module}.{sub}.{key}` consistently. Don't mix conventions (e.g., `surgerySchedulerOrRoom` vs `surgery.scheduler.orRoom`). Always use the latter.

8. **Print styles must not break screen layout.** All print rules go inside `@media print { }` blocks. Never use screen-affecting CSS outside the print media query.

9. **Service worker can't cache API responses aggressively.** Use `NetworkFirst` strategy for `/api/*` routes. Only cache static assets with `CacheFirst`.

10. **Skeleton component must use existing design tokens.** Use `bone` for light mode skeleton color, `silver/20` for dark. Don't invent new colors.

### Medium Priority
11. **Shepherd.js v15 uses `attachTo` with element selectors.** Every tour target needs a `data-tour="name"` attribute on the component root. Phase 10-15 components are missing these.

12. **ARIA labels should be concise.** "Close" not "Close this modal window". Screen readers need short, descriptive labels.

13. **`react-i18next` `t()` function supports interpolation:** `t('key', { name: 'value' })`. Use `{{name}}` in JSON files. Don't concatenate strings.

14. **The existing `Spinner()` in App.jsx** should be replaced with `Skeleton` in the Suspense fallback for a better loading experience.

15. **PWA manifest icons must be square, ≥192px, PNG format.** Use the hospital logo if available, or a generated placeholder.

---

**Estimated Duration:** 3–4 sprints  
**Total Tasks:** 18 (Sr Dev: 6, Jr Dev: 11, QA: 1)  
**Parallelizable:** T7-T10 can run in parallel. T1-T6 can run in parallel. T11-T12 after T7-T10. T13-T15 can run in parallel. T16 after T6. T17-T18 last.
