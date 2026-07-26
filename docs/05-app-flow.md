# Application Flow & Route Tree — Al Jawarih Hospital HMS

> Navigation reference for AI agents implementing features.
> Derived from: `frontend/src/app/App.jsx`, `backend/src/app.ts`, `backend/src/middleware/auth.ts`, `backend/src/middleware/rbac.ts`

---

## Part 1: Route Tree (Frontend)

### Authentication Routes

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/login` | `LoginPage` | No | Email + password login form. Wrapped in `PublicRoute` — redirects to `/dashboard` if already authenticated. |

### Protected Routes — Core

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/dashboard` | `DashboardRedirect` | Yes | Smart redirect: sends user to their role-specific or clinic-specific default page. |
| `/settings` | `SettingsPage` | Yes | App settings (theme, language, profile). |
| `/overview` | `HospitalOverview` | Yes | Hospital-wide overview dashboard (CEO/CFO). |
| `/patients` | `PatientListPage` | Yes | Patient registry — searchable list. |
| `/patients/:id` | `PatientDetailPage` | Yes | Patient profile — demographics, visits, records. |
| `/reports` | `ReportsPage` | Yes | Cross-module reporting. |

### Protected Routes — Reception & Front Desk

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/reception` | `ReceptionPage` | Yes | Main reception: check-in, queue management, appointment booking. |
| `/waiting-room` | `WaitingRoomTV` | No | Public-facing waiting room display (TV screen). **Not wrapped in `ProtectedRoute`** — accessible without auth. |

### Protected Routes — Clinics

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/clinic/medicine` | `MedicineDashboard` | Yes | Internal Medicine clinic workspace. |
| `/clinic/ent` | `ENTDashboard` | Yes | ENT clinic workspace. |
| `/clinic/dental` | `DentalDashboard` | Yes | Dental clinic workspace. |
| `/clinic/retina` | `RetinaDashboard` | Yes | Retina specialist clinic. |
| `/clinic/glaucoma` | `GlaucomaDashboard` | Yes | Glaucoma specialist clinic. |
| `/clinic/orbit` | `OrbitDashboard` | Yes | Orbit specialist clinic. |
| `/clinic/pediatrics-ophth` | `PedsOphthDashboard` | Yes | Pediatric Ophthalmology clinic. |
| `/clinic/general-ophth` | `GenOphthDashboard` | Yes | General Ophthalmology clinic. |
| `/clinic/optometry` | `OptometryDashboard` | Yes | Optometry screening/clinic. |
| `/clinic/imaging` | `ImagingDashboard` | Yes | Medical imaging (radiology). |

Clinic slug → route mapping defined in `frontend/src/app/router.js`:
```
medicine → /clinic/medicine
ent      → /clinic/ent
dental   → /clinic/dental
retina   → /clinic/retina
glaucoma → /clinic/glaucoma
orbit    → /clinic/orbit
pediatrics-ophth → /clinic/pediatrics-ophth
general-ophth    → /clinic/general-ophth
optometry → /clinic/optometry
imaging   → /clinic/imaging
```

Users assigned to a clinic are routed to `/clinic/{slug}` on `/dashboard` redirect.

### Protected Routes — Surgery & Wards

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/surgery` | `SurgeryGantt` | Yes | Gantt chart view of all surgeries. |
| `/surgery/schedule` | `SurgeryScheduler` | Yes | Schedule new surgeries. |
| `/surgery/dashboard` | `SurgeryDashboard` | Yes | Surgery department dashboard (default for Doctors). |
| `/surgery/:surgeryId/discharge` | `DischargeSummaryPage` | Yes | Post-surgery discharge summary form. |
| `/preoperative` | `PreoperativePage` | Yes | Pre-operative assessment management. |
| `/wards` | `WardsPage` | Yes | Ward overview — bed allocation, capacity. |
| `/inpatient` | `InpatientPage` | Yes | In-patient management — vitals, rounds, notes. |

### Protected Routes — Pharmacy & Optics

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/pharmacy` | `PharmacyPOS` | Yes | Pharmacy point-of-sale (dispensing). |
| `/pharmacy/products` | `PharmacyProducts` | Yes | Pharmacy product catalog management. |
| `/optics` | `OpticsPOS` | Yes | Optics point-of-sale (glasses/lenses). |
| `/optics/products` | `OpticsProducts` | Yes | Optics product catalog management. |
| `/optic-lab` | `OpticLabDashboard` | Yes | Optic lab job tracking & management. |

### Protected Routes — Lab & Diagnostics

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/lab` | `LabDashboard` | Yes | Laboratory dashboard — orders, results entry. |

### Protected Routes — Operations & Finance

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/inventory` | `InventoryPOS` | Yes | Inventory management & warehouse. |
| `/accounting` | `AccountingPage` | Yes | Accounting — transactions, shifts, debts, expenses. |
| `/procurement` | `ProcurementPage` | Yes | Procurement — requisitions, POs, suppliers, assets. |
| `/referrals` | `ReferralsPage` | Yes | Inter-clinic referral management. |

### Protected Routes — Admin & HR

| Path | Component | Lazy | Description |
|------|-----------|------|-------------|
| `/admin` | `AdminPage` | Yes | User management, RBAC, system settings. |
| `/hr` | `HRPage` | Yes | HR — employees, payroll, attendance, leave. |

### Catch-all

| Path | Behavior |
|------|----------|
| `*` | Redirects to `/dashboard` (which then redirects to the role-specific default). |

---

## Part 2: Authentication Flow

### Login Flow

```
User enters email + password on LoginPage
        │
        ▼
POST /api/auth/login  { email, password }
        │
        ├── Rate limited: 5 req/min (prod), 50 req/min (dev)
        │
        ▼
Backend validates credentials (bcrypt.compare)
        │
        ├── Invalid → 401 "Invalid credentials"
        │
        ▼
Backend generates two JWTs:
  • token        (secret: JWT_SECRET,        expiry: 7d default)
  • refreshToken (secret: JWT_REFRESH_SECRET, expiry: 7d default)
        │
        ▼
Response: { token, refreshToken, user: { id, email, fullName, role, clinic, permissions, avatarUrl } }
        │
        ▼
Frontend calls authStore.login(token, refreshToken, user)
        │
        ▼
Zustand persist middleware saves to localStorage (key: "jh-auth-storage")
  └── Persisted fields: token, refreshToken, user, isAuthenticated
        │
        ▼
Navigate to /dashboard (replace)
```

### JWT Payload Structure

```json
{
  "id": "user-uuid",
  "email": "user@aljawarih.sd",
  "role": "Doctor",
  "clinicId": "clinic-uuid | null",
  "clinicSlug": "medicine | null",
  "permissions": ["patient:read", "clinical:write", ...],
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Token Refresh Flow

```
API request returns 401 with { code: "TOKEN_EXPIRED" }
        │
        ▼
ApiClient.refresh() called automatically
        │
        ├── No refreshToken in store → logout → redirect /login
        │
        ▼
POST /api/auth/refresh  { refreshToken }
        │
        ├── Invalid/expired refresh token → logout → redirect /login
        │
        ▼
Response: { token, refreshToken }  (new pair)
        │
        ▼
authStore.setTokens(newToken, newRefreshToken)  → persists to localStorage
        │
        ▼
Original request retried with new token
        │
        ├── Retry fails → logout → redirect /login
```

### Logout Flow

```
authStore.logout()
        │
        ▼
Resets: { token: null, refreshToken: null, user: null, isAuthenticated: false }
        │
        ▼
Zustand persist clears "jh-auth-storage" in localStorage
        │
        ▼
Navigate to /login
```

### Redirect Logic

| Condition | Behavior |
|-----------|----------|
| No token + visit `/login` | Show login page |
| No token + visit any protected route | `ProtectedRoute` → `<Navigate to="/login" replace />` |
| Has token + visit `/login` | `PublicRoute` → `<Navigate to="/dashboard" replace />` |
| Visit `/dashboard` | `DashboardRedirect` routes by role/clinic (see table below) |
| 401 with `TOKEN_EXPIRED` | Auto-refresh → retry, or logout if refresh fails |
| 401 without `TOKEN_EXPIRED` | Immediate logout → redirect `/login` |
| Any unknown path (`*`) | Redirect to `/dashboard` |

### Dashboard Redirect Routing

```
/dashboard
    │
    ├── User has a clinic? → /clinic/{clinic.slug}  (via getClinicRoute)
    │
    ├── Match user.role to ROLE_ROUTES:
    │     CEO            → /overview
    │     CFO            → /reports
    │     Doctor         → /surgery/dashboard
    │     Receptionist   → /reception
    │     Pharmacist     → /pharmacy
    │     Optician       → /optics
    │     Accountant     → /accounting
    │     HR Manager     → /hr
    │     Lab Technician → /lab
    │     Lab Admin      → /lab
    │     Inventory Mgr  → /inventory
    │     Procurement Mgr→ /procurement
    │     OpticLab       → /optic-lab
    │
    └── No match → Show tile grid of all modules (fallback dashboard)
```

### Session Persistence

- **Storage:** `localStorage` via Zustand `persist` middleware (key: `"jh-auth-storage"`)
- **Page reload:** Zustand rehydrates `token`, `refreshToken`, `user`, `isAuthenticated` from localStorage on app init. User stays logged in.
- **Native platforms (Tauri/Capacitor):** Same localStorage persistence. Additionally, `syncEngine.init()` is called on `ProtectedRoute` mount to set up offline sync.

---

## Part 3: Navigation Map

### Admin / Super Admin

```
/login → /dashboard → /overview
  ├── /admin          (user management, RBAC)
  ├── /hr             (employees, payroll, attendance)
  ├── /settings       (theme, language, profile)
  ├── /patients       (patient registry)
  ├── /reports        (cross-module analytics)
  ├── /reception      (front desk operations)
  └── /procurement    (purchasing, suppliers, assets)
```

### Doctor (assigned to a clinic)

```
/login → /dashboard → /clinic/{slug}
  ├── /clinic/{slug}        (primary workspace — queue, clinical notes)
  ├── /patients/:id         (patient detail from queue)
  ├── /surgery/dashboard    (surgery dept overview)
  ├── /surgery/schedule     (book surgeries)
  ├── /referrals            (refer to other clinics)
  ├── /lab                  (view/order diagnostics)
  ├── /preoperative         (pre-op assessments)
  ├── /wards                (ward bed overview)
  └── /inpatient            (daily rounds, vitals)
```

### Doctor (no clinic assigned)

```
/login → /dashboard → /surgery/dashboard
  (same as above, but lands on surgery dashboard)
```

### Receptionist

```
/login → /dashboard → /reception
  ├── /reception            (check-in, queue management)
  ├── /patients             (search/register patients)
  ├── /patients/:id         (patient detail)
  ├── /waiting-room         (waiting room TV display)
  └── /accounting           (view billing, collect payments)
```

### Nurse

```
/login → /dashboard → (no explicit role route → tile grid or /wards)
  ├── /wards                (ward overview, bed allocation)
  ├── /inpatient            (vital signs entry, medication admin, nursing notes)
  └── /reception            (appointment queue if needed)
```

### Lab Technician

```
/login → /dashboard → /lab
  ├── /lab                  (orders list, results entry)
  └── /patients/:id         (patient context for results)
```

### Pharmacist

```
/login → /dashboard → /pharmacy
  ├── /pharmacy             (POS — dispensing)
  └── /pharmacy/products    (product catalog)
```

### Optician

```
/login → /dashboard → /optics
  ├── /optics               (POS — glasses/lenses)
  └── /optics/products      (optics product catalog)
```

### Accountant

```
/login → /dashboard → /accounting
  ├── /accounting           (transactions, shifts, debts, expenses)
  └── /reports              (financial reports)
```

### HR Manager

```
/login → /dashboard → /hr
  └── /hr                   (employees, payroll, attendance, leave)
```

### Inventory Manager

```
/login → /dashboard → /inventory
  ├── /inventory            (stock levels, transactions)
  └── /pharmacy/products    (pharmacy stock management)
```

### Procurement Manager

```
/login → /dashboard → /procurement
  └── /procurement          (requisitions, POs, suppliers, assets)
```

### CEO / CFO / Hospital Director

```
/login → /dashboard → /overview (CEO) or /reports (CFO)
  ├── /overview             (hospital-wide KPIs)
  ├── /reports              (financial & operational reports)
  ├── /accounting           (financial details)
  ├── /procurement          (purchasing oversight)
  └── /admin                (system settings if Super Admin)
```

### OpticLab Technician

```
/login → /dashboard → /optic-lab
  └── /optic-lab            (optic lab job management)
```

---

## Part 4: Key User Flows

### Flow 1: Patient Registration → Exit

```
1. Receptionist clicks "Register Patient" in /reception
       │
       ▼
2. POST /api/reception/patients  { fullName, phone, nationalId, dob, gender, ... }
       │
       ▼
3. Patient created in DB with generated MRN
       │
       ▼
4. Receptionist clicks "Check-In" → POST /api/reception/check-in
   { patientId, clinicId, type: "WALKIN", visitType: "NEW_VISIT", priority, ... }
       │
       ├── If clinic has optometryPreScreeningRequired → auto-creates appointment
       │   in optometry clinic instead, targeting the original clinic
       │
       ▼
5. Token generated, appointment status = WAITING
   Added to clinic queue → visible on Waiting Room TV
       │
       ▼
6. Doctor picks up patient from queue → appointment status → IN_PROGRESS
       │
       ▼
7. Doctor creates clinical record:
   POST /api/reception/... or clinic-specific endpoint
   { symptoms, vitals, diagnosis, ICD-10 codes }
       │
       ▼
8. Doctor prescribes medications → sent to pharmacy
   Doctor orders diagnostics → sent to lab
       │
       ▼
9. Patient proceeds to:
   ├── Pharmacy → Pharmacist dispenses → /pharmacy POS
   │     POST /api/pos/pharmacy/sell { items, patientId, paymentMethod }
   ├── Lab (if ordered) → /lab dashboard
   └── Optics (if needed) → /optics POS
       │
       ▼
10. Payment collected:
    POST /api/accounting/transactions { amount, method, appointmentId, ... }
    Shift opened automatically if not already open
       │
       ▼
11. Appointment completed → status = COMPLETED
```

### Flow 2: Patient Admission → Discharge

```
1. Admission decision (emergency or scheduled)
       │
       ▼
2. Ward assignment: /wards → POST /api/wards/assign
   { patientId, wardId, bedNumber, admissionType, diagnosis }
       │
       ▼
3. Patient admitted → status = ADMITTED
   Visible on /inpatient page
       │
       ▼
4. Daily rounds: /inpatient
   ├── Record vitals: POST /api/wards/{id}/vitals { temperature, bp, heartRate, ... }
   ├── Nursing notes: POST /api/wards/{id}/notes
   ├── Medications: administered through pharmacy → POST /api/pos/pharmacy/...
   └── Ward rounds: POST /api/wards/{id}/rounds { notes, findings }
       │
       ▼
5. Discharge decision → Doctor creates discharge summary
   POST /api/surgeries/{id}/discharge or /api/wards/discharge
   { summary, instructions, prescriptions, followUpDate }
       │
       ▼
6. Bed freed → ward capacity updated
   Final billing through /accounting
```

### Flow 3: Lab Order → Result Review

```
1. Doctor creates diagnostic order (from clinic or /lab)
   POST /api/lab/orders { patientId, clinicId, tests: [...], priority }
       │
       ▼
2. Order appears in /lab dashboard for Lab Technician
   Status: PENDING
       │
       ▼
3. Lab Tech receives sample → status: IN_PROGRESS
   Assigns result entry
       │
       ▼
4. Lab Tech enters results:
   PUT /api/lab/orders/{orderId}/results
   { results: [{ testId, value, unit, abnormalFlag }] }
   Status: COMPLETED
       │
       ▼
5. Results visible to ordering Doctor in clinic dashboard
   Doctor reviews → can add interpretation notes
       │
       ▼
6. Results attached to patient record
```

### Flow 4: Surgery Scheduling → Recovery → Discharge

```
1. Surgery scheduled: /surgery/schedule
   POST /api/surgeries { patientId, procedure, surgeonId, date, OR, ... }
       │
       ▼
2. Pre-operative assessment: /preoperative
   POST /api/preoperative { patientId, surgeryId, assessments: [...] }
   Checklist: vitals, allergies, consent, labs, imaging
       │
       ▼
3. Surgery day → /surgery Gantt shows timeline
   Status progression: SCHEDULED → PRE_OP → IN_PROGRESS → RECOVERY → POST_OP
       │
       ▼
4. Post-operative notes
   POST /api/surgeries/{id}/postoperative { notes, complications, ... }
       │
       ▼
5. Recovery in ward → /inpatient for monitoring
   Vitals tracking, pain management, wound care
       │
       ▼
6. Discharge: /surgery/{surgeryId}/discharge
   POST /api/surgeries/{id}/discharge
   { summary, instructions, followUpDate, prescriptions }
       │
       ▼
7. Follow-up appointment scheduled via /reception
```

### Flow 5: Procurement → Inventory

```
1. Requisition created: /procurement
   POST /api/procurement/requisitions { items: [{ name, quantity, unit }] }
       │
       ▼
2. Approval workflow (Hospital Director / CFO)
   PUT /api/procurement/requisitions/{id}/approve
   Status: PENDING → APPROVED
       │
       ▼
3. Purchase Order generated
   POST /api/procurement/purchase-orders { supplierId, items, requisitionId }
       │
       ▼
4. Supplier delivers → Receiving at /procurement
   PUT /api/procurement/purchase-orders/{id}/receive
   { receivedItems: [{ itemId, quantity, batchNumber, expiryDate }] }
       │
       ▼
5. Inventory auto-updated
   POST /api/inventory/transactions { itemId, type: "RECEIVE", quantity, location }
       │
       ▼
6. Stock levels updated across /inventory, /pharmacy/products, /optics/products
```

### Flow 6: Insurance Claim → Settlement

```
1. Patient visits with insurance → recorded during check-in
   Insurance details captured in patient record
       │
       ▼
2. Services rendered → clinical records, prescriptions, lab tests
       │
       ▼
3. Billing prepared via /accounting
   POST /api/accounting/transactions
   { patientId, insuranceProvider, items: [...], totalAmount }
       │
       ▼
4. Claim submitted (manual or integration)
   Tracked in accounting records with status: SUBMITTED
       │
       ▼
5. Tracking: /accounting → filter by insurance claims
   Status: SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED
       │
       ▼
6. Settlement received:
   PUT /api/accounting/transactions/{id}/settle
   { settledAmount, settlementDate, adjustmentNotes }
       │
       ├── Partial settlement → remaining balance as accountsPayable
       └── Full settlement → claim closed
```

---

## Part 5: Data Flow

### Standard Request/Response Cycle

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│   React UI   │────▶│  api.js      │────▶│  Express.js  │────▶│ Prisma   │
│  Component   │◀────│  ApiClient   │◀────│  Routes      │◀────│ Postgres │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────┘
                           │                     │
                     Authorization:         authenticate()
                     Bearer <token>         requirePermission()
                           │                     │
                     JWT verified via        RBAC checked
                     jwt.verify()            against user.role.permissions
```

**Detailed steps:**
1. Component calls `api.get('/patients')` or `api.post('/patients', data)`
2. `ApiClient.request()` reads token from `useAuthStore`, attaches `Authorization: Bearer <token>` header
3. `fetch()` sends request to `{VITE_API_URL}/api/patients`
4. Backend `authenticate` middleware verifies JWT, attaches `req.user`
5. `requirePermission('patient:read')` checks `req.user.permissions`
6. Route handler executes Prisma query against PostgreSQL
7. Response returned to frontend
8. For GET requests, response is cached to IndexedDB (native platforms only)

### Offline Sync Flow (Native Platforms Only)

```
┌──────────────────────────────────────────────────────┐
│                    Native App (Tauri/Capacitor)        │
│                                                        │
│  ┌─────────────┐    Online?    ┌──────────────────┐  │
│  │  api.js      │─────────────▶│  POST /api/...    │  │
│  │  request()   │              │  (server)         │  │
│  └──────┬───────┘              └──────────────────┘  │
│         │                                              │
│    Network OK?                                         │
│    ├── Yes → send to server, cache GETs to IndexedDB  │
│    │                                              │    │
│    └── No (offline)                               │    │
│         ├── GET → read from IndexedDB (localDb)   │    │
│         │         fallback: stale cache data      │    │
│         │                                         │    │
│         └── Mutation → queueOffline()             │    │
│              │                                    │    │
│              ▼                                    │    │
│         syncEngine.queueMutation({               │    │
│           table, action, recordId, data,         │    │
│           clientTimestamp                         │    │
│         })                                       │    │
│              │                                    │    │
│              ▼ (on reconnect)                     │    │
│         syncEngine.init() / auto-sync timer      │    │
│              │                                    │    │
│              ▼                                    │    │
│         POST /api/sync  { mutations: [...] }     │    │
│              │                                    │    │
│              ▼                                    │    │
│         Server applies in order, returns results  │    │
│         IndexedDB updated with server state       │    │
└──────────────────────────────────────────────────────┘
```

**IndexedDB tables** (database name: `"hms"`):
`user`, `role`, `clinic`, `department`, `expense`, `patient`, `patientFile`, `appointment`, `icd10Code`, `vitalSign`, `symptom`, `medication`, `clinicalRecord`, `referral`, `referralMedication`, `referralTest`, `surgery`, `inventoryItem`, `inventoryLocation`, `inventoryTransaction`, `transaction`, `shift`, `diagnosticTest`, `diagnosticPanel`, `diagnosticPanelTest`, `diagnosticOrder`, `diagnosticOrderTest`, `employee`, `payrollRecord`, `attendance`, `leaveRequest`, `auditLog`, `accountsPayable`, `supplier`, `supplierInvoice`, `supplierInvoiceItem`, `costCenter`, `requisition`, `requisitionItem`, `purchaseOrder`, `purchaseOrderItem`, `fixedAsset`, `notification`

### File Upload Flow

```
Component (patient avatar, clinical image, document)
    │
    ▼
api.upload(path, FormData)
    │
    ├── FormData contains file + metadata (patientId, type, etc.)
    ├── No Content-Type header set manually (browser sets multipart boundary)
    ├── Authorization: Bearer <token> attached
    │
    ▼
POST /api/reception/files  (or relevant endpoint)
    │
    ▼
Backend receives multipart/form-data
    │
    ├── Supabase Storage upload (bucket: "jh-uploads")
    │   → Public URL returned
    │
    ▼
File URL stored in database record (patientFile, clinicalImage, etc.)
    │
    ▼
Response: { id, url, fileName, ... }
```

### Print / Receipt Generation

```
Transaction completed (pharmacy sale, appointment payment)
    │
    ▼
Receipt generated client-side (no server-side print endpoint)
    │
    ├── Receipt data assembled from transaction response
    ├── Rendered as HTML/printable div
    │
    ▼
window.print() or Tauri print plugin
    │
    ├── Web: browser print dialog
    └── Native: direct printer integration via Tauri
```

---

## Part 6: Permission / Role Matrix

### Permission Constants (`backend/src/middleware/rbac.ts`)

```
patient:read        patient:create       patient:update
clinical:read       clinical:write
appointment:read    appointment:write
pharmacy:read       pharmacy:write
optics:read         optics:write
surgery:read        surgery:write
accounting:read     accounting:write
warehouse:read      warehouse:write
admin:users         admin:rbac
hr:read             hr:write
diagnostics:read    diagnostics:order    diagnostics:write    diagnostics:results    diagnostics:catalog
inventory:read      inventory:write
purchase:read       purchase:write
approval:read       approval:write
asset:read          asset:write
notification:read
optic_lab:read      optic_lab:write
preoperative:read   preoperative:write
ward:read           ward:write
pricing:read        pricing:write
```

### Route → Permission Mapping (Backend Enforcement)

| API Endpoint | Method | Required Permission |
|---|---|---|
| `/api/auth/login` | POST | None (rate limited) |
| `/api/auth/refresh` | POST | None |
| `/api/auth/me` | GET | `authenticate` only |
| `/api/users` | GET | `admin:users` |
| `/api/users/roles` | GET | `admin:rbac` |
| `/api/users/:id/roles` | PUT | `admin:rbac` |
| `/api/reception/check-in` | POST | `appointment:write` |
| `/api/reception/patients` | * | `patient:read` / `patient:create` |
| `/api/reception/appointments` | * | `appointment:read` / `appointment:write` |
| `/api/surgeries` | * | `surgery:read` / `surgery:write` |
| `/api/lab/*` | * | `diagnostics:*` |
| `/api/pos/*` | * | `pharmacy:*` / `optics:*` |
| `/api/inventory/*` | * | `inventory:read` / `inventory:write` |
| `/api/accounting/*` | * | `accounting:read` / `accounting:write` |
| `/api/procurement/*` | * | `purchase:read` / `purchase:write` |
| `/api/hr/*` | * | `hr:read` / `hr:write` |
| `/api/wards/*` | * | `ward:read` / `ward:write` |
| `/api/preoperative/*` | * | `preoperative:read` / `preoperative:write` |
| `/api/admin/*` | * | `admin:users` / `admin:rbac` |
| `/api/sync` | POST | `authenticate` only (burst limited) |

### Role → Permission Matrix

| Permission | Super Admin | CEO | CFO | Hospital Director | Doctor | Nurse | PreOp Office | Receptionist | Pharmacist | Optician | Accountant | HR Manager | Lab Tech | Lab Admin | Inventory Mgr | Procurement Mgr | OpticLab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `patient:read` | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | — | ✅ |
| `patient:create` | ✅ | — | — | — | ✅ | — | — | ✅ | — | — | — | — | — | — | — | — | — |
| `patient:update` | ✅ | — | — | — | — | — | — | ✅ | — | — | — | — | — | — | — | — | — |
| `clinical:read` | ✅ | — | — | — | ✅ | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — |
| `clinical:write` | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | — | — | — | — |
| `appointment:read` | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — |
| `appointment:write` | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — |
| `pharmacy:read` | ✅ | — | — | — | — | — | — | — | ✅ | — | — | — | — | — | ✅ | ✅ | — |
| `pharmacy:write` | ✅ | — | — | — | — | — | — | — | ✅ | — | — | — | — | — | ✅ | — | — |
| `optics:read` | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | — | — | ✅ | ✅ | — |
| `optics:write` | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | — | — | ✅ | — | — |
| `surgery:read` | ✅ | — | — | — | ✅ | — | ✅ | — | — | — | — | — | — | — | — | — | — |
| `surgery:write` | ✅ | — | — | — | — | — | ✅ | — | — | — | — | — | — | — | — | — | — |
| `accounting:read` | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — | ✅ | — | — | — | — | — | — |
| `accounting:write` | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — | — | — | — | — |
| `warehouse:read` | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | — | ✅ | ✅ | — |
| `warehouse:write` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | ✅ | — | — |
| `admin:users` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `admin:rbac` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `hr:read` | ✅ | — | — | — | — | — | — | — | — | — | — | ✅ | — | — | — | — | — |
| `hr:write` | ✅ | — | — | — | — | — | — | — | — | — | — | ✅ | — | — | — | — | — |
| `diagnostics:read` | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | ✅ | ✅ | — | — | — |
| `diagnostics:order` | ✅ | — | — | — | ✅ | — | — | — | — | — | — | — | — | ✅ | — | — | — |
| `diagnostics:write` | ✅ | — | — | — | — | — | — | — | — | — | — | — | ✅ | ✅ | — | — | — |
| `diagnostics:results` | ✅ | — | — | — | — | — | — | — | — | — | — | — | ✅ | ✅ | — | — | — |
| `diagnostics:catalog` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | ✅ | — | — | — |
| `inventory:read` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | ✅ | ✅ | — |
| `inventory:write` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | ✅ | — | — |
| `purchase:read` | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — | ✅ | ✅ | — |
| `purchase:write` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ✅ | — |
| `approval:read` | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `approval:write` | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `asset:read` | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — | — | ✅ | — | — |
| `asset:write` | ✅ | — | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `notification:read` | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — | ✅ | ✅ | — |
| `optic_lab:read` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ✅ |
| `optic_lab:write` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | ✅ |
| `preoperative:read` | ✅ | — | — | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — |
| `preoperative:write` | ✅ | — | — | — | ✅ | — | ✅ | — | — | — | — | — | — | — | — | — | — |
| `ward:read` | ✅ | — | — | — | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| `ward:write` | ✅ | — | — | — | — | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| `pricing:read` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `pricing:write` | ✅ | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |

> **Note:** Permissions marked ✅ are in the `DEFAULT_ROLES` seed. Actual production roles may differ — admins can customize via `/admin` RBAC management. The `permissions` field on the `Role` model is a JSON column, allowing arbitrary permission sets.

### Frontend Route Access (Client-Side — Not Enforced)

The frontend `ProtectedRoute` component only checks token existence, not role/permissions. All protected routes are accessible to any authenticated user. **Role-based access is enforced server-side** via the `authenticate` and `requirePermission` middleware on each API endpoint. The frontend navigation (sidebar, dashboard tiles) may visually filter based on role, but the routes themselves are not locked.

---

## Appendix: Backend API Route Mounting

All routes are mounted under `/api` prefix (defined in `backend/src/app.ts`).

| Mount Point | Router Module | Sub-routes |
|---|---|---|
| `/api/auth` | `auth.routes.ts` | `POST /login`, `POST /refresh`, `GET /me` |
| `/api/users` | `users.routes.ts` | `GET /`, `GET /roles`, `PUT /:id/roles` |
| `/api/clinics` | `clinics.routes.ts` | CRUD |
| `/api/reception` | `reception.routes.ts` | Patients, files, appointments, queue, lab payments |
| `/api/surgeries` | `surgery.routes.ts` | CRUD + postoperative, discharge |
| `/api/referrals` | `referral.routes.ts` | CRUD |
| `/api/pos` | `pos.routes.ts` | Pharmacy, optics, hospital, invoices, transactions, suppliers |
| `/api/inventory` | `inventory.routes.ts` | Items, transactions |
| `/api/accounting` | `accounting.routes.ts` | Transactions, summary, shifts, expenses, debts, cash movements |
| `/api/admin` | `admin.routes.ts` | System admin |
| `/api/hr` | `hr.routes.ts` | Employees, payroll, attendance, leave |
| `/api/ai` | `ai.routes.ts` | AI clinical assessment endpoints |
| `/api/lab` | `lab.routes.ts` | Diagnostic orders, results, panels |
| `/api/departments` | `departments.routes.ts` | CRUD |
| `/api/patients` | `patients.routes.ts` | CRUD |
| `/api/appointments` | `appointments.routes.ts` | CRUD |
| `/api/procurement` | `procurement.routes.ts` | Requisitions, POs, suppliers, notifications, assets, cost centers |
| `/api/sync` | `sync.routes.ts` | Offline sync endpoint (burst limited: 500/min prod) |
| `/api/imaging` | `imaging.routes.ts` | Imaging orders/results |
| `/api/optic-lab` | `optic-lab.routes.ts` | Optic lab jobs |
| `/api/preoperative` | `preoperative.routes.ts` | Pre-op assessments |
| `/api/wards` | `wards.routes.ts` | Ward management, inpatient |

### Global Middleware Stack

```
helmet()                          → Security headers
cors({ origin, credentials })     → CORS for frontend + native apps
compression()                     → gzip
morgan('short')                   → Request logging
express.json({ limit: '10mb' })  → Body parser
globalLimiter (100/min prod)      → Rate limiting on /api/*
syncBurstLimiter (500/min prod)  → Stricter rate limit on /api/sync
```

### Error Handling

- `authenticate` → 401 `{ message, code: "TOKEN_EXPIRED" | "Invalid token" }`
- `requirePermission` → 403 `{ message: "Insufficient permissions" }`
- Route-level `asyncHandler` catches async errors
- `errorHandler` middleware produces final error response
- Validation via `validate(schema)` middleware (Zod schemas)
