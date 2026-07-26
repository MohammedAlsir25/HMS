# Technical Requirements Document (TRD)
## Hospital Management System (HMS)

**Version:** 1.0  
**Date:** 2026-07-16  
**Status:** Draft

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack & Justification](#2-technology-stack--justification)
3. [Security Architecture](#3-security-architecture)
4. [Database Design Principles](#4-database-design-principles)
5. [API Design Conventions](#5-api-design-conventions)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Desktop App Architecture](#7-desktop-app-architecture)
8. [Authentication & Authorization Flow](#8-authentication--authorization-flow)
9. [Multi-tenancy Implementation](#9-multi-tenancy-implementation)
10. [Internationalization Strategy](#10-internationalization-strategy)
11. [Testing Strategy](#11-testing-strategy)
12. [CI/CD Pipeline](#12-cicd-pipeline)
13. [Performance Targets](#13-performance-targets)
14. [Monitoring & Observability](#14-monitoring--observability)
15. [Deployment Architecture](#15-deployment-architecture)

---

## 1. System Architecture Overview

HMS is a multi-tenant SaaS Hospital Management System delivered as both a web application and a desktop application (via Tauri v2). The system follows a modular monorepo architecture with clear separation of concerns.

### High-Level Architecture Diagram

```
+-------------------------------------------------------------------+
|                          CLIENTS                                    |
+---------------------------------+-----------------------------------+
|   Web App (React SPA)           |   Desktop App (Tauri v2)         |
|   - Vite 5 build                |   - Rust core                    |
|   - Tailwind CSS 4              |   - Same React frontend          |
|   - React Router 6              |   - Local file system access     |
|   - Zustand + RQ                |   - Updater plugin               |
|   - i18next                     |   - CSP null policy              |
+-----------------+---------------+-----------------+-----------------+
                  |                                 |
                  v                                 v
+-------------------------------------------------------------------+
|                        API LAYER                                    |
|                Express.js + TypeScript                              |
|  +-------------------------------------------------------------+  |
|  |  JWT Auth -> RBAC Middleware -> Rate Limiter                 |  |
|  |  -> Validation (Zod) -> Controller -> Service -> Prisma     |  |
|  +-------------------------------------------------------------+  |
+---------------------------+-----------------------------------------+
                            |
                            v
+-------------------------------------------------------------------+
|                        DATA LAYER                                   |
|  +-----------------+  +-----------------+  +-----------------+    |
|  |   PostgreSQL     |  |   Supabase      |  |  File Store     |    |
|  |   (via Supabase) |  |   Auth/Storage  |  |  uploads/       |    |
|  |   + Prisma ORM   |  |   (optional)    |  |                 |    |
|  +-----------------+  +-----------------+  +-----------------+    |
+-------------------------------------------------------------------+
```

### Monorepo Structure

```
hms/
  frontend/                    # React SPA (Vite 5)
    src/
      features/                # Feature-based modules
        auth/
        patients/
        appointments/
        clinical/
        laboratory/
        imaging/
        pharmacy/
        billing/
        inventory/
        hr/
        admissions/
        surgery/
        insurance/
        settings/
      components/              # Shared UI components
        ui/                    # Base UI primitives
        layout/                # Layout components
        shared/                # Domain-specific shared
      lib/                     # Utilities, API client, hooks
      stores/                  # Zustand stores
      hooks/                   # Custom React hooks
      i18n/                    # i18next config + translations
      routes/                  # React Router config
      types/                   # Shared TypeScript types
      App.tsx
      main.tsx
    public/
    index.html
    vite.config.ts
    tailwind.config.ts
    tsconfig.json
    package.json

  backend/                     # Express.js API
    src/
      modules/                 # Feature modules
        auth/
          auth.routes.ts
          auth.controller.ts
          auth.service.ts
          auth.helpers.ts
          auth.validation.ts
          auth.types.ts
        patients/
          patient.routes.ts
          patient.controller.ts
          patient.service.ts
          patient.helpers.ts
          patient.validation.ts
          patient.types.ts
        appointments/
        clinical/
        laboratory/
        imaging/
        pharmacy/
        billing/
        inventory/
        hr/
        admissions/
        surgery/
        insurance/
        settings/
      middleware/               # Auth, RBAC, rate-limit, validation
      lib/                     # Prisma client, utils, helpers
      config/                  # Environment config
      types/                   # Shared types
      index.ts                 # Entry point
    prisma/
      schema.prisma
      migrations/
    uploads/                   # Local file storage
    tsconfig.json
    package.json

  shared/                      # Shared types, constants, utilities
    types/
    constants/
    utils/

  desktop/                     # Tauri v2 desktop wrapper
    src-tauri/
      Cargo.toml
      tauri.conf.json
      src/
    package.json

  docs/                        # Documentation
  docker-compose.yml
  package.json                 # Root workspace config
  pnpm-workspace.yaml
```

### Module Pattern (Backend)

Each feature module follows a consistent structure:

```
modules/
  {feature}/
    {feature}.routes.ts         # Route definitions
    {feature}.controller.ts     # Request/response handling
    {feature}.service.ts        # Business logic
    {feature}.helpers.ts        # Utility functions
    {feature}.validation.ts     # Zod schemas
    {feature}.types.ts          # TypeScript interfaces
```

---

## 2. Technology Stack & Justification

### Frontend

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| React | 18.x | UI library | Concurrent features, mature ecosystem, wide adoption |
| Vite | 5.x | Bundler/dev server | Fast HMR, native ESM, optimized builds via Rollup |
| Tailwind CSS | 4.x | Utility-first CSS | Rapid UI development, consistent design system |
| React Router | 6.x | Client-side routing | Declarative routing, nested routes, data loaders |
| Zustand | Latest | Client state management | Minimal boilerplate, no providers needed, TypeScript-first |
| TanStack React Query | Latest | Server state management | Caching, background refetching, optimistic updates |
| i18next | Latest | Internationalization | Mature i18n, pluralization, nesting, RTL support |
| Motion | Latest | UI animations | React-native animation API, layout animations |
| GSAP | Latest | Complex animations | Timeline control, scroll triggers, high performance |
| Shepherd.js | Latest | User tours/onboarding | Lightweight guided tours, step-based navigation |
| three.js | Latest | 3D visualizations | Medical imaging previews, interactive 3D models |

### Backend

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Node.js | 20.x LTS | Runtime | Event-driven, excellent ecosystem, long-term support |
| Express.js | 4.x | HTTP framework | Minimal, flexible, well-documented |
| TypeScript | 5.x | Type safety | Compile-time error catching, better DX |
| Prisma ORM | Latest | Database access | Type-safe queries, migrations, schema management |
| PostgreSQL | 16.x | Database | ACID compliance, JSON support, full-text search |
| Supabase | Latest | Database hosting | Managed PostgreSQL, auth, storage, real-time |
| bcrypt | Latest | Password hashing | Industry-standard, salt-based hashing |
| jsonwebtoken | Latest | JWT tokens | Stateless authentication, widely supported |

### Desktop

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Tauri | v2 | Desktop framework | Small binary size, Rust security, web frontend reuse |
| tauri-plugin-updater | Latest | Auto-updates | GitHub releases-based update distribution |
| tauri-plugin-process | Latest | Process management | Graceful shutdown, single instance enforcement |
| tauri-plugin-opener | Latest | System integration | Open files/URLs in default applications |

### Testing & DevOps

| Technology | Purpose |
|------------|---------|
| Vitest | Unit and integration testing |
| Playwright | End-to-end testing (web and desktop) |
| GitHub Actions | CI/CD pipelines |
| Docker | Containerization |
| docker-compose | Local development environment |
| pnpm | Package management (workspace mode) |

---

## 3. Security Architecture

### 3.1 Authentication Security

```
Client --POST /auth/login--> Express
                               |
                               v
                         Rate Limiter
                         (5 req/15min per IP)
                               |
                               v
                         Input Validation
                         (Zod schema)
                               |
                               v
                         bcrypt.compare()
                               |
                               v
                         JWT Sign
                         (access: 15min, refresh: 7d)
                               |
                               v
                         Set-Cookie
                         (httpOnly, secure, sameSite: strict)
```

### 3.2 HTTP Security Headers (Helmet)

Applied globally via Express middleware:

```typescript
helmet({
  contentSecurityPolicy: false,        // Disabled for Tauri compatibility
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true }
})
```

### 3.3 CORS Configuration

```typescript
cors({
  origin: process.env.FRONTEND_URL,   // e.g., http://localhost:5173
  credentials: true,                   // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
```

### 3.4 Rate Limiting

| Endpoint Category | Limit | Window | Key |
|-------------------|-------|--------|-----|
| Auth endpoints (`/auth/*`) | 5 requests | 15 minutes | Per IP |
| General API | 100 requests | 15 minutes | Per user |
| File uploads | 10 requests | 15 minutes | Per user |
| Password reset | 3 requests | 1 hour | Per email |

### 3.5 Input Validation

All API endpoints validate input using Zod schemas before processing:

```typescript
// Validation middleware pattern
const validateBody = (schema: ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: result.error.issues
      }
    });
  }
  req.body = result.data;
  next();
};
```

### 3.6 SQL Injection Prevention

Prisma ORM automatically parameterizes all queries. Raw SQL rules:

```typescript
// CORRECT - Use Prisma.sql template tags
const users = await prisma.$queryRaw`
  SELECT * FROM "User"
  WHERE "hospitalId" = ${hospitalId}
`;

// WRONG - Never use string interpolation
const users = await prisma.$queryRawUnsafe(
  `SELECT * FROM "User" WHERE "hospitalId" = '${hospitalId}'`
);
```

### 3.7 File Upload Security

- Validate file types against allowlist (images, PDFs, documents)
- Enforce size limits: max 10MB per file
- Store files in `uploads/` directory (outside web root)
- Sanitize filenames to prevent path traversal attacks
- In Tauri, files stored in app data directory

### 3.8 Environment Variables

Required:
```
DATABASE_URL=postgresql://...
JWT_SECRET=<random-64-char-hex>
JWT_REFRESH_SECRET=<random-64-char-hex>
FRONTEND_URL=http://localhost:5173
```

Optional:
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
```

---

## 4. Database Design Principles

### 4.1 Naming Conventions

| Element | Convention | Examples |
|---------|------------|----------|
| Tables | PascalCase | `Patient`, `ClinicalRecord`, `LabOrder` |
| Columns | camelCase | `hospitalId`, `createdAt`, `isActive` |
| Enums | PascalCase | `UserRole`, `AppointmentStatus` |
| Primary keys | `id` (UUID) | `id String @id @default(uuid())` |
| Foreign keys | `{relation}Id` | `hospitalId`, `patientId` |
| Timestamps | Standard names | `createdAt`, `updatedAt` |
| Soft deletes | `deletedAt` | Nullable timestamp |
| Multi-tenant | `hospitalId` | On all tenant-specific tables |

### 4.2 Core Schema Design

```prisma
model Hospital {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  settings  Json?
  isActive  Boolean  @default(true)

  users     User[]
  patients  Patient[]
  wards     Ward[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id           String    @id @default(uuid())
  hospitalId   String
  hospital     Hospital  @relation(fields: [hospitalId], references: [id])

  email        String
  passwordHash String
  firstName    String
  lastName     String
  role         UserRole
  permissions  String[]
  isActive     Boolean   @default(true)

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  @@unique([hospitalId, email])
  @@index([hospitalId])
  @@index([email])
}

model Patient {
  id           String    @id @default(uuid())
  hospitalId   String
  hospital     Hospital  @relation(fields: [hospitalId], references: [id])

  mrn          String
  firstName    String
  lastName     String
  dateOfBirth  DateTime
  gender       Gender
  phone        String?
  email        String?
  address      Json?

  appointments     Appointment[]
  clinicalRecords  ClinicalRecord[]
  labOrders        LabOrder[]
  imagingOrders    ImagingOrder[]

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  @@unique([hospitalId, mrn])
  @@index([hospitalId])
  @@index([hospitalId, lastName, firstName])
}

model Appointment {
  id           String    @id @default(uuid())
  hospitalId   String
  hospital     Hospital  @relation(fields: [hospitalId], references: [id])

  patientId    String
  patient      Patient   @relation(fields: [patientId], references: [id])
  doctorId     String
  doctor       User      @relation(fields: [doctorId], references: [id])

  scheduledAt  DateTime
  duration     Int       // minutes
  status       AppointmentStatus
  type         AppointmentType
  visitType    VisitType
  notes        String?

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([hospitalId])
  @@index([hospitalId, doctorId, scheduledAt])
  @@index([hospitalId, patientId])
}
```

### 4.3 Index Strategy

| Index Type | Purpose | Example |
|------------|---------|---------|
| Primary key | Record identification | Automatic (UUID) |
| Foreign key | JOIN performance | `@@index([hospitalId])` |
| Composite multi-tenant | Tenant-scoped queries | `@@unique([hospitalId, mrn])` |
| Search fields | Fast lookups | `@@index([hospitalId, lastName, firstName])` |
| Date fields | Chronological queries | `@@index([hospitalId, scheduledAt])` |
| Status fields | Filtered queries | Index on enum columns |

### 4.4 MRN Generation

Medical Record Numbers follow format `MRN-{YEAR}-{5-digit sequential}` per hospital:

```typescript
// backend/src/modules/patients/patient.helpers.ts
async function generateMRN(hospitalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastPatient = await prisma.patient.findFirst({
    where: {
      hospitalId,
      mrn: { startsWith: `MRN-${year}-` }
    },
    orderBy: { mrn: 'desc' },
    select: { mrn: true }
  });

  let sequence = 1;
  if (lastPatient) {
    const lastSeq = parseInt(lastPatient.mrn.split('-')[2]);
    sequence = lastSeq + 1;
  }

  return `MRN-${year}-${sequence.toString().padStart(5, '0')}`;
}
```

### 4.5 Prisma Middleware (Multi-tenant Filtering)

```typescript
// backend/src/lib/prisma.ts
import { Prisma } from '@prisma/client';

const tenantModels = new Set([
  'Patient', 'Appointment', 'ClinicalRecord', 'VitalSign',
  'Symptom', 'Medication', 'LabOrder', 'LabResult',
  'ImagingOrder', 'ImagingResult', 'PharmacyProduct', 'PharmacyPOS',
  'Inventory', 'Procurement', 'Supplier', 'Ward', 'Bed',
  'Admission', 'Surgery', 'SurgerySchedule', 'Billing',
  'Payment', 'InsuranceClaim', 'Expense', 'Account',
  'HR_Employee', 'Attendance'
]);

const hospitalIdMiddleware: Prisma.Middleware = async (params, next) => {
  if (!tenantModels.has(params.model)) {
    return next(params);
  }

  // Validate hospitalId is present on write operations
  if (['create', 'createMany', 'update', 'updateMany'].includes(params.action)) {
    if (!params.args?.data?.hospitalId) {
      console.warn(`[TENANT] ${params.action} on ${params.model} without hospitalId`);
    }
  }

  return next(params);
};

export const prisma = new PrismaClient().$use(hospitalIdMiddleware);
```

### 4.6 Migration Strategy

- All migrations stored in `prisma/migrations/` and version-controlled
- Development: `prisma migrate dev --name <migration_name>`
- Production: `prisma migrate deploy` (applied via CI/CD)
- Supabase CLI for production migration management
- Never edit applied migrations; create new ones instead

---

## 5. API Design Conventions

### 5.1 URL Structure

Base URL: `/api/v1`

```
Resources:
  GET    /api/v1/patients              # List patients (paginated)
  POST   /api/v1/patients              # Create patient
  GET    /api/v1/patients/:id          # Get patient by ID
  PUT    /api/v1/patients/:id          # Update patient
  DELETE /api/v1/patients/:id          # Soft delete patient

Nested resources:
  GET    /api/v1/patients/:id/appointments
  POST   /api/v1/patients/:id/clinical-records

Special actions:
  POST   /api/v1/patients/:id/assign-mrn
  GET    /api/v1/patients/search?q=term
```

### 5.2 Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
X-Hospital-ID: <hospital_uuid>   # Optional; derived from JWT
```

### 5.3 Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

### 5.4 Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### 5.5 Pagination

```typescript
// Query parameters
interface PaginationParams {
  page?: number;              // Default: 1
  limit?: number;             // Default: 20, Max: 100
  sortBy?: string;            // Default: createdAt
  sortOrder?: 'asc' | 'desc'; // Default: desc
  search?: string;            // Full-text search term
}
```

### 5.6 Module Implementation Pattern

**Route:**
```typescript
// patient.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validation';
import * as controller from './patient.controller';
import { createPatientSchema, updatePatientSchema } from './patient.validation';

const router = Router();

router.use(authenticate);

router.get('/',           authorize('patient:read'),   controller.list);
router.post('/',          authorize('patient:write'),  validateBody(createPatientSchema), controller.create);
router.get('/:id',        authorize('patient:read'),   controller.getById);
router.put('/:id',        authorize('patient:write'),  validateBody(updatePatientSchema), controller.update);
router.delete('/:id',     authorize('patient:delete'), controller.softDelete);

export default router;
```

**Controller:**
```typescript
// patient.controller.ts
import { Request, Response } from 'express';
import * as service from './patient.service';

export const list = async (req: Request, res: Response) => {
  const { hospitalId } = req.user;
  const { page, limit, search } = req.query;

  const result = await service.listPatients(hospitalId, {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    search: search as string
  });

  res.json({ success: true, ...result });
};

export const create = async (req: Request, res: Response) => {
  const { hospitalId } = req.user;
  const patient = await service.createPatient(hospitalId, req.body);
  res.status(201).json({ success: true, data: patient });
};

export const getById = async (req: Request, res: Response) => {
  const { hospitalId } = req.user;
  const { id } = req.params;
  const patient = await service.getPatientById(hospitalId, id);

  if (!patient) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Patient not found' }
    });
  }

  res.json({ success: true, data: patient });
};

export const update = async (req: Request, res: Response) => {
  const { hospitalId } = req.user;
  const { id } = req.params;
  const patient = await service.updatePatient(hospitalId, id, req.body);
  res.json({ success: true, data: patient });
};

export const softDelete = async (req: Request, res: Response) => {
  const { hospitalId } = req.user;
  const { id } = req.params;
  await service.softDeletePatient(hospitalId, id);
  res.status(204).send();
};
```

**Service:**
```typescript
// patient.service.ts
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { generateMRN } from './patient.helpers';

export const createPatient = async (hospitalId: string, data: CreatePatientInput) => {
  const mrn = await generateMRN(hospitalId);

  return prisma.patient.create({
    data: { ...data, hospitalId, mrn }
  });
};

export const listPatients = async (hospitalId: string, params: ListParams) => {
  const { page, limit, search } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.PatientWhereInput = {
    hospitalId,
    deletedAt: null,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { mrn: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.patient.count({ where })
  ]);

  return {
    data: patients,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};

export const getPatientById = async (hospitalId: string, id: string) => {
  return prisma.patient.findFirst({
    where: { id, hospitalId, deletedAt: null },
    include: { appointments: true }
  });
};

export const updatePatient = async (hospitalId: string, id: string, data: UpdatePatientInput) => {
  return prisma.patient.update({
    where: { id, hospitalId },
    data
  });
};

export const softDeletePatient = async (hospitalId: string, id: string) => {
  return prisma.patient.update({
    where: { id, hospitalId },
    data: { deletedAt: new Date() }
  });
};
```

**Validation:**
```typescript
// patient.validation.ts
import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().datetime().or(z.date()),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional()
  }).optional()
});

export const updatePatientSchema = createPatientSchema.partial();
```

---

## 6. Frontend Architecture

### 6.1 Component Tree

```
src/
  components/
    ui/                         # Base UI primitives
      Button.tsx
      Input.tsx
      Select.tsx
      Table.tsx
      Modal.tsx
      Dialog.tsx
      Card.tsx
      Badge.tsx
      Tabs.tsx
      Dropdown.tsx
      Toast.tsx
      Skeleton.tsx
    layout/                     # Layout components
      Sidebar.tsx
      Header.tsx
      Footer.tsx
      PageContainer.tsx
      DashboardLayout.tsx
    shared/                     # Domain-specific shared
      PatientSearch.tsx
      DateRangePicker.tsx
      DataTable.tsx
      FormField.tsx
      PrintButton.tsx
  features/
    auth/
      components/
        LoginForm.tsx
        ForgotPassword.tsx
        AuthGuard.tsx
      hooks/useAuth.ts
      store/authStore.ts
      api/auth.api.ts
      pages/LoginPage.tsx
    patients/
      components/
        PatientList.tsx
        PatientForm.tsx
        PatientDetail.tsx
        PatientSearch.tsx
      hooks/
        usePatients.ts
        usePatient.ts
      api/patients.api.ts
      pages/
        PatientsPage.tsx
        PatientDetailPage.tsx
    appointments/
      ...
    clinical/
      ...
    laboratory/
      ...
    imaging/
      ...
    pharmacy/
      ...
    billing/
      ...
    inventory/
      ...
    hr/
      ...
    admissions/
      ...
    surgery/
      ...
    insurance/
      ...
    settings/
      ...
    dashboard/
      ...
  lib/
    api.ts                      # Axios/fetch configuration
    queryClient.ts              # TanStack Query config
    validators.ts               # Shared Zod schemas
    formatters.ts               # Date, currency formatters
    constants.ts                # App constants
  hooks/
    useDebounce.ts
    useLocalStorage.ts
    useMediaQuery.ts
  stores/
    authStore.ts
    themeStore.ts
    uiStore.ts
  i18n/
    index.ts
    locales/
      en/translation.json
      ar/translation.json
  routes/
    index.tsx
    protected.tsx
    routes.tsx
  types/
    api.ts
    models.ts
    index.ts
  App.tsx
  main.tsx
```

### 6.2 State Management

**Client State (Zustand):**

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const response = await authApi.login(credentials);
        set({
          user: response.user,
          token: response.accessToken,
          refreshToken: response.refreshToken,
          isAuthenticated: true
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const response = await authApi.refresh(refreshToken);
        set({
          token: response.accessToken,
          refreshToken: response.refreshToken
        });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user
      })
    }
  )
);
```

**Server State (TanStack React Query):**

```typescript
// features/patients/hooks/usePatients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as patientsApi from '../api/patients.api';

export const usePatients = (params: ListPatientsParams) => {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => patientsApi.list(params),
    staleTime: 30_000,
    keepPreviousData: true
  });
};

export const usePatient = (id: string) => {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id),
    enabled: !!id
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => patientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients', variables.id] });
    }
  });
};
```

### 6.3 Routing

```typescript
// routes/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AuthGuard } from '../features/auth/components/AuthGuard';
import { lazy, Suspense } from 'react';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const PatientsPage = lazy(() => import('../features/patients/pages/PatientsPage'));
const PatientDetailPage = lazy(() => import('../features/patients/pages/PatientDetailPage'));
const AppointmentsPage = lazy(() => import('../features/appointments/pages/AppointmentsPage'));
const ClinicalPage = lazy(() => import('../features/clinical/pages/ClinicalPage'));
const LaboratoryPage = lazy(() => import('../features/laboratory/pages/LaboratoryPage'));
const ImagingPage = lazy(() => import('../features/imaging/pages/ImagingPage'));
const PharmacyPage = lazy(() => import('../features/pharmacy/pages/PharmacyPage'));
const BillingPage = lazy(() => import('../features/billing/pages/BillingPage'));
const InventoryPage = lazy(() => import('../features/inventory/pages/InventoryPage'));
const HRPage = lazy(() => import('../features/hr/pages/HRPage'));
const AdmissionsPage = lazy(() => import('../features/admissions/pages/AdmissionsPage'));
const SurgeryPage = lazy(() => import('../features/surgery/pages/SurgeryPage'));
const InsurancePage = lazy(() => import('../features/insurance/pages/InsurancePage'));
const SettingsPage = lazy(() => import('../features/settings/pages/SettingsPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'patients', element: <PatientsPage /> },
      { path: 'patients/:id', element: <PatientDetailPage /> },
      { path: 'appointments', element: <AppointmentsPage /> },
      { path: 'clinical', element: <ClinicalPage /> },
      { path: 'laboratory', element: <LaboratoryPage /> },
      { path: 'imaging', element: <ImagingPage /> },
      { path: 'pharmacy', element: <PharmacyPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'hr', element: <HRPage /> },
      { path: 'admissions', element: <AdmissionsPage /> },
      { path: 'surgery', element: <SurgeryPage /> },
      { path: 'insurance', element: <InsurancePage /> },
      { path: 'settings', element: <SettingsPage /> }
    ]
  }
]);
```

### 6.4 API Client

```typescript
// lib/api.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await useAuthStore.getState().refreshAccessToken();
        const newToken = useAuthStore.getState().token;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 7. Desktop App Architecture

### 7.1 Tauri v2 Configuration

```json
{
  "productName": "HMS Desktop",
  "version": "1.0.0",
  "identifier": "com.hms.desktop",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "title": "HMS Desktop",
    "windows": [
      {
        "title": "HMS Desktop",
        "width": 1400,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 680,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msis", "nsis", "dmg", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIG1lc3NhZ2Ugc2lnbmF0dXJlIGtleQ==",
      "endpoints": [
        "https://github.com/hms-desktop/releases/latest/download/latest.json"
      ],
      "windows": { "installerType": "nsis" }
    },
    "process": { "singleInstance": true },
    "opener": { "openUrl": true }
  }
}
```

### 7.2 Rust Backend

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data dir");
            let uploads_dir = app_data_dir.join("uploads");
            std::fs::create_dir_all(&uploads_dir)
                .expect("Failed to create uploads dir");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            open_file_dialog,
            save_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> String {
    app.path().app_data_dir()
        .expect("Failed to get app data dir")
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
fn open_file_dialog(app: tauri::AppHandle) -> Result<String, String> {
    Ok(String::new())
}

#[tauri::command]
fn save_file(app: tauri::AppHandle, content: Vec<u8>, path: String) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .expect("Failed to get app data dir");
    let file_path = app_data_dir.join(&path);
    std::fs::write(&file_path, &content).map_err(|e| e.to_string())?;
    Ok(())
}
```

### 7.3 Desktop-Specific Features

1. **File System Access**: Uploads stored in OS app data directory
2. **Auto-Updater**: Checks GitHub releases for new versions on startup
3. **Single Instance**: Prevents multiple app instances via `tauri-plugin-process`
4. **System Integration**: Opens files/URLs in default applications via `tauri-plugin-opener`
5. **Offline Support**: Local database sync via IndexedDB with custom sync engine

### 7.4 Desktop Build Commands

```bash
# Development
cd desktop
pnpm tauri dev

# Production build
pnpm tauri build

# Output locations:
# Windows: desktop/src-tauri/target/release/bundle/nsis/
# macOS:   desktop/src-tauri/target/release/bundle/dmg/
# Linux:   desktop/src-tauri/target/release/bundle/appimage/
```

### 7.5 Update Flow

1. App checks `latest.json` endpoint on GitHub releases
2. Compares local version against remote version
3. Downloads update silently in background
4. Prompts user to install and restart
5. Tauri handles binary replacement on restart

---

## 8. Authentication & Authorization Flow

### 8.1 JWT Token Structure

**Access Token (15 minutes):**
```json
{
  "sub": "user-uuid",
  "hospitalId": "hospital-uuid",
  "role": "ADMIN",
  "permissions": ["patient:read", "patient:write", "appointment:read"],
  "iat": 1679900000,
  "exp": 1679900900
}
```

**Refresh Token (7 days):**
```json
{
  "sub": "user-uuid",
  "hospitalId": "hospital-uuid",
  "type": "refresh",
  "iat": 1679900000,
  "exp": 1680504800
}
```

### 8.2 Authentication Middleware

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    req.user = {
      id: decoded.sub,
      hospitalId: decoded.hospitalId,
      role: decoded.role,
      permissions: decoded.permissions
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expired' }
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
    });
  }
};
```

### 8.3 RBAC Middleware

```typescript
// middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';

export const authorize = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];
    const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
      });
    }
    next();
  };
};
```

### 8.4 Role Definitions

```typescript
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  RECEPTIONIST = 'RECEPTIONIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  RADIOLOGIST = 'RADIOLOGIST',
  PHARMACIST = 'PHARMACIST',
  BILLING_OFFICER = 'BILLING_OFFICER',
  HR_OFFICER = 'HR_OFFICER',
  VIEWER = 'VIEWER'
}

export const rolePermissions: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: [
    'patient:read', 'patient:write', 'patient:delete',
    'appointment:read', 'appointment:write', 'appointment:delete',
    'clinical:read', 'clinical:write',
    'billing:read', 'billing:write',
    'inventory:read', 'inventory:write',
    'hr:read', 'hr:write',
    'settings:read', 'settings:write'
  ],
  [UserRole.DOCTOR]: [
    'patient:read', 'patient:write',
    'appointment:read', 'appointment:write',
    'clinical:read', 'clinical:write',
    'lab:read', 'imaging:read'
  ],
  [UserRole.NURSE]: [
    'patient:read', 'patient:write',
    'appointment:read',
    'clinical:read', 'clinical:write',
    'admissions:read', 'admissions:write'
  ],
  [UserRole.RECEPTIONIST]: [
    'patient:read', 'patient:write',
    'appointment:read', 'appointment:write'
  ],
  [UserRole.LAB_TECHNICIAN]: [
    'patient:read',
    'lab:read', 'lab:write'
  ],
  [UserRole.RADIOLOGIST]: [
    'patient:read',
    'imaging:read', 'imaging:write'
  ],
  [UserRole.PHARMACIST]: [
    'patient:read',
    'pharmacy:read', 'pharmacy:write',
    'inventory:read', 'inventory:write'
  ],
  [UserRole.BILLING_OFFICER]: [
    'patient:read',
    'billing:read', 'billing:write',
    'insurance:read', 'insurance:write'
  ],
  [UserRole.HR_OFFICER]: [
    'hr:read', 'hr:write'
  ],
  [UserRole.VIEWER]: [
    'patient:read',
    'appointment:read'
  ]
};
```

### 8.5 Token Refresh Flow

```
1. Client makes API request
2. Server returns 401 TOKEN_EXPIRED
3. Client interceptor automatically calls POST /auth/refresh with refresh token
4. Server validates refresh token against database
5. Server issues new access token + new refresh token (token rotation)
6. Client retries original request with new access token
7. If refresh fails, client redirects to /login
```

---

## 9. Multi-tenancy Implementation

### 9.1 Architecture Pattern

Shared database, shared schema. `hospitalId` is the tenant discriminator on every tenant-specific table.

### 9.2 Data Isolation Guarantees

1. **Query Level**: All SELECT queries must include `hospitalId` filter
2. **Create Level**: All INSERT operations must include `hospitalId` from JWT
3. **Update Level**: Updates verify ownership before modifying
4. **Delete Level**: Soft deletes preserve data for compliance
5. **Export Level**: Data exports filtered by hospital
6. **Backup Level**: Per-hospital backup capability

### 9.3 API Level Enforcement

All authenticated requests have `req.user.hospitalId` from JWT:

```typescript
export const list = async (req: Request, res: Response) => {
  const { hospitalId } = req.user;
  const patients = await prisma.patient.findMany({
    where: { hospitalId, deletedAt: null }
  });
  res.json({ success: true, data: patients });
};
```

### 9.4 Hospital Settings

Each hospital can customize behavior via JSON settings column:

```typescript
interface HospitalSettings {
  timezone: string;               // Default: 'Asia/Riyadh'
  currency: string;               // Default: 'SAR'
  language: 'en' | 'ar';         // Default: 'en'
  mrnPrefix: string;              // Default: 'MRN'
  appointmentDuration: number;    // Default: 30 (minutes)
  enableInsurance: boolean;       // Default: true
  enableSurgery: boolean;         // Default: true
  receiptFooter: string;          // Custom footer text
  printTemplate: 'thermal' | 'a4';
}
```

---

## 10. Internationalization Strategy

### 10.1 Configuration

```typescript
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    debug: import.meta.env.DEV,
    interpolation: { escapeValue: false },
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    ns: ['common', 'patients', 'appointments', 'billing', 'clinical', 'laboratory', 'pharmacy', 'inventory', 'hr', 'settings'],
    defaultNS: 'common'
  });

export default i18n;
```

### 10.2 Translation File Structure

```
i18n/locales/
  en/
    common.json
    patients.json
    appointments.json
    billing.json
    clinical.json
    laboratory.json
    pharmacy.json
    inventory.json
    hr.json
    settings.json
  ar/
    common.json
    patients.json
    appointments.json
    billing.json
    clinical.json
    laboratory.json
    pharmacy.json
    inventory.json
    hr.json
    settings.json
```

### 10.3 Translation Example

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "patients": "Patients",
    "appointments": "Appointments",
    "billing": "Billing"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "loading": "Loading...",
    "noData": "No data found",
    "confirm": "Are you sure?"
  },
  "validation": {
    "required": "{{field}} is required",
    "email": "Must be a valid email"
  }
}
```

### 10.4 RTL Support

- Tailwind CSS 4 supports RTL via `dir` attribute
- `dir="rtl"` on `<html>` for Arabic
- All layouts must work correctly in both LTR and RTL modes

### 10.5 Component Usage

```tsx
import { useTranslation } from 'react-i18next';

export const PatientForm = () => {
  const { t } = useTranslation('patients');
  return (
    <form>
      <h2>{t('form.title')}</h2>
      <label>{t('form.firstName')}</label>
      <button type="submit">{t('common.save')}</button>
    </form>
  );
};
```

### 10.6 Date/Number Formatting

```typescript
// lib/formatters.ts
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

export const formatDate = (date: string | Date, lang: string = 'en'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'PPP', { locale: lang === 'ar' ? ar : undefined });
};

export const formatCurrency = (amount: number, currency: string = 'SAR'): string => {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency
  }).format(amount);
};
```

---

## 11. Testing Strategy

### 11.1 Unit Testing (Vitest)

**Configuration:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
});
```

**Test Pattern:**
```typescript
// modules/patients/patient.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPatient, listPatients } from './patient.service';
import { prisma } from '../../lib/prisma';
import { generateMRN } from './patient.helpers';

vi.mock('../../lib/prisma');
vi.mock('./patient.helpers');

describe('Patient Service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createPatient', () => {
    it('should create patient with generated MRN', async () => {
      const hospitalId = 'hospital-1';
      const mockMRN = 'MRN-2026-00001';
      const mockPatient = {
        id: 'patient-1', hospitalId, mrn: mockMRN,
        firstName: 'John', lastName: 'Doe'
      };

      vi.mocked(generateMRN).mockResolvedValue(mockMRN);
      vi.mocked(prisma.patient.create).mockResolvedValue(mockPatient as any);

      const result = await createPatient(hospitalId, {
        firstName: 'John', lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'), gender: 'MALE'
      });

      expect(result.mrn).toBe(mockMRN);
      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ hospitalId, mrn: mockMRN })
      });
    });
  });
});
```

### 11.2 E2E Testing (Playwright)

**Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

**Test Example:**
```typescript
// e2e/patients.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Patient Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@hospital.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new patient', async ({ page }) => {
    await page.goto('/patients');
    await page.click('[data-testid="create-patient"]');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="date-of-birth"]', '1990-01-01');
    await page.selectOption('[data-testid="gender"]', 'MALE');
    await page.click('[data-testid="save-patient"]');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('text=MRN-2026-')).toBeVisible();
  });

  test('should search patients by MRN', async ({ page }) => {
    await page.goto('/patients');
    await page.fill('[data-testid="search-input"]', 'MRN-2026');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="patient-row"]')).toHaveCount(1);
  });
});
```

### 11.3 Test Commands

```bash
# Unit tests
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report

# E2E tests
pnpm test:e2e          # Run all E2E tests
pnpm test:e2e:ui       # With Playwright UI mode
pnpm test:e2e:headed   # With browser visible

# Combined
pnpm test:all          # Unit + E2E
```

---

## 12. CI/CD Pipeline

### 12.1 GitHub Actions Workflow

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: '${{ env.PNPM_VERSION }}' }
      - uses: actions/setup-node@v4
        with:
          node-version: '${{ env.NODE_VERSION }}'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: '${{ env.PNPM_VERSION }}' }
      - uses: actions/setup-node@v4
        with:
          node-version: '${{ env.NODE_VERSION }}'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: hms_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: '${{ env.PNPM_VERSION }}' }
      - uses: actions/setup-node@v4
        with:
          node-version: '${{ env.NODE_VERSION }}'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/hms_test
      - run: pnpm test:all
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/hms_test
          JWT_SECRET: test-secret-key-for-ci-only
          JWT_REFRESH_SECRET: test-refresh-secret-for-ci-only
          FRONTEND_URL: http://localhost:5173

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: '${{ env.PNPM_VERSION }}' }
      - uses: actions/setup-node@v4
        with:
          node-version: '${{ env.NODE_VERSION }}'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:all

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: '${{ env.PNPM_VERSION }}' }
      - uses: actions/setup-node@v4
        with:
          node-version: '${{ env.NODE_VERSION }}'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [e2e]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      # Add deployment steps for staging

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [e2e]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      # Add deployment steps for production
```

---

## 13. Performance Targets

### 13.1 API Response Times

| Operation | Target (p95) | Target (p99) |
|-----------|--------------|--------------|
| Simple CRUD | < 100ms | < 200ms |
| Paginated list (20 items) | < 200ms | < 400ms |
| Search (full-text) | < 300ms | < 500ms |
| Complex reports | < 1000ms | < 2000ms |
| File upload (10MB) | < 5000ms | < 10000ms |

### 13.2 Frontend Performance

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Time to Interactive (TTI) | < 3.0s |
| Bundle size (initial load) | < 300KB gzipped |

### 13.3 Database Performance

| Metric | Target |
|--------|--------|
| Connection pool size | 10-20 connections |
| Query timeout | 30 seconds max |
| Slow query threshold | > 500ms logged |
| Index hit rate | > 95% |

### 13.4 Concurrent Users

| Environment | Target |
|-------------|--------|
| Development | 1-5 users |
| Staging | 50 concurrent users |
| Production | 500+ concurrent users per hospital |

### 13.5 Uptime

| SLA Target | Value |
|------------|-------|
| Monthly uptime | 99.9% |
| Planned maintenance window | < 4 hours/month |
| Recovery Time Objective (RTO) | < 1 hour |
| Recovery Point Objective (RPO) | < 5 minutes |

---

## 14. Monitoring & Observability

### 14.1 Planned (Future Implementation)

**Application Monitoring:**
- Centralized logging (structured JSON logs)
- Error tracking and alerting
- API request/response metrics
- Database query performance monitoring

**Infrastructure Monitoring:**
- CPU, memory, disk usage
- Network latency
- Database connection pool metrics
- Supabase dashboard metrics

**User Analytics:**
- Feature usage tracking
- Session recording (privacy-compliant)
- Error rate by user action

### 14.2 Logging Standards

```typescript
// Structured logging format
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context: {
    requestId: string;
    userId?: string;
    hospitalId?: string;
    action: string;
    duration?: number;
  };
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}
```

### 14.3 Health Check Endpoint

```
GET /api/v1/health

Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "database": "connected",
  "timestamp": "2026-07-16T12:00:00Z"
}
```

---

## 15. Deployment Architecture

### 15.1 Web Application

```
                    +-------------------+
                    |   Load Balancer   |
                    |   (nginx/Cloud)   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     |  App Server 1   |          |  App Server 2   |
     |  (Node.js)      |          |  (Node.js)      |
     +--------+---------+          +--------+--------+
              |                             |
              +--------------+--------------+
                             |
                    +--------v--------+
                    |    PostgreSQL    |
                    |    (Supabase)   |
                    +-----------------+
```

### 15.2 Docker Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: hms
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: hms
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hms"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://hms:${DB_PASSWORD}@postgres:5432/hms
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 15.3 Desktop Distribution

| Platform | Format | Distribution |
|----------|--------|--------------|
| Windows | NSIS installer, MSI | GitHub Releases |
| macOS | DMG | GitHub Releases |
| Linux | AppImage, deb | GitHub Releases |

### 15.4 Environment Matrix

| Environment | Database | Frontend URL | Backend URL | Purpose |
|-------------|----------|--------------|-------------|---------|
| Development | Local PostgreSQL | localhost:5173 | localhost:3000 | Local dev |
| Staging | Supabase staging | staging.hms.com | api-staging.hms.com | Testing |
| Production | Supabase production | hms.com | api.hms.com | Live |
| Desktop | Local/IndexedDB | bundled | bundled | Offline-capable |

---

## Appendix A: Enum Reference

```typescript
// User roles
enum UserRole {
  SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST,
  LAB_TECHNICIAN, RADIOLOGIST, PHARMACIST,
  BILLING_OFFICER, HR_OFFICER, VIEWER
}

// Patient gender
enum Gender { MALE, FEMALE, OTHER }

// Appointment
enum AppointmentStatus {
  SCHEDULED, CONFIRMED, CHECKED_IN,
  IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
}

enum AppointmentType {
  GENERAL, FOLLOW_UP, EMERGENCY, CONSULTATION, TELEHEALTH
}

enum VisitType {
  IN_PERSON, TELEHEALTH, HOME_VISIT
}

// Billing
enum PaymentStatus {
  PENDING, PARTIAL, PAID, OVERDUE, CANCELLED, REFUNDED
}

// Admission
enum AdmissionStatus {
  ADMITTED, DISCHARGED, TRANSFERRED, DECEASED
}

// Surgery
enum SurgeryStatus {
  SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
}

// Lab/Imaging
enum LabOrderStatus {
  ORDERED, SAMPLE_COLLECTED, IN_PROGRESS,
  COMPLETED, CANCELLED
}

enum ImagingOrderStatus {
  ORDERED, SCHEDULED, IN_PROGRESS,
  COMPLETED, CANCELLED
}
```

## Appendix B: API Endpoint Summary

| Module | Endpoint Prefix | Key Operations |
|--------|-----------------|----------------|
| Auth | `/api/v1/auth` | login, logout, refresh, register |
| Patients | `/api/v1/patients` | CRUD, search, MRN assignment |
| Appointments | `/api/v1/appointments` | CRUD, reschedule, cancel |
| Clinical | `/api/v1/clinical` | Records, vitals, symptoms, medications |
| Laboratory | `/api/v1/lab` | Orders, results |
| Imaging | `/api/v1/imaging` | Orders, results |
| Pharmacy | `/api/v1/pharmacy` | Products, POS sales |
| Billing | `/api/v1/billing` | Invoices, payments |
| Insurance | `/api/v1/insurance` | Claims, processing |
| Inventory | `/api/v1/inventory` | Stock, procurement, suppliers |
| HR | `/api/v1/hr` | Employees, attendance |
| Admissions | `/api/v1/admissions` | Admit, discharge, transfers |
| Surgery | `/api/v1/surgery` | Scheduling, records |
| Settings | `/api/v1/settings` | Hospital config |

---

**End of Technical Requirements Document**
