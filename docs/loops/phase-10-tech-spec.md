# Phase 10 Tech Spec: Billing & Accounting

> **Phase Complexity:** XL | **Duration:** 3 sprints | **Devs:** Sr (backend) + Jr (frontend)
> **6 new Prisma models** · **6 new route modules** · **8 new frontend pages/hooks**

---

## 1. Architecture Decisions

### 1.1 ServiceItem Catalog Design

**Decision:** Flat model with `category` enum (CONSULTATION, SURGERY, LAB, IMAGING, PHARMACY, WARD, OTHER) and bilingual name fields.

**Rationale:** The codebase already uses flat enum-based categorization (`TransactionType`, `ExpenseCategory`, `DepartmentType`). A self-referential tree adds complexity without benefit — the hospital has a finite, predictable set of service categories. The `category` enum maps directly to `TransactionType` values, enabling automatic account selection during journal entry generation.

**Schema excerpt:**
```prisma
model ServiceItem {
  id        String           @id @default(uuid())
  name      String
  nameAr    String?
  category  ServiceItemCategory
  price     Decimal          @db.Decimal(10, 2)
  costPrice Decimal          @default(0) @db.Decimal(10, 2)
  isActive  Boolean          @default(true)
  hospitalId String?
  created_at DateTime?       @default(now()) @db.Timestamptz(6)
  updated_at DateTime        @updatedAt @db.Timestamptz(6)
  invoiceItems InvoiceItem[]
  hospital  Hospital?        @relation(fields: [hospitalId], references: [id])

  @@unique([hospitalId, name])
  @@index([category])
  @@index([hospitalId])
  @@index([isActive])
  @@map("service_items")
}

enum ServiceItemCategory {
  CONSULTATION
  SURGERY
  LAB
  IMAGING
  PHARMACY
  WARD
  OTHER
}
```

### 1.2 Invoice Model Design (Separate from Transaction)

**Decision:** Invoice and InvoiceItem are **new standalone models** — not an extension of Transaction. A Transaction is a payment record (amount, method, shift). An Invoice is a bill (line items, subtotal, tax, discount). They are linked via `invoiceId` on Transaction (optional) or via sourceId/sourceType.

**Rationale:** The existing Transaction model is a flat payment record tied to a shift/cashier. Invoicing requires multi-line items, tax/discount, and payment status tracking. Merging them would bloat Transaction and break the existing shift-closing logic. The two models serve different purposes:
- **Transaction** = "money moved" (cash register record)
- **Invoice** = "bill issued" (what was charged)

A Transaction can reference an Invoice. When a payment is recorded against an Invoice, a Transaction is created and the Invoice's `amountPaid` / `paymentStatus` is updated.

### 1.3 Auto-Generated Invoice Numbering

**Decision:** Format `INV-{YYYY}-{5-digit-seq}` per hospital. Generated server-side using a raw SQL counter table approach.

**Implementation:**
```
SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 11) AS INTEGER)), 0) + 1
FROM invoices WHERE hospital_id = ? AND invoice_number LIKE 'INV-2026-%'
```

Use a Prisma raw query inside a transaction. The `@@unique([hospitalId, invoiceNumber])` constraint prevents race condition duplicates — if two concurrent requests generate the same number, the second will fail and retry. This is simpler than a separate counter table and sufficient for the expected volume (<100 invoices/day/hospital).

### 1.4 Chart of Accounts Structure

**Decision:** Single `Account` model with 5-type enum (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE), self-referential `parentId` for sub-accounts, string `code` for the numbering scheme (1xxx-5xxx).

**Standard chart (~25 accounts):**
```
1000  Assets
  1100  Cash on Hand
  1200  Bank Account
  1300  Accounts Receivable
  1400  Inventory
  1500  Fixed Assets (Control)
2000  Liabilities
  2100  Accounts Payable
  2200  Accrued Expenses
3000  Equity
  3100  Owner's Equity
  3200  Retained Earnings
4000  Revenue
  4100  Consultation Revenue
  4200  Pharmacy Revenue
  4300  Lab Revenue
  4400  Imaging Revenue
  4500  Surgery Revenue
  4600  Ward Revenue
  4700  Other Revenue
5000  Expenses
  5100  Salary Expense
  5200  Supplies Expense
  5300  Utilities Expense
  5400  Rent Expense
  5500  Equipment Expense
  5600  Maintenance Expense
  5700  Marketing Expense
  5800  Depreciation Expense
  5900  Other Expense
```

**Rationale:** 5-type structure matches the accounting equation (A = L + E). Self-referential parentId allows future expansion (e.g., 1110 Cash on Hand - Petty Cash). Seed via a `seedChartOfAccounts(hospitalId)` function called after hospital creation or on first login.

### 1.5 Journal Entry Auto-Generation

**Decision:** Extract into a shared utility `journalHelper.ts` that both Transaction and Expense creation endpoints call after successful record creation.

**Mapping tables:**

| Trigger | Debit Account | Credit Account |
|---|---|---|
| Transaction (CASH) | 1100 Cash on Hand | 4xxx Revenue (by TransactionType) |
| Transaction (CARD) | 1200 Bank Account | 4xxx Revenue (by TransactionType) |
| Transaction (BANK_TRANSFER) | 1200 Bank Account | 4xxx Revenue (by TransactionType) |
| Transaction (INSURANCE) | 1300 Accounts Receivable | 4xxx Revenue (by TransactionType) |
| Expense | 5xxx Expense (by category) | 1100/1200 Cash/Bank (by paymentMethod) |

**Rationale:** This keeps journal entry logic in one place. The utility function accepts `(type: 'transaction' | 'expense', record, userId, hospitalId)` and handles account resolution internally. Journal entries are created in the same DB transaction as the source record to ensure consistency.

### 1.6 Balance Sheet Computation

**Decision:** Compute on-the-fly from JournalEntryLine records at query time. No materialized/cached balance sheet.

**Algorithm:**
1. Get all JournalEntryLines where `entry.date <= asOfDate`
2. Sum debit/credit per account
3. Net balance per account = `sum(debit) - sum(credit)` (or reversed for revenue/equity)
4. Group by account type: ASSET, LIABILITY, EQUITY
5. Add accumulated depreciation from FixedAsset table for fixed assets
6. Compute Net Income = Total Revenue - Total Expenses
7. Verify: Assets = Liabilities + Equity + Net Income

**Rationale:** The journal entry table will be at most ~50K rows/year for this hospital. A composite index on `(accountId, entryId)` with `entry.date` makes this fast enough for real-time computation. No caching complexity needed at this scale.

### 1.7 Fixed Asset Depreciation

**Decision:** Straight-line method only (matching existing `depreciationMethod` field default). Monthly depreciation calculated on creation. Batch "Run Depreciation" endpoint processes all active assets for the current month.

**Formula:** `monthlyDepreciation = (acquisitionCost + installationCost - salvageValue) / (usefulLifeYears * 12)`

The `POST /accounting/fixed-assets/depreciation/run` endpoint:
1. Queries all `isActive = true` assets
2. For each: check if depreciation was already run this month (compare `updatedAt` month)
3. If not: increment `accumulatedDepreciation` by `monthlyDepreciation`, decrement `bookValue`
4. Create a JournalEntry: debit 5800 Depreciation Expense, credit a contra-asset account

### 1.8 Dual-Format Receipt (Thermal + A4)

**Decision:** Extend existing `printReceipt.js` with a `format` parameter. Same data structure, different HTML templates.

- **Thermal (80mm):** Current `buildReceiptHtml` — already works, no changes to logic
- **A4:** New `buildA4InvoiceHtml` function — full-width layout with hospital header, patient details, line items table, totals section, payment info, signature lines

Both functions accept the same data shape from `GET /accounting/invoices/:id/receipt`. The `printReceipt` export becomes:
```js
export async function printReceipt(data, format = 'thermal')
```

**Rationale:** Avoids a separate print utility. The thermal format is already battle-tested. The A4 format follows the same pattern as `DeliveryModal.jsx`'s `buildInvoiceHtml` but generalized.

---

## 2. Work Split

### 2.1 Sr Dev — Backend (T1-T8)

| Task | Complexity | Files | Dependencies | Notes |
|------|-----------|-------|-------------|-------|
| **T1: ServiceItem model + CRUD** | M | `schema.prisma`, `serviceCatalog.routes.ts`, `accounting.routes.ts` | None | Start here. Creates enum used by T2. |
| **T2: Invoice + InvoiceItem models + endpoints** | L | `schema.prisma`, `invoices.routes.ts`, `accounting.routes.ts` | T1 | 4 endpoints: list, create, get, record payment. Invoice number auto-gen. |
| **T3: Receipt data endpoint** | S | `invoices.routes.ts` | T2 | GET /invoices/:id/receipt — add to T2's route file |
| **T4a: Account + JournalEntry models + seed** | L | `schema.prisma`, `journal.routes.ts`, `seed.ts` | None | Split from T4 to parallelize. Models + seed data + basic CRUD. |
| **T4b: Journal entry CRUD + reversal endpoint** | L | `journal.routes.ts`, `accounting.routes.ts` | T4a | POST reversal endpoint, GET list with filters |
| **T5: Auto journal from Transaction/Expense** | L | `journalHelper.ts`, `transactions.routes.ts`, `expenses.routes.ts` | T4a | Shared utility, integrate into existing POST endpoints |
| **T6: Balance sheet endpoint** | L | `summary.routes.ts` | T4a | Add to existing summary routes file |
| **T7: Fixed asset CRUD + depreciation** | L | `fixedAssets.routes.ts`, `accounting.routes.ts` | T4a | CRUD + batch depreciation runner |
| **T8: Cost center CRUD + report** | M | `costCenters.routes.ts`, `accounting.routes.ts` | None | Model already exists. Pure endpoint work. |

**Critical path:** T1 → T2 → T3
**Parallel tracks:**
- Track A: T1 → T2 → T3
- Track B: T4a → T4b, T5, T6, T7
- Track C: T8 (independent, can start immediately)

**T4 is XL complexity — split into T4a and T4b:**
- **T4a** delivers models + seed + basic list/create endpoints. Unblocks T5, T6, T7, T13, T16.
- **T4b** adds advanced filtering, reversal endpoint, and full CRUD. Can be done after T4a.

### 2.2 Jr Dev — Frontend (T9-T16)

| Task | Complexity | Files | Dependencies | Notes |
|------|-----------|-------|-------------|-------|
| **T9: ServiceItemCatalog page + hooks** | M | `ServiceItemCatalog.jsx`, `useServiceCatalog.js` | T1 | Can start with mock data immediately |
| **T10: InvoicePage + hooks** | L | `InvoicePage.jsx`, `useAccountingInvoices.js` | T2, T9 | Must use `useAccountingInvoices` NOT `useInvoices` |
| **T11: Receipt printer dual format** | M | `printReceipt.js` (modify) | T3 | Extend existing file, add A4 builder |
| **T12: Enhance AccountingPage tabs** | S | `AccountingPage.jsx` (modify) | T9, T10 | Add Invoices + Service Items tabs |
| **T13: ChartOfAccounts + JournalEntryList + hooks** | L | `ChartOfAccounts.jsx`, `JournalEntryList.jsx`, `useJournal.js` | T4a | Can start with mock data immediately |
| **T14: BalanceSheet page + hook** | M | `BalanceSheet.jsx`, `useBalanceSheet.js` | T6 | Standard three-column layout |
| **T15: FixedAssetRegister page + hook** | M | `FixedAssetRegister.jsx`, `useFixedAssets.js` | T7 | Table + create modal + Run Depreciation button |
| **T16: useServiceCatalog + useJournal hooks** | S | `useServiceCatalog.js`, `useJournal.js` | T1, T4a | Can start immediately with mock shapes |

**Parallel tracks:**
- Track A: T9 → T10 → T12 (with T11 parallel to T10)
- Track B: T13 (parallel, mock data first)
- Track C: T14, T15 (sequential after their backend deps)
- Track D: T16 (parallel, hooks-first approach)

---

## 3. Key Gotchas

### 3.1 Import Paths
All files under `frontend/src/features/accounting/` must import UI components using the **long relative path**:
```jsx
import { Card } from '../../components/ui/Card';
```
**NOT** `../ui/Card`. This is because `features/accounting/` is two levels deep from `src/`.

### 3.2 No Code Comments
The codebase has zero comments. Do not add any. Code must be self-documenting through clear naming.

### 3.3 safeStringify, Not JSON.stringify
Use `safeStringify` from `@voltagent/internal` instead of `JSON.stringify`. This is enforced across the backend. Any use of `JSON.stringify` will be rejected in review.

### 3.4 Zod v4 Syntax
Zod schemas use v4 syntax:
```ts
z.record(z.string(), z.unknown())  // NOT z.record(z.string(), z.any())
```

### 3.5 Loading / Empty / Error States
Every new page and component must handle three states:
1. **Loading:** Spinner/skeleton while query is in flight
2. **Empty:** Meaningful message when data array is empty
3. **Error:** Error message with retry option

Follow the pattern in `AccountingPage.jsx` where each tab checks these states.

### 3.6 JSX Fragment Matching
Every opening `<>` must have a matching `</>`. The linter catches this but it's a common source of build failures.

### 3.7 TypeScript Check
After all changes, run `tsc --noEmit` from the frontend directory. Fix ALL errors before marking a task complete. The project uses TypeScript for new files and strict mode is enabled.

### 3.8 Route Registration
All new accounting backend routes are mounted at `/api/accounting/*` via `accounting.routes.ts`:
```ts
router.use('/service-items', serviceCatalogRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/journal-entries', journalRoutes);
router.use('/fixed-assets', fixedAssetsRoutes);
router.use('/cost-centers', costCentersRoutes);
```

### 3.9 useInvoices Naming Conflict
There is already a `frontend/src/hooks/queries/useInvoices.js` used by POS. The accounting-specific hook file **must** be named `useAccountingInvoices.js` to avoid import collisions. Its query keys must use the `accountingInvoices` namespace.

### 3.10 Invoice Number Auto-Generation
Format: `INV-{YEAR}-{5-digit-seq}` per hospital.
- Year is the current calendar year
- Sequence resets each year
- Concurrent generation protected by `@@unique([hospitalId, invoiceNumber])` + retry on conflict
- Example: `INV-2026-00001`, `INV-2026-00042`

### 3.11 Hospital Scoping
Every new model includes `hospitalId String?` and every query filters by `req.user!.hospitalId`. This is non-negotiable. The `authenticate` middleware sets `req.user` with `hospitalId`.

### 3.12 Decimal Handling
All monetary fields in Prisma use `@db.Decimal(10, 2)`. When creating records, pass `parseFloat(value)` — Prisma handles Decimal serialization. When reading, use `Number(value)` to convert.

### 3.13 Audit Trail
Use `auditMiddleware` for all write operations:
```ts
auditMiddleware('CREATE_SERVICE_ITEM', 'ServiceItem')
```
Follow the pattern in `expenses.routes.ts` and `transactions.routes.ts`.

### 3.14 Permission Constants
Use `PERMISSIONS.ACCOUNTING_READ` and `PERMISSIONS.ACCOUNTING_WRITE` from `rbac.js` for all new endpoints. Do not hardcode permission strings.

### 3.15 Existing Enum Reuse
The `PaymentStatus` enum already exists with values `PaidInFull`, `PartialPayment`, `Pending`. Reuse it on Invoice model — do not create a duplicate enum.

---

## 4. Data Flow Diagram

### 4.1 Transaction → Invoice → Journal Entry Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE POINT (POS / Clinic)                 │
│  Patient pays for consultation → cashier clicks "Pay"            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/accounting/invoices                                  │
│  { patientId, sourceType: "CONSULTATION", items: [...],         │
│    discount: 0, notes: "..." }                                   │
│                                                                 │
│  1. Generate invoiceNumber: INV-2026-00042                      │
│  2. Create Invoice (subtotal, tax, total, amountPaid: 0)        │
│  3. Create InvoiceItem rows (serviceItemId, qty, unitPrice)     │
│  4. Return Invoice with items                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/accounting/invoices/:id/payment                      │
│  { amount: 50000, paymentMethod: "CASH" }                       │
│                                                                 │
│  1. Create Transaction (amount, paymentMethod, shiftId, etc.)   │
│  2. Update Invoice.amountPaid += 50000                          │
│  3. Recalculate Invoice.paymentStatus:                          │
│     - amountPaid >= total → PaidInFull                           │
│     - amountPaid > 0 && < total → PartialPayment                │
│     - amountPaid === 0 → Pending                                │
│  4. Call journalHelper('transaction', tx)                        │
│     → Creates JournalEntry:                                     │
│        Debit:  1100 Cash on Hand       50,000                   │
│        Credit: 4100 Consultation Rev   50,000                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  JOURNAL LEDGER                                                 │
│  ┌─────────┬────────────┬───────┬────────┬──────────┐           │
│  │ Entry#  │ Date       │ Acct  │ Debit  │ Credit   │           │
│  ├─────────┼────────────┼───────┼────────┼──────────┤           │
│  │ JE-0042 │ 2026-07-17 │ 1100  │ 50,000 │          │           │
│  │ JE-0042 │ 2026-07-17 │ 4100  │        │ 50,000   │           │
│  └─────────┴────────────┴───────┴────────┴──────────┘           │
│                                                                 │
│  BALANCE SHEET auto-computed from journal lines:                 │
│  Assets += 50,000 (Cash on Hand)                                │
│  Equity += 50,000 (via Retained Earnings → Revenue)             │
│  Assets = Liabilities + Equity ✓                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Expense → Journal Entry Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/accounting/expenses                                  │
│  { amount: 15000, category: "SUPPLIES", paymentMethod: "CASH",  │
│    description: "Office supplies", departmentId: "..." }         │
│                                                                 │
│  1. Create Expense record                                       │
│  2. Call journalHelper('expense', expense)                       │
│     → Creates JournalEntry:                                     │
│        Debit:  5200 Supplies Expense  15,000                     │
│        Credit: 1100 Cash on Hand      15,000                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Exact File List

### 5.1 New Files to Create

| # | Path | Purpose | Owner |
|---|------|---------|-------|
| 1 | `backend/prisma/migrations/XXXXXX_add_billing_models.sql` | Auto-generated migration for ServiceItem, Invoice, InvoiceItem, Account, JournalEntry, JournalEntryLine | Sr |
| 2 | `backend/src/modules/accounting/routes/serviceCatalog.routes.ts` | ServiceItem CRUD endpoints | Sr |
| 3 | `backend/src/modules/accounting/routes/invoices.routes.ts` | Invoice CRUD + payment recording + receipt endpoint | Sr |
| 4 | `backend/src/modules/accounting/routes/journal.routes.ts` | Account CRUD, JournalEntry CRUD, reversal endpoint | Sr |
| 5 | `backend/src/modules/accounting/routes/fixedAssets.routes.ts` | FixedAsset CRUD + depreciation runner | Sr |
| 6 | `backend/src/modules/accounting/routes/costCenters.routes.ts` | CostCenter CRUD + department report | Sr |
| 7 | `backend/src/modules/accounting/utils/journalHelper.ts` | Shared utility for auto-generating journal entries | Sr |
| 8 | `backend/prisma/seed.ts` (or extend existing seed) | Chart of accounts seed function | Sr |
| 9 | `frontend/src/features/accounting/ServiceItemCatalog.jsx` | Service item management page | Jr |
| 10 | `frontend/src/features/accounting/InvoicePage.jsx` | Invoice list, create, detail, payment | Jr |
| 11 | `frontend/src/features/accounting/ChartOfAccounts.jsx` | Account tree view | Jr |
| 12 | `frontend/src/features/accounting/JournalEntryList.jsx` | Journal entries with expandable lines | Jr |
| 13 | `frontend/src/features/accounting/BalanceSheet.jsx` | Three-column balance sheet | Jr |
| 14 | `frontend/src/features/accounting/FixedAssetRegister.jsx` | Asset register + depreciation | Jr |
| 15 | `frontend/src/hooks/queries/useServiceCatalog.js` | React Query hooks for ServiceItem API | Jr |
| 16 | `frontend/src/hooks/queries/useAccountingInvoices.js` | React Query hooks for Invoice API (NOT useInvoices) | Jr |
| 17 | `frontend/src/hooks/queries/useJournal.js` | React Query hooks for Account + JournalEntry API | Jr |
| 18 | `frontend/src/hooks/queries/useBalanceSheet.js` | React Query hook for balance sheet | Jr |
| 19 | `frontend/src/hooks/queries/useFixedAssets.js` | React Query hooks for FixedAsset API | Jr |

### 5.2 Files to Modify

| # | Path | Change | Owner |
|---|------|--------|-------|
| 1 | `backend/prisma/schema.prisma` | Add 6 models + 2 enums (ServiceItemCategory, InvoiceSourceType, AccountType, JournalEntryStatus) + add `serviceItems`, `invoices`, `invoiceItems` relations to Hospital | Sr |
| 2 | `backend/src/modules/accounting/accounting.routes.ts` | Register 5 new route modules | Sr |
| 3 | `backend/src/modules/accounting/routes/transactions.routes.ts` | Add journalHelper call in POST `/` | Sr |
| 4 | `backend/src/modules/accounting/routes/expenses.routes.ts` | Add journalHelper call in POST `/` | Sr |
| 5 | `backend/src/modules/accounting/routes/summary.routes.ts` | Add GET `/balance-sheet` endpoint | Sr |
| 6 | `frontend/src/features/accounting/AccountingPage.jsx` | Add Invoices + Service Items tabs | Jr |
| 7 | `frontend/src/lib/printReceipt.js` | Add A4 format support, accept `format` param | Jr |
| 8 | `frontend/src/app/App.jsx` | Add routes for ServiceItemCatalog, InvoicePage, ChartOfAccounts, JournalEntryList, BalanceSheet, FixedAssetRegister | Jr |
| 9 | `frontend/src/config/navigation.tsx` | Add nav items: Service Items, Invoices, Chart of Accounts, Journal, Balance Sheet, Fixed Assets under Finance group | Jr |

---

## 6. Pattern References

| Pattern | Follow This File |
|---------|-----------------|
| Route structure (Express router + auth + asyncHandler + audit) | `backend/src/modules/accounting/routes/expenses.routes.ts` |
| Hospital-scoped query with filters | `backend/src/modules/accounting/routes/transactions.routes.ts:11-43` |
| Zod-like validation without Zod (manual checks + ValidationError) | `backend/src/modules/accounting/routes/transactions.routes.ts:60` |
| Prisma model with Decimal, optional relations, hospital scoping | `backend/prisma/schema.prisma:975-1019` (Transaction model) |
| PaymentStatus enum usage | `backend/prisma/schema.prisma:1962-1966` |
| React Query hook (query) | `frontend/src/hooks/queries/useAccounting.js:16-21` |
| React Query hook (mutation + invalidation) | `frontend/src/hooks/queries/useAccounting.js:71-77` |
| Query key factory pattern | `frontend/src/hooks/queries/useAccounting.js:4-14` |
| Page with tabs + loading/empty/error states | `frontend/src/features/accounting/AccountingPage.jsx` |
| Import paths from features/accounting | `frontend/src/features/accounting/AccountingPage.jsx:4-13` |
| Thermal receipt HTML template | `frontend/src/lib/printReceipt.js:17-61` |
| A4 invoice HTML (for reference) | `frontend/src/features/pos/DeliveryModal.jsx` (buildInvoiceHtml) |
| Route definition in App.jsx | `frontend/src/app/App.jsx:138` |
| Nav item with permissions | `frontend/src/config/navigation.tsx:121-128` |
| Lazy import pattern | `frontend/src/app/App.jsx:31` |
| RoleGuard with permissions | `frontend/src/app/App.jsx:138` |

---

## 7. Migration Strategy

After all schema changes are made:
1. `npx prisma migrate dev --name add_billing_models` — generates migration
2. `npx prisma generate` — regenerates client
3. Run seed function for chart of accounts: `npx tsx prisma/seed.ts --chart-only`
4. Verify: `npx prisma studio` — confirm all 6 new tables exist

---

## 8. Testing Checklist

- [ ] ServiceItem CRUD: create, list (filtered by category), update, soft-delete
- [ ] Invoice creation: auto-number generation, line items saved, totals computed
- [ ] Invoice payment: amountPaid accumulates, paymentStatus transitions correctly
- [ ] Receipt endpoint: returns complete data for both thermal and A4
- [ ] Journal entries auto-created for transactions (all 4 payment methods)
- [ ] Journal entries auto-created for expenses (all 8 categories)
- [ ] Balance sheet: assets = liabilities + equity (always balanced)
- [ ] Fixed asset depreciation: monthly run increments correctly
- [ ] Cost center report: shows department expenses and revenue
- [ ] All frontend pages load without errors
- [ ] All pages have loading/empty/error states
- [ ] Thermal receipt prints correctly
- [ ] A4 receipt prints correctly
- [ ] Navigation shows all new items with correct permissions
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes
