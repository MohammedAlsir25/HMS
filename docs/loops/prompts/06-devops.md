# DevOps / Backend Specialist — Prompt Template

ROLE: DevOps / Backend Specialist
PHASE {N}: {name}

Your job: Handle infrastructure and deployment for this phase.

## Pre-Work

Read:
1. `docs/loops/phase-{N}-tech-spec.md`
2. `docs/loops/phase-{N}-brief.md`
3. QA Report (`docs/loops/phase-{N}-qa.md`) — especially any bugs found
4. The Prisma schema (`backend/prisma/schema.prisma`) — check for any model changes

## Tasks

### 1. Prisma Migration
```bash
cd backend && npx prisma migrate dev --name phase-{N}
```
If any model changes exist, this will generate the migration SQL.
If no model changes, this still runs but produces no migration (verify with `npx prisma migrate status`).

### 2. Verify Build
```bash
cd backend && npx --no-install tsc --noEmit && cd ../frontend && npx --no-install tsc --noEmit && npx vite build
```

### 3. Infrastructure Checks
- [ ] `backend/.env.example` — add any new env vars introduced in this phase
- [ ] `docker-compose.yml` — update if new services/ports needed
- [ ] `.github/workflows/` — update CI/CD if needed
- [ ] SEED data — update if new models need base data for dev/testing

### 4. Startup Verification
```bash
cd backend && npm run dev
```
Start backend and verify it boots without errors (run for 5 seconds, then kill).

### 5. Migration Rollback Check
```bash
cd backend && npx prisma migrate reset --force
```
Verify fresh DB setup works (this drops and recreates everything).

## Return
- Migration name and status (applied successfully?)
- Build verification result (pass/fail for each step)
- Any changes to infra files (with specific changes)
- Backend startup verification (pass/fail)
- Migration rollback verification (pass/fail)
- Any issues found
