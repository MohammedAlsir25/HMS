# Phase 0 Brief — Multi-Tenant Foundation & Auth

## 1. Phase Goal

Convert the single-tenant HMS into a multi-tenant SaaS by introducing a `Hospital` model as the top-level tenant boundary, adding `hospitalId` to every tenant-scoped table, and wiring tenant isolation into authentication and query execution so that no hospital can ever see another hospital's data.

## 2. Tasks

1. Add `Hospital` model to `backend/prisma/schema.prisma` with fields: `id`, `name`, `slug` (unique), `address`, `phone`, `email`, `logoUrl`, `isActive`, `createdAt`, `updatedAt`, `is_deleted`. Add `hospitalId` FK relation field on the model.

2. Add `hospitalId String` (required, FK → Hospital) to every tenant-scoped table in the schema. The following tables are **NOT** tenant-scoped (they are shared catalogs): `DiagnosticTest`, `DiagnosticPanel`, `DiagnosticPanelTest`, `ImagingProcedureType`, `ORRole`, `IntraoperativeEventType`, `Icd10Code`. All other 50+ tables need the column. Add composite unique constraints where logical (e.g. `@@unique([hospitalId, mrn])` on Patient, `@@unique([hospitalId, email])` on User, `@@unique([hospitalId, employeeCode])` on Employee). Add `@@index([hospitalId])` on every tenant-scoped table.

3. Create `backend/src/middleware/tenant.ts` — a Prisma client extension (not middleware, since Prisma v5+ uses extensions) that reads `hospitalId` from the async-local-storage request context and automatically injects it as a `where` filter on all `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`, `groupBy` operations for tenant-scoped models. On `create`/`createMany`, auto-inject `hospitalId` into `data` if missing. On `update`/`updateMany`/`delete`/`deleteMany`, ensure `where` includes `hospitalId`.

4. Create `backend/src/middleware/requestContext.ts` — use `AsyncLocalStorage` to store `{ hospitalId, userId, role }` per request, so the Prisma extension can access it without threading through every call.

5. Update `generateTokens()` in `backend/src/modules/auth/auth.routes.ts` to include `hospitalId` in the JWT access token payload. Currently the payload is `{ id, email, role, clinicId, clinicSlug, permissions }`. Add `hospitalId` from `user.hospitalId`. Also include it in the refresh token payload.

6. Update `authenticate()` in `backend/src/middleware/auth.ts` to extract `hospitalId` from the decoded JWT and set it on `req.user.hospitalId`, then store it in the AsyncLocalStorage request context.

7. Add `hospitalId` to the Express `User` type augmentation (likely in `backend/src/types/` or `backend/src/@types/`) so TypeScript recognizes it on `req.user`.

8. Create `backend/src/modules/admin/hospital.routes.ts` with CRUD endpoints (super-admin only):
   - `POST /admin/hospitals` — create hospital, auto-seed default roles (from existing `DEFAULT_ROLES` in `rbac.ts`), a default clinic, and a default admin user.
   - `GET /admin/hospitals` — list all hospitals (super-admin).
   - `GET /admin/hospitals/:id` — get hospital details.
   - `PATCH /admin/hospitals/:id` — update hospital.
   - `PATCH /admin/hospitals/:id/deactivate` — soft-deactivate.

9. Update `generateMRN()` in `backend/src/modules/patients/patients.routes.ts` to scope MRN uniqueness per hospital. The current implementation uses random numbers (`Math.floor(Math.random() * 99999)`). Replace with a sequential counter scoped to `hospitalId` + year, querying `prisma.patient.findFirst({ where: { hospitalId, mrn: { startsWith: 'MRN-{year}-' } }, orderBy: { mrn: 'desc' } })` and incrementing. Change the global `@@unique(mrn)` to `@@unique([hospitalId, mrn])`.

10. Write a data migration script (`backend/prisma/seed-migrate-tenant.ts` or a SQL migration) that: (a) creates a default `Hospital` record for the existing single-tenant database, (b) updates every tenant-scoped table's `hospitalId` to point to it, (c) marks all columns as NOT NULL after migration.

11. Audit every route handler and service file across all modules and add `hospitalId` filtering to every Prisma query. This is the largest task — it touches every `*.routes.ts` and `*.service.ts` file. Systematic approach: grep for `prisma.` across all backend source files and update each query. Key files:
    - `backend/src/modules/patients/patients.routes.ts` — patient search, create, list, detail, update, file upload
    - `backend/src/modules/clinics/` — queue, records, dashboard, stats
    - `backend/src/modules/reception/` — check-in, reservations, queue
    - `backend/src/modules/laboratory/` — tests, orders, results, checkout
    - `backend/src/modules/imaging/` — orders, upload, files
    - `backend/src/modules/surgery/` — CRUD, team, events, notes, discharge
    - `backend/src/modules/preoperative/` — requests, status transitions
    - `backend/src/modules/wards/` — beds, vitals, notes, rounds
    - `backend/src/modules/accounting/` — transactions, expenses, shifts, debts, cash movements
    - `backend/src/modules/pharmacy/` (POS) — items, stock, dispensing
    - `backend/src/modules/inventory/` — items, locations, transactions, suppliers, POs, requisitions
    - `backend/src/modules/hr/` — employees, attendance, payroll, leaves
    - `backend/src/modules/admin/` — users, roles, pricing
    - `backend/src/modules/optic-lab/` — jobs
    - `backend/src/modules/settings/` — configuration
    - `backend/src/utils/audit.ts` — audit log creation

12. Write integration tests verifying cross-tenant isolation: create two hospitals, create patients/appointments/orders under each, assert that Hospital A's authenticated user cannot read Hospital B's data (expect 404 or empty results).

13. Update `frontend/src/stores/authStore.ts` to store and expose `hospitalId` from the JWT response. Update the `User` type on the frontend to include `hospitalId`.

14. Register the hospital routes in `backend/src/index.ts` (the Express app entry point).

## 3. Acceptance Criteria

- [ ] `Hospital` model exists in Prisma schema and migration applies cleanly
- [ ] Every tenant-scoped table has a non-nullable `hospitalId` column with FK to `Hospital`
- [ ] Shared catalog tables (`DiagnosticTest`, `DiagnosticPanel`, `DiagnosticPanelTest`, `ImagingProcedureType`, `ORRole`, `IntraoperativeEventType`, `Icd10Code`) do NOT have `hospitalId`
- [ ] Composite unique constraints enforce MRN uniqueness per hospital (`@@unique([hospitalId, mrn])`)
- [ ] Composite unique constraints enforce email uniqueness per hospital on User (`@@unique([hospitalId, email])`)
- [ ] JWT access token contains `hospitalId` field
- [ ] JWT refresh token contains `hospitalId` field
- [ ] `req.user.hospitalId` is populated on every authenticated request
- [ ] Prisma extension / middleware auto-injects `hospitalId` filter on reads and `hospitalId` data on writes for tenant-scoped models
- [ ] `AsyncLocalStorage` request context is set up and torn down per request (no leaking between requests)
- [ ] Super admin can create a new hospital via `POST /admin/hospitals`, which seeds default roles and a default clinic
- [ ] MRN generation is scoped per hospital — same year + sequential counter within hospital, independent across hospitals
- [ ] Cross-tenant data isolation test passes: Hospital A users cannot see Hospital B's patients, appointments, orders, or any data
- [ ] Existing single-tenant data is migrated to a default hospital with zero data loss
- [ ] All existing routes still function correctly after the migration (no regressions)
- [ ] Frontend `authStore` exposes `hospitalId`
- [ ] TypeScript compiles without errors (`tsc --noEmit` passes)
- [ ] All existing tests pass (`pnpm test` passes)

## 4. Dependencies

- **None** — this is the first phase.
- The existing codebase must be in a working state (all routes functional, Prisma migrations applied, seed data loaded).
- PostgreSQL database available (local or Supabase-hosted).
- `AsyncLocalStorage` is available in Node.js 16+ (the project uses Node 20 LTS per TRD).

## 5. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Missing `hospitalId` on a query** — a single missed query in any module leaks cross-tenant data | Critical | Systematic grep audit of every `prisma.*` call. Write isolation tests that assert 404/empty for cross-tenant reads. Consider a development-mode Prisma extension that throws if a tenant-scoped model is queried without `hospitalId`. |
| **Data migration fails or loses data** — assigning `hospitalId` to all existing rows must not fail on FK constraints or NOT NULL violations | High | Create the `Hospital` row first. Run the migration in a single transaction. Validate row counts before/after. Test on a staging database copy first. |
| **Unique constraint collisions during migration** — existing `@@unique(mrn)` or `@@unique(email)` constraints must be dropped and recreated as composite before adding `hospitalId` | High | The migration DDL must drop old unique constraints, add `hospitalId` column, then create new composite unique constraints. Order matters: drop → add column → update rows → add composite unique → add NOT NULL. |
| **Prisma extension / AsyncLocalStorage complexity** — incorrect implementation causes silent data leaks or request-context bleed | High | Use well-tested patterns (e.g., `prisma-pothos` tenant extension pattern). Write unit tests for the extension. Ensure `AsyncLocalStorage.run()` wraps the entire request lifecycle and `disable()` is called on error paths. |
| **Performance regression** — adding `hospitalId` filter to every query adds a WHERE clause; composite indexes must cover it | Medium | Ensure every `@@index([hospitalId])` is present. Composite indexes (e.g., `@@index([hospitalId, createdAt])`) should be added on frequently-queried columns. Benchmark query plans before/after. |
| **Existing `clinicId`-based isolation conflicts with `hospitalId`** — the current codebase uses `clinicId` for some isolation (e.g., clinic-scoped queries in reception, labs). Adding `hospitalId` as the top-level boundary means `clinicId` becomes a sub-tenant filter within a hospital. Some queries currently filter only on `clinicId` and will now need both. | Medium | The `clinicId` filter remains valid — it scopes within a hospital. Ensure queries that used `clinicId` alone still work (clinics belong to a hospital, so filtering by `clinicId` implicitly scopes to a hospital). Verify no `clinicId` is shared across hospitals (add `@@unique([hospitalId, slug])` on Clinic). |
| **JWT size increase** — adding `hospitalId` (UUID = 36 chars) to the token increases payload size | Low | Negligible impact. JWT is already carrying `permissions[]` which is much larger. |
| **Frontend breaking changes** — the auth response shape changes (new `hospitalId` field) | Low | Additive change. Frontend ignores unknown fields. Just need to update types and store. |

## 6. Files Likely Impacted

### Schema & Migration
- `backend/prisma/schema.prisma` — Hospital model, hospitalId on all tables, updated constraints

### New Files
- `backend/src/middleware/tenant.ts` — Prisma tenant extension
- `backend/src/middleware/requestContext.ts` — AsyncLocalStorage request context
- `backend/src/modules/admin/hospital.routes.ts` — Hospital CRUD endpoints
- `backend/src/modules/admin/hospital.controller.ts` — Hospital controller
- `backend/src/modules/admin/hospital.service.ts` — Hospital service
- `backend/src/modules/admin/hospital.validation.ts` — Zod schemas
- `backend/src/modules/admin/hospital.types.ts` — TypeScript types
- `backend/prisma/seed-migrate-tenant.ts` — Data migration script

### Modified Files — Auth & Middleware
- `backend/src/middleware/auth.ts` — extract `hospitalId` from JWT, store in context
- `backend/src/modules/auth/auth.routes.ts` — add `hospitalId` to `generateTokens()` payload
- `backend/src/index.ts` — register hospital routes, set up AsyncLocalStorage wrapper
- `backend/src/types/` (Express type augmentation) — add `hospitalId` to `req.user`

### Modified Files — All Route Handlers (hospitalId injection)
- `backend/src/modules/patients/patients.routes.ts` — update `generateMRN()`, add hospitalId to all queries
- `backend/src/modules/clinics/clinics.routes.ts` — hospitalId filtering
- `backend/src/modules/reception/reception.routes.ts` — hospitalId filtering
- `backend/src/modules/laboratory/lab.routes.ts` — hospitalId filtering
- `backend/src/modules/imaging/imaging.routes.ts` — hospitalId filtering
- `backend/src/modules/surgery/surgery.routes.ts` — hospitalId filtering
- `backend/src/modules/preoperative/preoperative.routes.ts` — hospitalId filtering
- `backend/src/modules/wards/wards.routes.ts` — hospitalId filtering
- `backend/src/modules/accounting/accounting.routes.ts` — hospitalId filtering
- `backend/src/modules/pharmacy/` (POS) — hospitalId filtering
- `backend/src/modules/inventory/inventory.routes.ts` — hospitalId filtering
- `backend/src/modules/hr/hr.routes.ts` — hospitalId filtering
- `backend/src/modules/admin/admin.routes.ts` — hospitalId filtering on user/role queries
- `backend/src/modules/optic-lab/optic-lab.routes.ts` — hospitalId filtering
- `backend/src/modules/settings/settings.routes.ts` — hospitalId filtering
- `backend/src/utils/audit.ts` — add hospitalId to audit logs

### Modified Files — Frontend
- `frontend/src/stores/authStore.ts` — store `hospitalId`
- `frontend/src/types/` — add `hospitalId` to User type

## 7. Key Business Rules (from PRD)

| Rule | Source | Applies to Phase 0 |
|------|--------|---------------------|
| Multi-tenant SaaS: shared database, tenant isolation at row level via `hospitalId` | PRD §2.3, TRD §9.1 | Yes — this IS Phase 0 |
| MRN format: `MRN-YYYY-NNNNN`, unique per hospital, never reused | PRD Appendix A | Yes — task 9 |
| JWT tokens carry `hospitalId` | TRD §8.1 | Yes — task 5 |
| RBAC: granular permissions per role, per module | PRD Appendix B, TRD §8.3 | Yes — roles are seeded per hospital |
| Hospital can have settings (timezone, currency, language, etc.) | TRD §9.4 | Partial — Hospital model includes `settings Json?` |
| Soft deletes for compliance (data preserved) | TRD §9.2, existing `is_deleted` pattern | Yes — existing pattern continues |
| Audit logging for all data modifications | PRD §6.2 | Yes — audit logs get hospitalId |
| HIPAA: PHI access controls, minimum necessary principle | PRD §6.2 | Indirect — tenant isolation is a HIPAA requirement |
| Super-admin can create hospitals, each hospital auto-seeds default roles | Implementation plan task 7 | Yes — task 8 |
| Existing single-tenant data must be migrated backward-compatibly | Implementation plan task 9 | Yes — task 10 |
