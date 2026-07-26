# Phase 0 QA Report — Multi-Tenant Foundation & Auth

**Date:** 2026-07-16
**Tester:** QA Engineer (automated)
**Scope:** Code correctness and logic validation (pre-migration)

---

## 1. Acceptance Criteria Results

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `Hospital` model exists in Prisma schema | ✅ | `schema.prisma:13-86` — Model with all required fields (id, name, slug, address, phone, email, logoUrl, isActive, createdAt, updatedAt, is_deleted, settings), `@@unique(slug)`, `@@index([isActive])`, `@@index([is_deleted])`, `@@map("hospitals")`, and all relation fields |
| 2 | Every tenant-scoped table has `hospitalId` with FK to Hospital | ✅ | All 55 tenant-scoped models have `hospitalId String` + `hospital Hospital @relation(fields: [hospitalId], references: [id])`. Verified in schema.prisma (lines 101, 148, 171, 200, 234, 264, 297, 323, 373, 395, 419, 438, 464, 493, 510, 532, 574, 595, 615, 635, 687, 715, 732, 767, 792, 817, 847, 860, 882, 911, 935, 955, 984, 1031, 1063, 1087, 1173, 1215, 1245, 1273, 1296, 1320, 1342, 1366, 1387, 1412, 1436, 1457, 1479, 1503, 1542, 1574, 1606, 1626, 1687, 1709) |
| 3 | Shared catalog tables do NOT have `hospitalId` | ✅ | `DiagnosticTest` (line 1095), `DiagnosticPanel` (line 1124), `DiagnosticPanelTest` (line 1141), `ImagingProcedureType` (line 1650), `ORRole` (line 648), `IntraoperativeEventType` (line 745), `Icd10Code` (line 345) — none have `hospitalId` |
| 4 | Composite unique: Patient `@@unique([hospitalId, mrn])` | ✅ | `schema.prisma:278` |
| 5 | Composite unique: User `@@unique([hospitalId, email])` | ✅ | `schema.prisma:132` |
| 6 | Composite unique: Employee `@@unique([hospitalId, employeeCode])` | ✅ | `schema.prisma:1253` |
| 7 | Composite unique: Role `@@unique([hospitalId, name])` | ✅ | `schema.prisma:152` |
| 8 | Composite unique: Clinic `@@unique([hospitalId, slug])` | ✅ | `schema.prisma:182` |
| 9 | Composite unique: Department `@@unique([hospitalId, slug])` | ✅ | `schema.prisma:213` |
| 10 | Composite unique: InventoryItem `@@unique([hospitalId, sku])` | ✅ | `schema.prisma:919` |
| 11 | Composite unique: OpticLabJob `@@unique([hospitalId, jobNumber])` | ✅ | `schema.prisma:1043` |
| 12 | Composite unique: CostCenter `@@unique([hospitalId, code])` | ✅ | `schema.prisma:1462` |
| 13 | JWT access token contains `hospitalId` | ✅ | `auth.routes.ts:31` — `hospitalId: user.hospitalId` in payload |
| 14 | JWT refresh token contains `hospitalId` | ✅ | `auth.routes.ts:34` — `jwt.sign({ id: user.id, hospitalId: user.hospitalId }, ...)` |
| 15 | Login response includes `hospitalId` | ✅ | `auth.routes.ts:73` — `hospitalId: user.hospitalId` in response user object |
| 16 | `/me` response includes `hospitalId` | ✅ | `auth.routes.ts:104` — `hospitalId: user.hospitalId` |
| 17 | `req.user.hospitalId` is populated on authenticated requests | ✅ | `auth.ts:19-22` — `ctx.hospitalId = (d['hospitalId'] as string) \|\| null` after JWT decode |
| 18 | Prisma extension auto-injects `hospitalId` filter on reads | ✅ | `tenant.ts:59-70` — findMany, findFirst, count, aggregate, groupBy get `hospitalId` in where. findUnique does post-query check (line 61-66) |
| 19 | Prisma extension auto-injects `hospitalId` on create | ✅ | `tenant.ts:72-83` — `create`/`createMany` inject `hospitalId` into data if missing |
| 20 | Prisma extension auto-injects `hospitalId` on update/delete | ✅ | `tenant.ts:85-89` — `update`/`updateMany`/`delete`/`deleteMany` merge hospitalId into where |
| 21 | Prisma extension handles upsert | ✅ | `tenant.ts:91-99` — upsert merges hospitalId into where and create data |
| 22 | Shared catalog models bypass extension | ✅ | `tenant.ts:51-53` — checks `TENANT_SCOPED_MODELS.has(model)`, returns early if false |
| 23 | AsyncLocalStorage set up correctly | ✅ | `requestContext.ts` — Full implementation with `runWithContext`, `getRequestContext`, `setHospitalId`, `setUserId`, `setRole`. Unit tests pass for context isolation |
| 24 | ALS wrapper middleware in app.ts | ✅ | `app.ts:84-86` — `runWithContext({ hospitalId: null, userId: null, role: null }, () => next())` placed after `express.json()` and before routes |
| 25 | Super admin can create hospital | ✅ | `hospital.routes.ts:18` — `POST /` with `authenticate`, `requireSuperAdmin`, `auditMiddleware`, `validate(createHospitalSchema)` |
| 26 | Hospital CRUD endpoints exist | ✅ | `hospital.routes.ts` — POST, GET, GET /:id, PATCH /:id, PATCH /:id/deactivate |
| 27 | Hospital creation seeds default roles | ✅ | `hospital.service.ts:25-35` — `Object.entries(DEFAULT_ROLES)` createMany with `skipDuplicates: true` |
| 28 | Hospital creation seeds default clinic | ✅ | `hospital.service.ts:37-44` — Creates "General Clinic" with type MEDICINE |
| 29 | MRN generation scoped per hospital | ✅ | `patients.routes.ts:26-42` — `generateMRN(hospitalId)` queries `findFirst` with `hospitalId` filter, sequential counter per year per hospital |
| 30 | MRN format `MRN-YYYY-NNNNN` | ✅ | `patients.routes.ts:41` — `MRN-${year}-${String(sequence).padStart(5, '0')}` |
| 31 | Cross-tenant isolation (findUnique post-query check) | ✅ | `tenant.ts:61-66` — After `findUnique`, verifies `result.hospitalId === hospitalId`, returns null if mismatch |
| 32 | Data migration script exists | ✅ | `seed-migrate-tenant.ts` — Creates default hospital, adds hospitalId to all 52 tables, backfills, drops old unique constraints, adds composite uniques, sets NOT NULL, creates indexes, validates row counts |
| 33 | Migration handles relationMode = "prisma" | ✅ | `seed-migrate-tenant.ts` — Uses raw SQL ALTER TABLE (no FK constraints, which is correct for `relationMode = "prisma"`) |
| 34 | Audit log includes hospitalId | ✅ | `audit.ts:5-6` — `logAudit` accepts `hospitalId` parameter, passes to `auditLog.create` |
| 35 | Frontend authStore exposes hospitalId | ✅ | `authStore.js:10` — `hospitalId: null` in initial state. Line 13: `getHospitalId` helper. Line 20: set in `login`. Line 28: set in `setUser`. Line 39: persisted |
| 36 | All `@@index([hospitalId])` present on tenant tables | ✅ | Verified in schema — every tenant-scoped model has `@@index([hospitalId])` |
| 37 | Hospital routes registered in app.ts | ✅ | `app.ts:31` import, `app.ts:98` — `app.use('/api/admin/hospitals', hospitalRoutes)` |

---

## 2. Tests Written

| File | Tests | Status |
|------|-------|--------|
| `backend/tests/tenant.test.js` | 27 tests across 6 suites | ✅ ALL PASS |

### Test Suites:
1. **AsyncLocalStorage Request Context** (6 tests) — context population, isolation, setters, no-leak
2. **Prisma Tenant Extension - hospitalId injection logic** (7 tests) — model classification, where-merge, create-data injection
3. **JWT Payload Structure** (2 tests) — access + refresh token field verification
4. **Hospital Validation Schemas** (8 tests) — Zod schema validation for create/update
5. **Audit Log - hospitalId parameter** (1 test) — function signature verification
6. **Schema Completeness** (2 tests) — model count validation

---

## 3. Build Status

### Backend TypeScript Check (`tsc --noEmit`)
**Status:** ❌ FAIL — 153 type errors across 41 files

**Root Cause:** The Prisma schema requires `hospitalId` on all tenant-scoped model create/update inputs (NOT NULL). However, many route handlers across the codebase were not updated to include `hospitalId` in their Prisma `create()` and `createMany()` calls. While the Prisma extension would auto-inject `hospitalId` at runtime, TypeScript's type checker requires it at compile time because `hospitalId` is non-nullable in the schema.

**Affected Files (41):**
- `src/modules/accounting/routes/` — cashMovements, debts, expenses, shifts, transactions
- `src/modules/admin/` — admin.routes, hospital.service, hospital.validation
- `src/modules/auth/` — auth.routes (findUnique by email no longer valid with composite unique)
- `src/modules/clinics/` — helpers, routes
- `src/modules/departments/` — routes
- `src/modules/hr/` — routes
- `src/modules/imaging/` — helpers, routes
- `src/modules/inventory/` — routes
- `src/modules/lab/` — routes
- `src/modules/optic-lab/` — routes
- `src/modules/patients/` — routes
- `src/modules/pos/routes/` — hospital, invoices, optics, pharmacy, suppliers, transactions
- `src/modules/preoperative/` — routes, wards.routes
- `src/modules/procurement/routes/` — costCenters, fixedAssets, purchaseOrders, requisitions
- `src/modules/procurement/services/` — NotificationService
- `src/modules/reception/` — utils, routes (appointments, files, labPayments, patients)
- `src/modules/referral/` — routes
- `src/modules/surgery/` — routes
- `src/modules/sync/` — routes
- `src/utils/` — audit

**Error Types:**
| Error Code | Count | Description |
|-----------|-------|-------------|
| TS2322 | ~130 | Property 'hospitalId' is missing in type — Prisma create/update inputs require hospitalId |
| TS2339 | ~5 | Property 'hospitalId' does not exist on type — req.user type missing hospitalId |
| TS2551 | ~2 | `findUnique` with `{ slug }` now requires `{ hospitalId_slug }` composite key |
| TS2554 | ~1 | Wrong argument count due to changed unique inputs |
| TS2353 | ~1 | hospitalId used in relation connect without proper type |
| TS6133 | ~2 | Unused variables |

### Key Bug: `express.d.ts` type augmentation missing hospitalId
The `req.user` type (likely in `backend/src/types/express.d.ts`) does not include `hospitalId`, causing TS2339 errors in `reception/routes/appointments.routes.ts:144`, `reception/routes/patients.routes.ts:32`, and `sync/sync.routes.ts:114,154`.

### Key Bug: `logAudit` called without hospitalId
`audit.ts:10` has `hospitalId: string | undefined` but the schema requires `string`. Many call sites across the codebase pass `logAudit(...)` without `hospitalId`, which will fail at runtime even if the Prisma extension auto-injects it (audit.ts uses the base prisma, not the extended one... actually it uses the same `prisma` import which IS the extended one, so the extension would inject hospitalId). However, the TypeScript error is real: the parameter type is `string | undefined` but the schema field is required `string`.

### Key Bug: `findUnique` by email/slug no longer works
- `auth.routes.ts:42` — `findUnique({ where: { email } })` is invalid with `@@unique([hospitalId, email])`
- `reception.utils.ts:15` — `findUnique({ where: { slug } })` is invalid with `@@unique([hospitalId, slug])`
- `labPayments.routes.ts:41` — `findUnique({ where: { slug } })` for Department is invalid with `@@unique([hospitalId, slug])`
- `referral.routes.ts:24` — same Clinic slug issue

These should use `findFirst` with composite where or use the composite unique input syntax.

### Frontend Build
**Status:** ❌ SKIP — `node_modules` not installed (cannot run `vite build`)

---

## 4. Lint Status

**Status:** ⚠️ N/A — Lint is `tsc --noEmit` (same as TypeScript check above). 153 errors.

---

## 5. Bugs Found

| # | Bug | Severity | File | Description |
|---|-----|----------|------|-------------|
| 1 | **Missing `hospitalId` in Prisma create calls** | Critical | 41 route files | Prisma `create()` calls don't include `hospitalId`. The extension auto-injects it at runtime, but TypeScript compiles these as errors. Some calls use `as unknown as Prisma.XxxCreateInput` cast which bypasses the check, but many don't. |
| 2 | **`findUnique` by single field broken** | High | `auth.routes.ts:42`, `reception.utils.ts:15`, `labPayments.routes.ts:41`, `referral.routes.ts:24` | Composite uniques (`[hospitalId, email]`, `[hospitalId, slug]`) make single-field `findUnique` invalid. Must use `findFirst` with composite where, or include hospitalId in the where. |
| 3 | **`req.user` type missing `hospitalId`** | High | `types/express.d.ts` (assumed) | TypeScript doesn't recognize `req.user.hospitalId`, causing TS2339 in at least 3 files. The type augmentation needs `hospitalId?: string` added to the Request.user interface. |
| 4 | **`logAudit` hospitalId type mismatch** | Medium | `audit.ts:5-6` | Parameter type is `hospitalId?: string` (optional, can be undefined) but Prisma schema requires `hospitalId: string` (NOT NULL). The `hospitalId \|\| undefined` on line 12 can pass `undefined` to a NOT NULL column. |
| 5 | **`Clinic.slug` unique now composite but `findUnique({ slug })` still used** | High | `reception.utils.ts:15`, `labPayments.routes.ts:41` | Will fail at runtime with Prisma error: "Argument `where` of type `ClinicWhereUniqueInput` needs at least one argument." |
| 6 | **`Department.slug` unique now composite but `findUnique({ slug })` still used** | High | `labPayments.routes.ts:41` | Same issue as above for Department. |
| 7 | **`auth.routes.ts` login uses `findUnique({ email })`** | High | `auth.routes.ts:42` | Login will fail at runtime because email is no longer globally unique — needs hospitalId scope. Should be `findFirst({ where: { email } })` (extension adds hospitalId filter) or handle multi-hospital email differently. |

---

## 6. Recommendation

### Verdict: **CONDITIONAL PASS** ⚠️

**Core infrastructure is correct and well-implemented:**
- ✅ Prisma schema is complete — Hospital model, hospitalId on all tenant tables, composite uniques, indexes
- ✅ AsyncLocalStorage context management is correct — tested, no leaks
- ✅ Prisma extension logic is correct — proper injection for all CRUD operations, shared model bypass
- ✅ JWT and auth middleware correctly propagate hospitalId
- ✅ MRN generation is properly scoped per hospital
- ✅ Hospital CRUD endpoints with validation, RBAC, and default seeding
- ✅ Migration script is comprehensive and handles edge cases
- ✅ Frontend authStore properly exposes hospitalId
- ✅ All 27 unit tests pass

**Blocking issues (must fix before merge):**
1. **153 TypeScript errors** — The Jr Dev module audit (Task F) was not completed. 41 files need `hospitalId` added to Prisma create/update calls. The Prisma extension auto-injects at runtime, but the code must compile cleanly.
2. **`findUnique` by single field broken in 4+ locations** — Must change to `findFirst` or use composite unique input.
3. **`express.d.ts` type augmentation missing `hospitalId`** — Must add to Request.user interface.

**Non-blocking (should fix):**
4. `logAudit` hospitalId type should be required, not optional.
5. Frontend build cannot be verified (node_modules not installed).

**Next Steps:**
1. Fix the Express type augmentation to add `hospitalId` to `req.user`
2. Complete the Jr Dev module audit — add `hospitalId` to all Prisma create calls across 41 files
3. Fix `findUnique` → `findFirst` for email/slug lookups
4. Run `tsc --noEmit` until 0 errors
5. Install frontend deps and verify `vite build`
6. Run full test suite: `npm test`
