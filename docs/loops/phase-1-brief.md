# Phase 1 Brief: Core UI & Navigation

**Date:** 2026-07-16
**Complexity:** L | **Estimated Effort:** 3–4 days
**Focus Role:** frontend
**Dependencies:** Phase 0 (hospitalId in auth context)

---

## 1. Phase Goal

Replace the admin-only StaggeredMenu overlay with a persistent, collapsible sidebar that all roles can see, with grouped navigation items filtered by each user's permissions. Add a RoleGuard component for client-side route protection and build out the user settings page. This phase transforms the shell from a single-role admin layout into a multi-role SaaS navigation system.

---

## 2. Tasks

### 2.1 Navigation Config — `frontend/src/config/navigation.tsx`

Create a single source of truth for all sidebar navigation items. Each entry must define:
- `label` — display string
- `icon` — lucide-react icon name
- `path` — route path (matches existing `App.jsx` routes)
- `requiredPermissions` — array of permission strings from `backend/src/middleware/rbac.ts` (e.g. `['surgery:read']`); empty array = visible to all authenticated users
- `group` — section key (Overview, Clinical, Clinics, Surgery, Wards, Pharmacy, Optics, Lab, Operations, Finance, Administration)
- `badge` — optional callback returning count/label for dynamic badges

Groups map to sections in the sidebar, each with an optional `allowedRoles` or `requiredPermissions` filter so entire sections are hidden for unauthorized roles. The full nav item list (derived from the 49 routes in `App.jsx` and the permission matrix in `05-app-flow.md`):

| Group | Items | Minimum Permission |
|-------|-------|--------------------|
| Overview | Dashboard `/dashboard`, Hospital Overview `/overview` | (none — all roles) |
| Clinical | Reception `/reception`, Waiting Room `/waiting-room`, Patients `/patients`, Referrals `/referrals` | `patient:read` |
| Clinics | Medicine, ENT, Dental, Retina, Glaucoma, Orbit, Peds Ophth, Gen Ophth, Optometry, Imaging (`/clinic/*`) | `clinical:read` (doctor/clinic-assigned) |
| Surgery | Preoperative `/preoperative`, Surgery Gantt `/surgery`, Surgery Dashboard `/surgery/dashboard`, Surgery Scheduler `/surgery/schedule` | `surgery:read` |
| Wards & Inpatient | Wards & Beds `/wards`, In-Patient `/inpatient` | `ward:read` |
| Pharmacy | Pharmacy POS `/pharmacy`, Pharmacy Products `/pharmacy/products` | `pharmacy:read` |
| Optics | Optics POS `/optics`, Optics Products `/optics/products`, Optic Lab `/optic-lab` | `optics:read` or `optic_lab:read` |
| Lab & Diagnostics | Laboratory `/lab` | `diagnostics:read` |
| Operations & Inventory | Inventory `/inventory`, Procurement `/procurement` | `inventory:read` or `purchase:read` |
| Finance | Accounting `/accounting`, Reports `/reports` | `accounting:read` |
| Administration | Admin `/admin`, HR `/hr`, Settings `/settings` | `admin:users` or `hr:read` (Settings: all) |

**Important:** This file must be a `.tsx` file so icon components can be referenced directly (imported from `lucide-react` or equivalent). The config exports a `getNavigation(userPermissions: string[])` function that filters and returns the visible nav tree.

### 2.2 Sidebar Component — `frontend/src/components/layout/Sidebar.jsx`

Build the new persistent left sidebar. Key requirements:

**Structure (top to bottom):**
1. **Hospital branding** — Logo (`/logo.png`, `h-9 w-auto`), hospital name text when expanded
2. **Nav groups** — Scrollable section with grouped items. Each group has a label and collapsible item list
3. **User section** — Pinned to bottom: avatar + name (expanded) or avatar only (collapsed), logout button

**States:**
- **Expanded:** `width: 260px`, full labels visible, icons + text per item
- **Collapsed:** `width: 64px`, icons only, `title` attribute for tooltips on hover
- **Mobile overlay (<768px):** Hidden by default; slides in from left with backdrop overlay, toggled by hamburger button in header

**Active-route highlighting:** Use `useLocation()` from react-router-dom. Current path matches an item → apply `bg-lilac-bloom/20 text-obsidian font-medium` class. All other items use default `text-graphite hover:bg-bone hover:text-obsidian`.

**Role filtering:** Read `user.permissions` from `useAuthStore`. Pass to `getNavigation(userPermissions)` from the config. Only render items/groups that pass the filter.

**CSS classes** (from `04-ui-ux.md` Section 2.2):
```
.sidebar           → fixed top-0 left-0 h-dvh bg-paper border-r border-silver/50 flex flex-col z-30 transition-all duration-300
.sidebar.collapsed → --sidebar-width: 64px
.sidebar.expanded  → --sidebar-width: 260px
.nav-item          → flex items-center gap-3 px-3 py-2.5 rounded-lg text-body text-graphite hover:bg-bone hover:text-obsidian transition-colors
.nav-item.active   → bg-lilac-bloom/20 text-obsidian font-medium
.nav-group-label   → text-caption font-medium text-slate uppercase tracking-wider px-3 mb-2 mt-4
```

### 2.3 SidebarGroup Sub-Component — `frontend/src/components/layout/SidebarGroup.jsx`

Reusable component for each navigation section:
- Renders the group label (`text-caption font-medium text-slate uppercase tracking-wider`)
- Renders the list of `NavItem` children
- **Collapsible:** Click the group label → toggle item visibility with a smooth height transition (CSS `overflow-hidden` + `max-height` transition or `framer-motion` `AnimatePresence`)
- **Badge support:** If a nav item has a `badge` callback, render a small count/indicator badge next to the label (e.g., pending orders count in red)
- Collapsed sidebar: only show icons, no group labels

### 2.4 RoleGuard Component — `frontend/src/components/auth/RoleGuard.jsx`

Simple wrapper component:
```jsx
<RoleGuard requiredPermissions={['surgery:read']}>
  <SurgeryGantt />
</RoleGuard>
```

- Reads `user.permissions` from `useAuthStore`
- If user has ALL required permissions → render `{children}`
- If user lacks any → `<Navigate to="/dashboard" replace />`
- Empty `requiredPermissions` array → always render (for routes accessible to all authenticated users)
- Log a console warning in dev mode when redirecting due to missing permissions

### 2.5 Update AppShell — `frontend/src/components/layout/AppShell.jsx`

Refactor the existing `AppShell.jsx` (currently 230 lines) to:
- Remove `StaggeredMenu` import and render (line 5, line 152)
- Import and render `<Sidebar />` in the flex layout
- Move the header to sit alongside the sidebar (not full-width above it)
- Adjust `<main>` to use `margin-left: var(--sidebar-width)` offset so content doesn't overlap the sidebar
- Keep all existing header elements: hamburger toggle (now for mobile sidebar), logo, notification bell, user dropdown, Tauri window controls
- Add hamburger button visible on mobile (`< md` breakpoint) to toggle mobile sidebar overlay

The updated layout becomes:
```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │  Header (sticky)                  │
│ (z-30)   │  [☰] [Search...] [🔔] [👤]      │
│          ├──────────────────────────────────┤
│          │  Main Content Area                │
└──────────┴──────────────────────────────────┘
```

### 2.6 Wrap Routes with RoleGuard — `frontend/src/app/App.jsx`

Wrap each `<ProtectedRoute>` child with `<RoleGuard>` using the correct permission set per route. The mapping is derived from the backend permission matrix in `05-app-flow.md`:

| Route | Required Permissions |
|-------|---------------------|
| `/dashboard` | (none — all authenticated) |
| `/settings` | (none — all authenticated) |
| `/reception` | `['appointment:write']` or `['patient:create']` |
| `/patients` | `['patient:read']` |
| `/patients/:id` | `['patient:read']` |
| `/clinic/*` | `['clinical:read']` |
| `/surgery`, `/surgery/dashboard`, `/surgery/schedule` | `['surgery:read']` |
| `/surgery/:surgeryId/discharge` | `['surgery:read']` |
| `/preoperative` | `['preoperative:read']` |
| `/wards`, `/inpatient` | `['ward:read']` |
| `/pharmacy`, `/pharmacy/products` | `['pharmacy:read']` |
| `/optics`, `/optics/products` | `['optics:read']` |
| `/optic-lab` | `['optic_lab:read']` |
| `/lab` | `['diagnostics:read']` |
| `/inventory` | `['inventory:read']` |
| `/accounting` | `['accounting:read']` |
| `/admin` | `['admin:users']` |
| `/hr` | `['hr:read']` |
| `/procurement` | `['purchase:read']` |
| `/referrals` | `['patient:read']` |
| `/overview` | (none — dashboard-level) |
| `/reports` | `['accounting:read']` |
| `/waiting-room` | (none — public display, already unwrapped) |

### 2.7 User Settings Page — `frontend/src/features/settings/SettingsPage.jsx`

Extend the existing `SettingsPage.jsx` (currently 19 lines) and `SettingsContent.jsx` (currently 209 lines) to include:

- **Profile editing:** Full name, email (read-only), phone, avatar upload (already partially exists)
- **Password change:** Current password, new password, confirm password — wire to `PUT /api/auth/password` endpoint (if it exists) or add placeholder
- **Notification preferences:** Toggle switches for email notifications, push notifications, SMS alerts (persist to `useUIStore` or `localStorage`)
- **Theme toggle:** Already exists (light/dark/system) — verify it works in the new layout
- **Language selector:** Already exists (EN/AR) — verify RTL direction change works with sidebar
- **Account info display:** Role, hospital name, join date (from user object)

The existing `SettingsContent.jsx` already has theme toggle, language selector, password fields (disabled), and avatar upload. This task wires the password fields to a real endpoint, adds notification prefs section, and ensures everything renders correctly within the new sidebar layout.

### 2.8 Breadcrumb Component — `frontend/src/components/ui/Breadcrumb.jsx`

Build a breadcrumb component that:
- Reads `useLocation()` to get the current path
- Looks up the path in the navigation config to find the group → item hierarchy
- Renders: `Group Name > Item Name` (with links)
- Styled: `text-caption text-slate` with `/` or `>` separator, last item `text-obsidian font-medium`
- Placed at the top of the main content area in `AppShell.jsx`
- For nested routes like `/patients/:id`, show: `Clinical > Patients > [Patient Name]` (patient name fetched from context or param)

### 2.9 Persist Sidebar State to localStorage

Use `useUIStore` (Zustand persist, key `jh-ui-storage`) — already exists per `04-ui-ux.md` Section 1.7 — to store:
- `sidebarCollapsed: boolean` — expanded/collapsed state
- Default: `false` (expanded) on desktop, `true` (collapsed) on tablet

The Sidebar component reads this state and calls `setSidebarCollapsed()` on toggle. Zustand persist handles localStorage automatically.

### 2.10 Remove Legacy Nav Files

Delete these files (no longer needed):
- `frontend/src/components/layout/StaggeredMenu.jsx` (518 lines)
- `frontend/src/components/layout/StaggeredMenu.css`
- `frontend/src/components/layout/TabletNav.jsx` (30 lines) — mobile sidebar overlay replaces this

Ensure no other file imports these. Current known importers:
- `AppShell.jsx` imports `StaggeredMenu` (line 5) — will be removed in task 2.5
- No other files import `TabletNav` (verified via codebase search)

---

## 3. Acceptance Criteria

- [ ] Sidebar is visible on all screen sizes with proper responsive breakpoints (lg: persistent expanded, md: persistent collapsed, <md: hidden overlay)
- [ ] Navigation items are grouped (Overview, Clinical, Clinics, Surgery, Wards, Pharmacy, Optics, Lab, Operations, Finance, Admin) with section headers
- [ ] Items are filtered based on user permissions — a Receptionist does not see Surgery, Accounting, or HR links
- [ ] Active route is highlighted in the sidebar with `bg-lilac-bloom/20 text-obsidian font-medium`
- [ ] Sidebar collapses to icon-only mode (64px) and can be toggled via button
- [ ] Sidebar collapse/expand state persists across page reloads (localStorage via Zustand persist)
- [ ] `RoleGuard` component prevents unauthorized route access and redirects to `/dashboard`
- [ ] All routes in `App.jsx` are wrapped with the correct `RoleGuard` permission set
- [ ] User settings page allows profile editing, password change, and theme/language switching
- [ ] Breadcrumb reflects current navigation group > item hierarchy
- [ ] StaggeredMenu.jsx, StaggeredMenu.css, and TabletNav.jsx are removed
- [ ] Mobile sidebar opens as slide-over overlay with backdrop, toggled by hamburger in header
- [ ] Sidebar user section shows avatar + name (expanded) or avatar only (collapsed) with logout
- [ ] All existing functionality (notification bell, Tauri window controls, user dropdown, sync badge, tour manager) continues to work
- [ ] No visual regressions on any existing page

---

## 4. Work Split

### Sr Dev — Frontend Architecture (estimated 2–2.5 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.1 Navigation Config | `frontend/src/config/navigation.tsx` | M | Single source of truth, `getNavigation()` function, permission mapping for every route. Requires careful mapping of all 49 routes to permissions. |
| 2.2 Sidebar Component | `frontend/src/components/layout/Sidebar.jsx` | L | Core component. Responsive behavior, active-route highlighting, role filtering, mobile overlay, collapse/expand with CSS transitions, user section. |
| 2.3 SidebarGroup | `frontend/src/components/layout/SidebarGroup.jsx` | M | Collapsible sections, badge support, collapsed-mode rendering |
| 2.5 AppShell Integration | `frontend/src/components/layout/AppShell.jsx` | L | Remove StaggeredMenu, add Sidebar, restructure flex layout for sidebar offset, breadcrumb placement, mobile hamburger |
| 2.8 Breadcrumb | `frontend/src/components/ui/Breadcrumb.jsx` | S | Path lookup from nav config, styled breadcrumb trail |
| 2.9 localStorage Persistence | `frontend/src/stores/uiStore.js` | S | Add `sidebarCollapsed` to existing Zustand store |
| 2.10 Remove Legacy Files | Delete 3 files | S | Verify no broken imports after removal |

### Jr Dev — Simpler Components & Integration (estimated 1.5–2 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.4 RoleGuard | `frontend/src/components/auth/RoleGuard.jsx` | S | Straightforward: read permissions, check, render or redirect. ~30 lines. |
| 2.6 Wrap Routes with RoleGuard | `frontend/src/app/App.jsx` | S | Import RoleGuard, wrap each route. Table-driven approach: define `routePermissions` map, iterate. |
| 2.7 Settings Page | `frontend/src/features/settings/SettingsPage.jsx`, `SettingsContent.jsx` | M | Extend existing code. Wire password fields, add notification prefs section, verify theme/language work in new layout. |
| 2.4+2.6 Testing | — | S | Verify RoleGuard works for: Super Admin (sees all), Doctor (clinical + surgery), Receptionist (patients + reception only), Lab Tech (lab only), Pharmacist (pharmacy only) |

**Coordination point:** The Jr Dev tasks (2.4, 2.6, 2.7) depend on the Sidebar and AppShell being complete (tasks 2.2, 2.5). The Jr Dev should start with RoleGuard (2.4) and settings page (2.7) in parallel while the Sr Dev builds the Sidebar, then wrap routes (2.6) once the full nav config is finalized.

---

## 5. Files Likely Impacted

### New Files (7)
| File | Description |
|------|-------------|
| `frontend/src/config/navigation.tsx` | Navigation config with all items, groups, permissions |
| `frontend/src/components/layout/Sidebar.jsx` | New persistent sidebar component |
| `frontend/src/components/layout/SidebarGroup.jsx` | Collapsible nav group sub-component |
| `frontend/src/components/auth/RoleGuard.jsx` | Permission-based route guard |
| `frontend/src/components/ui/Breadcrumb.jsx` | Breadcrumb navigation component |

### Modified Files (5)
| File | Changes |
|------|---------|
| `frontend/src/components/layout/AppShell.jsx` | Remove StaggeredMenu, add Sidebar, restructure layout, add breadcrumb, mobile hamburger |
| `frontend/src/app/App.jsx` | Wrap all ProtectedRoute children with RoleGuard + permission sets |
| `frontend/src/features/settings/SettingsPage.jsx` | Extend with profile editing, password change wiring |
| `frontend/src/features/settings/SettingsContent.jsx` | Add notification prefs, wire password fields, verify layout |
| `frontend/src/stores/uiStore.js` | Add `sidebarCollapsed` state field |

### Deleted Files (3)
| File | Reason |
|------|--------|
| `frontend/src/components/layout/StaggeredMenu.jsx` | Replaced by Sidebar |
| `frontend/src/components/layout/StaggeredMenu.css` | No longer needed |
| `frontend/src/components/layout/TabletNav.jsx` | Replaced by mobile sidebar overlay |

### Reference Files (read-only)
| File | Purpose |
|------|---------|
| `backend/src/middleware/rbac.ts` | Permission string constants and DEFAULT_ROLES |
| `frontend/src/stores/authStore.js` | User permissions source (`user.permissions` array) |
| `frontend/src/app/router.js` | Clinic slug-to-route mapping |
| `frontend/src/stores/uiStore.js` | Theme/language/sidebar state |

---

*This brief is based on: `docs/01-prd.md`, `docs/02-trd.md`, `docs/04-ui-ux.md`, `docs/05-app-flow.md`, `docs/06-implementation-plan.md` (Phase 1), and inspection of the existing codebase.*
