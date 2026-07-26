# Phase 17 — Production-Ready Foundation

**Date:** 2026-07-20  
**Status:** Ready for Tech Lead  
**Complexity:** L  
**Estimated Tasks:** 14  

---

## 1. Phase Goal

Turn the current development build into a production-ready system that can be deployed in a clinic in 30 minutes with one command. This means Docker containerization, automated backup/restore, HTTPS out of the box, error boundaries on every page, performance optimization, and complete deploy documentation.

---

## 2. What Already Exists vs What's Needed

| Component | Exists? | Details |
|-----------|---------|---------|
| Backend (Express/TS) | ✅ | `backend/` — runs via `ts-node` or compiled `tsc` |
| Frontend (React/Vite) | ✅ | `frontend/` — runs via `vite dev` or `vite build` |
| Database (PostgreSQL) | ✅ | Prisma schema, Supabase-hosted in dev |
| Docker files | ❌ | No `Dockerfile` in backend or frontend, no `docker-compose.yml` |
| Backup/restore | ❌ | No scripts for pg_dump/pg_restore |
| HTTPS/SSL | ❌ | Dev only (localhost) |
| Global ErrorBoundary | ❌ | No React ErrorBoundary wrapping the app |
| Per-page error states | ⚠️ | Some pages have try/catch, most just crash silently |
| Loading states | ⚠️ | ~60% of pages have basic loading indicators, no Skeleton pattern on many |
| Empty states | ⚠️ | Inconsistent — some pages show "No data" text, many show nothing |
| N+1 query audit | ❌ | Not done — likely many pages have N+1 in the nested includes |
| DB indexes | ⚠️ | `@@index` on most FK columns, but query-pattern-specific indexes missing |
| Connection pooling | ❌ | Prisma direct connection — no PgBouncer or pooler configured |
| System health dashboard | ❌ | No admin page showing DB health, queue depth, active users |
| PDF/export | ⚠️ | 7 files have `@media print`, many pages still missing print styles |
| Environment config | ⚠️ | `.env` files exist per environment, no `.env.example` or startup validation |
| Deploy documentation | ❌ | No README deploy section, no architecture diagram |
| CI/CD | ❌ | No GitHub Actions or deploy pipeline |

---

## 3. Gap Analysis

### Critical Gaps
1. **No Docker setup** — cannot deploy to any server without manually installing Node, Postgres, configuring env vars
2. **No backup/restore** — first production crash = permanent data loss
3. **No HTTPS** — browsers block PWAs, camera access, notifications on HTTP
4. **No ErrorBoundary** — a single unhandled React error = white screen of death for the user
5. **No system health dashboard** — no way to know if the app is running, DB is connected, backups are recent

### Major Gaps
6. **Inconsistent loading/empty/error states** — professional apps handle all 3 on every page
7. **Performance not optimized** — likely N+1 queries and missing indexes will cause slow pages at clinic scale
8. **No print CSS on many pages** — hospitals print everything (prescriptions, lab reports, invoices)
9. **No deploy documentation** — a clinic IT person can't set this up without step-by-step instructions
10. **No environment validation** — startup crashes with unhelpful errors if env vars are missing

---

## 4. Tasks

| # | Task | File Paths | Complexity | Dependencies | Owner |
|---|------|-----------|------------|--------------|-------|
| 1 | Create `Dockerfile` for backend (multi-stage: build + prod) | `backend/Dockerfile` | M | None | DevOps |
| 2 | Create `Dockerfile` for frontend (nginx static serve) | `frontend/Dockerfile`, `frontend/nginx.conf` | M | None | DevOps |
| 3 | Create `docker-compose.yml` with backend + frontend + postgres + pgadmin | `docker-compose.yml` | L | Tasks 1, 2 | DevOps |
| 4 | Create backup/restore scripts (pg_dump + automated rotation) | `scripts/backup.sh`, `scripts/restore.sh`, `scripts/backup-schedule.sh` | M | Task 3 | DevOps |
| 5 | Add HTTPS with Caddy reverse proxy (auto Let's Encrypt) | `docker-compose.yml`, `Caddyfile` | M | Task 3 | DevOps |
| 6 | Add React ErrorBoundary wrapper + per-page error states | `frontend/src/components/ui/ErrorBoundary.jsx`, update `App.jsx`, audit all page components | XL | None | Sr Dev |
| 7 | Audit and fix loading/empty/error states on every page | All ~60 page components across `frontend/src/features/` | XL | Task 6 | Jr Dev |
| 8 | Performance audit: identify N+1 queries, add missing indexes, configure PgBouncer | `backend/prisma/schema.prisma` (indexes), backend route files, `docker-compose.yml` | L | None | Sr Dev |
| 9 | Add print CSS styles for all pages missing them (prescriptions, lab reports, invoices, insurance, HR payslips, emergency, preop) | Multiple feature files | M | None | Jr Dev |
| 10 | Build system health admin dashboard (DB status, queue depth, active users, disk usage, last backup) | `frontend/src/features/admin/SystemHealth.jsx`, backend endpoint | M | Task 8 | Sr Dev |
| 11 | Add environment config validation on startup (required vars, DB connection test) | `backend/src/config/index.ts` | S | None | Jr Dev |
| 12 | Write deploy documentation: README, architecture diagram, env config reference, deploy checklist | `README.md`, `docs/deploy.md` | M | Tasks 1–10 | DevOps |
| 13 | Set up GitHub Actions CI (lint → typecheck → build → test) | `.github/workflows/ci.yml` | M | None | DevOps |
| 14 | Run `npm run lint`, `tsc --noEmit` on both backend and frontend | — | S | All above | QA |

---

## 5. Acceptance Criteria

- [ ] `docker-compose up` starts the full stack (backend, frontend, Postgres) and is accessible at `https://localhost`
- [ ] Caddy auto-provisions Let's Encrypt SSL for a real domain
- [ ] `scripts/backup.sh` creates a timestamped pg_dump; `scripts/restore.sh` restores from any backup file
- [ ] Backup rotation keeps last 7 daily + 4 weekly backups, auto-cleanup old ones
- [ ] Global ErrorBoundary catches React errors and shows a "Something went wrong" page with reload button
- [ ] Every page has a loading state (Skeleton pattern), empty state ("No X found"), and error state (retry button)
- [ ] Performance baseline: all API pages respond in <200ms for realistic dataset (1000 patients, 5000 appointments, 2000 lab orders)
- [ ] Missing indexes added for all common query patterns (date range filters, status filters, hospitalId + type combined)
- [ ] Print CSS renders clean pages for: prescriptions, lab reports, invoices, insurance claims, HR payslips, surgery reports, emergency triage forms, preoperative checklists
- [ ] System health page at `/admin/system` shows: DB connection status, active users (last 15 min), pending queue items, disk usage, last backup timestamp
- [ ] Backend exits with clear error message on startup if any required env var is missing
- [ ] `README.md` has: deploy requirements, step-by-step setup, env var table, architecture diagram (ASCII or Mermaid)
- [ ] GitHub Actions CI passes: lint → typecheck → build
- [ ] `npm run lint` zero errors, `tsc --noEmit` zero errors on both projects

---

## 6. Work Split

### Sr Dev (Complex / Architectural)
- Task 6: ErrorBoundary + per-page error architecture
- Task 8: Performance audit (N+1, indexes, PgBouncer)
- Task 10: System health dashboard (backend endpoint + frontend page)

### Jr Dev (UI / Scripting / Repetitive)
- Task 7: Loading/empty/error states audit on all 60 pages
- Task 9: Print CSS for missing pages
- Task 11: Environment config validation
- Task 14: Lint + typecheck

### DevOps
- Task 1: Backend Dockerfile
- Task 2: Frontend Dockerfile
- Task 3: docker-compose.yml
- Task 4: Backup/restore scripts
- Task 5: Caddy HTTPS proxy
- Task 12: Deploy documentation
- Task 13: GitHub Actions CI

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Docker image too large (>1GB) | Medium — slow deploys | Medium | Multi-stage build: dev deps in build stage, only prod deps in final image |
| Prisma client generation fails in Docker | High — app won't start | Low | Run `prisma generate` in Docker build step; pin prisma version |
| Backup script fails silently on cron | High — data loss assumed safe | Medium | Add backup verification step (restore test to temp DB); alert on failure |
| Loading state audit is too large for solo dev | Medium — phase takes too long | High | Split into 3 sub-PRs: (a) core pages, (b) clinical pages, (c) admin/reports |
| Per-page error states conflict with existing business logic | Medium — retry logic breaks workflows | Low | Error states are purely UI wrappers; no business logic changes |
| No clinic actually tests deployment | High — unknown gaps | High | Deploy to a free-tier VPS (Oracle Cloud free, DigitalOcean $6) and run through the deploy checklist end-to-end |

---

**Estimated Complexity:** L  
**Total Tasks:** 14  
**Estimated Duration:** 3–4 sprints  
**Focus Roles:** DevOps, Sr Dev, Jr Dev  
**Next Phase:** Phase 18 — Interoperability (HL7/FHIR)
