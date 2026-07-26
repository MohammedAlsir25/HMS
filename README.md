# HMS

[![Backend CI](https://github.com/moham/AL-Jawahir-Hospital/actions/workflows/backend.yml/badge.svg)](https://github.com/moham/AL-Jawahir-Hospital/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/moham/AL-Jawahir-Hospital/actions/workflows/frontend.yml/badge.svg)](https://github.com/moham/AL-Jawahir-Hospital/actions/workflows/frontend.yml)

Hospital management system — reception, clinics, surgery, referrals, lab, pharmacy, optics, inventory, accounting, HR, and AI-powered diagnosis support.

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Backend** | Node.js 20+, Express 4, TypeScript 5 (strict: true), Prisma 5, PostgreSQL 16, Supabase |
| **Frontend** | React 18, Vite, Tailwind CSS 4, TypeScript, TanStack Query, Zustand, i18next, Vitest, Playwright |
| **Testing** | Jest (backend unit), Vitest (frontend unit), Playwright (E2E), Supertest (API), custom stress test |
| **Infrastructure** | Docker Compose, Caddy (reverse proxy + auto HTTPS), Railway (backend), Netlify (frontend), GitHub Actions (CI/CD) |

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
│   │   ├── patients/     # CRUD, file upload/download via Supabase
│   │   ├── appointments/ # Status & priority management
│   │   ├── reception/    # Check-in, queue, reservations, waiting room
│   │   ├── clinics/      # Clinical records, queue, dashboards
│   │   ├── surgery/      # Surgery scheduling
│   │   ├── referral/     # Internal/external referrals
│   │   ├── lab/          # Test catalog, orders, results
│   │   ├── pos/          # Pharmacy POS + Optics POS
│   │   ├── inventory/    # Stock management, low-stock alerts
│   │   ├── accounting/   # Shift management, expense tracking
│   │   ├── hr/           # Employees, payroll, attendance, leaves
│   │   ├── admin/        # User & role management
│   │   ├── ai/           # AI diagnosis (Gemini API + mock)
│   │   ├── departments/  # Department CRUD
│   │   └── users/        # User profile & lookup
│   ├── middleware/        # auth, rbac, validate, auditLog, errorHandler
│   ├── config/           # Env config, CORS, constants
│   ├── schemas/          # Zod validation schemas
│   ├── utils/            # errors, audit, encryption, supabase client
│   ├── lib/              # Prisma singleton
│   └── types/            # Express type augmentations
├── prisma/
│   ├── schema.prisma     # Full data model (19 models, 19 enums)
│   └── migrations/       # Migration history
└── tests/                # 21 test suites (198 tests + stress)
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
| Patients | `/api/patients` | Required | CRUD, search, file upload/download |
| Appointments | `/api/appointments` | Required | Status transitions, priority |
| Reception | `/api/reception` | Required | Check-in, queue, waiting room |
| Clinics | `/api/clinics` | Required | Clinical records, vitals, queue dashboards |
| Surgery | `/api/surgery` | Required | Scheduling |
| Referrals | `/api/referrals` | Required | Internal/external, pharmacy/lab dispatch |
| Lab | `/api/lab` | Required | Tests, categories, orders, results |
| POS | `/api/pos` | Required | Pharmacy + Optics transactions, shifts |
| Inventory | `/api/inventory` | Required | Items, categories, stock alerts |
| Accounting | `/api/accounting` | Required | Expenses, shifts, reports |
| HR | `/api/hr` | Required | Employees, payroll, attendance |
| Admin | `/api/admin` | Admin | Users, roles, permissions |
| AI | `/api/ai` | Required | Diagnosis suggestions (Gemini/mock) |
| Departments | `/api/departments` | Required | Lookup |

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
| `npm test` | Run all 21 test suites + stress |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm run test:stress` | 100 rapid + 50 concurrent request test |
| `npm run prisma:seed` | Seed database with sample data |
| `npm run lint` | ESLint |
| `npm run backup` | Run database backup (see `scripts/backup.sh`) |
| `npm run restore` | Restore database from backup (see `scripts/restore.sh`) |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright E2E (requires running server) |

## Database

### Models (19)

User, Patient, PatientFile, Apppointment, ClinicAppointment, ClinicalRecord, Symptom, Medication, Surgery, Referral, ReferralMedication, DiagnosticOrder, DiagnosticTest, DiagnosticOrderTest, InventoryItem, InventoryTransaction, Transaction, Expense, Shift, Department, AuditLog, Employee, Payroll, Attendance, Leave, Role

### Enums (19)

ClinicType, DepartmentType, ExpenseCategory, DiabetesType, AppointmentType, AppointmentStatus, VisitType, ReferralType, ReferralStatus, SurgeryStatus, TransactionType, PaymentMethod, DiagnosticOrderType, DiagnosticOrderStatus, ResultFlag, PayrollStatus, AttendanceStatus, LeaveType, LeaveStatus

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
- **Frontend:** lint → typecheck → build

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `tsc` errors after pull | `cd backend && npm install && npx prisma generate` |
| Database connection failed | Check `DATABASE_URL` in `.env`, ensure PostgreSQL is running |
| `@prisma/client` not found | `cd backend && npx prisma generate` |
| File upload fails | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env` |
| Frontend can't reach API | Check `VITE_API_URL` in `frontend/.env`, backend is running |
| E2E tests fail | Start backend + frontend first, then `npm run test:e2e` |
