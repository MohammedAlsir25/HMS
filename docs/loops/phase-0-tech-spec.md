# Phase 0 Tech Spec — Multi-Tenant Foundation & Auth

**Author:** Tech Lead  
**Date:** 2026-07-16  
**Status:** Ready for Implementation  

---

## 1. Architecture Decisions

### 1.1 Prisma Extension vs Middleware

**Decision:** Use Prisma Client Extension (not `$use` middleware).

**Rationale:**
- The TRD §4.5 shows a `Prisma.Middleware` pattern, but Prisma v5+ deprecates `$use()` middleware in favor of `.$extends()` client extensions. The current `prisma.ts` just does `new PrismaClient()` with no middleware, so we're building from scratch anyway.
- Extensions give us **type-safe interception** of query args and return values — we can inject `hospitalId` into `where` clauses and `data` payloads with full type awareness.
- Extensions run per-client-instance, which pairs naturally with AsyncLocalStorage (each request gets its own context).
- Extensions don't mutate the global PrismaClient — they produce a new client per `.extends()` call.

**Pattern:**
```typescript
// backend/src/middleware/tenant.ts
export function createTenantPrisma() {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const ctx = requestContext.getStore();
          const hospitalId = ctx?.hospitalId;
          // ... inject hospitalId
        },
      },
    },
  });
}
```

**Deviation from TRD:** The TRD suggests middleware (`$use`). We use extensions instead because they are the modern, recommended API and avoid the deprecation path. The behavior is equivalent.

### 1.2 AsyncLocalStorage Usage Pattern

**Decision:** Wrap the Express request lifecycle with `AsyncLocalStorage.run()`.

**Implementation:**

1. Create `backend/src/middleware/requestContext.ts`:
   - Export an `AsyncLocalStorage<RequestContext>` instance where `RequestContext = { hospitalId: string; userId: string; role: string }`.
   - Export `requestContext` (the ALS store) and a helper `runInContext(ctx, fn)`.

2. Wrap every request in `app.ts` (not in individual routes):
   - Add a middleware **before** `authenticate` that starts the ALS context.
   - The `authenticate` middleware sets `hospitalId`/`userId`/`role` on the store after decoding the JWT.
   - The Prisma extension reads from the store on every operation.

3. **Critical:** The ALS store must be set up **after** JWT decode, not before. This means:
   - The wrapper middleware calls `requestContext.run({ hospitalId: null, userId: null, role: null }, next)`.
   - Inside `authenticate`, we call `requestContext.getStore()` and populate it with decoded JWT fields.
   - This avoids threading hospitalId through every controller → service → prisma call.

**Why not just pass hospitalId as a parameter?** With 40+ route files and 200+ Prisma calls, parameter threading would touch every single function signature. AsyncLocalStorage makes tenant isolation **automatic and invisible** to route handlers.

### 1.3 Work Split Strategy

The split follows a strict **file-level non-overlap** principle:

- **Sr Dev** owns: Schema, Core Infrastructure (extension + ALS), Auth middleware, Hospital CRUD module, Migration script. These are foundational files that everything depends on.
- **Jr Dev** owns: Module audit (adding hospitalId to existing route files), Frontend store, Route registration. These are mechanical, pattern-based changes across many files.

No file is modified by both devs. The Sr Dev's work must be completed and merged first because the Jr Dev's work depends on the Prisma schema having `hospitalId` columns and the context being set up.

---

## 2. Work Split

### Sr Dev Tasks (5 tasks, complex/core)

#### Task A: Prisma Schema Changes
**Approach:** Add `Hospital` model, add `hospitalId` FK to all tenant-scoped tables, update unique constraints.

**File:** `backend/prisma/schema.prisma`

**Steps:**
1. Add `Hospital` model at the top (before all other models):
   ```prisma
   model Hospital {
     id        String   @id @default(uuid())
     name      String
     slug      String   @unique
     address   String?
     phone     String?
     email     String?
     logoUrl   String?
     isActive  Boolean  @default(true)
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
     is_deleted Boolean @default(false)
     settings  Json?
     users     User[]
     patients  Patient[]
     clinics   Clinic[]
     departments Department[]
     // ... relation fields for all tenant-scoped models
     @@index([isActive])
     @@index([is_deleted])
     @@map("hospitals")
   }
   ```

2. Add `hospitalId String` + relation to every tenant-scoped model. **DO NOT add to shared catalogs:**
   - DiagnosticTest
   - DiagnosticPanel
   - DiagnosticPanelTest
   - ImagingProcedureType
   - ORRole
   - IntraoperativeEventType
   - Icd10Code

3. Update unique constraints:
   - Patient: change `@@unique(mrn)` → `@@unique([hospitalId, mrn])`
   - User: change `@@unique(email)` → `@@unique([hospitalId, email])`
   - Employee: change `@@unique(employeeCode)` → `@@unique([hospitalId, employeeCode])`

4. Add `@@index([hospitalId])` on every tenant-scoped model.

5. Add composite indexes where beneficial:
   - Patient: `@@index([hospitalId, lastName, firstName])`
   - Appointment: `@@index([hospitalId, doctorId, scheduledAt])`, `@@index([hospitalId, patientId])`

**Tenant-scoped models to modify** (from schema analysis):
- User, Role (roles are per-hospital), Clinic, Department, Expense, Patient, PatientFile, Appointment, VitalSign, Symptom, Medication, ClinicalRecord, Referral, ReferralMedication, ReferralTest, Surgery, PostOpFollowUp, PostoperativeNote, DischargeSummary, OperationType, PreoperativeRequest, ConsentWaiver, SurgeryTeamMember, IntraoperativeEvent, Ward, Bed, InpatientVital, NursingNote, WardRound, InventoryItem, InventoryLocation, InventoryTransaction, Transaction, OpticLabJob, Shift, CashMovement, DiagnosticOrder, DiagnosticOrderTest, Employee, PayrollRecord, Attendance, LeaveRequest, AuditLog, AccountsPayable, Supplier, SupplierInvoice, SupplierInvoiceItem, CostCenter, Requisition, RequisitionItem, PurchaseOrder, PurchaseOrderItem, FixedAsset, Notification

**Note:** Some models like VitalSign, Symptom, Medication, ReferralMedication, ReferralTest, SurgeryTeamMember, PostOpFollowUp, PostoperativeNote, DischargeSummary, IntraoperativeEvent, ConsentWaiver, InpatientVital, NursingNote, WardRound, DiagnosticOrderTest, PayrollRecord, Attendance, LeaveRequest, CashMovement, SupplierInvoiceItem, PurchaseOrderItem, AuditLog, Notification, PatientFile are child/nested models that already transitively belong to a hospital through their parent. **We still add `hospitalId` to them** for the Prisma extension to work — the extension intercepts all queries on tenant-scoped models regardless of nesting.

---

#### Task B: Prisma Tenant Extension + AsyncLocalStorage

**New Files:**
- `backend/src/middleware/requestContext.ts`
- `backend/src/middleware/tenant.ts`

**Modified Files:**
- `backend/src/lib/prisma.ts`
- `backend/src/app.ts`

**Approach:**

**requestContext.ts:**
```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  hospitalId: string | null;
  userId: string | null;
  role: string | null;
}

const als = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

// Called by authenticate middleware after JWT decode
export function setHospitalId(hospitalId: string) {
  const store = als.getStore();
  if (store) store.hospitalId = hospitalId;
}

export function setUserId(userId: string) {
  const store = als.getStore();
  if (store) store.userId = userId;
}

export function setRole(role: string) {
  const store = als.getStore();
  if (store) store.role = role;
}
```

**tenant.ts (Prisma extension):**
- Defines `TENANT_SCOPED_MODELS` as a `Set<string>` of all tenant model names.
- On `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy`: auto-inject `hospitalId` filter in `where` (merge with existing where).
- On `create`, `createMany`: auto-inject `hospitalId` into `data` if not already present.
- On `update`, `updateMany`, `delete`, `deleteMany`: ensure `where` includes `hospitalId`.
- On `findFirst`/`findUnique` by `id` only: **do NOT inject** hospitalId filter (the id is globally unique UUID) — but we add a **post-query check** that the returned record's hospitalId matches the context hospitalId. This prevents reading another hospital's record by guessing an id.

**prisma.ts:**
```typescript
import { PrismaClient } from '@prisma/client';
import { createTenantPrisma } from '../middleware/tenant.js';

const basePrisma = new PrismaClient();
export const prisma = createTenantPrisma(basePrisma);
export default prisma; // default export for backward compat
```

**app.ts:**
- Add middleware BEFORE all route registrations:
```typescript
import { runWithContext } from './middleware/requestContext.js';

app.use((req, _res, next) => {
  runWithContext({ hospitalId: null, userId: null, role: null }, () => next());
});
```
This must be placed after `express.json()` but BEFORE `app.use('/api/auth', authRoutes)`.

---

#### Task C: Auth Middleware + JWT Updates

**Modified Files:**
- `backend/src/middleware/auth.ts`
- `backend/src/modules/auth/auth.routes.ts`
- `backend/src/types/express.d.ts`

**Approach:**

**auth.routes.ts — `generateTokens()`:**
- Add `hospitalId: user.hospitalId` to the access token payload.
- Add `hospitalId: user.hospitalId` to the refresh token payload.
- The `user` object already includes `hospitalId` once the schema change (Task A) is applied.

```typescript
function generateTokens(user: Prisma.UserGetPayload<{ include: { role: true; clinic: true } }>) {
  const payload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    role: user.role.name,
    clinicId: user.clinicId,
    clinicSlug: user.clinic?.slug || null,
    permissions: user.role.permissions,
    hospitalId: user.hospitalId, // NEW
  };
  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry });
  const refreshToken = jwt.sign(
    { id: user.id, hospitalId: user.hospitalId }, // NEW
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );
  return { token, refreshToken };
}
```

Also update the `/login` response to include `hospitalId`:
```typescript
res.json({
  token,
  refreshToken,
  user: {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role.name,
    clinic: user.clinic ? { ... } : null,
    permissions: user.role.permissions,
    avatarUrl: user.avatarUrl,
    hospitalId: user.hospitalId, // NEW
  },
});
```

**auth.ts — `authenticate()`:**
- After `jwt.verify()`, extract `hospitalId` from decoded token.
- Set it on `req.user.hospitalId`.
- Populate the AsyncLocalStorage context.

```typescript
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // ... existing token extraction ...
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded as Request['user'];
    
    // NEW: populate AsyncLocalStorage context
    const ctx = getRequestContext();
    if (ctx) {
      ctx.hospitalId = (decoded as any).hospitalId || null;
      ctx.userId = req.user!.id;
      ctx.role = req.user!.role;
    }
    
    next();
  } catch (err) { ... }
}
```

**express.d.ts — Type augmentation:**
```typescript
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        permissions: string[];
        hospitalId?: string; // NEW — add to the type
        [key: string]: unknown;
      };
    }
  }
}
```

**Note:** `hospitalId` is already captured in the `[key: string]: unknown` catch-all, but adding it explicitly improves type safety.

---

#### Task D: Hospital CRUD Endpoints

**New Files:**
- `backend/src/modules/admin/hospital.routes.ts`
- `backend/src/modules/admin/hospital.controller.ts`
- `backend/src/modules/admin/hospital.service.ts`
- `backend/src/modules/admin/hospital.validation.ts`
- `backend/src/modules/admin/hospital.types.ts`

**Approach:** Follow the existing module pattern (`admin.routes.ts` style). Super-admin only endpoints.

**hospital.service.ts:**
- `createHospital(data)` — Create hospital, then in a transaction: create default roles (from `DEFAULT_ROLES`), a default clinic, and a default admin user.
- `listHospitals()` — `prisma.hospital.findMany()` with pagination.
- `getHospitalById(id)` — Find with counts of users, clinics, patients.
- `updateHospital(id, data)` — Update name, address, phone, email, logoUrl, settings.
- `deactivateHospital(id)` — Set `isActive = false`.

**hospital.routes.ts:**
```typescript
router.post('/', authenticate, requireSuperAdmin, auditMiddleware('CREATE_HOSPITAL', 'Hospital'), ...);
router.get('/', authenticate, requireSuperAdmin, ...);
router.get('/:id', authenticate, requireSuperAdmin, ...);
router.patch('/:id', authenticate, requireSuperAdmin, ...);
router.patch('/:id/deactivate', authenticate, requireSuperAdmin, ...);
```

**Validation:** Add a `requireSuperAdmin` middleware or use `requirePermission` with a new `SUPER_ADMIN` permission. Given the existing RBAC structure doesn't have a `SUPER_ADMIN` permission constant, use a check: `req.user?.role === 'Super Admin'`.

**Default roles seed on hospital creation:** Loop `Object.entries(DEFAULT_ROLES)`, create each role via `prisma.role.create()`.

**Default clinic on hospital creation:** Create one generic clinic (e.g., "General Clinic", type MEDICINE).

---

#### Task E: Data Migration Script

**New File:** `backend/prisma/seed-migrate-tenant.ts`

**Approach:**
1. Create a single default Hospital record.
2. Run a SQL migration (not Prisma migration) to bulk-update all tenant-scoped tables:
   ```sql
   -- Step 1: Create default hospital
   INSERT INTO hospitals (id, name, slug, "isActive", "createdAt", "updatedAt", is_deleted)
   VALUES ('default-hospital-id', 'Default Hospital', 'default', true, NOW(), NOW(), false);
   
   -- Step 2: Add hospitalId column to all tenant-scoped tables (nullable first)
   ALTER TABLE users ADD COLUMN "hospitalId" TEXT;
   ALTER TABLE patients ADD COLUMN "hospitalId" TEXT;
   -- ... for all ~50 tables ...
   
   -- Step 3: Backfill
   UPDATE users SET "hospitalId" = 'default-hospital-id' WHERE "hospitalId" IS NULL;
   UPDATE patients SET "hospitalId" = 'default-hospital-id' WHERE "hospitalId" IS NULL;
   -- ... for all tables ...
   
   -- Step 4: Drop old unique constraints
   ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_mrn_key;
   ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
   -- ...
   
   -- Step 5: Add new composite unique constraints
   ALTER TABLE patients ADD CONSTRAINT patients_hospitalId_mrn_key UNIQUE ("hospitalId", mrn);
   ALTER TABLE users ADD CONSTRAINT users_hospitalId_email_key UNIQUE ("hospitalId", email);
   -- ...
   
   -- Step 6: Set NOT NULL
   ALTER TABLE users ALTER COLUMN "hospitalId" SET NOT NULL;
   ALTER TABLE patients ALTER COLUMN "hospitalId" SET NOT NULL;
   -- ...
   
   -- Step 7: Add foreign keys
   ALTER TABLE users ADD CONSTRAINT users_hospitalId_fkey FOREIGN KEY ("hospitalId") REFERENCES hospitals(id);
   ALTER TABLE patients ADD CONSTRAINT patients_hospitalId_fkey FOREIGN KEY ("hospitalId") REFERENCES hospitals(id);
   -- ...
   ```
3. Add indexes:
   ```sql
   CREATE INDEX idx_users_hospitalId ON users("hospitalId");
   CREATE INDEX idx_patients_hospitalId ON patients("hospitalId");
   -- ...
   ```
4. **Run in a transaction.** Validate row counts before/after.

**Why raw SQL instead of Prisma migrate?** The migration needs to drop unique constraints, add columns, backfill, then re-add constraints. Prisma's migration system handles DDL well, but the seed script approach is safer for one-time data migration and can be re-run idempotently.

**Alternative:** Use a proper Prisma migration file instead. The script approach gives more control and can be run independently.

---

### Jr Dev Tasks (3 tasks, simpler/mechanical)

#### Task F: Audit All Module Files and Add hospitalId to Queries

**Approach:** Mechanical grep-and-update. For every `prisma.*.findMany()`, `prisma.*.findFirst()`, `prisma.*.findUnique()`, `prisma.*.count()`, `prisma.*.create()`, `prisma.*.update()`, `prisma.*.delete()`, `prisma.*.groupBy()`, `prisma.*.aggregate()` — add `hospitalId` from `req.user!.hospitalId` to the appropriate place.

**HOWEVER:** Once Task B is complete and the Prisma extension is active, many of these become **automatic** — the extension injects `hospitalId` into all tenant-scoped model queries. The Jr Dev's job is to:

1. **Verify** that the extension handles each query (it should for all tenant-scoped models).
2. **Add `hospitalId` to `data` payloads on creates** where it's not already present (the extension does this automatically too, but defensive coding is better).
3. **Handle special cases** where the extension can't help:
   - Raw queries (`$queryRaw`, `$executeRaw`) — must add `WHERE "hospitalId" = ...` manually.
   - Queries on models not in the tenant-scoped set (shared catalogs) — skip.
   - The `seed.js` file — skip (it seeds shared data, not tenant data).

**Files to audit (44 route files):**

| Module | Files | Notes |
|--------|-------|-------|
| patients | `patients.routes.ts` | Also update `generateMRN()` |
| clinics | `clinics.routes.ts` | |
| reception | `reception.routes.ts` + `routes/appointments.routes.ts` + `routes/patients.routes.ts` + `routes/queue.routes.ts` + `routes/files.routes.ts` + `routes/labPayments.routes.ts` | |
| lab | `lab.routes.ts` | |
| imaging | `imaging.routes.ts` | |
| surgery | `surgery.routes.ts` | |
| preoperative | `preoperative.routes.ts` + `wards.routes.ts` | |
| accounting | `accounting.routes.ts` + `routes/transactions.routes.ts` + `routes/summary.routes.ts` + `routes/shifts.routes.ts` + `routes/expenses.routes.ts` + `routes/debts.routes.ts` + `routes/cashMovements.routes.ts` | |
| pos | `pos.routes.ts` + `routes/transactions.routes.ts` + `routes/suppliers.routes.ts` + `routes/pharmacy.routes.ts` + `routes/optics.routes.ts` + `routes/invoices.routes.ts` + `routes/hospital.routes.ts` | |
| inventory | `inventory.routes.ts` | |
| hr | `hr.routes.ts` | |
| admin | `admin.routes.ts` | |
| users | `users.routes.ts` | |
| departments | `departments.routes.ts` | |
| procurement | `procurement.routes.ts` + `routes/notifications.routes.ts` + `routes/fixedAssets.routes.ts` + `routes/costCenters.routes.ts` + `routes/purchaseOrders.routes.ts` + `routes/requisitions.routes.ts` | |
| optic-lab | `optic-lab.routes.ts` | |
| referral | `referral.routes.ts` | |
| appointments | `appointments.routes.ts` | |
| sync | `skip` — sync module uses raw queries; add hospitalId to raw SQL |
| ai | `skip` — likely no tenant data |

**MRN Generation Update** (part of patients module audit):
```typescript
// OLD (patients.routes.ts:26-30)
function generateMRN() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `MRN-${year}-${rand}`;
}

// NEW
async function generateMRN(hospitalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastPatient = await prisma.patient.findFirst({
    where: {
      hospitalId,
      mrn: { startsWith: `MRN-${year}-` },
    },
    orderBy: { mrn: 'desc' },
    select: { mrn: true },
  });
  let sequence = 1;
  if (lastPatient) {
    const lastSeq = parseInt(lastPatient.mrn.split('-')[2]!);
    sequence = lastSeq + 1;
  }
  return `MRN-${year}-${String(sequence).padStart(5, '0')}`;
}
```

**Audit utility update** (`utils/audit.ts`):
- Add `hospitalId` parameter to `logAudit()`.
- Include it in the `data` payload for `auditLog.create()`.

---

#### Task G: Frontend authStore Update

**Modified Files:**
- `frontend/src/stores/authStore.js`

**Approach:** Additive change only. The `user` object returned from `/api/auth/login` will now include `hospitalId`. The store already passes the full `user` object through, so `hospitalId` is automatically available via `useAuthStore(state => state.user?.hospitalId)`.

**No changes strictly required** — the store stores whatever `user` object the login response returns. However, to be explicit and support TypeScript consumers:
- If the store gets converted to `.ts`, add `hospitalId?: string` to the User type.

**Optional enhancement:** Expose `hospitalId` as a top-level getter:
```javascript
hospitalId: null, // add to state
login: (token, refreshToken, user) =>
  set({ token, refreshToken, user, isAuthenticated: true, hospitalId: user?.hospitalId }),
```

---

#### Task H: Route Registration in app.ts

**Modified File:** `backend/src/app.ts`

**Approach:** Add the hospital routes import and registration.

```typescript
import hospitalRoutes from './modules/admin/hospital.routes.js';

// Add after existing admin routes:
app.use('/api/admin/hospitals', hospitalRoutes);
```

**Note:** The hospital routes live inside the existing `admin` module directory. They are mounted as a sub-path of `/api/admin/hospitals`, separate from the existing `/api/admin` routes.

---

## 3. Key Gotchas

### 3.1 RelationMode = "prisma" Affects Foreign Keys
The schema has `relationMode = "prisma"` (line 11 of schema.prisma). This means Prisma **does not create foreign key constraints at the database level**. FKs are enforced by Prisma client only. Implications:
- The migration script must NOT try to `ADD CONSTRAINT ... FOREIGN KEY` — PostgreSQL won't have them.
- Instead, use raw SQL to add the column and index, and rely on Prisma for FK enforcement.
- Unique constraints DO work with `relationMode = "prisma"`.

### 3.2 The `clinicId` Pattern
Many existing queries already filter by `clinicId` (e.g., reception, clinics, labs). Since `Clinic` will have its own `hospitalId`, filtering by `clinicId` **implicitly scopes to a hospital**. We do NOT need to add `hospitalId` to every query that already filters by `clinicId` — but the Prisma extension will inject it anyway (no harm, slight performance cost of an extra WHERE clause that's always true).

### 3.3 The `createdById` Pattern
Patient, ClinicalRecord, and other models have a `createdById` FK to User. User will have `hospitalId`. So `createdById` indirectly scopes to a hospital. But we still add `hospitalId` to these models for the extension to work.

### 3.4 Existing Unique Constraints Must Be Dropped Before Adding hospitalId
- `Patient.mrn` has `@@unique` — must be dropped before adding `hospitalId` column, then recreated as `@@unique([hospitalId, mrn])`.
- `User.email` has `@@unique` — same pattern.
- `Employee.employeeCode` has `@@unique` — same pattern.
- `Clinic.slug` has `@@unique` — must become `@@unique([hospitalId, slug])` since clinics should be unique per hospital.
- `InventoryItem.sku` has `@@unique` — same pattern.
- `OpticLabJob.jobNumber` has `@@unique` — same pattern.
- `OpticLabJob.transactionId` has `@@unique` — this one stays global (one transaction per optic lab job across all hospitals).
- `Role.name` has `@@unique` — **must become per-hospital**: `@@unique([hospitalId, name])`.

### 3.5 The `Role` Model Needs hospitalId Too
Roles are currently global (`@@unique(name)`). In multi-tenant, each hospital has its own set of roles. The `DEFAULT_ROLES` seed on hospital creation creates roles per-hospital. This means:
- `Role.name` uniqueness is scoped to hospital.
- `User.roleId` FK is fine — it points to a hospital-scoped Role.

### 3.6 AuditLog Needs hospitalId
`AuditLog` currently has `userId` but no `hospitalId`. Adding `hospitalId` to `AuditLog` enables hospital-scoped audit log queries. The `logAudit()` utility must be updated to accept and store `hospitalId`.

### 3.7 Seed Data Compatibility
The existing `seed.js` creates roles, clinics, users, and reference data. After multi-tenancy:
- `seed.js` must be updated to associate all seeded data with the default hospital.
- Or: Run the migration script first, then seed — but the seed must include `hospitalId` in all creates.

### 3.8 Prisma Extension Must Handle Nested Creates
When a `clinicalRecord.create()` includes nested `vitalSigns.create()`, the extension must inject `hospitalId` into BOTH the parent and child records. The `$allModels` hook handles this because each nested create triggers the hook for that model.

### 3.9 AsyncLocalStorage and Error Handling
If an error occurs in a route handler and `asyncHandler` catches it, the ALS context is still active. No special cleanup needed — ALS automatically discards the store when the `run()` callback exits.

### 3.10 The Sync Module Uses Raw Queries
`sync.routes.ts` likely uses `$queryRaw` or `$executeRaw`. The Prisma extension does NOT intercept raw queries. These must be manually updated to include `WHERE "hospitalId" = ...`.

### 3.11 Department.slug Unique Constraint
`Department` has `@@unique(slug)` — this should become `@@unique([hospitalId, slug])` since departments are per-hospital.

### 3.12 CostCenter.code Unique Constraint
`CostCenter` has `@@unique(code)` — should become `@@unique([hospitalId, code])`.

---

## 4. Exact File List

### New Files (Sr Dev)

| File | Description |
|------|-------------|
| `backend/src/middleware/requestContext.ts` | AsyncLocalStorage setup + context getters/setters |
| `backend/src/middleware/tenant.ts` | Prisma client extension for tenant isolation |
| `backend/src/modules/admin/hospital.routes.ts` | Hospital CRUD route definitions |
| `backend/src/modules/admin/hospital.controller.ts` | Hospital controller handlers |
| `backend/src/modules/admin/hospital.service.ts` | Hospital business logic (create, list, update, seed defaults) |
| `backend/src/modules/admin/hospital.validation.ts` | Zod schemas for hospital create/update |
| `backend/src/modules/admin/hospital.types.ts` | TypeScript interfaces for hospital DTOs |
| `backend/prisma/seed-migrate-tenant.ts` | Data migration script for existing data |

### Modified Files (Sr Dev)

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add Hospital model, add hospitalId to ~50 models, update unique constraints, add indexes |
| `backend/src/lib/prisma.ts` | Export tenant-extended PrismaClient instead of plain one |
| `backend/src/app.ts` | Add AsyncLocalStorage wrapper middleware (before routes) |
| `backend/src/middleware/auth.ts` | Extract hospitalId from JWT, populate ALS context |
| `backend/src/modules/auth/auth.routes.ts` | Add hospitalId to generateTokens() payload and login response |
| `backend/src/types/express.d.ts` | Add hospitalId to Request.user type |

### Modified Files (Jr Dev — Task F: Module Audit)

| File | Change |
|------|--------|
| `backend/src/modules/patients/patients.routes.ts` | Update generateMRN() to async + hospitalId-scoped; verify extension handles queries |
| `backend/src/modules/clinics/clinics.routes.ts` | Verify extension handles queries |
| `backend/src/modules/reception/reception.routes.ts` | Verify |
| `backend/src/modules/reception/routes/appointments.routes.ts` | Verify |
| `backend/src/modules/reception/routes/patients.routes.ts` | Verify |
| `backend/src/modules/reception/routes/queue.routes.ts` | Verify |
| `backend/src/modules/reception/routes/files.routes.ts` | Verify |
| `backend/src/modules/reception/routes/labPayments.routes.ts` | Verify |
| `backend/src/modules/lab/lab.routes.ts` | Verify |
| `backend/src/modules/imaging/imaging.routes.ts` | Verify |
| `backend/src/modules/surgery/surgery.routes.ts` | Verify |
| `backend/src/modules/preoperative/preoperative.routes.ts` | Verify |
| `backend/src/modules/preoperative/wards.routes.ts` | Verify |
| `backend/src/modules/accounting/accounting.routes.ts` | Verify |
| `backend/src/modules/accounting/routes/transactions.routes.ts` | Verify |
| `backend/src/modules/accounting/routes/summary.routes.ts` | Verify |
| `backend/src/modules/accounting/routes/shifts.routes.ts` | Verify |
| `backend/src/modules/accounting/routes/expenses.routes.ts` | Verify |
| `backend/src/modules/accounting/routes/debts.routes.ts` | Verify |
| `backend/src/modules/accounting/routes/cashMovements.routes.ts` | Verify |
| `backend/src/modules/pos/pos.routes.ts` | Verify |
| `backend/src/modules/pos/routes/transactions.routes.ts` | Verify |
| `backend/src/modules/pos/routes/suppliers.routes.ts` | Verify |
| `backend/src/modules/pos/routes/pharmacy.routes.ts` | Verify |
| `backend/src/modules/pos/routes/optics.routes.ts` | Verify |
| `backend/src/modules/pos/routes/invoices.routes.ts` | Verify |
| `backend/src/modules/pos/routes/hospital.routes.ts` | Verify |
| `backend/src/modules/inventory/inventory.routes.ts` | Verify |
| `backend/src/modules/hr/hr.routes.ts` | Verify |
| `backend/src/modules/admin/admin.routes.ts` | Verify — user queries need hospitalId filter |
| `backend/src/modules/users/users.routes.ts` | Verify |
| `backend/src/modules/departments/departments.routes.ts` | Verify |
| `backend/src/modules/procurement/procurement.routes.ts` | Verify |
| `backend/src/modules/procurement/routes/notifications.routes.ts` | Verify |
| `backend/src/modules/procurement/routes/fixedAssets.routes.ts` | Verify |
| `backend/src/modules/procurement/routes/costCenters.routes.ts` | Verify |
| `backend/src/modules/procurement/routes/purchaseOrders.routes.ts` | Verify |
| `backend/src/modules/procurement/routes/requisitions.routes.ts` | Verify |
| `backend/src/modules/optic-lab/optic-lab.routes.ts` | Verify |
| `backend/src/modules/referral/referral.routes.ts` | Verify |
| `backend/src/modules/appointments/appointments.routes.ts` | Verify |
| `backend/src/modules/sync/sync.routes.ts` | Manual update for raw queries |
| `backend/src/utils/audit.ts` | Add hospitalId parameter |

### Modified Files (Jr Dev — Task G)

| File | Change |
|------|--------|
| `frontend/src/stores/authStore.js` | Optionally expose hospitalId from user object |

### Modified Files (Jr Dev — Task H)

| File | Change |
|------|--------|
| `backend/src/app.ts` | Import and register hospital routes |

---

## 5. Pattern References

| Pattern | Reference File | What to Follow |
|---------|---------------|----------------|
| Route definitions | `backend/src/modules/admin/admin.routes.ts` | Router structure, `authenticate` + `requirePermission` usage, `asyncHandler` wrapping |
| CRUD endpoints | `backend/src/modules/admin/admin.routes.ts` (GET/POST/PATCH/DELETE patterns) | Controller pattern with `req.body`, `req.params`, `req.query` destructuring |
| Zod validation | `backend/src/schemas/` directory | `validate()` middleware pattern |
| Error handling | `backend/src/utils/errors.ts` | `ValidationError`, `NotFoundError`, `ConflictError` classes |
| Audit logging | `backend/src/middleware/auditLog.ts` | `auditMiddleware()` usage pattern |
| Prisma queries | `backend/src/modules/patients/patients.routes.ts` | `findMany` with pagination, `create`, `update`, `findUnique` patterns |
| RBAC permissions | `backend/src/middleware/rbac.ts` | `PERMISSIONS` constants, `DEFAULT_ROLES` structure |
| Async handler | `backend/src/middleware/errorHandler.ts` | `asyncHandler()` wrapper |
| Config | `backend/src/config/index.ts` | JWT secrets, frontend URL, environment variables |
| Frontend store | `frontend/src/stores/authStore.js` | Zustand `create` + `persist` pattern |
| Type augmentation | `backend/src/types/express.d.ts` | Global namespace declaration pattern |
| Seed data | `backend/prisma/seed.js` | `upsert` pattern, `DEFAULT_ROLES` import |
| Migration SQL | `backend/prisma/migrations/` | SQL migration file naming convention |

---

## 6. Implementation Order

```
Week 1 (Sr Dev):
  Day 1: Task A (Schema) + Task E (Migration script — write but don't run yet)
  Day 2: Task B (Extension + ALS) + Task C (Auth middleware)
  Day 3: Task D (Hospital CRUD)
  Day 4: Run migration, test, fix

Week 1-2 (Jr Dev, after schema + extension merged):
  Day 1-3: Task F (Module audit — 44 files, ~5 min each)
  Day 3: Task G (Frontend store)
  Day 4: Task H (Route registration)
  Day 5: Integration testing
```

## 7. Testing Strategy

1. **Unit test for Prisma extension** — Mock AsyncLocalStorage, verify hospitalId injection.
2. **Cross-tenant isolation test** — Create 2 hospitals, create data under each, assert Hospital A can't see Hospital B's data.
3. **Auth flow test** — Login, verify JWT contains hospitalId, verify req.user.hospitalId is populated.
4. **MRN generation test** — Verify sequential MRNs per hospital, independent across hospitals.
5. **Migration test** — Run on a copy of production data, validate row counts, no data loss.
6. **Existing test regression** — `pnpm test` must pass after all changes.
