# UI/UX Design Specification

> **Al Jawarih Hospital Management System (HMS)**
> SaaS Product — Design Reference for AI Agents
> Last updated: 2026-07-16

---

## Table of Contents

1. [Design Tokens & Theme](#part-1-design-tokens--theme)
2. [Layout Structure](#part-2-layout-structure)
3. [Screen Inventory](#part-3-screen-inventory)
4. [Component Library](#part-4-component-library)
5. [Interaction Patterns](#part-5-interaction-patterns)

---

## Part 1: Design Tokens & Theme

All tokens are defined in `theme.css`, `variables.css`, and `tokens.json` at the repo root. Tailwind references them via `@import "../../../theme.css"` in `frontend/src/styles/index.css`.

### 1.1 Color Palette

#### Core Neutrals

| Token | Hex | Tailwind Class | Usage |
|-------|-----|---------------|-------|
| `obsidian` | `#000000` | `text-obsidian`, `bg-obsidian` | Primary text, filled dark CTAs, high-contrast borders |
| `graphite` | `#333333` | `text-graphite`, `bg-graphite` | Secondary text, hairline borders (structural edge system) |
| `slate` | `#7b7b7b` | `text-slate` | Muted helper text, inactive links, timestamps |
| `mist` | `#bcbcbc` | `text-mist`, `border-mist` | Subtle badge borders, soft body borders |
| `silver` | `#d6d6d6` | `text-silver`, `border-silver` | Light dividers, input borders, inactive link borders |
| `bone` | `#f5f2f0` | `bg-bone`, `text-bone` | Warm cream surface — badge backgrounds, off-white secondary surfaces |
| `paper` | `#ffffff` | `bg-paper` | Page canvas and card surfaces (default ground) |

#### Accent Colors

| Token | Hex | Tailwind Class | Usage |
|-------|-----|---------------|-------|
| `lilac-bloom` | `#f1ccff` | `bg-lilac-bloom`, `text-lilac-bloom`, `ring-lilac-bloom` | Primary action — filled buttons, selected nav, focused conversions |
| `sky-veil` | `#91e0ff` | `bg-sky-veil`, `text-sky-veil` | Secondary accent — icon accents, illustration details, alternate highlights |

#### Surface Layers (StaggeredMenu)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `sm-layer-1` | `#f1ccff` | `#2a2a35` | Menu overlay layer 1 |
| `sm-layer-2` | `#d4a0f0` | `#252530` | Menu overlay layer 2 |
| `sm-layer-3` | `#b879e0` | `#20202a` | Menu overlay layer 3 |

#### Semantic / Status Colors (Tailwind built-in)

| Purpose | Light Mode | Dark Mode | Classes |
|---------|-----------|-----------|---------|
| Success | `green-100` / `green-800` | `green-900` / `green-200` | `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200` |
| Warning | `amber-100` / `amber-800` | `amber-900` / `amber-200` | `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200` |
| Danger | `red-100` / `red-800` | `red-900` / `red-200` | `bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200` |
| Destructive | `red-500` / `white` | `red-600` / `white` | `bg-red-500 text-white` (Button danger variant) |
| Info | `sky-veil` | `sky-veil` | `bg-sky-veil text-obsidian` (Badge info variant) |

#### Shadcn-Mapped Tokens (theme.css)

```css
--color-primary: var(--color-lilac-bloom);
--color-primary-foreground: var(--color-obsidian);
--color-background: var(--color-paper);
--color-foreground: var(--color-obsidian);
--color-accent: var(--color-bone);
--color-accent-foreground: var(--color-obsidian);
--color-input: var(--color-silver);
--color-ring: var(--color-lilac-bloom);
--color-border: var(--color-silver);
--color-secondary: var(--color-bone);
--color-secondary-foreground: var(--color-graphite);
--color-destructive: #ef4444;
--color-destructive-foreground: #ffffff;
```

### 1.2 Typography

#### Font Families

| Name | CSS Variable | Fallback | Usage |
|------|-------------|----------|-------|
| **Switzer** | `--font-switzer` | `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | All functional UI — body, subheadings, nav, buttons, badges |
| **PP Editorial New** | `--font-pp-editorial-new` | same fallback | Hero and section headlines only (display sizes) |
| **Arial** | `--font-arial` | same fallback | Legacy fallback |
| **system-ui** | `--font-system-ui` | same fallback | System font fallback |

#### Type Scale

| Step | Size | Line Height | Tracking | Font | Tailwind | Usage |
|------|------|------------|----------|------|----------|-------|
| caption | `13px` | `1.19` | — | Switzer 500 | `text-caption` | Labels, table headers, badges |
| body | `16px` | `1.44` | — | Switzer 400 | `text-body` | Default body text, form values |
| subheading | `20px` | `1.4` | `-0.2px` | Switzer 400 | `text-subheading` | Card titles, section headings |
| heading-sm | `32px` | `1.2` | `-0.8px` | Switzer 600 | `text-heading-sm` | Page titles (`h1`) |
| display | `48px` | `1.25` | — | PP Editorial New 400 | `text-display` | Hero headlines |
| display-lg | `62px` | `1.2` | — | PP Editorial New 400 | `text-display-lg` | Large hero headlines |

#### Font Weights

| Name | Value | CSS Variable |
|------|-------|-------------|
| Regular | `400` | `--font-weight-regular` |
| Medium | `500` | `--font-weight-medium` |
| Semibold | `600` | `--font-weight-semibold` |

#### Typographic Conventions

- Page titles: `text-heading-sm font-semibold text-obsidian` (32px Switzer 600)
- Card titles: `text-subheading font-medium text-obsidian` (20px Switzer 500)
- Body copy: `text-body text-obsidian` (16px Switzer 400)
- Helper text: `text-caption text-slate` (13px Switzer 500, muted)
- Labels: `text-sm font-medium text-graphite` (14px Switzer 500)
- MRN / mono data: `font-mono text-caption`
- Truncate long text: `truncate` with `min-w-0` parent

### 1.3 Spacing Scale

Base unit: **4px** (`--spacing-unit: 4px`)

| Token | Value | Tailwind | Common Use |
|-------|-------|----------|-----------|
| `spacing-8` | `8px` | `p-2`, `gap-2`, `m-2` | Tight gaps, icon padding |
| `spacing-12` | `12px` | `p-3`, `gap-3` | Compact internal spacing |
| `spacing-16` | `16px` | `p-4`, `gap-4` | Standard card padding (inner), form field gaps |
| `spacing-20` | `20px` | `p-5` | Button horizontal padding (md) |
| `spacing-24` | `24px` | `p-6` | Card outer padding, section gaps |
| `spacing-32` | `32px` | `p-8` | Large card padding, page section spacing |
| `spacing-40` | `40px` | `p-10` | Page section dividers |
| `spacing-56` | `56px` | `p-14` | Large vertical spacing |
| `spacing-60` | `60px` | — | Menu panel top padding |
| `spacing-80` | `80px` | — | Section gap (between major sections) |
| `spacing-88` | `88px` | — | Hero spacing |
| `spacing-116` | `116px` | — | Large hero spacing |
| `spacing-160` | `160px` | — | Maximum spacing |

#### Layout Constants (variables.css)

```
--page-max-width: 1200px
--section-gap: 80-120px
--card-padding: 24-32px
--element-gap: 16px
```

### 1.4 Border Radius

| Token | Value | Tailwind | Named Alias | Usage |
|-------|-------|----------|------------|-------|
| `lg` | `10px` | `rounded-lg` | `--radius-inputs`, `--radius-buttons`, `--radius-badges` | Buttons, inputs, badges |
| `xl` | `13px` | `rounded-xl` | — | Dropdowns, small panels |
| `2xl` | `16px` | `rounded-2xl` | — | — |
| `3xl` | `24px` | `rounded-3xl` | `--radius-cards` | Cards (`card-surface` class) |
| `3xl-2` | `32px` | `rounded-3xl-2` | `--radius-pills` | Pill shapes |
| `3xl-3` | `42px` | `rounded-3xl-3` | `--radius-cards-elevated` | Elevated cards (`card-surface-elevated`) |
| `full` | `48px` | `rounded-full` | — | Avatars, circles |

### 1.5 Shadows

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `subtle` | `rgba(16,24,40,0.05) 0px 1px 2px 0px` | — | Subtle elevation |
| `md` | `rgba(0,0,0,0.04) 0px 8px 16px 0px` | `shadow-md` | Cards, dropdowns, modals |

Dark mode overrides:
```css
--shadow-md: rgba(0,0,0,0.4) 0px 8px 16px 0px;
--shadow-subtle: rgba(0,0,0,0.3) 0px 1px 2px 0px;
```

### 1.6 Breakpoints

The app uses Tailwind responsive prefixes. Based on existing code patterns:

| Prefix | Min Width | Target | Usage |
|--------|----------|--------|-------|
| default | `0px` | Mobile phone | Base styles, single-column |
| `sm:` | `640px` | Large phone / small tablet | Grid adjustments (e.g. `grid-cols-2 sm:grid-cols-4`) |
| `md:` | `768px` | Tablet | Horizontal padding increase (`p-4 md:p-6`), show text alongside icons |
| `lg:` | `1024px` | Desktop | Full layout, sidebar visible, max padding (`p-8 lg:px-8`) |

### 1.7 Dark/Light Mode

#### Mechanism

- Theme stored in `useUIStore` (Zustand persist, key `jh-ui-storage`)
- Applied via class: `<div className={theme === 'dark' ? 'dark' : ''}>` in `App.jsx`
- Dark variant: `@custom-variant dark (&:where(.dark, .dark *))` in `index.css`
- Toggle in Settings: `ToggleGroup` component switching `'light'` / `'dark'`

#### Dark Mode Token Overrides (theme.css `.dark` selector)

```css
--color-obsidian: #f0f0f0;      /* was #000000 */
--color-graphite: #c0c0c0;      /* was #333333 */
--color-slate: #888888;          /* was #7b7b7b */
--color-mist: #555555;           /* was #bcbcbc */
--color-silver: #3a3a3e;         /* was #d6d6d6 */
--color-bone: #2a2a30;           /* was #f5f2f0 */
--color-paper: #1c1c22;          /* was #ffffff */
--color-lilac-bloom: #a78bfa;    /* was #f1ccff — shifts to violet */
--color-sky-veil: #60a5fa;       /* was #91e0ff — shifts to blue */
--color-panel: rgba(28,28,34,0.97);
```

#### Convention

Use `dark:` prefix for all dark mode overrides. Examples from codebase:
- `dark:bg-red-900 dark:text-red-300` (error states)
- `dark:bg-green-900 dark:text-green-200 dark:border-green-700` (success badges)
- `dark:border-red-700` (error input borders)
- `dark:!bg-obsidian !text-obsidian dark:!text-paper` (toast notifications)

### 1.8 RTL Support

- Controlled via `dir` attribute: `dir={language === 'ar' ? 'rtl' : 'ltr'}` on root div
- Language stored in `useUIStore` (persisted)
- Use logical Tailwind utilities where possible: `ms-*` / `me-*` instead of `ml-*` / `mr-*`, `ps-*` / `pe-*` instead of `pl-*` / `pr-*`

### 1.9 Component Sizing

| Component | Height | Width | Padding | Classes |
|-----------|--------|-------|---------|---------|
| Button sm | auto | auto | `px-3 py-1.5` | `text-caption` |
| Button md | auto | auto | `px-5 py-3` | `text-body` |
| Button lg | auto | auto | `px-6 py-4` | `text-body font-medium` |
| Input (default) | auto | `w-full` | `px-4 py-3` | `text-body rounded-lg` |
| Touch target | `min-h-[48px]` | `min-w-[48px]` | — | `.touch-target` class |
| Avatar sm | `w-8 h-8` | `w-8 h-8` | — | `text-sm` |
| Avatar md | `w-10 h-10` | `w-10 h-10` | — | `text-base` |
| Avatar lg | `w-12 h-12` | `w-12 h-12` | — | `text-lg` |
| Avatar xl | `w-16 h-16` | `w-16 h-16` | — | `text-xl` |
| Card (default) | auto | auto | `p-6` | `card-surface` → `bg-paper border border-silver rounded-3xl shadow-md` |
| Card (elevated) | auto | auto | `p-6` | `card-surface-elevated` → `bg-paper border border-silver rounded-3xl-3 shadow-md` |
| Modal | auto | `max-w-lg` | `px-6 py-4` (body) | `rounded-3xl max-h-[85vh]` |
| Badge sm | auto | auto | `px-2 py-0.5` | `text-caption rounded-[10px]` |
| Badge md | auto | auto | `px-3 py-1` | `text-caption rounded-[10px]` |
| Badge lg | auto | auto | `px-4 py-1.5` | `text-body rounded-[10px]` |
| Notification bell | `w-10 h-10` | `w-10 h-10` | — | `rounded-lg` |
| Header bar | `sticky top-0` | full | `py-2 px-4 md:px-6 lg:px-8` | `bg-paper/90 backdrop-blur-sm border-b border-silver/50` |

---

## Part 2: Layout Structure

### 2.1 Current Architecture (AppShell)

**File:** `frontend/src/components/layout/AppShell.jsx`

Current layout:
```
┌─────────────────────────────────────┐
│  Header (sticky, z-20)              │
│  [☰ Menu] [Logo] [🔔] [👤 User]   │
├─────────────────────────────────────┤
│                                     │
│  Main Content (flex-1, overflow-y)  │
│  max-width: 1440px, centered        │
│  padding: p-4 md:p-6 lg:p-8        │
│                                     │
└─────────────────────────────────────┘
```

- Navigation: `StaggeredMenu` — animated overlay panel (GSAP), only visible to Super Admin
- Non-admin users see no navigation menu (this is a known gap)
- Tauri window controls integrated in header (minimize/maximize/close)
- Background: `LiquidEther` animated gradient (fixed, z-0, pointer-events-none)

### 2.2 Target Architecture: Persistent Collapsible Sidebar

Replace the `StaggeredMenu` overlay with a **persistent sidebar** that all roles can use.

```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │  Header (sticky)                  │
│ (z-30)   │  [☰] [Search...] [🔔] [👤]      │
│          ├──────────────────────────────────┤
│ 🏥 Logo  │                                   │
│          │  Main Content Area                │
│ ──────── │  (flex-1, overflow-y)             │
│          │  max-width: 1200px                │
│ GROUP    │  padding: p-4 md:p-6 lg:p-8      │
│ ──────── │                                   │
│ item     │                                   │
│ item     │                                   │
│ item     │                                   │
│          │                                   │
│ GROUP    │                                   │
│ ──────── │                                   │
│ item     │                                   │
│          │                                   │
│          │                                   │
│          │                                   │
│ ──────── │                                   │
│ 👤 User  │                                   │
│ 🚪 Logout│                                   │
└──────────┴──────────────────────────────────┘
```

#### Sidebar Specification

**Width:**
- Expanded: `260px`
- Collapsed: `64px` (icons only)
- Toggle button in header or sidebar edge

**Structure (top to bottom):**

1. **Hospital Branding** (top)
   - Logo: `/logo.png` at `h-9 w-auto` (same as current header)
   - Hospital name (visible when expanded): `text-body font-semibold text-obsidian`
   - Collapsed: show only logo centered

2. **Navigation Groups** (scrollable middle)
   - Group label: `text-caption font-medium text-slate uppercase tracking-wide px-3 mb-2`
   - Group divider: `border-t border-silver/50 my-3`
   - Nav item (default): `flex items-center gap-3 px-3 py-2.5 rounded-lg text-body text-graphite hover:bg-bone hover:text-obsidian transition-colors`
   - Nav item (active): `flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium bg-lilac-bloom/20 text-obsidian`
   - Icon: `w-5 h-5 shrink-0` (use inline SVG or lucide-react icons)
   - Label: `truncate` — hidden when collapsed
   - Tooltip when collapsed: native `title` attribute

3. **User Section** (bottom, pinned)
   - Separator: `border-t border-silver mt-auto`
   - Avatar + name (expanded): same pattern as `StaggeredMenu` user section
   - Avatar only (collapsed): `Avatar size="sm"` centered
   - Logout button: `text-slate hover:text-red-500 transition-colors`

#### Navigation Groups by Role

```javascript
const navGroups = {
  'Overview': {
    roles: ['all'],
    items: [
      { label: 'Dashboard',       path: '/dashboard',     icon: 'Home' },
      { label: 'Hospital Overview', path: '/overview',    icon: 'Building2' },
    ]
  },
  'Clinical': {
    roles: ['all'],
    items: [
      { label: 'Reception',       path: '/reception',     icon: 'ClipboardList' },
      { label: 'Waiting Room',    path: '/waiting-room',  icon: 'Monitor' },
      { label: 'Patients',        path: '/patients',      icon: 'Users' },
      { label: 'Referrals',       path: '/referrals',     icon: 'ArrowLeftRight' },
    ]
  },
  'Clinics': {
    roles: ['all'],
    items: [
      { label: 'Medicine',        path: '/clinic/medicine' },
      { label: 'ENT',             path: '/clinic/ent' },
      { label: 'Dental',          path: '/clinic/dental' },
      { label: 'Retina',          path: '/clinic/retina' },
      { label: 'Glaucoma',        path: '/clinic/glaucoma' },
      { label: 'Orbit',           path: '/clinic/orbit' },
      { label: 'Peds Ophth',      path: '/clinic/pediatrics-ophth' },
      { label: 'Gen Ophth',       path: '/clinic/general-ophth' },
      { label: 'Optometry',       path: '/clinic/optometry' },
      { label: 'Imaging',         path: '/clinic/imaging' },
    ]
  },
  'Surgery': {
    roles: ['all'],
    items: [
      { label: 'Preoperative',    path: '/preoperative',          icon: 'ClipboardCheck' },
      { label: 'Surgery Gantt',   path: '/surgery',               icon: 'GanttChart' },
      { label: 'Surgery Dashboard', path: '/surgery/dashboard',   icon: 'LayoutDashboard' },
      { label: 'Surgery Scheduler', path: '/surgery/schedule',    icon: 'Calendar' },
    ]
  },
  'Wards & Inpatient': {
    roles: ['all'],
    items: [
      { label: 'Wards & Beds',    path: '/wards',          icon: 'Bed' },
      { label: 'In-Patient',      path: '/inpatient',      icon: 'HeartPulse' },
    ]
  },
  'Pharmacy & Dispensary': {
    roles: ['all'],
    items: [
      { label: 'Pharmacy POS',    path: '/pharmacy',       icon: 'ShoppingCart' },
      { label: 'Pharmacy Products', path: '/pharmacy/products', icon: 'Package' },
    ]
  },
  'Optics': {
    roles: ['all'],
    items: [
      { label: 'Optics POS',      path: '/optics',         icon: 'Glasses' },
      { label: 'Optics Products',  path: '/optics/products', icon: 'Package' },
      { label: 'Optic Lab',       path: '/optic-lab',      icon: 'Wrench' },
    ]
  },
  'Lab & Diagnostics': {
    roles: ['all'],
    items: [
      { label: 'Laboratory',      path: '/lab',            icon: 'FlaskConical' },
    ]
  },
  'Inventory & Procurement': {
    roles: ['Admin', 'Super Admin'],
    items: [
      { label: 'Inventory',       path: '/inventory',      icon: 'Warehouse' },
      { label: 'Procurement',     path: '/procurement',    icon: 'Truck' },
    ]
  },
  'Finance': {
    roles: ['Admin', 'Super Admin', 'Accountant'],
    items: [
      { label: 'Accounting',      path: '/accounting',     icon: 'DollarSign' },
      { label: 'Reports',         path: '/reports',        icon: 'BarChart3' },
    ]
  },
  'Administration': {
    roles: ['Super Admin'],
    items: [
      { label: 'Admin',           path: '/admin',          icon: 'Settings' },
      { label: 'HR',              path: '/hr',             icon: 'UsersRound' },
      { label: 'Settings',        path: '/settings',       icon: 'Settings' },
    ]
  },
};
```

#### Sidebar CSS (Target Pattern)

```css
/* Sidebar container */
.sidebar {
  @apply fixed top-0 left-0 h-dvh bg-paper border-r border-silver/50
         flex flex-col z-30 transition-all duration-300;
  width: var(--sidebar-width, 260px);
}
.sidebar.collapsed {
  --sidebar-width: 64px;
}
.sidebar.expanded {
  --sidebar-width: 260px;
}

/* Main content offset */
.main-content {
  @apply flex-1 flex flex-col;
  margin-left: var(--sidebar-width, 260px);
}

/* Nav item */
.nav-item {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-body text-graphite
         hover:bg-bone hover:text-obsidian transition-colors cursor-pointer;
}
.nav-item.active {
  @apply bg-lilac-bloom/20 text-obsidian font-medium;
}

/* Group label */
.nav-group-label {
  @apply text-caption font-medium text-slate uppercase tracking-wider px-3 mb-2 mt-4;
}
```

#### Responsive Behavior

| Breakpoint | Sidebar | Header | Main |
|-----------|---------|--------|------|
| `lg:` (≥1024px) | Persistent, expanded by default | Full with text | `p-8` |
| `md:` (768–1023px) | Persistent, collapsed by default | Full with text | `p-6` |
| `< md` (<768px) | Hidden by default, slide-over overlay | Compact | `p-4` |

On mobile: sidebar becomes a slide-over with backdrop, toggled by hamburger in header.

### 2.3 Header Bar

**File:** `AppShell.jsx` (existing, to be modified)

```
┌──────────────────────────────────────────────────┐
│ [☰] [Logo + Name]    [Search] [🔔] [Tour] [👤] │
└──────────────────────────────────────────────────┘
```

- Position: `sticky top-0 z-20`
- Background: `bg-paper/90 backdrop-blur-sm`
- Border: `border-b border-silver/50`
- Padding: `py-2 px-4 md:px-6 lg:px-8`
- Max width: `1440px` centered
- Logo: `h-9 w-auto` (click navigates to `/dashboard`)
- Tauri drag region: `data-tauri-drag-region` on header and child divs
- Tauri window controls: minimize/maximize/close buttons (desktop only)

### 2.4 Background

- `LiquidEther` animated gradient canvas (z-0, pointer-events-none)
- Light mode: `['#91e0ff', '#7ec8e0', '#6ab0d0']`
- Dark mode: `['#5227FF', '#FF9FFC', '#B497CF']`
- Opacity: `opacity-[0.35]` in light mode, full in dark mode
- Toggle visibility via `useUIStore.theme`

---

## Part 3: Screen Inventory

### 3.1 Login / Register

**Route:** `/login` | **File:** `features/auth/LoginPage.jsx`
**Layout:** Centered card on full-viewport background

```
┌──────────────────────────────────┐
│                                  │
│         [Logo  h-14]             │
│     "Al Jawarih"                 │
│     text-heading-sm              │
│     subtitle text-slate          │
│                                  │
│   ┌────────────────────────┐     │
│   │  Card p-6 md:p-8       │     │
│   │                        │     │
│   │  [Email    Input]      │     │
│   │  [Password Input]      │     │
│   │  [Error alert]         │     │
│   │  [Sign In Button lg]   │     │
│   │    w-full              │     │
│   └────────────────────────┘     │
│                                  │
└──────────────────────────────────┘
```

- Full viewport: `min-h-dvh flex items-center justify-center p-4`
- Card: `Card className="p-6 md:p-8"`
- Error state: `bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300`
- Loading overlay: `fixed inset-0 z-50 bg-obsidian/30` with `.loader` animation
- No registration screen exists — users are created via Admin panel

### 3.2 Dashboard (Role-Based)

**Route:** `/dashboard` | **File:** `features/auth/DashboardRedirect.jsx`
**Layout:** Redirects to role-specific dashboard

#### Hospital Overview

**Route:** `/overview` | **File:** `features/dashboard/HospitalOverview.jsx`
**Layout:** Stats grid + detail cards

```
┌──────────────────────────────────────┐
│  "Hospital Overview"                 │
│  text-heading-sm                     │
│  Date text-body text-slate           │
│                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐ │
│  │Revenue│ │Revenue│ │Revenue│ │Gross│ │
│  │ Today │ │ Week  │ │ Month │ │Profit│ │
│  │ 3xl   │ │ 3xl   │ │ 3xl   │ │green │ │
│  └──────┘ └──────┘ └──────┘ └─────┘ │
│  grid grid-cols-2 sm:grid-cols-4     │
│  gap-4                               │
│                                      │
│  ┌───────────┐┌──────────┐┌────────┐ │
│  │  Surgery  ││ Revenue  ││ Today's│ │
│  │  Pipeline ││ by Source││ Surgery│ │
│  │  (list)   ││ (list)   ││Schedule│ │
│  └───────────┘└──────────┘└────────┘ │
│  grid grid-cols-1 lg:grid-cols-3     │
│  gap-6                               │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ Open Shift status bar           │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- Page header: `space-y-6` wrapper, title `text-heading-sm font-semibold text-obsidian`
- Stat cards: `Card > CardContent className="text-center py-6"`, value `text-3xl font-bold`, label `text-caption text-slate`
- Status values use semantic colors: `text-green-600`, `text-amber-600`, `text-purple-600`, `text-blue-600`
- Surgery list items: `flex items-center justify-between p-2 rounded border border-silver/50 hover:bg-bone/30 transition-colors`

### 3.3 Patient List

**Route:** `/patients` | **File:** `features/patients/PatientListPage.jsx`
**Layout:** Search + Table + Pagination

```
┌──────────────────────────────────────┐
│  "Patient Directory"                 │
│  text-heading-sm                     │
│  "{N} patients" text-body text-slate │
│                                      │
│  Card                                │
│  └─ CardContent pt-4                 │
│     ┌──────────────────────────┐     │
│     │  Input (search) flex-1   │     │
│     └──────────────────────────┘     │
│     Table (columns: MRN, Name,       │
│            Phone, Gender, DOB,       │
│            Registered, [View])       │
│     ┌──────────────────────────┐     │
│     │ Pagination:              │     │
│     │ "Page X of Y"           │     │
│     │ [Previous] [Next]       │     │
│     └──────────────────────────┘     │
└──────────────────────────────────────┘
```

- Search: `Input` with `placeholder="Search by name, MRN, phone, or national ID…"`
- Table: `Table` component with `onRowClick` navigating to `/patients/:id`
- MRN column: `font-mono text-caption`
- Pagination: `flex items-center justify-between pt-4 border-t border-silver/50 mt-4`
- Loading state: `text-center py-12 text-slate text-body`

### 3.4 Patient Detail

**Route:** `/patients/:id` | **File:** `features/patients/PatientDetailPage.jsx`
**Layout:** Patient header + Tabbed content

```
┌──────────────────────────────────────┐
│  [Avatar xl] Patient Name            │
│             MRN: XXXXX              │
│             DOB / Age / Gender       │
│                                      │
│  [Overview] [Appointments]           │
│  [Clinical Records] [Surgery]        │
│  [Files] [Billing]                   │
│  (tab bar: flex gap-2 border-b)      │
│                                      │
│  Tab content:                        │
│  ┌─────────────────────────────────┐ │
│  │  Overview:                      │ │
│  │  EditableField grid             │ │
│  │  (inline edit with pencil icon) │ │
│  │                                 │ │
│  │  Appointments: Table            │ │
│  │  Clinical Records: Table        │ │
│  │  Surgery History: Table         │ │
│  │  Files: FileUploader            │ │
│  │  Billing: Table + total         │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- Tabs: `TABS = ['Overview', 'Appointments', 'Clinical Records', 'Surgery History', 'Files', 'Billing']`
- Tab bar pattern: `flex gap-2` with buttons, active tab uses `bg-lilac-bloom/20 text-obsidian font-medium`
- Editable fields: hover reveals pencil icon (`opacity-0 group-hover:opacity-100`), inline edit with Input + Save/Cancel buttons
- Loading: `text-center py-12 text-slate text-body`
- Not found: same pattern as loading

### 3.5 Reception

**Route:** `/reception` | **File:** `features/reception/ReceptionPage.jsx`
**Layout:** Tabbed interface with check-in workflow

```
┌──────────────────────────────────────┐
│  [Check-in] [Reservations] [Queue]   │
│  [Follow-ups] [Lab Payments]         │
│  (tab bar)                           │
│                                      │
│  Tab: Queue                          │
│  ┌─────────────────────────────────┐ │
│  │  Clinic filter buttons          │ │
│  │  Queue search input             │ │
│  │  Queue stats (cards)            │ │
│  │  Queue list:                    │ │
│  │  [Patient] [Status] [Priority]  │ │
│  │  [Call Next] button             │ │
│  └─────────────────────────────────┘ │
│                                      │
│  Tab: Check-in                       │
│  ┌─────────────────────────────────┐ │
│  │  Patient search (autocomplete)  │ │
│  │  Clinic select                  │ │
│  │  Appointment type toggle        │ │
│  │  [Check In] button              │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- Tabs: `TABS = ['checkin', 'reservations', 'queue', 'followUps', 'labPayments']`
- Status config objects map statuses to Badge variants: `WAITING → warning`, `CALLED → info`, `IN_PROGRESS → primary`, `COMPLETED → success`, `CANCELLED → danger`
- Sub-panels: `ReservationsPanel`, `FollowUpsPanel`, `ReceptionLabPayments`, `FileUploader`
- Payment modals for collection, pickup recording

### 3.6 Appointment Calendar / Scheduler

**Route:** `/surgery/schedule` | **File:** `features/surgery/SurgeryScheduler.jsx`
**Layout:** Calendar view with scheduling form

- Date picker for day selection
- Surgery cards with time slots
- Create/edit surgery form in Modal
- Operating room columns

### 3.7 Consultation / Clinical Note Writer

**Route:** `/clinic/*` (multiple clinic dashboards)
**Files:** `features/clinics/MedicineDashboard.jsx`, `ENTDashboard.jsx`, etc.

```
┌──────────────────────────────────────┐
│  Clinic Name Dashboard               │
│                                      │
│  ┌──────────┐ ┌──────────────────┐   │
│  │ Patient  │ │ Clinical Form    │   │
│  │ Queue    │ │ - Vitals         │   │
│  │ (list)   │ │ - Symptoms       │   │
│  │          │ │ - Diagnosis      │   │
│  │          │ │ - Prescriptions  │   │
│  │          │ │ - Notes          │   │
│  └──────────┘ └──────────────────┘   │
│                                      │
│  Upcoming Follow-ups section         │
└──────────────────────────────────────┘
```

- Each clinic dashboard follows similar pattern: patient queue on left, clinical form on right
- Vitals: structured input fields (BP, HR, Temp, Weight, Height, Visual Acuity)
- Diagnosis: text input with optional ICD codes
- Prescriptions: add/remove medication rows
- Print: `OptometryReportPrint.jsx` for optometry-specific print layout

### 3.8 Pharmacy POS

**Route:** `/pharmacy` | **File:** `features/pos/PharmacyPOS.jsx`
**Layout:** Split-view — product catalog + cart

```
┌──────────────────────────────────────┐
│  [Sale] [Referrals] [Products]       │
│  [Suppliers]                         │
│  (tab bar)                           │
│                                      │
│  ┌────────────────┐┌───────────────┐ │
│  │ Product Search  ││ Cart          │ │
│  │ Input           ││ Patient name  │ │
│  │                 ││               │ │
│  │ Product Grid:   ││ Cart Items:   │ │
│  │ ┌───┐ ┌───┐    ││ [item] [qty]  │ │
│  │ │   │ │   │    ││ [item] [qty]  │ │
│  │ └───┘ └───┘    ││               │ │
│  │ ┌───┐ ┌───┐    ││ Subtotal      │ │
│  │ │   │ │   │    ││ Payment method│ │
│  │ └───┘ └───┘    ││ [Complete]    │ │
│  │                 ││ [StripCounter]│ │
│  └────────────────┘└───────────────┘ │
└──────────────────────────────────────┘
```

- Product catalog: filterable grid by search + SKU
- Cart: quantity controls (box/strips toggle), remove button
- Payment methods: Cash, Card, Insurance, Bank Transfer
- `StripCounter` component for physical cash counting
- Receipt generation: `printReceipt()` utility
- Referral tab: dispatch medications to referred patients

**Products Management:** `/pharmacy/products` — full CRUD table

### 3.9 Lab Dashboard

**Route:** `/lab` | **File:** `features/lab/LabDashboard.jsx`
**Layout:** Order list + detail modal

```
┌──────────────────────────────────────┐
│  "Laboratory"                        │
│  Lab stats cards (PENDING/IN_PROGRESS│
│   /COMPLETED counts)                 │
│                                      │
│  Search input                        │
│  Status filter tabs                  │
│                                      │
│  Table:                              │
│  [Patient] [Tests] [Status] [Priority│
│  [Assigned] [Actions]                │
│  Actions: [Claim] [Unclaim]          │
│  Row click → OrderDetailModal        │
│                                      │
│  Modal (results entry):              │
│  Per-test result fields              │
│  Result notes textarea               │
│  [Save Results] button               │
└──────────────────────────────────────┘
```

- Stats: Badge variants per status — `PENDING: warning`, `IN_PROGRESS: info`, `COMPLETED: success`, `CANCELLED: danger`
- Priority: `ROUTINE: default`, `URGENT: danger`, `STAT: danger`
- Claim/unclaim workflow for lab technicians
- Results entry: per-test input fields in Modal

### 3.10 Imaging Dashboard

**Route:** `/clinic/imaging` | **File:** `features/clinics/ImagingDashboard.jsx`

- Similar to Lab Dashboard pattern
- Image upload capabilities
- Study ordering and results

### 3.11 Surgery Views

#### Surgery Gantt Chart

**Route:** `/surgery` | **File:** `features/surgery/SurgeryGantt.jsx`

```
┌──────────────────────────────────────┐
│  "Surgery Schedule"                  │
│  Date picker                         │
│                                      │
│  Gantt Grid:                         │
│  OR1 │ ████ Surgery ████            │
│  OR2 │ ████████████                  │
│  OR3 │         ████ Surgery ████     │
│  OR4 │                              │
│  OR5 │ ████ Surgery ████            │
│      └────────────────────────────── │
│       7am  8am  9am  ...  8pm        │
│                                      │
│  Status color coding:                │
│  SCHEDULED: lilac-bloom/30           │
│  PREP: amber-100                     │
│  IN_SURGERY: green-100              │
│  RECOVERY: purple-100               │
│  CANCELLED: red-100                  │
│                                      │
│  Click surgery → Detail panel:       │
│  Patient, OR, Time, Surgeon          │
│  Status flow: SCHEDULED → PREP →     │
│  IN_SURGERY → RECOVERY → COMPLETED   │
│  [Advance Status] [Notes] [Follow-up]│
└──────────────────────────────────────┘
```

- OR rooms as rows: `OR_ROOMS = [1, 2, 3, 4, 5]`
- Time axis: `HOURS = Array.from({ length: 14 }, (_, i) => i + 7)` (7am–8pm)
- Surgery bars positioned by time, colored by status
- Status flow mapping for advancement

#### Surgery Dashboard

**Route:** `/surgery/dashboard` | **File:** `features/surgery/SurgeryDashboard.jsx`

- Statistics cards
- Surgery list with status badges

#### Discharge Summary

**Route:** `/surgery/:surgeryId/discharge` | **File:** `features/surgery/DischargeSummary.jsx`

- Structured discharge form
- Print layout

### 3.12 Wards / Beds

**Route:** `/wards` | **File:** `features/wards/WardsPage.jsx`
**Layout:** Tabs — Wards / Beds / Rounds

```
┌──────────────────────────────────────┐
│  [Wards] [Beds] [Rounds]            │
│  (tab bar)                           │
│                                      │
│  Tab: Wards                          │
│  [+ New Ward] button                 │
│  Ward cards/table with:              │
│  Name, Type, Floor, Capacity,        │
│  Department, Daily Rate, Actions     │
│                                      │
│  Tab: Beds                           │
│  Ward filter dropdown                │
│  Bed table:                          │
│  Bed# | Patient | MRN | Ward |       │
│  Admitted | Status | Actions         │
│  Actions: Reserve, Maintain,         │
│  Transfer, Discharge                 │
│                                      │
│  Tab: Rounds                         │
│  Date picker, Ward filter            │
│  Round entries list                  │
│  [+ New Round] button                │
└──────────────────────────────────────┘
```

- Bed statuses: `OCCUPIED → success`, `VACANT → default`, `RESERVED → warning`, `MAINTENANCE → danger`
- `BedDetailPanel` slides in on bed selection
- Modals for: Create Ward, Create Bed, Assign Patient, Transfer Bed

### 3.13 Inpatient

**Route:** `/inpatient` | **File:** `features/wards/InpatientPage.jsx`

- Admission/discharge workflow
- Patient search + bed assignment
- Inpatient list with status tracking

### 3.14 Billing

Handled across multiple screens:
- **Reception:** payment collection during check-in
- **Pharmacy POS:** medication sales with receipt
- **Optics POS:** optical product sales
- **Accounting page:** transaction ledger, expenses, P&L
- **Patient Detail > Billing tab:** per-patient transaction history

### 3.15 Accounting

**Route:** `/accounting` | **File:** `features/accounting/AccountingPage.jsx`
**Layout:** Tabs — Summary / Transactions / Expenses / P&L / Debts / Shifts

```
┌──────────────────────────────────────┐
│  [Summary] [Transactions] [Expenses] │
│  [P&L] [Debts] [Shifts]            │
│  (tab bar)                           │
│                                      │
│  Summary tab:                        │
│  ┌──────────┐ ┌──────────────────┐   │
│  │ Revenue  │ │ Bar Chart        │   │
│  │ Stats    │ │ (revenue by day) │   │
│  └──────────┘ └──────────────────┘   │
│                                      │
│  Transactions tab:                   │
│  Date range filter                   │
│  Type filter (Reception/Pharmacy/    │
│               Optics)                │
│  Transaction table                   │
│  [Print Receipt] per row             │
│                                      │
│  Shifts tab:                         │
│  [Open Shift] / [Close Shift]        │
│  Cash movements list                 │
│  [Record Pickup]                     │
└──────────────────────────────────────┘
```

- Revenue types with color coding: `RECEPTION: blue`, `PHARMACY: green`, `OPTICS: purple`
- `BarChart` inline component for revenue visualization
- Shift management: open/close shift, cash movements (pickup, deposit)
- Expense categories: `SALARY, SUPPLIES, UTILITIES, RENT, EQUIPMENT, MAINTENANCE, MARKETING, OTHER`

### 3.16 Inventory

**Route:** `/inventory` | **File:** `features/pos/InventoryPOS.jsx`

- POS-style inventory management
- Stock tracking, adjustments

### 3.17 Procurement

**Route:** `/procurement` | **File:** `features/procurement/ProcurementPage.jsx`

- Purchase orders
- Supplier management
- Notification system (integrated with `NotificationBell`)

### 3.18 HR

**Route:** `/hr` | **File:** `features/hr/HRPage.jsx`
**Layout:** Tabs — Employees / Payroll / Leaves / Attendance

```
┌──────────────────────────────────────┐
│  [Employees] [Payroll] [Leaves]      │
│  [Attendance]                        │
│  (tab bar)                           │
│                                      │
│  Tab: Employees                      │
│  [+ Add Employee] button             │
│  Employee table:                     │
│  Code | Name | Gender | Position |   │
│  Dept | Salary | Status | [Edit]     │
│                                      │
│  Tab: Payroll                        │
│  [+ Create Payroll] button           │
│  Payroll table with status badges    │
│  [Approve] / [Reject] actions        │
│                                      │
│  Tab: Leaves                         │
│  Leave request table                 │
│  [Approve] / [Reject]                │
│                                      │
│  Tab: Attendance                     │
│  Date picker                         │
│  Attendance grid:                    │
│  Employee | Present/Absent toggle    │
└──────────────────────────────────────┘
```

- Employee positions: `Doctor, Nurse, Technician, Administrator, Accountant, Receptionist, Pharmacist, Security, Housekeeping, Other`
- Status: `isActive → success badge`, `!isActive → danger badge`
- Modal forms for employee creation, payroll generation, leave requests
- Option to create user account during employee creation

### 3.19 Reports

**Route:** `/reports` | **File:** `features/reports/ReportsPage.jsx`

- Pre-built report templates
- Date range and filter controls
- Print/export functionality

### 3.20 Settings

**Route:** `/settings` | **File:** `features/settings/SettingsPage.jsx`
**Layout:** Modal-style or page with sections

```
┌──────────────────────────────────────┐
│  [SettingsModal or SettingsPage]     │
│                                      │
│  Section: Profile                    │
│  Card                                │
│  Avatar upload                       │
│  Name, email fields                  │
│  [Save] button                       │
│                                      │
│  Section: Preferences                │
│  Card                                │
│  Theme toggle: [Light] [Dark]        │
│  Language toggle: [EN] [AR]          │
│                                      │
│  Section: System (Admin only)        │
│  Card                                │
│  Hospital name, logo                 │
│  Department management               │
│  Role management                     │
│  User management                     │
│                                      │
│  Section: Updates (Tauri only)       │
│  Card                                │
│  UpdateManager component             │
└──────────────────────────────────────┘
```

- `Section` component: `Card` with `CardHeader > CardTitle` and `CardContent space-y-4`
- Theme/language toggles: `ToggleGroup` component (pill-style buttons)
- Active toggle: `bg-lilac-bloom text-obsidian`
- Inactive toggle: `bg-bone text-graphite hover:bg-silver`

### 3.21 Admin

**Route:** `/admin` | **File:** `features/admin/AdminPage.jsx`

- System configuration
- Role and permission management (see `features/admin/permissions.js`)
- User management (create, edit, deactivate)
- Department management
- Clinic management

### 3.22 Patient Portal

**Not yet implemented.** Planned as a separate public-facing interface:
- Patient login (separate from staff login)
- Appointment booking
- View medical records
- View/pay bills
- Lab results

### 3.23 Waiting Room TV

**Route:** `/waiting-room` | **File:** `features/reception/WaitingRoomTV.jsx`

- Public display mode (no auth required — not wrapped in `ProtectedRoute`)
- Queue display for waiting area screens
- Auto-refreshing queue list

---

## Part 4: Component Library

### 4.1 Button

**File:** `components/ui/Button.jsx`

```jsx
<Button variant="primary" size="md" loading={false} disabled={false}>
  Label
</Button>
```

#### Variants

| Variant | Classes | Usage |
|---------|---------|-------|
| `primary` | `bg-lilac-bloom text-obsidian hover:brightness-95 active:brightness-90` | Primary actions, form submissions |
| `secondary` | `bg-obsidian text-paper hover:bg-graphite active:bg-obsidian` | Secondary actions, dark CTAs |
| `ghost` | `bg-transparent text-obsidian border border-silver hover:bg-bone` | Tertiary actions, cancel, navigation |
| `danger` | `bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500` | Destructive actions, delete |

#### Sizes

| Size | Classes | Min Height |
|------|---------|-----------|
| `sm` | `px-3 py-1.5 text-caption` | 32px |
| `md` | `px-5 py-3 text-body` | 44px |
| `lg` | `px-6 py-4 text-body font-medium` | 52px |

#### Shared Base Classes

```
inline-flex items-center justify-center gap-2 rounded-lg font-switzer font-medium
transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-lilac-bloom
disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none touch-target
```

#### Loading State

Spinner SVG inside button: `animate-spin h-4 w-4` (same pattern as App.jsx Spinner)

### 4.2 Input

**File:** `components/ui/Input.jsx`

```jsx
<Input
  label="Email"
  type="email"
  error="Invalid email"
  placeholder="doctor@hospital.com"
  value={value}
  onChange={handleChange}
/>
```

#### Structure

```
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-graphite" />
  <input className="w-full px-4 py-3 bg-paper border {error ? 'border-red-400' : 'border-silver'}
    rounded-lg text-body text-obsidian placeholder:text-slate
    focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent
    transition-colors duration-150 touch-target" />
  {error && <span className="text-caption text-red-500 dark:text-red-400">{error}</span>}
</div>
```

#### States

| State | Border | Ring |
|-------|--------|------|
| Default | `border-silver` | none |
| Focus | `border-transparent` | `focus:ring-2 focus:ring-lilac-bloom` |
| Error | `border-red-400 dark:border-red-500` | none |
| Disabled | `disabled:opacity-50 disabled:cursor-not-allowed` | none |

### 4.3 Select

Not a dedicated component — use native `<select>` or `<Input>` pattern with `select` element. Follow same styling: `px-4 py-3 bg-paper border border-silver rounded-lg text-body`.

### 4.4 DatePicker

Not a dedicated component — use native `<input type="date">` styled to match Input component. Same border, padding, and focus ring classes.

### 4.5 Table

**File:** `components/ui/Table.jsx`

```jsx
<Table
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
  ]}
  data={rows}
  onRowClick={(row) => navigate(`/detail/${row.id}`)}
/>
```

#### Structure

```
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <table className="w-full border-collapse">
    <thead>
      <tr className="border-b border-silver">
        <th className="px-4 py-3 text-left text-caption font-medium text-slate uppercase tracking-wide">
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-silver/50 transition-colors
                     {onRowClick ? 'cursor-pointer hover:bg-bone/50'}">
        <td className="px-4 py-3.5 text-body text-obsidian">
      </tr>
    </tbody>
  </table>
</div>
```

#### Empty State

```
<tr>
  <td colSpan={columns.length} className="px-4 py-8 text-center text-slate text-body">
    No data available
  </td>
</tr>
```

#### Column Config

```javascript
{
  key: string,          // data field key
  label: string,        // header text
  render: (row) => JSX, // optional custom cell renderer
  className: string,    // optional th class
  cellClass: string,    // optional td class
}
```

### 4.6 Card

**File:** `components/ui/Card.jsx`

```jsx
<Card elevated={false} className="custom-class">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

#### CSS Classes

| Element | Standard | Elevated |
|---------|----------|---------|
| Card | `card-surface` → `bg-paper border border-silver rounded-3xl shadow-md p-6` | `card-surface-elevated` → `bg-paper border border-silver rounded-3xl-3 shadow-md p-6` |
| CardHeader | `mb-4` | same |
| CardTitle | `text-subheading font-medium text-obsidian` | same |
| CardContent | (passthrough className) | same |

### 4.7 Modal / Dialog

**File:** `components/ui/Modal.jsx`

```jsx
<Modal open={isOpen} onClose={close} title="Modal Title">
  <div>Content</div>
</Modal>
```

#### Structure

```
fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4
  └─ div.bg-paper.border.border-silver.rounded-3xl.shadow-md
     .max-w-lg.max-h-[85vh].overflow-y-auto
     .animate-in.fade-in.zoom-in-95.duration-200
     ├─ Header: flex items-center justify-between px-6 pt-6 pb-2
     │  h2.text-subheading.font-medium.text-obsidian
     │  Close button (× icon)
     └─ Body: px-6 py-4
```

#### Behaviors

- Closes on `Escape` key
- Closes on overlay click (`e.target === overlayRef.current`)
- Locks body scroll when open (`document.body.style.overflow = 'hidden'`)
- Entrance animation: `animate-in fade-in zoom-in-95 duration-200`

### 4.8 Badge / Tag

**File:** `components/ui/Badge.jsx`

```jsx
<Badge variant="success" size="sm">Active</Badge>
```

#### Variants

| Variant | Classes | Semantic Meaning |
|---------|---------|-----------------|
| `default` | `bg-bone text-obsidian` | Neutral, informational |
| `primary` | `bg-lilac-bloom text-obsidian` | Primary status, active |
| `success` | `bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700` | Completed, active, online |
| `warning` | `bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700` | Pending, waiting, needs attention |
| `danger` | `bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700` | Error, cancelled, critical |
| `info` | `bg-sky-veil text-obsidian` | Informational, in-progress |

#### Sizes

| Size | Classes |
|------|---------|
| `sm` | `px-2 py-0.5 text-caption` |
| `md` | `px-3 py-1 text-caption` |
| `lg` | `px-4 py-1.5 text-body` |

Base: `inline-flex items-center gap-1 rounded-[10px] font-switzer font-medium`

### 4.9 Tabs

Not a dedicated component — pattern implemented inline in feature pages.

#### Pattern

```jsx
const tabs = ['tab1', 'tab2', 'tab3'];
const [activeTab, setActiveTab] = useState('tab1');

<div className="flex gap-2 mb-6 border-b border-silver pb-2">
  {tabs.map((t) => (
    <button
      key={t}
      onClick={() => setActiveTab(t)}
      className={`px-4 py-2.5 rounded-lg text-body font-medium transition-all touch-target
        ${activeTab === t
          ? 'bg-lilac-bloom text-obsidian'
          : 'bg-bone text-graphite hover:bg-silver'}`}
    >
      {t}
    </button>
  ))}
</div>
```

### 4.10 Toast / Notification

**Library:** `react-hot-toast`

```jsx
import toast from 'react-hot-toast';
toast.success('Saved successfully');
toast.error('Something went wrong');
```

#### Configuration (App.jsx)

```jsx
<Toaster
  position="top-right"
  toastOptions={{
    className: '!bg-paper dark:!bg-obsidian !text-obsidian dark:!text-paper !shadow-lg !border !border-silver/20'
  }}
/>
```

#### Utility Functions

```javascript
import { notifySuccess, notifyError } from '../../utils/notify';
notifySuccess('Patient updated');
notifyError(err);  // handles Error objects
```

### 4.11 Loading States

#### Spinner (Page-level)

```jsx
// App.jsx Spinner component
<div className="flex items-center justify-center min-h-[60vh]">
  <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
</div>
```

#### Inline Spinner (Button loading)

```jsx
<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
</svg>
```

#### Full-screen Loading Overlay

```jsx
// LoginPage pattern
<div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/30">
  <div className="loader" />  {/* CSS animation: three bouncing bars */}
</div>
```

#### Three-Bar Loader (CSS)

```css
.loader {
  width: 8px; height: 40px; border-radius: 4px;
  background-color: currentColor; color: #a78bfa;
  animation: animloader 0.3s 0.3s linear infinite alternate;
}
/* Two pseudo-elements at left:-20px and left:20px */
@keyframes animloader {
  0% { height: 48px; }
  100% { height: 4px; }
}
```

#### Text-based Loading

```jsx
<div className="text-center py-12 text-slate text-body">Loading patients…</div>
```

#### Skeleton Loading

Not yet implemented as a dedicated component. Use text-based loading states.

### 4.12 Empty States

#### Table Empty State

```jsx
// Built into Table component
<td colSpan={columns.length} className="px-4 py-8 text-center text-slate text-body">
  No data available
</td>
```

#### Custom Empty State Pattern

```jsx
<p className="text-caption text-slate text-center py-8">No data</p>
<p className="text-caption text-slate text-center py-12">No surgeries scheduled today</p>
<p className="text-caption text-slate text-center py-4">No transactions today</p>
```

### 4.13 Error States

#### Inline Error Alert

```jsx
// LoginPage pattern
<div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700
  rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
  {errorMessage}
</div>
```

#### ErrorBoundary

**File:** `components/ui/ErrorBoundary.jsx`

Wraps all protected routes:
```jsx
<ProtectedRoute>
  <ErrorBoundary>
    <Suspense fallback={<Spinner />}>
      {children}
    </Suspense>
  </ErrorBoundary>
</ProtectedRoute>
```

### 4.14 Search Bar with Filters

#### Simple Search

```jsx
<Input
  placeholder="Search by name, MRN, phone, or national ID…"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

#### Search + Filter Tabs

```jsx
// Reception pattern
<Input placeholder="Search patients…" value={search} onChange={...} />
<div className="flex gap-2 mt-3">
  {clinics.map((c) => (
    <button
      key={c.id}
      className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-all
        ${activeClinic === c.id
          ? 'bg-lilac-bloom text-obsidian'
          : 'bg-bone text-graphite hover:bg-silver'}`}
    >
      {c.name}
    </button>
  ))}
</div>
```

### 4.15 Avatar

**File:** `components/ui/Avatar.jsx`

```jsx
<Avatar src={user.avatarUrl} name={user.fullName} size="md" />
```

#### Sizes

| Size | Dimensions | Font |
|------|-----------|------|
| `sm` | `w-8 h-8` | `text-sm` |
| `md` | `w-10 h-10` | `text-base` |
| `lg` | `w-12 h-12` | `text-lg` |
| `xl` | `w-16 h-16` | `text-xl` |

Base: `relative flex items-center justify-center rounded-full bg-lilac-bloom text-obsidian font-medium font-switzer overflow-hidden shrink-0`

- With image: `<img className="w-full h-full object-cover" />`
- Without image: First 2 initials from name, uppercase

### 4.16 Other Components

#### GradientText

**File:** `components/ui/GradientText.jsx`

Animated gradient text for hero/branding:
```jsx
<GradientText colors={["#B497CF", "#5227FF", "#FF9FFC", "#5227FF", "#B497CF"]}
  animationSpeed={4} showBorder={false} className="text-heading-xs font-semibold">
  Al Jawarih Hospital
</GradientText>
```

#### SyncStatusBadge

**File:** `components/layout/SyncStatusBadge.jsx`

Shows offline sync status (Tauri/mobile only).

#### WelcomeToast

**File:** `components/ui/WelcomeToast.jsx`

First-visit welcome message.

#### TourManager

**File:** `components/ui/TourManager.jsx`

Shepherd.js-based guided tour.

#### UpdateManager

**File:** `components/ui/UpdateManager.jsx`

Tauri auto-update notifications. Can render in compact mode: `<UpdateManager compact />`.

#### StripCounter

**File:** `components/ui/StripCounter.jsx`

Physical cash denomination counter for POS.

#### LoadingOverlay

**File:** `components/ui/LoadingOverlay.jsx`

Full-page loading overlay.

#### TextPressure

**File:** `components/ui/TextPressure.jsx`

Animated text pressure effect.

---

## Part 5: Interaction Patterns

### 5.1 Form Validation

#### Inline Errors

All forms use inline error display below the field:

```jsx
<Input label="Email" error={errors.email} />
// Renders: <span className="text-caption text-red-500 dark:text-red-400">{error}</span>
```

#### Error Styling

- Input border: `border-red-400 dark:border-red-500` (replaces `border-silver`)
- Error text: `text-caption text-red-500 dark:text-red-400`
- No ring on error (focus ring is `lilac-bloom` only)

#### Form Submission Pattern

```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
    await api.post('/endpoint', payload);
    notifySuccess('Saved');
    onClose();
  } catch (err) {
    setError(err.message || 'Failed to save');
  } finally {
    setLoading(false);
  }
};
```

#### Alert-style Error (Login)

```jsx
<div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700
  rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
  {error}
</div>
```

### 5.2 Confirmation Dialogs

#### Pattern

Destructive actions should use a confirmation step. No dedicated ConfirmDialog component exists yet — implement as:

```jsx
<Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Deletion">
  <p className="text-body text-graphite mb-4">
    Are you sure you want to delete this item? This action cannot be undone.
  </p>
  <div className="flex justify-end gap-2">
    <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
  </div>
</Modal>
```

#### Quick Confirm (Inline)

Some actions use `window.confirm()` or `alert()` — these should be migrated to Modal-based confirmation.

### 5.3 Keyboard Shortcuts

Currently limited:
- `Escape` closes Modals (`Modal.jsx`)
- `Escape` closes UserProfileDropdown
- `Escape` closes StaggeredMenu
- Form submission on `Enter` (native form behavior)

#### Planned Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Global search (future) |
| `Ctrl+/` | Toggle sidebar |
| `Escape` | Close modal/dropdown/panel |
| `Ctrl+S` | Save current form (where applicable) |
| `Ctrl+P` | Print current view |

### 5.4 Print Layouts

#### Receipt Printing

```javascript
import { printReceipt } from '../../lib/printReceipt';
// Used in: PharmacyPOS, OpticsPOS, AccountingPage, ReceptionPage
```

#### Report Printing

```jsx
// SurgeryPrintReport.jsx — structured print layout
// OptometryReportPrint.jsx — optometry-specific print
// DischargeSummary.jsx — discharge summary print
```

#### Print CSS

```css
@media print {
  .hide-scrollbar { display: none; }
  /* Hide non-print elements */
  nav, header, .no-print { display: none !important; }
  /* Adjust layout for print */
  body { background: white; }
}
```

### 5.5 Responsive Breakpoint Behavior

| Component | Mobile (<768px) | Tablet (768-1023px) | Desktop (≥1024px) |
|-----------|----------------|---------------------|-------------------|
| **Sidebar** | Hidden (slide-over) | Collapsed (icons) | Expanded |
| **Header padding** | `p-4` | `p-6` | `p-8` |
| **Main content** | `p-4` | `p-6` | `p-8` |
| **Stat grid** | `grid-cols-2` | `grid-cols-4` | `grid-cols-4` |
| **Detail grid** | `grid-cols-1` | `grid-cols-2` | `grid-cols-3` |
| **Table** | Horizontal scroll | Full width | Full width |
| **Modal** | `max-w-lg p-4` | `max-w-lg p-4` | `max-w-lg p-4` |
| **POS layout** | Stacked | Side-by-side | Side-by-side |
| **Page title** | `text-heading-sm` | `text-heading-sm` | `text-heading-sm` |
| **Touch targets** | `min-h-[48px] min-w-[48px]` | `min-h-[48px]` | default |

#### Touch Device Enhancements

```css
@media (hover: none) and (pointer: coarse) {
  button, a, input, select, textarea, [role="button"] {
    min-height: 48px;
    min-width: 48px;
  }
}
```

### 5.6 Scrollbar Handling

Default: hidden scrollbars across the app.

```css
html {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
html::-webkit-scrollbar { display: none; }

.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
```

Used on: scrollable containers (notification dropdown, modal bodies, sidebar nav).

### 5.7 RTL (Arabic) Support

- Root `dir` attribute toggled by language setting
- Use logical CSS properties where possible
- Text alignment follows `dir` automatically
- Icon direction may need manual flipping for RTL (e.g., back arrows)

### 5.8 Animation Conventions

| Pattern | Implementation |
|---------|---------------|
| Menu open/close | GSAP `power4.out` / `power3.in` (StaggeredMenu) |
| Modal entrance | Tailwind `animate-in fade-in zoom-in-95 duration-200` |
| Dropdown entrance | `animate-in fade-in slide-in-from-top-2 duration-150` |
| Loading spinner | `animate-spin` (Tailwind) |
| Bar chart | `transition-all duration-300 hover:opacity-80` |
| Hover states | `transition-colors duration-150` or `transition-all duration-150` |
| Button press | `active:brightness-90` (primary) or `active:bg-obsidian` (secondary) |

### 5.9 Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Background | `z-0` | LiquidEther canvas |
| Main content | `z-10` | Content wrapper |
| Header | `z-20` | Sticky header bar |
| Sidebar | `z-30` | Persistent sidebar |
| StaggeredMenu | `z-40` | Overlay menu (legacy) |
| Modal/Toast | `z-50` | Modals, toasters, overlays |

---

## Appendix: File Reference

| Path | Purpose |
|------|---------|
| `tokens.json` | Design token definitions (W3C format) |
| `theme.css` | Tailwind `@theme` block + dark mode overrides |
| `variables.css` | CSS custom properties (root `:root`) |
| `frontend/src/styles/index.css` | Tailwind imports + base/component layers |
| `frontend/src/components/ui/` | All reusable UI components |
| `frontend/src/components/layout/` | Layout shell components |
| `frontend/src/stores/uiStore.js` | Theme/language persisted state |
| `frontend/src/app/App.jsx` | Root routing + theme application |
