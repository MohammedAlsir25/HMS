# Phase 2 Tech Spec: Patient Management

**Date:** 2026-07-16  
**Author:** Tech Lead  
**Status:** Ready for implementation  
**Depends on:** Phase 0 (hospitalId in auth context), Phase 1 (navigation + role guarding)

---

## 1. Key Architectural Decisions

### 1.1 Duplicate Detection as Pre-flight Check

**Decision:** Duplicate detection is a separate `POST /patients/check-duplicates` endpoint called by the registration form _before_ `POST /patients`. The form shows a warning panel; the user can override and proceed.

**Rationale:** Keeping it as a pre-flight check (rather than server-side enforcement at create time) gives receptionists the final say. Hospitals often have legitimate reasons to create near-duplicate records (e.g., different person with same name). The warning is advisory, not blocking.

### 1.2 Audit Log via Direct Prisma Writes (Not Event Bus)

**Decision:** Audit entries are written inline in each mutation handler via `prisma.auditLog.create(...)`. No event bus, no middleware, no decorator pattern.

**Rationale:** The codebase has no event emitter or pub/sub pattern. Adding one for a single model is over-engineering. The `AuditLog` model already exists in Prisma with `action`, `entity`, `entityId`, `details`, `userId`, `hospitalId`. Inline writes are explicit, traceable, and follow the same pattern as every other mutation in `patients.routes.ts`. The diff logic for UPDATE is simple enough to compute inline (compare `req.body` against current record).

### 1.3 Merge Uses Prisma Interactive Transaction

**Decision:** Patient merge runs inside `prisma.$transaction(async (tx) => { ... })` — all record transfers happen atomically. If any transfer fails, the entire merge rolls back.

**Rationale:** The merge touches 9+ related tables. Atomicity is non-negotiable — a partial merge would leave data in an inconsistent state. Prisma interactive transactions support `tx.model.findMany/updateMany` within the callback. The source patient soft-delete (`is_deleted = true`) happens last, inside the same transaction.

### 1.4 Quick-Search as a Standalone Component (Not a Hook)

**Decision:** `PatientQuickSearch.jsx` is a self-contained component with its own input + dropdown. It accepts `onSelect` callback as a prop. No custom hook extracted.

**Rationale:** The component manages its own debounce timer, dropdown visibility, keyboard navigation state, and API call. Extracting a hook would split state management from rendering without benefit — the component is used as a drop-in widget, not composed into different UI shapes.

### 1.5 Hospital Scoping — Explicit Where Clauses, Not Just Middleware

**Decision:** Every patient query in `patients.routes.ts` explicitly includes `hospitalId: req.user!.hospitalId!` in its Prisma `where` clause. The Prisma middleware from Phase 0 only validates on _writes_; read queries must filter explicitly.

**Rationale:** The existing codebase confirms this pattern — `patients.routes.ts` line 142 shows `where` built without `hospitalId`. This is a data isolation gap. Adding it to every endpoint is the simplest, most auditable fix. No middleware magic, just explicit filtering.

### 1.6 Registration Schema Extension

**Decision:** Create a new `registerPatientSchema` in `patients.schema.ts` that adds optional fields (`nationalId`, `email`, `chronicConditions`) and makes `phone` optional.

**Rationale:** The existing `createPatientSchema` in `reception.schema.ts` requires `phone` and omits several fields the registration form needs. Rather than modifying the reception schema (which would break the existing quick-create endpoint), a new schema lives in `patients.schema.ts` alongside `updatePatientSchema`.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Duplicate detection | Advisory pre-flight, not blocking | Receptionists need override capability for legitimate cases |
| Merge transaction | Prisma interactive `$transaction` | Atomicity across 9+ table transfers; rolls back on failure |
| Audit log writes | Inline `prisma.auditLog.create()` in each handler | No event bus in codebase; explicit, traceable, follows existing patterns |
| Audit diff for UPDATE | Compare `req.body` against current record before update | Simple object diff; no library needed for field-level change tracking |
| Quick-search | Self-contained component with `onSelect` prop | Drop-in widget; no need to split state into a hook |
| Hospital scoping | Explicit `hospitalId` in every `where` clause | Prisma middleware only validates writes; reads need explicit filter |
| Registration schema | New `registerPatientSchema` in `patients.schema.ts` | Extends existing fields; avoids breaking reception quick-create |
| File upload progress | Native `XMLHttpRequest` with `onprogress` event | `fetch` API has no progress callback; XHR is standard for file uploads |
| Tabs order (detail page) | Overview, Appointments, Clinical Records, Surgery History, Referrals, Preoperative, Files, Billing | Adds Referrals and Preoperative after Surgery; Files before Billing |
| Merge permission | `admin:users` (existing Super Admin only) | Merge is a destructive admin action; no dedicated permission needed |
| Gender filter type | Single `<select>` dropdown | Matches brief spec; single-select is sufficient and simpler |
| Date range filter | Two `<input type="date">` fields (from/to) | Native HTML5 date inputs; no date picker library in codebase |

---

## 3. Work Split

### 3.1 Sr Dev — Complex Backend & Integration (estimated 2–2.5 days)

**Order:** S5 (hospital scoping fix — unblocks everything) → S1 (duplicate detection) → S7 (audit log) → S6 (merge) → S4 (quick-search component).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| S1 | Duplicate Detection | `patients.routes.ts` | M | New endpoint. Multi-field fuzzy search with hospital scoping. Must handle: nationalId exact match, fullName+DOB combo, phone match. |
| S6 | Patient Merge | `patients.routes.ts` | L | Most complex. 9+ table transfers in Prisma transaction. Validate same-hospital. Soft-delete source. Edge cases: active admission, pending appointments. |
| S7 | Audit Log | `patients.routes.ts` | M | Inline writes on create/update/merge. Diff logic for UPDATE. GET endpoint with pagination. |
| S4 | Quick-Search Component | `PatientQuickSearch.jsx` | M | Reusable. Debounced input, dropdown, keyboard nav. Must work in reception, pharmacy, clinical contexts. |
| S5 | Hospital Scoping Fix | `patients.routes.ts` | S | Add `hospitalId` to every query `where`. Simple but critical — must not miss any endpoint. |

### 3.2 Jr Dev — Frontend Components & Forms (estimated 1.5–2 days)

**Start immediately:** J3 (detail page tabs — no backend dependency) and J4 (file upload — endpoint already exists).  
**After S1 complete:** J1 (registration form — needs check-duplicates endpoint).  
**After S5 complete:** J2 (list page enhancements — needs backend filter params in GET /patients).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| J1 | Registration Form | `PatientRegistration.jsx` | M | Modal form, duplicate warning panel, success/error handling. Wire to check-duplicates then create endpoints. |
| J2 | List Page Enhancements | `PatientListPage.jsx` + backend | S | Gender select, date range inputs, register button. Backend: add 3 query params to existing list endpoint. |
| J3 | Detail Page Tabs | `PatientDetailPage.jsx` | M | Add Referrals + Preoperative tabs. Improve Clinical Records with expandable cards. Improve Appointments with status Badge colors. |
| J4 | File Upload Integration | `PatientDetailPage.jsx` | S | Wire existing POST endpoint to upload UI. FormData, progress state, file type validation. |



## 4. Exact File Lists

### Sr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| S4 | `frontend/src/components/shared/PatientQuickSearch.jsx` | Reusable debounced patient search dropdown component |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| S1/S5/S6/S7 | `backend/src/modules/patients/patients.routes.ts` | Add check-duplicates endpoint (S1), merge endpoint (S6), audit log writes + GET endpoint (S7), hospitalId filter on all queries (S5), add filter params to GET / (J2 backend) |
| — | `backend/src/schemas/patients.schema.ts` | Add `registerPatientSchema`, `checkDuplicatesSchema`, `mergePatientsSchema` |
| — | `frontend/src/hooks/queries/usePatients.js` | Add `useCreatePatient`, `useMergePatients`, `usePatientAudit`, `useCheckDuplicates` hooks |

#### REFERENCE — Read Only

| File | Purpose |
|------|---------|
| `backend/src/lib/prisma.js` | Prisma client instance |
| `backend/src/middleware/auth.ts` | `authenticate`, `requirePermission` middleware |
| `backend/src/middleware/errorHandler.js` | `asyncHandler` wrapper |
| `backend/src/middleware/validate.js` | `validate(schema)` middleware |
| `backend/src/utils/errors.js` | `ValidationError`, `NotFoundError` |
| `frontend/src/lib/api.js` | API client |
| `frontend/src/components/ui/Input.jsx` | Reusable Input component |
| `frontend/src/components/ui/Button.jsx` | Reusable Button component |
| `frontend/src/components/ui/Badge.jsx` | Reusable Badge component |
| `frontend/src/components/ui/Modal.jsx` | Reusable Modal component |
| `frontend/src/components/ui/Table.jsx` | Reusable Table component |
| `frontend/src/components/ui/Card.jsx` | Card, CardHeader, CardTitle, CardContent |
| `frontend/src/stores/authStore.js` | User permissions source |
| `frontend/src/utils/notify.js` | `notifySuccess`, `notifyError` |

### Jr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| J1 | `frontend/src/features/patients/PatientRegistration.jsx` | Modal registration form with duplicate detection |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| J2 | `frontend/src/features/patients/PatientListPage.jsx` | Add gender filter, date range filter, "Register Patient" button |
| J3 | `frontend/src/features/patients/PatientDetailPage.jsx` | Add Referrals tab, Preoperative tab, expandable clinical records, appointment status colors |
| J4 | `frontend/src/features/patients/PatientDetailPage.jsx` | Add file upload UI (drag-and-drop area, progress indicator, file type icons) — same file as J3 |

---

## 5. Implementation Details — Sr Dev

### S1: Duplicate Detection Endpoint — `patients.routes.ts`

**Route:** `POST /patients/check-duplicates`  
**Permission:** `patient:create`  
**Schema:** `checkDuplicatesSchema` (new, in `patients.schema.ts`)

#### Request Body

```ts
{
  fullName: string;        // required, min 1
  dateOfBirth?: string;    // ISO date string, optional
  phone?: string;          // optional
  nationalId?: string;     // optional
}
```

#### Schema (add to `patients.schema.ts`)

```ts
export const checkDuplicatesSchema = z.object({
  fullName: z.string().min(1, 'fullName is required'),
  dateOfBirth: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
});
```

#### Query Logic

```ts
router.post('/check-duplicates',
  authenticate,
  requirePermission(PERMISSIONS.PATIENT_CREATE),
  validate(checkDuplicatesSchema),
  asyncHandler(async (req, res) => {
    const { fullName, dateOfBirth, phone, nationalId } = req.body;
    const hospitalId = req.user!.hospitalId!;
    const orConditions: Prisma.PatientWhereInput[] = [];

    if (nationalId) {
      orConditions.push({ nationalId, hospitalId });
    }

    if (phone) {
      orConditions.push({ phone, hospitalId });
    }

    if (fullName && dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const nextDay = new Date(dob);
      nextDay.setDate(nextDay.getDate() + 1);
      orConditions.push({
        fullName: { contains: fullName, mode: 'insensitive' },
        dateOfBirth: { gte: dob, lt: nextDay },
        hospitalId,
      });
    }

    if (orConditions.length === 0) {
      return res.json({ matches: [] });
    }

    const matches = await prisma.patient.findMany({
      where: { OR: orConditions },
      select: {
        id: true,
        fullName: true,
        mrn: true,
        dateOfBirth: true,
        phone: true,
        nationalId: true,
        gender: true,
      },
      take: 10,
    });

    res.json({ matches });
  })
);
```

#### Response Shape

```ts
{
  matches: Array<{
    id: string;
    fullName: string;
    mrn: string;
    dateOfBirth: string | null;
    phone: string | null;
    nationalId: string | null;
    gender: string | null;
  }>;
}
```

#### Edge Cases

- **Empty body fields:** If all optional fields are empty/null, return `{ matches: [] }` — no query executed.
- **Same name, different DOB:** Won't match (DOB is part of the combo condition).
- **Same nationalId, different name:** Will match (nationalId is an exact independent condition).
- **hospitalId always in where:** Every condition includes `hospitalId` — Hospital A never sees Hospital B patients.
- **Case-insensitive name:** `mode: 'insensitive'` on `fullName` contains.
- **Date range for DOB:** Use `gte: dob` and `lt: nextDay` (not exact DateTime match) to handle timezone differences.



### S6: Patient Merge Endpoint — `patients.routes.ts`

**Route:** `POST /patients/:id/merge`  
**Permission:** `admin:users` (Super Admin only)  
**Schema:** `mergePatientsSchema` (new, in `patients.schema.ts`)

#### Request Body

```ts
{
  sourcePatientId: string;  // UUID of the patient to merge INTO this one
}
```

#### Schema

```ts
export const mergePatientsSchema = z.object({
  sourcePatientId: z.string().uuid('Invalid patient ID'),
});
```

#### Transfer List (9 tables)

| # | Model | Foreign Key | Operation |
|---|-------|-------------|-----------|
| 1 | `Appointment` | `patientId` | `updateMany({ where: { patientId: sourceId }, data: { patientId: targetId } })` |
| 2 | `ClinicalRecord` | `patientId` | same |
| 3 | `DiagnosticOrder` | `patientId` | same |
| 4 | `Referral` | `patientId` | same |
| 5 | `Surgery` | `patientId` | same |
| 6 | `PreoperativeRequest` | `patientId` | same |
| 7 | `Transaction` | `patientId` | same |
| 8 | `PatientFile` | `patientId` | same |
| 9 | `PostOpFollowUp` | `patientId` | same |

#### Transaction Pseudocode

```ts
router.post('/:id/merge',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_USERS),
  validate(mergePatientsSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { sourcePatientId } = req.body;

    if (sourcePatientId === targetId) {
      throw new ValidationError('Cannot merge a patient into themselves');
    }

    const [target, source] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: targetId, hospitalId: req.user!.hospitalId! }
      }),
      prisma.patient.findFirst({
        where: { id: sourcePatientId, hospitalId: req.user!.hospitalId! }
      }),
    ]);

    if (!target) throw new NotFoundError('Target patient not found');
    if (!source) throw new NotFoundError('Source patient not found');

    const activeBed = await prisma.bed.findFirst({
      where: { patientId: sourcePatientId, dischargedAt: null },
    });
    if (activeBed) {
      throw new ValidationError(
        'Source patient has an active admission — discharge first'
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const transfers: Record<string, number> = {};

      const models = [
        { name: 'appointments', model: tx.appointment },
        { name: 'clinicalRecords', model: tx.clinicalRecord },
        { name: 'diagnosticOrders', model: tx.diagnosticOrder },
        { name: 'referrals', model: tx.referral },
        { name: 'surgeries', model: tx.surgery },
        { name: 'preoperativeRequests', model: tx.preoperativeRequest },
        { name: 'transactions', model: tx.transaction },
        { name: 'patientFiles', model: tx.patientFile },
        { name: 'postOpFollowUps', model: tx.postOpFollowUp },
      ];

      for (const { name, model } of models) {
        const r = await model.updateMany({
          where: { patientId: sourcePatientId },
          data: { patientId: targetId },
        });
        transfers[name] = r.count;
      }

      await tx.patient.update({
        where: { id: sourcePatientId },
        data: { is_deleted: true },
      });

      return transfers;
    });

    await prisma.auditLog.create({
      data: {
        action: 'MERGE',
        entity: 'Patient',
        entityId: targetId,
        details: {
          sourcePatientId,
          sourceMRN: source.mrn,
          targetMRN: target.mrn,
          transferredCounts: result,
        },
        userId: req.user!.id,
        hospitalId: req.user!.hospitalId!,
      },
    });

    res.json({
      message: 'Patients merged successfully',
      target: { id: target.id, mrn: target.mrn, fullName: target.fullName },
      source: { id: source.id, mrn: source.mrn, fullName: source.fullName },
      transferred: result,
    });
  })
);
```

#### Response Shape

```ts
{
  message: string;
  target: { id: string; mrn: string; fullName: string };
  source: { id: string; mrn: string; fullName: string };
  transferred: {
    appointments: number;
    clinicalRecords: number;
    diagnosticOrders: number;
    referrals: number;
    surgeries: number;
    preoperativeRequests: number;
    transactions: number;
    patientFiles: number;
    postOpFollowUps: number;
  };
}
```

#### Validation Rules

1. `sourcePatientId` must be a valid UUID, different from `:id`
2. Both patients must exist and belong to `req.user.hospitalId`
3. Source must not be the same as target
4. If source has an active bed admission (`beds` where `dischargedAt: null`), throw `ValidationError`

#### Edge Cases

- **Source has active admission:** Block merge with clear error message
- **Source has pending appointments:** Allow merge (appointments transfer)
- **Both patients have transactions:** Merge is safe — transactions just re-point to target
- **Source nationalId conflicts with target:** Keep target's nationalId. Source's is lost intentionally (target is the surviving record)

---

### S7: Patient Audit Log — `patients.routes.ts`

#### Schema Usage

Use the existing `AuditLog` model (`schema.prisma:1331`):

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  action     String       // CREATE, UPDATE, MERGE
  entity     String       // "Patient"
  entityId   String?      // patient UUID
  details    Json?        // { changes: { field: { old, new } } }
  ipAddress  String?
  userId     String       // who did it
  hospitalId String?      // which hospital
  createdAt  DateTime @default(now())
}
```

#### Audit Writes — Inline in Each Handler

**On CREATE** (`POST /patients` — line 74):  
After patient creation, add:

```ts
await prisma.auditLog.create({
  data: {
    action: 'CREATE',
    entity: 'Patient',
    entityId: patient.id,
    details: { mrn: patient.mrn, fullName: patient.fullName },
    userId: req.user!.id,
    hospitalId: req.user!.hospitalId!,
  },
});
```

**On UPDATE** (`PATCH /patients/:id` — line 182):  
Before the update, fetch current record to compute diff:

```ts
const current = await prisma.patient.findUnique({
  where: { id: req.params.id },
});

// ... existing update logic ...

const changes: Record<string, { old: unknown; new: unknown }> = {};
for (const [key, newVal] of Object.entries(data)) {
  const oldVal = current[key as keyof typeof current];
  if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
    changes[key] = { old: oldVal, new: newVal };
  }
}
if (Object.keys(changes).length > 0) {
  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'Patient',
      entityId: req.params.id,
      details: { changes },
      userId: req.user!.id,
      hospitalId: req.user!.hospitalId!,
    },
  });
}
```

**On MERGE** — handled inline in S6 transaction pseudocode above.

#### GET Endpoint

**Route:** `GET /patients/:id/audit`  
**Permission:** `patient:read`  
**Query params:** `page?` (default 1), `limit?` (default 20)

```ts
router.get('/:id/audit',
  authenticate,
  requirePermission(PERMISSIONS.PATIENT_READ),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entity: 'Patient', entityId: req.params.id },
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({
        where: { entity: 'Patient', entityId: req.params.id },
      }),
    ]);

    res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);
```

#### Response Shape

```ts
{
  logs: Array<{
    id: string;
    action: string;       // "CREATE" | "UPDATE" | "MERGE"
    entity: string;       // "Patient"
    entityId: string;
    details: object | null;
    userId: string;
    user: { id: string; fullName: string };
    hospitalId: string | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```



### S4: Quick-Search Component — `PatientQuickSearch.jsx`

**File:** `frontend/src/components/shared/PatientQuickSearch.jsx`

#### Component API

```jsx
<PatientQuickSearch
  onSelect={(patient) => { /* handle selection */ }}
  placeholder="Search patients..."
  clinicSlug="medicine"
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSelect` | `(patient: object) => void` | required | Called when user selects a patient from dropdown |
| `placeholder` | `string` | `"Search patients..."` | Input placeholder |
| `clinicSlug` | `string` | `undefined` | Optional clinic slug to filter to queued patients |

#### Debounce Logic

```
State: query (string), results (array), isOpen (boolean), loading (boolean), highlightIndex (number)
Ref: debounceTimer (setTimeout ID), dropdownRef (for click-outside)

onChange handler:
  1. Set query = e.target.value
  2. ClearTimeout(debounceTimer)
  3. If query.length < 2: setResults([]), setIsOpen(false), return
  4. debounceTimer = setTimeout(() => {
       setLoading(true)
       GET /patients/search?q={query}&clinicSlug={clinicSlug}
       .then(data => { setResults(data); setIsOpen(true) })
       .finally(() => setLoading(false))
     }, 300)
```

#### Keyboard Navigation

```
onKeyDown handler:
  ArrowDown: highlightIndex = Math.min(highlightIndex + 1, results.length - 1)
  ArrowUp:   highlightIndex = Math.max(highlightIndex - 1, 0)
  Enter:     if highlightIndex >= 0: onSelect(results[highlightIndex]), setIsOpen(false), setQuery('')
  Escape:    setIsOpen(false)
```

#### Dropdown Styling

```jsx
{isOpen && results.length > 0 && (
  <div className="absolute z-50 w-full mt-1 bg-paper border border-silver rounded-xl shadow-md max-h-72 overflow-y-auto">
    {results.map((patient, i) => (
      <button
        key={patient.id}
        onMouseDown={() => onSelect(patient)}
        className={`w-full text-left px-4 py-3 flex items-center justify-between
          ${i === highlightIndex ? 'bg-lilac-bloom/20' : 'hover:bg-bone'}
          transition-colors`}
      >
        <div className="min-w-0">
          <p className="text-body text-obsidian truncate">{patient.fullName}</p>
          <p className="text-caption text-slate">
            {patient.mrn} {patient.phone && `. ${patient.phone}`}
          </p>
        </div>
        <span className="text-caption text-slate shrink-0">
          {patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'F' : '-'}
        </span>
      </button>
    ))}
  </div>
)}
```

**Empty state:** When loading, show "Searching..." text. When no results after debounce completes, show "No patients found".

**Click outside:** `useEffect` with `mousedown` listener on `document`. If click is outside `dropdownRef`, close dropdown.

---

### S5: Hospital Scoping Fix — `patients.routes.ts`

**Critical security fix.** Add `hospitalId: req.user!.hospitalId!` to every patient query `where` clause.

#### Exact Changes

**1. `GET /patients` (line 133):**

Current `where` at line 142:
```ts
const where: Prisma.PatientWhereInput = {};
```
Add immediately after:
```ts
where.hospitalId = req.user!.hospitalId!;
```
The existing `OR` block for `q` search sits inside `if (q && q.length >= 2)` — no conflict. The `hospitalId` filter is added to the top-level `where` alongside any `OR`.

**2. `GET /patients/search` (line 44):**

Current `where` at line 47:
```ts
const where: Record<string, unknown> = {
  OR: [...],
};
```
Add at line 48, before the `OR`:
```ts
where.hospitalId = req.user!.hospitalId!;
```

**3. `GET /patients/:id` (line 163):**

Current query at line 164:
```ts
const patient = await prisma.patient.findUnique({
  where: { id: req.params.id },
```
Change to:
```ts
const patient = await prisma.patient.findFirst({
  where: { id: req.params.id, hospitalId: req.user!.hospitalId! },
```
(`findFirst` instead of `unique` because the unique constraint is on `id` alone, but adding `hospitalId` to the where clause makes it a compound condition — `findFirst` handles this cleanly.)

**4. `POST /patients/check-duplicates` (new endpoint — S1):**

Already includes `hospitalId` in all conditions per S1 spec.

**5. `PATCH /patients/:id` (line 182):**

Add a verification query before the update:
```ts
const existing = await prisma.patient.findFirst({
  where: { id: req.params.id, hospitalId: req.user!.hospitalId! },
});
if (!existing) throw new NotFoundError('Patient not found');
```
Then update using `prisma.patient.update({ where: { id: req.params.id } })` — the existence check above ensures hospital scoping.

#### Verification Checklist

After all changes, verify these endpoints have `hospitalId` in their where clause:

- [ ] `GET /patients` — `where.hospitalId = req.user!.hospitalId!`
- [ ] `GET /patients/search` — `where.hospitalId = req.user!.hospitalId!`
- [ ] `GET /patients/:id` — `findFirst` with `hospitalId`
- [ ] `POST /patients/check-duplicates` — all conditions include `hospitalId`
- [ ] `PATCH /patients/:id` — existence check with `hospitalId`
- [ ] `POST /patients/:id/merge` — both patient fetches use `findFirst` with `hospitalId`
- [ ] `GET /patients/:id/audit` — scoped to `entity: 'Patient', entityId: req.params.id` (implicitly scoped because patient access is already verified)



## 6. Implementation Details - Jr Dev

### J1: Registration Form - PatientRegistration.jsx

**File:** rontend/src/features/patients/PatientRegistration.jsx

#### Component Structure

`jsx
export default function PatientRegistration({ isOpen, onClose, onPatientCreated }) {
  // form state, duplicate check state, submission state
}
`

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| isOpen | oolean | Controls modal visibility |
| onClose | () => void | Called when modal should close |
| onPatientCreated | (patient) => void | Called after successful creation (used to refresh list) |

#### Form Fields

| Field | Type | Required | Component |
|-------|------|----------|-----------|
| ullName | text | Yes | <Input> |
| phone | tel | No | <Input> |
| 
ationalId | text | No | <Input> |
| email | email | No | <Input> |
| dateOfBirth | date | No | <input type="date"> styled like Input |
| gender | select | No | <select> with MALE/FEMALE options |
| ddress | text | No | <Input> |
| chronicConditions | text array | No | Tag input (comma-separated, rendered as badges) |
| diabetesType | select | No | <select> with NONE/TYPE1/TYPE2/GESTATIONAL |
| 
otes | textarea | No | <textarea> |

**Validation:** Client-side required check for ullName only. All other fields optional. Submit button disabled when ullName is empty or form is submitting.

#### API Call Flow

`
1. User fills form, clicks "Register"
2. Client validates: fullName must not be empty
3. Call POST /patients/check-duplicates with { fullName, dateOfBirth, phone, nationalId }
4. If matches.length > 0:
   -> Show duplicate warning panel (see below)
   -> User can: "View Patient" (navigates to /patients/:id) or "Register Anyway"
5. If user clicks "Register Anyway" OR no matches:
   -> Call POST /patients with form data
   -> On success: toast.success('Patient registered'), onClose(), onPatientCreated(patient)
   -> On error: toast.error(err.message)
`

#### Duplicate Warning Panel

Shown when checkDuplicates returns matches. Renders inside the modal below the form:

`jsx
<div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 space-y-3">
  <p className="text-body font-medium text-amber-800 dark:text-amber-200">
    Potential duplicates found:
  </p>
  {matches.map(m => (
    <div key={m.id} className="flex items-center justify-between p-3 bg-paper rounded-lg border border-silver/50">
      <div>
        <p className="text-body text-obsidian">{m.fullName}</p>
        <p className="text-caption text-slate">{m.mrn} {m.phone &&  . }</p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => navigate(/patients/)}>
        View
      </Button>
    </div>
  ))}
  <div className="flex gap-2 pt-2">
    <Button variant="danger" size="sm" onClick={proceedWithRegistration}>Register Anyway</Button>
    <Button variant="ghost" size="sm" onClick={() => setMatches(null)}>Cancel</Button>
  </div>
</div>
`

#### Integration with PatientListPage

The "Register Patient" button in PatientListPage.jsx opens the modal:

`jsx
const [showRegistration, setShowRegistration] = useState(false);

// In header area:
<Button onClick={() => setShowRegistration(true)}>Register Patient</Button>

// At bottom of component:
<PatientRegistration
  isOpen={showRegistration}
  onClose={() => setShowRegistration(false)}
  onPatientCreated={() => { queryClient.invalidateQueries({ queryKey: patientKeys.all }) }}
/>
`

---

### J2: List Page Enhancements - PatientListPage.jsx

#### Backend Changes to GET /patients

Add three new query params: gender, dateFrom, dateTo.

In patients.routes.ts, inside the GET / handler (line 133), after the q filter:

`	s
const { gender, dateFrom, dateTo } = req.query as Record<string, string | undefined>;

if (gender && ['MALE', 'FEMALE'].includes(gender)) {
  where.gender = gender;
}

if (dateFrom || dateTo) {
  where.createdAt = {};
  if (dateFrom) where.createdAt.gte = new Date(dateFrom);
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    where.createdAt.lte = to;
  }
}
`

#### Frontend Changes to PatientListPage.jsx

**Add filter controls** between the search input and the table:

`jsx
<div className="flex flex-col md:flex-row items-center gap-3 mb-4">
  <div className="flex-1 w-full">
    <Input
      placeholder="Search by name, MRN, phone, or national ID..."
      value={q}
      onChange={(e) => updateParams({ q: e.target.value, page: e.target.value ? '' : undefined })}
    />
  </div>
  <select
    value={searchParams.get('gender') || ''}
    onChange={(e) => updateParams({ gender: e.target.value, page: '' })}
    className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian"
  >
    <option value="">All Genders</option>
    <option value="MALE">Male</option>
    <option value="FEMALE">Female</option>
  </select>
  <input
    type="date"
    value={searchParams.get('dateFrom') || ''}
    onChange={(e) => updateParams({ dateFrom: e.target.value, page: '' })}
    className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian"
  />
  <input
    type="date"
    value={searchParams.get('dateTo') || ''}
    onChange={(e) => updateParams({ dateTo: e.target.value, page: '' })}
    className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian"
  />
</div>
`

**Pass new params** to usePatientList:

`jsx
const gender = searchParams.get('gender') || '';
const dateFrom = searchParams.get('dateFrom') || '';
const dateTo = searchParams.get('dateTo') || '';
const { data, isLoading } = usePatientList({
  q: q || undefined,
  page,
  limit: 20,
  gender: gender || undefined,
  dateFrom: dateFrom || undefined,
  dateTo: dateTo || undefined,
});
`

---

### J3: Detail Page Tabs - PatientDetailPage.jsx

#### Updated Tabs Array

`jsx
const TABS = [
  'Overview',
  'Appointments',
  'Clinical Records',
  'Surgery History',
  'Referrals',
  'Preoperative',
  'Files',
  'Billing',
];
`

#### Referrals Tab (new)

`jsx
{activeTab === 'Referrals' && (
  <Table
    columns={[
      { key: 'type', label: 'Type', render: (r) => <Badge size="sm">{r.type}</Badge> },
      { key: 'status', label: 'Status', render: (r) => <Badge size="sm" variant={referralStatusVariant(r.status)}>{r.status}</Badge> },
      { key: 'fromClinic', label: 'From', render: (r) => r.fromClinic?.name || '--' },
      { key: 'toClinic', label: 'To', render: (r) => r.toClinic?.name || '--' },
      { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
    ]}
    data={patient.referrals || []}
  />
)}
`

Where eferralStatusVariant maps: PENDING -> 'warning', DISPATCHED -> 'info', FULFILLED -> 'success', CANCELLED -> 'danger'.

#### Preoperative Tab (new)

`jsx
{activeTab === 'Preoperative' && (
  <Table
    columns={[
      { key: 'status', label: 'Status', render: (r) => <Badge size="sm" variant={preopStatusVariant(r.status)}>{r.status}</Badge> },
      { key: 'operationType', label: 'Operation', render: (r) => r.operationType?.name || '--' },
      { key: 'scheduledDate', label: 'Scheduled', render: (r) => formatDate(r.scheduledDate) },
      { key: 'createdAt', label: 'Created', render: (r) => formatDateTime(r.createdAt) },
    ]}
    data={patient.preoperativeRequests || []}
  />
)}
`

#### Clinical Records - Expandable Cards

Replace the flat table with expandable cards using a ClinicalRecordCard sub-component. Each card shows encounter date and diagnosis on the header; expands to show diagnosis, prescriptions, notes. See Section 5 S4 for full JSX spec of ClinicalRecordCard.

#### Appointments Tab - Status Colors

Add ppointmentStatusVariant map: WAITING -> 'warning', CALLED -> 'info', IN_PROGRESS -> 'primary', COMPLETED -> 'success', NO_SHOW/CANCELLED -> 'danger', RESERVED -> 'info'.

---

### J4: File Upload Integration - PatientDetailPage.jsx

#### Upload Component in Files Tab

Replace the existing Files tab content with an upload UI + file list. Extract a FileUploadSection sub-component:

`jsx
function FileUploadSection({ patient }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 15 * 1024 * 1024;

  const handleUpload = async (files) => {
    const fileArr = Array.from(files);
    for (const f of fileArr) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        notifyError(${f.name}: Only PDF and images (JPEG, PNG, WebP) allowed);
        return;
      }
      if (f.size > MAX_SIZE) {
        notifyError(${f.name}: Max file size is 15MB);
        return;
      }
    }

    const formData = new FormData();
    fileArr.forEach(f => formData.append('files', f));

    setUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', /api/patients//files);
    xhr.setRequestHeader('Authorization', Bearer );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 201) {
        notifySuccess('Files uploaded');
        queryClient.invalidateQueries({ queryKey: patientKeys.detail(patient.id) });
      } else {
        notifyError('Upload failed');
      }
    };

    xhr.onerror = () => { setUploading(false); notifyError('Upload failed'); };
    xhr.send(formData);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-silver rounded-xl p-8 text-center cursor-pointer hover:border-lilac-bloom transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => e.target.files?.length && handleUpload(e.target.files)}
        />
        <p className="text-body text-slate">Drag files here or click to browse</p>
        <p className="text-caption text-slate mt-1">PDF, JPEG, PNG, WebP - max 15MB per file</p>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="w-full bg-silver rounded-full h-2">
          <div className="bg-lilac-bloom h-2 rounded-full transition-all" style={{ width: ${progress}% }} />
        </div>
      )}

      {/* File list */}
      {patient.files?.map((f) => (
        <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-silver/50">
          <div className="flex items-center gap-3 min-w-0">
            {/* File type icon */}
            {f.mimeType === 'application/pdf' ? (
              <span className="text-red-500 text-caption font-bold shrink-0">PDF</span>
            ) : (
              <span className="text-blue-500 text-caption font-bold shrink-0">IMG</span>
            )}
            <div className="min-w-0">
              <p className="text-body text-obsidian truncate">{f.originalName}</p>
              <p className="text-caption text-slate">{formatDateTime(f.createdAt)} . {(f.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <a href={/api/patients/files//download} target="_blank" rel="noopener noreferrer"
            className="text-caption text-lilac-bloom hover:underline shrink-0">Download</a>
        </div>
      ))}
      {(!patient.files || patient.files.length === 0) && !uploading && (
        <p className="text-caption text-slate text-center py-8">No files uploaded</p>
      )}
    </div>
  );
}
`

**Key decisions:**
- Uses XMLHttpRequest for upload progress (fetch API has no progress callback)
- FormData field name iles[] matches multer config in patients.routes.ts line 93
- File type and size validation before upload (matches multer limits)
- Drag-and-drop zone styled with dashed border, hover state
- File type icon: text badge "PDF" in red, "IMG" in blue (no icon library needed)
- On success: invalidate query to refresh file list



## 7. Coordination Points

### Dependency Graph

`
S5 (Hospital Scoping)  -----> J2 (List Page Filters)
      |
      v
S1 (Duplicate Detection) ---> J1 (Registration Form)
      |
      v
S7 (Audit Log)  -----------> (standalone, no frontend dependency)
      |
      v
S6 (Merge Endpoint) -------> (standalone, no frontend dependency)
      |
      v
S4 (Quick-Search Component) -> (standalone, reusable across modules)

J3 (Detail Page Tabs) -------> (no backend dependency, start immediately)
J4 (File Upload) ------------> (no backend dependency, start immediately)
`

### Parallel Execution Plan

**Day 1 (morning):**
- Sr Dev: S5 (hospital scoping fix) - critical security, unblocks everything
- Jr Dev: J3 (detail page tabs) + J4 (file upload) - zero backend dependency

**Day 1 (afternoon):**
- Sr Dev: S1 (duplicate detection endpoint) + add filter params to GET /patients (J2 backend)
- Jr Dev: Continue J3/J4

**Day 2 (morning):**
- Sr Dev: S7 (audit log) + S6 (merge endpoint)
- Jr Dev: J2 (list page enhancements) - backend filter params now available
- Jr Dev: J1 (registration form) - check-duplicates endpoint now available

**Day 2 (afternoon) / Day 3:**
- Sr Dev: S4 (quick-search component)
- Jr Dev: Finish J1, J2, J3, J4

**Day 3-4:**
- Integration testing, edge cases, responsive layout verification

### Coordination Rules

1. **J3 + J4 can start immediately** - they only use data already returned by `GET /patients/:id` (the detail endpoint already includes `referrals`, `preoperativeRequests`, `files`).
2. **J2 needs S5** - the list endpoint must return hospital-scoped results before adding filter params.
3. **J1 needs S1** - the registration form calls POST /patients/check-duplicates.
4. **S4 is independent** - the quick-search component uses the existing GET /patients/search endpoint (which S5 adds hospital scoping to).
5. **Backend filter params** (gender, dateFrom, dateTo for GET /patients) should be implemented alongside S5 in the same edit to patients.routes.ts.

---

## 8. Acceptance Criteria Checklist

- [ ] MRN format is MRN-{YEAR}-{5-digit} and unique within each hospital (verified - already works)
- [ ] Registration form warns about potential duplicates (by nationalId, name+DOB, or phone) before creating
- [ ] Patient list supports search, gender filter, date range filter, sort, and pagination
- [ ] Patient detail page shows all tabs: Overview, Appointments, Clinical Records, Surgery History, Referrals, Preoperative, Files, Billing
- [ ] Patient detail page allows inline editing of demographics (already works - verified)
- [ ] Files tab supports upload (PDF/images, max 15MB), listing, preview, and download
- [ ] Patient merge transfers all related records and soft-deletes the source
- [ ] Audit log records patient create, update, and merge events
- [ ] Quick-search component is reusable across modules (reception, pharmacy, clinical)
- [ ] All patient queries are hospital-scoped (Hospital A cannot see Hospital B patients)
- [ ] "Register Patient" button is accessible from the PatientListPage
- [ ] Loading, empty, and error states are present on all patient pages
- [ ] Responsive layout works on desktop (lg), tablet (md), and mobile
- [ ] No TypeScript/ESLint errors introduced
- [ ] All existing patient functionality continues to work (list, detail, search, file upload, edit)

