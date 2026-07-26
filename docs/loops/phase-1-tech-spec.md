# Phase 1 Tech Spec: Core UI & Navigation

**Date:** 2026-07-16  
**Author:** Tech Lead  
**Status:** Ready for implementation  
**Depends on:** Phase 0 (hospitalId in auth context)

---

## 1. Key Architectural Decisions

### 1.1 Navigation Config

**File:** `frontend/src/config/navigation.tsx`

Single source of truth. `.tsx` extension so icon components (from `lucide-react`) can be imported directly as JSX.

**Shape:**

```tsx
import {
  Home, Building2, ClipboardList, Monitor, Users, ArrowLeftRight,
  Stethoscope, Scissors, Bed, HeartPulse, ShoppingCart, Package,
  Glasses, Wrench, FlaskConical, Warehouse, Truck, DollarSign,
  BarChart3, Settings as SettingsIcon, UsersRound
} from 'lucide-react';

export type NavItem = {
  label: string;
  icon: LucideIcon;          // lucide-react component
  path: string;
  requiredPermissions: string[]; // empty = visible to all authenticated users
  badge?: () => number | null;  // optional dynamic badge count
};

export type NavGroup = {
  key: string;               // unique group identifier
  label: string;             // display label
  items: NavItem[];
  requiredPermissions: string[]; // group-level filter (empty = show to all)
};

export const NAV_GROUPS: NavGroup[] = [ /* ... */ ];

export function getVisibleNav(userPermissions: string[]): NavGroup[] {
  return NAV_GROUPS
    .filter(group =>
      group.requiredPermissions.length === 0 ||
      group.requiredPermissions.some(p => userPermissions.includes(p))
    )
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.requiredPermissions.length === 0 ||
        item.requiredPermissions.some(p => userPermissions.includes(p))
      ),
    }))
    .filter(group => group.items.length > 0);
}

// Helper: look up breadcrumb labels from path
export function findNavItem(path: string): { group: string; item: string } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.path === path) return { group: group.label, item: item.label };
    }
  }
  return null;
}
```

**Icon library:** `lucide-react` (already in `package.json` at `^1.23.0`, used in 10+ files). Do **not** use `react-icons`.

### 1.2 Sidebar State Management

**Store:** `useUIStore` in `frontend/src/stores/uiStore.js`

Add `sidebarCollapsed` state + setter. Zustand persist already configured with key `jh-ui-storage` — just add the field to both state and `partialize`.

### 1.3 RoleGuard Component

Reads `user.permissions` array from `useAuthStore`. Requires at least **one** matching permission (logical OR across the `requiredPermissions` array). Empty array → always render.

### 1.4 Sidebar Styling

All Tailwind — no CSS modules. Use project design tokens: `bg-paper`, `text-graphite`, `bg-bone`, `border-silver`, `bg-lilac-bloom/20`, `text-obsidian`, etc.

### 1.5 Breadcrumb

Derive from `useLocation().pathname` → look up via `findNavItem(path)` → render group label → item label.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Icon library | `lucide-react` | Already installed (`^1.23.0`), used in 10+ components |
| CSS approach | Tailwind utility classes | Consistent with codebase (no CSS modules used) |
| Sidebar width | `w-72` (288px) expanded, `w-16` (64px) collapsed | Matches `04-ui-ux.md` spec (260px/64px) |
| Breakpoints | `lg:` ≥1024px persistent, `md:` 768-1024 collapsed, `<md` overlay | Per `04-ui-ux.md` Section 1.6 |
| State persistence | Zustand persist → localStorage (`jh-ui-storage`) | Already used for theme/language |
| Mobile sidebar | Slide-over overlay with backdrop, z-30 | Per `04-ui-ux.md` target architecture |
| Active route | `useLocation()` + exact path match | Simple, no regex needed |
| Group collapse | CSS `max-height` transition (no framer-motion) | Keeps bundle small, matches existing patterns |
| `NAV_GROUPS` export | Array of group objects with `.tsx` icon components | Allows direct `<Icon />` rendering without string→component mapping |

---

## 3. Work Split

### 3.1 Sr Dev — Frontend Architecture (2–2.5 days)

**Order:** Start with nav config → uiStore → SidebarGroup → Sidebar → AppShell integration → Breadcrumb → Remove legacy files.

### 3.2 Jr Dev — Simpler Components (1.5–2 days)

**Can start immediately in parallel:** RoleGuard component, settings page updates.  
**Must wait for Sr Dev:** Wrapping routes with RoleGuard (needs finalized nav config + AppShell).

---

## 4. Exact File Lists

### Sr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| S1 | `frontend/src/config/navigation.tsx` | Nav config with all groups, items, permissions, icons |
| S2 | `frontend/src/components/layout/Sidebar.jsx` | Persistent collapsible sidebar component |
| S3 | `frontend/src/components/layout/SidebarGroup.jsx` | Reusable collapsible nav group sub-component |
| S4 | `frontend/src/components/ui/Breadcrumb.jsx` | Path-derived breadcrumb component |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| S5 | `frontend/src/stores/uiStore.js` | Add `sidebarCollapsed`, `setSidebarCollapsed`, update `partialize` |
| S6 | `frontend/src/components/layout/AppShell.jsx` | Remove StaggeredMenu import/render, import Sidebar, restructure flex layout for sidebar offset, add Breadcrumb, add mobile hamburger button |

#### DELETE

| # | File | Reason |
|---|------|--------|
| S7 | `frontend/src/components/layout/StaggeredMenu.jsx` | 518 lines — replaced by Sidebar |
| S8 | `frontend/src/components/layout/StaggeredMenu.css` | No longer needed |
| S9 | `frontend/src/components/layout/TabletNav.jsx` | 30 lines — replaced by mobile sidebar overlay |

### Jr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| J1 | `frontend/src/components/auth/RoleGuard.jsx` | Permission-based route guard wrapper |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| J2 | `frontend/src/app/App.jsx` | Import RoleGuard, wrap each `<ProtectedRoute>` child with `<RoleGuard requiredPermissions={[...]} >` |
| J3 | `frontend/src/features/settings/SettingsPage.jsx` | Add notification prefs section |
| J4 | `frontend/src/features/settings/SettingsContent.jsx` | Wire password fields to API, add notification preferences section with toggle switches, verify theme/language work with new sidebar layout |

---

## 5. Implementation Details — Sr Dev

### S1: Navigation Config — `navigation.tsx`

**Full item list** (maps to `05-app-flow.md` routes + `rbac.ts` permissions):

```tsx
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    requiredPermissions: [],
    items: [
      { label: 'Dashboard', icon: Home, path: '/dashboard', requiredPermissions: [] },
      { label: 'Hospital Overview', icon: Building2, path: '/overview', requiredPermissions: [] },
    ],
  },
  {
    key: 'clinical',
    label: 'Clinical',
    requiredPermissions: ['patient:read', 'appointment:read'],
    items: [
      { label: 'Reception', icon: ClipboardList, path: '/reception', requiredPermissions: ['appointment:write', 'patient:create'] },
      { label: 'Waiting Room', icon: Monitor, path: '/waiting-room', requiredPermissions: [] },
      { label: 'Patients', icon: Users, path: '/patients', requiredPermissions: ['patient:read'] },
      { label: 'Referrals', icon: ArrowLeftRight, path: '/referrals', requiredPermissions: ['patient:read'] },
    ],
  },
  {
    key: 'clinics',
    label: 'Clinics',
    requiredPermissions: ['clinical:read'],
    items: [
      { label: 'Medicine', icon: Stethoscope, path: '/clinic/medicine', requiredPermissions: [] },
      { label: 'ENT', icon: Stethoscope, path: '/clinic/ent', requiredPermissions: [] },
      { label: 'Dental', icon: Stethoscope, path: '/clinic/dental', requiredPermissions: [] },
      { label: 'Retina', icon: Stethoscope, path: '/clinic/retina', requiredPermissions: [] },
      { label: 'Glaucoma', icon: Stethoscope, path: '/clinic/glaucoma', requiredPermissions: [] },
      { label: 'Orbit', icon: Stethoscope, path: '/clinic/orbit', requiredPermissions: [] },
      { label: 'Peds Ophth', icon: Stethoscope, path: '/clinic/pediatrics-ophth', requiredPermissions: [] },
      { label: 'Gen Ophth', icon: Stethoscope, path: '/clinic/general-ophth', requiredPermissions: [] },
      { label: 'Optometry', icon: Stethoscope, path: '/clinic/optometry', requiredPermissions: [] },
      { label: 'Imaging', icon: Stethoscope, path: '/clinic/imaging', requiredPermissions: [] },
    ],
  },
  {
    key: 'surgery',
    label: 'Surgery',
    requiredPermissions: ['surgery:read'],
    items: [
      { label: 'Preoperative', icon: ClipboardCheck, path: '/preoperative', requiredPermissions: ['preoperative:read'] },
      { label: 'Surgery Gantt', icon: GanttChart, path: '/surgery', requiredPermissions: [] },
      { label: 'Surgery Dashboard', icon: LayoutDashboard, path: '/surgery/dashboard', requiredPermissions: [] },
      { label: 'Surgery Scheduler', icon: Calendar, path: '/surgery/schedule', requiredPermissions: [] },
    ],
  },
  {
    key: 'wards',
    label: 'Wards & Inpatient',
    requiredPermissions: ['ward:read'],
    items: [
      { label: 'Wards & Beds', icon: Bed, path: '/wards', requiredPermissions: [] },
      { label: 'In-Patient', icon: HeartPulse, path: '/inpatient', requiredPermissions: [] },
    ],
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    requiredPermissions: ['pharmacy:read'],
    items: [
      { label: 'Pharmacy POS', icon: ShoppingCart, path: '/pharmacy', requiredPermissions: [] },
      { label: 'Pharmacy Products', icon: Package, path: '/pharmacy/products', requiredPermissions: [] },
    ],
  },
  {
    key: 'optics',
    label: 'Optics',
    requiredPermissions: ['optics:read', 'optic_lab:read'],
    items: [
      { label: 'Optics POS', icon: Glasses, path: '/optics', requiredPermissions: ['optics:read'] },
      { label: 'Optics Products', icon: Package, path: '/optics/products', requiredPermissions: ['optics:read'] },
      { label: 'Optic Lab', icon: Wrench, path: '/optic-lab', requiredPermissions: ['optic_lab:read'] },
    ],
  },
  {
    key: 'lab',
    label: 'Lab & Diagnostics',
    requiredPermissions: ['diagnostics:read'],
    items: [
      { label: 'Laboratory', icon: FlaskConical, path: '/lab', requiredPermissions: [] },
    ],
  },
  {
    key: 'operations',
    label: 'Operations & Inventory',
    requiredPermissions: ['inventory:read', 'purchase:read'],
    items: [
      { label: 'Inventory', icon: Warehouse, path: '/inventory', requiredPermissions: ['inventory:read'] },
      { label: 'Procurement', icon: Truck, path: '/procurement', requiredPermissions: ['purchase:read'] },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    requiredPermissions: ['accounting:read'],
    items: [
      { label: 'Accounting', icon: DollarSign, path: '/accounting', requiredPermissions: [] },
      { label: 'Reports', icon: BarChart3, path: '/reports', requiredPermissions: [] },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    requiredPermissions: ['admin:users', 'hr:read'],
    items: [
      { label: 'Admin', icon: SettingsIcon, path: '/admin', requiredPermissions: ['admin:users'] },
      { label: 'HR', icon: UsersRound, path: '/hr', requiredPermissions: ['hr:read'] },
      { label: 'Settings', icon: SettingsIcon, path: '/settings', requiredPermissions: [] },
    ],
  },
];
```

**Exports:**
- `NAV_GROUPS` — raw config array
- `getVisibleNav(userPermissions: string[]): NavGroup[]` — filtered nav tree
- `findNavItem(path: string): { group: string; item: string } | null` — breadcrumb lookup

---

### S2: Sidebar Component — `Sidebar.jsx`

**Props:** None (reads state from stores internally).

**State & data flow:**

```
useAuthStore  ──→  user.permissions  ──→  getVisibleNav()
useUIStore    ──→  sidebarCollapsed   ──→  width class
useLocation() ──→  pathname           ──→  active route highlight
```

**Component structure:**

```jsx
<aside className={`
  fixed top-0 left-0 h-dvh bg-paper border-r border-silver/50
  flex flex-col z-30 transition-all duration-300
  ${collapsed ? 'w-16' : 'w-72'}
  max-md:hidden                    {/* hidden on mobile by default */}
  ${mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
`}>
  {/* 1. Branding */}
  <div className="flex items-center gap-3 px-4 py-4 border-b border-silver/50">
    <img src="/logo.png" alt="Al Jawarih" className="h-9 w-auto shrink-0" />
    {!collapsed && <span className="text-body font-semibold text-obsidian truncate">Al Jawarih</span>}
  </div>

  {/* 2. Nav groups — scrollable */}
  <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
    {visibleGroups.map(group => (
      <SidebarGroup key={group.key} group={group} collapsed={collapsed} pathname={pathname} />
    ))}
  </nav>

  {/* 3. User section — pinned bottom */}
  <div className="border-t border-silver px-3 py-3 mt-auto">
    {collapsed ? <Avatar size="sm" /> : <Expanded user={user} />}
    <button onClick={logout}>...</button>
  </div>
</aside>

{/* Mobile backdrop — visible only on <md when mobileOpen */}
{mobileOpen && (
  <div className="fixed inset-0 bg-obsidian/30 z-20 md:hidden" onClick={onMobileClose} />
)}
```

**Active route classes:**
```
active:   "bg-lilac-bloom/20 text-obsidian font-medium"
inactive: "text-graphite hover:bg-bone hover:text-obsidian transition-colors"
```

**Collapsed state:** Label hidden (`hidden` class), `title` attribute for tooltip.

**Mobile:** `max-md:hidden` by default, `max-md:translate-x-0` when `mobileOpen`. Hamburger in AppShell toggles `mobileOpen` (passed via state or a dedicated mobile sidebar store).

---

### S3: SidebarGroup Component — `SidebarGroup.jsx`

**Props:**
```ts
{
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
}
```

**Behavior:**
- Renders group label: `text-caption font-medium text-slate uppercase tracking-wider px-3 mb-2 mt-4`
- Collapsed → only render icons, no label
- Click label → toggle collapsed state for that group (local `useState`, default expanded)
- Group collapse animation: wrap items in `<div className="overflow-hidden transition-all duration-200" style={{ maxHeight: collapsed ? 0 : `${items.length * 44}px` }}>` (44px ≈ py-2.5 + line height per item)
- Each item: `<NavLink to={item.path} className={...}>`
  - Active: `bg-lilac-bloom/20 text-obsidian font-medium`
  - Inactive: `text-graphite hover:bg-bone hover:text-obsidian`
  - Icon: `w-5 h-5 shrink-0`
  - Label: `truncate` — hidden when sidebar collapsed

---

### S5: uiStore Update — `uiStore.js`

**Add to state:**
```js
sidebarCollapsed: false,
mobileSidebarOpen: false,
setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
```

**Update `partialize`:**
```js
partialize: (state) => ({
  theme: state.theme,
  language: state.language,
  hasSeenOnboarding: state.hasSeenOnboarding,
  sidebarCollapsed: state.sidebarCollapsed,
}),
```

Do NOT persist `mobileSidebarOpen` — always starts closed.

---

### S6: AppShell Update — `AppShell.jsx`

**Current state:** 230 lines. Imports `StaggeredMenu` (line 5), renders it at line 152.

**Changes:**
1. Remove `import StaggeredMenu from './StaggeredMenu';`
2. Add `import Sidebar from './Sidebar';` and `import Breadcrumb from '../ui/Breadcrumb';`
3. Remove `const [menuOpen, setMenuOpen] = useState(false);` and `toggleMenu`
4. Remove `StaggeredMenu` render (line 152)
5. Remove hamburger button for admin-only `StaggeredMenu` (lines 156-171)
6. Add mobile hamburger button visible on `<md`:
```jsx
<button
  onClick={() => useUIStore.getState().setMobileSidebarOpen(true)}
  className="md:hidden shrink-0 touch-target flex items-center justify-center w-10 h-10 rounded-lg text-graphite hover:text-obsidian hover:bg-bone transition-colors"
  aria-label="Open navigation"
>
  <Menu className="w-5 h-5" />
</button>
```
7. Render `<Sidebar />` inside the flex container
8. Add `<Breadcrumb />` at top of main content area
9. Adjust `<main>` to use `ml-0 md:ml-16 lg:ml-72 transition-all duration-300` (offset by sidebar width)

**Updated layout:**
```
<div className="relative h-dvh flex">
  <Sidebar />
  <div className="flex-1 flex flex-col min-w-0 ml-0 md:ml-16 lg:ml-72 transition-all duration-300">
    <header>...</header>
    <UpdateManager compact />
    <main>
      <Breadcrumb />
      <div>{children}</div>
    </main>
  </div>
</div>
```

**Header changes:** Remove `isDashboard` gradient text conditional (logo already in sidebar), keep notification bell, tour manager, sync badge, user dropdown, Tauri controls. Add mobile hamburger button (visible `<md`).

---

### S4: Breadcrumb — `Breadcrumb.jsx`

**Props:** None (uses `useLocation` internally).

**Logic:**
```jsx
const { pathname } = useLocation();
const nav = findNavItem(pathname);
if (!nav) return null;

return (
  <nav className="text-caption text-slate mb-4">
    <span>{nav.group}</span>
    <span className="mx-2">/</span>
    <span className="text-obsidian font-medium">{nav.item}</span>
  </nav>
);
```

**Nested routes** (e.g., `/patients/:id`): Strip the last path segment, look up the parent (`/patients` → "Patients"), append the param as the final breadcrumb. Use a simple heuristic: if `findNavItem` returns null, try `findNavItem('/' + pathSegments.slice(0, 2).join('/'))`.

---

### S7-S9: Delete Legacy Files

After S6 is complete, verify no imports remain:
```bash
grep -r "StaggeredMenu\|TabletNav" frontend/src/ --include="*.jsx" --include="*.js" --include="*.tsx"
```

Delete:
- `frontend/src/components/layout/StaggeredMenu.jsx`
- `frontend/src/components/layout/StaggeredMenu.css`
- `frontend/src/components/layout/TabletNav.jsx`

---

## 6. Implementation Details — Jr Dev

### J1: RoleGuard — `RoleGuard.jsx`

```jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function RoleGuard({ requiredPermissions = [], children }) {
  const userPermissions = useAuthStore((s) => s.user?.permissions) || [];

  // Empty = accessible to all authenticated users
  if (requiredPermissions.length === 0) return children;

  // User has at least ONE matching permission
  const hasAccess = requiredPermissions.some(p => userPermissions.includes(p));

  if (!hasAccess) {
    if (import.meta.env.DEV) {
      console.warn(
        `[RoleGuard] Missing permissions: ${requiredPermissions.join(' | ')}. ` +
        `User has: [${userPermissions.join(', ')}]. Redirecting to /dashboard.`
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
```

**~25 lines.** No side effects, no hooks beyond `useAuthStore`.

---

### J2: Wrap Routes — `App.jsx`

**File:** `frontend/src/app/App.jsx`

**Add import:**
```jsx
import RoleGuard from '../components/auth/RoleGuard';
```

**Wrap pattern:**
```jsx
// Before:
<Route path="/surgery" element={<ProtectedRoute><SurgeryGantt /></ProtectedRoute>} />

// After:
<Route path="/surgery" element={<ProtectedRoute><RoleGuard requiredPermissions={['surgery:read']}><SurgeryGantt /></RoleGuard></ProtectedRoute>} />
```

**Complete route→permission map** (derived from `05-app-flow.md` + `rbac.ts`):

| Route | `requiredPermissions` |
|-------|----------------------|
| `/dashboard` | `[]` |
| `/settings` | `[]` |
| `/overview` | `[]` |
| `/waiting-room` | Not wrapped in `ProtectedRoute` — skip |
| `/reception` | `['appointment:write']` |
| `/patients` | `['patient:read']` |
| `/patients/:id` | `['patient:read']` |
| `/referrals` | `['patient:read']` |
| `/clinic/*` (all 10) | `['clinical:read']` |
| `/surgery` | `['surgery:read']` |
| `/surgery/dashboard` | `['surgery:read']` |
| `/surgery/schedule` | `['surgery:read']` |
| `/surgery/:surgeryId/discharge` | `['surgery:read']` |
| `/preoperative` | `['preoperative:read']` |
| `/wards` | `['ward:read']` |
| `/inpatient` | `['ward:read']` |
| `/pharmacy` | `['pharmacy:read']` |
| `/pharmacy/products` | `['pharmacy:read']` |
| `/optics` | `['optics:read']` |
| `/optics/products` | `['optics:read']` |
| `/optic-lab` | `['optic_lab:read']` |
| `/lab` | `['diagnostics:read']` |
| `/inventory` | `['inventory:read']` |
| `/accounting` | `['accounting:read']` |
| `/admin` | `['admin:users']` |
| `/hr` | `['hr:read']` |
| `/procurement` | `['purchase:read']` |
| `/reports` | `['accounting:read']` |

---

### J3/J4: Settings Page Updates

**`SettingsContent.jsx` changes:**

1. **Wire password fields** — Add state for `currentPassword`, `newPassword`, `confirmPassword`. On submit, call `PUT /api/auth/password` (or placeholder with `toast.success` if endpoint doesn't exist yet). Enable the button (currently `disabled`).

2. **Add Notification Preferences section:**
```jsx
<Section title={t('settings.notifications')}>
  <ToggleGroup
    label={t('settings.emailNotifications')}
    options={[{ label: t('settings.on'), value: 'true' }, { label: t('settings.off'), value: 'false' }]}
    value={notificationPrefs.email}
    onChange={(v) => setNotificationPrefs({ ...notificationPrefs, email: v })}
  />
  {/* Same for push, sms */}
</Section>
```
Persist to `localStorage` key `jh-notification-prefs` (simple JSON, no need for Zustand).

3. **Verify theme toggle** — Already wired to `useUIStore.setTheme`. Test in new sidebar layout.

4. **Verify language selector** — Already wired to `useUIStore.setLanguage` + `i18n.changeLanguage`. Test RTL with new sidebar (sidebar should mirror on RTL).

---

## 7. Responsive Behavior Summary

| Breakpoint | Sidebar | Header | Main padding |
|-----------|---------|--------|-------------|
| `lg:` ≥1024px | Persistent, expanded (`w-72`) | Full | `p-8` |
| `md:` 768-1023px | Persistent, collapsed (`w-16`) | Full | `p-6` |
| `<md` <768px | Hidden, slide-over overlay | Compact (hamburger) | `p-4` |

The `sidebarCollapsed` Zustand state controls desktop/tablet. Mobile uses `mobileSidebarOpen` (always starts `false`).

---

## 8. Coordination Points

1. **Jr Dev can start immediately:** RoleGuard (J1) and settings page (J3/J4) have zero dependency on sidebar work.
2. **Jr Dev must wait for:** Route wrapping (J2) until nav config (S1) is finalized — but the route→permission table above is the spec, so J2 can be done in parallel if the Jr Dev follows the table exactly.
3. **Sr Dev must complete before Jr Dev wraps routes:** AppShell (S6) must be stable so Jr Dev can test RoleGuard redirects visually.
4. **Delete step (S7-S9) must be last:** After AppShell (S6) is confirmed working, verify no broken imports, then delete.

---

## 9. Acceptance Criteria Checklist

- [ ] Sidebar visible on all screen sizes with responsive breakpoints
- [ ] Navigation items grouped with section headers (Overview, Clinical, Clinics, Surgery, Wards, Pharmacy, Optics, Lab, Operations, Finance, Administration)
- [ ] Items filtered by user permissions (Receptionist sees no Surgery, Accounting, HR)
- [ ] Active route highlighted with `bg-lilac-bloom/20 text-obsidian font-medium`
- [ ] Sidebar collapses to icon-only (64px), toggleable via button
- [ ] Collapse state persists across reloads (localStorage via Zustand)
- [ ] `RoleGuard` redirects unauthorized users to `/dashboard`
- [ ] All routes wrapped with correct `RoleGuard` permission sets
- [ ] Settings page: password change wired, notification prefs added, theme/language verified
- [ ] Breadcrumb shows group > item hierarchy
- [ ] StaggeredMenu.jsx, StaggeredMenu.css, TabletNav.jsx deleted
- [ ] Mobile sidebar: slide-over overlay with backdrop, toggled by hamburger
- [ ] User section shows avatar + name (expanded) or avatar only (collapsed) + logout
- [ ] No visual regressions on existing pages
