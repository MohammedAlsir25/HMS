# HMS

[![CI](https://github.com/MohammedAlsir25/HMS/actions/workflows/ci.yml/badge.svg)](https://github.com/MohammedAlsir25/HMS/actions/workflows/ci.yml)

Hospital management system — a multi-tenant SaaS platform by **Tass.co** for managing reception, clinics, surgery, referrals, lab, pharmacy, optics, inventory, accounting, HR, insurance, emergency, patient portal, FHIR R4 interoperability, and more.

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Backend** | Node.js 20+, Express 4, TypeScript 6 (strict: true), Prisma 5, PostgreSQL 16, Redis 7, BullMQ |
| **Frontend** | React 18, Vite, Tailwind CSS 4, TanStack Query v5, Zustand, i18next (en/ar), Vitest, Playwright |
| **Desktop** | Tauri v2 (EXE/APK), Capacitor (Android), offline-first sync via IndexedDB |
| **Testing** | Jest (backend), Vitest (frontend), Playwright (E2E), Supertest (API) |
| **Infrastructure** | Docker Compose, Caddy (reverse proxy + auto HTTPS), PgBouncer, Railway, Netlify, GitHub Actions CI |

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Supabase account (for file storage)

### Quick Start (Development)

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit .env with your PostgreSQL connection string and Supabase keys

# Database
cd backend
npx prisma migrate dev
npm run prisma:seed

# Start development (two terminals)
cd backend && npm run dev          # Express API on :4001
cd frontend && npm run dev         # Vite dev server on :5173
```

### Quick Start (Docker — Production)

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
# Edit .env with your database URL, JWT secrets, and Supabase keys

# 2. Start all services
docker compose up -d

# 3. Run database migrations
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed

# 4. Access the application
# Frontend: https://your-domain.com
# API:      https://your-domain.com/api
# Caddy automatically provisions TLS via Let's Encrypt
```

See [docs/deploy.md](docs/deploy.md) for full deployment instructions.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌───────────┐
│   Frontend   │────▶│   Backend    │────▶│ PostgreSQL│
│  React + Vite│     │  Express API │     │  + Prisma │
│  :5173       │     │  :4001       │     │  :5432    │
└──────────────┘     └──────┬───────┘     └───────────┘
                            │
                     ┌──────┴───────┐
                     │   Supabase   │
                     │ File Storage │
                     └──────────────┘
```

### Backend Structure

```
backend/
├── src/
│   ├── modules/          # Domain modules (one per bounded context)
│   │   ├── auth/         # JWT auth, refresh tokens, rate limiting
│   │   ├── patients/     # CRUD, search, file upload/download, merge
│   │   ├── appointments/ # Status & priority management, reminders
│   │   ├── reception/    # Check-in, queue, reservations, waiting room
│   │   ├── clinics/      # Clinical records, queue, dashboards, templates
│   │   ├── surgery/      # Surgery scheduling, Gantt, preoperative
│   │   ├── referral/     # Internal/external referrals
│   │   ├── lab/          # Test catalog, orders, results, sample tracking
│   │   ├── pos/          # Pharmacy POS + Optics POS
│   │   ├── inventory/    # Stock management, low-stock alerts, barcode
│   │   ├── accounting/   # Journal, invoices, AR aging, fixed assets, cost centers
│   │   ├── hr/           # Employees, payroll, attendance, leaves, shifts
│   │   ├── admin/        # User & role management, hospital CRUD
│   │   ├── ai/           # AI diagnosis (Gemini API + mock)
│   │   ├── departments/  # Department CRUD
│   │   ├── billing/      # Tap payments, multi-currency, Arabic PDF templates
│   │   ├── emergency/    # Triage (ESI 5-level), rapid registration, dashboard
│   │   ├── fhir/         # FHIR R4 resources, C-CDA, inbound handler
│   │   ├── insurance/    # Companies, policies, claims, pre-auth, COB, denials
│   │   ├── modality/     # DICOM worklist stubs
│   │   ├── patient-portal/ # Patient auth, appointments, records, billing
│   │   ├── pharmacy/     # Pharmacy dashboard
│   │   ├── preoperative/ # Preop requests, consent, scheduling
│   │   ├── procurement/  # Purchase orders, requisitions, cost centers
│   │   ├── reports/      # Revenue, patient, occupancy, lab, surgery, HR reports
│   │   └── sync/         # Offline-first sync engine
│   ├── workers/          # BullMQ background jobs (statements, denials, payment plans)
│   ├── middleware/        # auth, rbac, validate, auditLog, tenant, errorHandler
│   ├── config/           # Env config, CORS, Redis, constants
│   ├── schemas/          # Zod validation schemas
│   ├── utils/            # errors, audit, encryption, name parser
│   ├── lib/              # Prisma singleton
│   └── types/            # Express type augmentations
├── prisma/
│   ├── schema.prisma     # Full data model (93 models, 44 enums)
│   └── migrations/       # Migration history
└── tests/                # 32 test files (integration + unit)
```

### Frontend Structure

```
frontend/
├── src/
│   ├── features/         # Feature modules mirroring backend modules
│   ├── components/       # Shared UI components
│   ├── hooks/            # TanStack Query hooks
│   ├── lib/              # API client, i18n, utils
│   └── ...
└── e2e/                  # Playwright smoke tests
```

## Modules

| Module | Route Prefix | Auth | Description |
|--------|-------------|------|-------------|
| Auth | `/api/auth` | Public + JWT | Login, refresh, profile |
| Patients | `/api/patients` | Required | CRUD, search, duplicate detection, merge |
| Appointments | `/api/appointments` | Required | Calendar, status transitions, reminders |
| Reception | `/api/reception` | Required | Check-in, queue, waiting room, lab payments |
| Clinics | `/api/clinics` | Required | Clinical records, vitals, templates, queue dashboards |
| Surgery | `/api/surgery` | Required | Scheduling, Gantt, preoperative, discharge |
| Referrals | `/api/referrals` | Required | Internal/external, pharmacy/lab dispatch |
| Lab | `/api/lab` | Required | Tests, categories, orders, results, sample tracking |
| POS | `/api/pos` | Required | Pharmacy + Optics transactions, shifts |
| Inventory | `/api/inventory` | Required | Items, categories, stock alerts, barcode |
| Accounting | `/api/accounting` | Required | Journal, invoices, AR aging, fixed assets, cost centers |
| HR | `/api/hr` | Required | Employees, payroll, attendance, leaves, shifts |
| Admin | `/api/admin` | Admin | Users, roles, permissions, hospital CRUD |
| AI | `/api/ai` | Required | Diagnosis suggestions (Gemini/mock) |
| Departments | `/api/departments` | Required | Lookup |
| Billing | `/api/billing` | Required | Tap payments, multi-currency, Arabic PDF templates |
| Emergency | `/api/emergency` | Required | Triage (ESI 5-level), rapid registration, dashboard |
| FHIR | `/api/fhir/R4` | FHIR Auth | FHIR R4 resources, C-CDA, inbound handler |
| Insurance | `/api/insurance` | Required | Companies, policies, claims, pre-auth, COB, denials |
| Modality | `/api/modality` | Required | DICOM worklist stubs |
| Patient Portal | `/api/portal` | Patient JWT | Patient auth, appointments, records, billing |
| Pharmacy | `/api/pharmacy` | Required | Pharmacy dashboard |
| Preoperative | `/api/preoperative` | Required | Preop requests, consent, scheduling |
| Procurement | `/api/procurement` | Required | Purchase orders, requisitions, cost centers |
| Reports | `/api/reports` | Required | Revenue, patient, occupancy, lab, surgery, HR reports |
| Sync | `/api/sync` | Required | Offline-first sync engine |

## API Reference

- **Base URL:** `http://localhost:4001/api`
- **Auth:** JWT Bearer token in `Authorization` header
- **Error format:** `{ message: string; details?: Record<string, unknown> }`
- **HTTP codes:** 200 (ok), 201 (created), 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limit), 500 (server error)

### Authentication

```
POST /api/auth/login      { email, password } → { token, refreshToken }
POST /api/auth/refresh    { refreshToken }    → { token, refreshToken }
GET  /api/auth/me         → { id, email, role, permissions, ... }
```

### Key Endpoints

See individual route files in `src/modules/*/*.routes.ts` for full endpoint listings.

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/jawarih

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Supabase (file storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET=hospital-files

# Gemini AI
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash

# Server
PORT=4001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Scripts

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with `tsx watch` |
| `npm test` | Run all test suites |
| `npm run test:ci` | CI-optimized test run (single worker) |
| `npm run test:coverage` | Tests with coverage report |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm run prisma:seed` | Seed database with sample data |
| `npm run lint` | ESLint |
| `npm run backup` | Run database backup (see `scripts/backup.sh`) |
| `npm run restore` | Restore database from backup (see `scripts/restore.sh`) |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run test:ci` | CI-optimized test run |
| `npm run test:coverage` | Tests with coverage report |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright E2E (requires running server) |

## Database

### Models (93) · Enums (44)

See `backend/prisma/schema.prisma` for the full data model including: User, Patient, PatientFile, Appointment, ClinicalRecord, Symptom, Medication, Surgery, Referral, LabSample, LabOrder, LabResult, InventoryItem, Transaction, Expense, Employee, Payroll, Attendance, Leave, Role, InsuranceCompany, InsurancePolicy, PreAuthorization, InsuranceClaim, InsuranceSettlement, FhirEndpoint, TriageAssessment, PaymentPlan, PaymentInstallment, CreditMemo, Refund, BadDebtWriteOff, DenialAppeal, ClinicalTemplate, and 59 more.

### Migrations

```bash
cd backend
npx prisma migrate dev          # Apply pending migrations
npx prisma migrate dev --name description  # Create new migration
npm run prisma:seed             # Seed data
```

## Testing

```bash
# Backend (requires running PostgreSQL)
cd backend && npm test
# Individual test: npx jest tests/auth.test.js

# Frontend
cd frontend && npm test

# E2E (requires backend + frontend running)
cd frontend && npm run test:e2e

# Stress
cd backend && npm run test:stress
```

### Test Suite Overview (Backend)

| Test Suite | Type | Description |
|-----------|------|-------------|
| auth | Unit | Login, refresh, rate limiting |
| middleware | Unit | Auth, RBAC, audit logging |
| validate | Unit | Zod schema validation |
| errors | Unit | Error classes + handler |
| encryption | Unit | Encryption utilities |
| schemas | Unit | Zod schema correctness |
| patients | Integration | CRUD, search, file upload |
| appointments | Integration | Status, priority |
| reception | Integration | Check-in, queue, payment |
| clinics | Integration | Queue, clinical records |
| surgery | Integration | Scheduling |
| referral | Integration | Referrals, lab dispatch |
| lab | Integration | Tests, orders, results |
| pos | Integration | Pharmacy, optics, shifts |
| inventory | Integration | Stock, categories |
| accounting | Integration | Expenses, transactions |
| hr | Integration | Employees, payroll |
| admin | Integration | Users, roles |
| rbac | Integration | Permission checks |
| stress | Performance | 100 rapid + 50 concurrent |
| security-scan | Security | Rate limiting, error info leak |

## CI/CD

GitHub Actions runs on push/PR to `main` via `.github/workflows/ci.yml`:

- **Backend:** lint → typecheck → test
- **Frontend:** lint → typecheck → test → build

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `tsc` errors after pull | `cd backend && npm install && npx prisma generate` |
| Database connection failed | Check `DATABASE_URL` in `.env`, ensure PostgreSQL is running |
| `@prisma/client` not found | `cd backend && npx prisma generate` |
| File upload fails | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env` |
| Frontend can't reach API | Check `VITE_API_URL` in `frontend/.env`, backend is running |
| E2E tests fail | Start backend + frontend first, then `npm run test:e2e` |
