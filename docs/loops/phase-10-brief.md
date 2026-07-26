# Phase 10 Brief: Billing & Accounting

## 1. Phase Goal

Build a comprehensive financial system — unified invoice generation from all service points, payment collection with multi-format receipt printing, shift-based cashier management, expense tracking, chart of accounts with journal entries, P&L and balance sheet reporting, and a fixed asset register with depreciation — extending a substantially-built accounting foundation.

---

## 2. Executive Summary — What Already Exists

| Functionality | Status | Location |
|---|---|---|
| Transaction model (flat records: type, amount, paymentMethod, shiftId, cashierId, departmentId, patientId, surgeryId, diagnosticOrderId, imagingOrderId, appointmentId) | ✅ Built | `backend/prisma/schema.prisma:975-1019` |
| TransactionType enum (all revenue types + EXPENSE + REFUND + WARD + PRESCRIPTION + SURGERY + CONSULTATION + LAB + IMAGING) | ✅ Built | `schema.prisma` (enum) |
| PaymentMethod enum (CASH, CARD, INSURANCE, BANK_TRANSFER, OTHER) | ✅ Built | `schema.prisma` (enum) |
| Shift model (openingBalance, closingBalance, actualTotal, status, denominations JSON) | ✅ Built | `schema.prisma:1059-1083` |
| CashMovement model (type: PICKUP/DROP/ADJUSTMENT, amount, shiftId) | ✅ Built | `schema.prisma:1085-1103` |
| Expense model (amount, category enum 8 values, description, date, departmentId) | ✅ Built | `schema.prisma:225-249` |
| AccountsPayable model (creditor, amount, amountPaid, dueDate, paymentStatus) | ✅ Built | `schema.prisma:1388-1407` |
| Supplier model (name, contactPerson, phone, email, category) | ✅ Built | `schema.prisma:1409-1428` |
| SupplierInvoice model (invoiceNumber, invoiceTotal, amountPaid, paymentStatus) | ✅ Built | `schema.prisma:1430-1457` |
| SupplierInvoiceItem model (quantity, unitPrice) | ✅ Built | `schema.prisma:1459-1479` |
| CostCenter model (code, name, departmentId unique) | ✅ Built | `schema.prisma:1481-1501` |
| FixedAsset model (acquisitionCost, usefulLifeYears, salvageValue, depreciationMethod, monthlyDepreciation, accumulatedDepreciation, bookValue) | ✅ Built | `schema.prisma:1619-1647` |
| GET /accounting/summary (today/week/month/allTime with COGS, grossProfit, byMethod, byType) | ✅ Built | `backend/src/modules/accounting/routes/summary.routes.ts:9-55` |
| GET /accounting/revenue-by-day (daily totals over N days) | ✅ Built | `summary.routes.ts:57-82` |
| GET /accounting/revenue-by-type (groupBy TransactionType) | ✅ Built | `summary.routes.ts:84-92` |
| GET /accounting/revenue-by-department (groupBy departmentId, with date filter) | ✅ Built | `summary.routes.ts:94-124` |
| GET /accounting/pnl (revenue by dept, expenses by dept, COGS, net profit) | ✅ Built | `summary.routes.ts:126-202` |
| GET/POST /accounting/transactions (list with filters, create) | ✅ Built | `backend/src/modules/accounting/routes/transactions.routes.ts` |
| GET/POST /accounting/expenses (list with filters, create) | ✅ Built | `backend/src/modules/accounting/routes/expenses.routes.ts` |
| POST /accounting/shifts/open, POST /accounting/shifts/close (with denominations JSON) | ✅ Built | `backend/src/modules/accounting/routes/shifts.routes.ts` |
| GET/POST/PUT /accounting/debts (CRUD + payment recording) | ✅ Built | `backend/src/modules/accounting/routes/debts.routes.ts` |
| GET/POST /accounting/cash-movements (list by shiftId, create) | ✅ Built | `backend/src/modules/accounting/routes/cashMovements.routes.ts` |
| POS pharmacy/optics/hospital item endpoints | ✅ Built | `backend/src/modules/pos/routes/{pharmacy,optics,hospital}.routes.ts` |
| POS supplier CRUD + invoice CRUD + delivery management | ✅ Built | `backend/src/modules/pos/routes/{suppliers,invoices}.routes.ts` |
| AccountingPage.jsx — full page with tabs: Summary, Transactions, Expenses, Debts, Shifts, P&L | ✅ Built | `frontend/src/features/accounting/AccountingPage.jsx` (~1258 lines) |
| useAccounting.js — 12+ React Query hooks (summary, revenueByDay, revenueByType, revenueByDepartment, transactions, expenses, pnl, shifts, debts, currentShift, openShift, closeShift, cashMovements, createCashMovement) | ✅ Built | `frontend/src/hooks/queries/useAccounting.js` |
| printReceipt.js — HTML receipt builder for 80mm thermal printer with hospital branding | ✅ Built | `frontend/src/lib/printReceipt.js` |
| DeliveryModal.jsx — supplier invoice creation form + print (A4 HTML invoice) | ✅ Built | `frontend/src/features/pos/DeliveryModal.jsx` |
| useInvoices.js — React Query hooks for POS invoice CRUD | ✅ Built | `frontend/src/hooks/queries/useInvoices.js` |
| InventoryPOS.jsx — delivery invoices list tab | ✅ Built | `frontend/src/features/pos/InventoryPOS.jsx` |
| ReportsPage.jsx — uses usePnL hook | ✅ Built | `frontend/src/features/reports/ReportsPage.jsx` |
| Navigation config for /accounting route with `accounting:read` permission | ✅ Built | `frontend/src/config/navigation.tsx:125-134` |

| Gap | Status | Impact |
|---|---|---|
| Unified service/item catalog (billable items with prices for consultations, surgeries, lab tests, imaging, pharmacy, ward charges) | ❌ Missing | High — plan task #1 |
| Invoice + InvoiceItem models (separate from Transaction) for multi-line-item invoicing | ❌ Missing | High — plan task #2 |
| Unified invoice generation from any service point (consultation → invoice, pharmacy sale → invoice, lab order → invoice, etc.) | ❌ Missing | High — plan task #2 |
| A4 receipt/invoice print format (printReceipt.js only does 80mm thermal; DeliveryModal has a separate A4 buildInvoiceHtml but only for supplier deliveries) | ⚠️ Partial | Medium — plan task #4 |
| Chart of accounts / Account model | ❌ Missing | High — plan task #7 |
| Journal entries / General ledger | ❌ Missing | High — plan task #7 |
| Balance sheet endpoint and UI | ❌ Missing | High — plan task #9 |
| Fixed asset register UI (model exists, no frontend) | ❌ Missing | Medium — plan task #11 |
| Expense receipt attachment upload | ❌ Missing | Low — plan task #6 |
| Expense budget tracking per department/category | ❌ Missing | Low |
| Cost center management UI (model exists, no routes or UI) | ❌ Missing | Medium |

---

## 3. Tasks

### Backend Tasks

#### T1: Add `ServiceItem` model and CRUD endpoints — unified billable items catalog
- **File:** `backend/prisma/schema.prisma` (add model), `backend/src/modules/accounting/routes/serviceCatalog.routes.ts` (new)
- **Change:** Add `ServiceItem` model with fields: `id`, `name`, `nameAr`, `category` (enum: CONSULTATION, SURGERY, LAB, IMAGING, PHARMACY, WARD, OTHER), `price` (Decimal), `costPrice` (Decimal, default 0), `isActive` (Boolean), `hospitalId`, `created_at`, `updated_at`. Add GET/POST/PATCH/DELETE endpoints under `/accounting/service-items` with hospital scoping, category filter, and pagination. Register routes in `accounting.routes.ts`.
- **Complexity:** M
- **Dependencies:** None

#### T2: Add `Invoice` and `InvoiceItem` models + invoice generation endpoint
- **File:** `backend/prisma/schema.prisma` (add models), `backend/src/modules/accounting/routes/invoices.routes.ts` (new)
- **Change:** Add `Invoice` model: `id`, `invoiceNumber` (unique per hospital, auto-generated), `patientId`, `sourceType` (enum: CONSULTATION, PHARMACY, LAB, IMAGING, SURGERY, WARD, MANUAL), `sourceId` (optional — links to originating record), `subtotal`, `discount`, `tax`, `total`, `amountPaid`, `paymentStatus` (Pending/PartialPayment/PaidInFull), `notes`, `hospitalId`, `createdBy`, `created_at`. Add `InvoiceItem` model: `id`, `invoiceId`, `serviceItemId`, `description`, `quantity`, `unitPrice`, `total`. Add `POST /accounting/invoices` (create invoice with line items), `GET /accounting/invoices` (list with filters: patientId, sourceType, paymentStatus, date range), `GET /accounting/invoices/:id` (with items + patient), `PATCH /accounting/invoices/:id/payment` (record payment, update amountPaid and paymentStatus). Register in `accounting.routes.ts`.
- **Complexity:** L
- **Dependencies:** T1 (references ServiceItem)

#### T3: Add `GET /accounting/invoices/:id/receipt` endpoint returning structured receipt data
- **File:** `backend/src/modules/accounting/routes/invoices.routes.ts`
- **Change:** Add endpoint that returns invoice with items, patient info, hospital info, cashier name, and payment history — structured for both thermal and A4 rendering on the frontend. Include computed fields: `balance`, `itemsTotal` (sum of line items), `paymentHistory` (from CashMovements linked to this invoice if applicable).
- **Complexity:** S
- **Dependencies:** T2

#### T4: Add `Account` model (chart of accounts) and `JournalEntry` + `JournalEntryLine` models
- **File:** `backend/prisma/schema.prisma` (add models), `backend/src/modules/accounting/routes/journal.routes.ts` (new)
- **Change:** Add `Account` model: `id`, `code` (unique), `name`, `type` (enum: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE), `parentId` (self-referential for sub-accounts), `isActive`, `hospitalId`. Add `JournalEntry` model: `id`, `entryNumber`, `date`, `description`, `reference` (optional — links to invoice/expense/etc.), `hospitalId`, `createdBy`, `created_at`. Add `JournalEntryLine` model: `id`, `entryId`, `accountId`, `debit` (Decimal, default 0), `credit` (Decimal, default 0). Add seed data for standard chart of accounts (~20-30 accounts: 1xxx Assets, 2xxx Liabilities, 3xxx Equity, 4xxx Revenue, 5xxx Expenses). Add GET/POST endpoints for accounts, journal entries with lines. Add `POST /accounting/journal-entries/reverse` for reversal entries. Register routes.
- **Complexity:** XL
- **Dependencies:** None

#### T5: Auto-generate journal entries from Transaction and Expense creation
- **File:** `backend/src/modules/accounting/routes/transactions.routes.ts`, `expenses.routes.ts`
- **Change:** After creating a Transaction, auto-create a JournalEntry with two lines: debit the appropriate Cash/Bank account (based on paymentMethod), credit the Revenue account (based on TransactionType). After creating an Expense, auto-create a JournalEntry: debit the Expense account (based on category), credit Cash/Bank. Extract this into a shared utility `backend/src/modules/accounting/utils/journalHelper.ts`. Both transaction and expense creation must call this helper.
- **Complexity:** L
- **Dependencies:** T4, existing Transaction and Expense creation endpoints

#### T6: Add `GET /accounting/balance-sheet` endpoint
- **File:** `backend/src/modules/accounting/routes/summary.routes.ts`
- **Change:** Add endpoint that computes balance sheet as of a given date: Assets (sum of all Asset-type accounts from journal entry lines, minus accumulated depreciation from FixedAsset), Liabilities (sum of Liability-type accounts), Equity (sum of Equity-type accounts + net income from Revenue - Expenses). Return `{ assets: { current: [...], fixed: [...], total }, liabilities: { current: [...], longTerm: [...], total }, equity: { total }, balanceCheck: assets === liabilities + equity }`. Accept optional `asOfDate` query param (default: today).
- **Complexity:** L
- **Dependencies:** T4

#### T7: Add `GET /accounting/fixed-assets` and CRUD endpoints + depreciation calculation
- **File:** `backend/src/modules/accounting/routes/fixedAssets.routes.ts` (new)
- **Change:** Add GET (list with filters: assetType, isActive), POST (create — auto-calculate monthlyDepreciation and bookValue on creation), PATCH (update — recalculate on cost/ life changes), DELETE (soft). Add `POST /accounting/fixed-assets/depreciation/run` — batch endpoint that iterates all active assets, calculates current month depreciation, increments accumulatedDepreciation, decrements bookValue, creates a JournalEntry (debit Depreciation Expense, credit Accumulated Depreciation). Register in `accounting.routes.ts`.
- **Complexity:** L
- **Dependencies:** T4

#### T8: Add `GET /accounting/cost-centers` and CRUD endpoints
- **File:** `backend/src/modules/accounting/routes/costCenters.routes.ts` (new)
- **Change:** The `CostCenter` model already exists but has no API endpoints. Add GET (list active), POST (create — validate unique code per hospital), PATCH (update), DELETE (soft). Add `GET /accounting/cost-centers/:id/report` that returns expenses and revenue assigned to that cost center's department. Register in `accounting.routes.ts`.
- **Complexity:** M
- **Dependencies:** None

### Frontend Tasks

#### T9: Build ServiceItemCatalog page — manage billable items
- **File:** `frontend/src/features/accounting/ServiceItemCatalog.jsx` (new), `frontend/src/hooks/queries/useServiceCatalog.js` (new)
- **Change:** New page component with a table listing all service items (name, category badge, price, costPrice, isActive toggle). Add "New Item" modal form: name, nameAr, category dropdown, price, costPrice. Add edit inline or modal. Add category filter tabs. Add search input. Wire up React Query hooks (useServiceItems, useCreateServiceItem, useUpdateServiceItem). Add route in App.jsx and nav item under Accounting section.
- **Complexity:** M
- **Dependencies:** T1

#### T10: Build InvoicePage — list, create, and manage invoices
- **File:** `frontend/src/features/accounting/InvoicePage.jsx` (new), `frontend/src/hooks/queries/useInvoices.js` (new — accounting-specific, distinct from POS useInvoices)
- **Change:** New page with: invoice list table (invoiceNumber, patient, sourceType badge, total, amountPaid, balance, status badge, date), filters (sourceType, paymentStatus, date range, patient search), "Create Invoice" button. Create Invoice modal: patient search, source type dropdown, add line items (service item search + qty + price — auto-populated from ServiceItem), discount, notes. View Invoice detail panel: full line items, payment history, "Record Payment" button, "Print Receipt" button. Wire React Query hooks (useAccountingInvoices, useAccountingInvoice, useCreateAccountingInvoice, useRecordInvoicePayment). Add route and nav item.
- **Complexity:** L
- **Dependencies:** T2, T9

#### T11: Build ReceiptPrinter utility — dual-format receipt generation
- **File:** `frontend/src/lib/printReceipt.js` (modify existing)
- **Change:** Extend existing printReceipt.js to support two formats: `thermal80mm` (current behavior, already works) and `a4` (new — full A4 invoice layout with hospital logo, header, patient info, line items table, totals, payment details, footer with signature lines). Add `formatReceipt(invoiceData, format)` function that returns HTML string. The `format` param is `'thermal'` or `'a4'`. Both formats reuse the same data structure from T3's receipt endpoint. Update `printReceipt` to accept format param.
- **Complexity:** M
- **Dependencies:** T3

#### T12: Enhance AccountingPage — add Invoice tab and Service Catalog tab
- **File:** `frontend/src/features/accounting/AccountingPage.jsx` (modify existing)
- **Change:** Add two new tabs to the existing tab bar: "Invoices" (embeds InvoicePage content or links to it) and "Service Items" (embeds ServiceItemCatalog or links). Alternatively, if the pages are large enough to warrant separate routes, add sub-navigation under the accounting section. Ensure existing tabs (Summary, Transactions, Expenses, Debts, Shifts, P&L) continue working unchanged.
- **Complexity:** S
- **Dependencies:** T10, T9

#### T13: Build ChartOfAccounts page and JournalEntryList
- **File:** `frontend/src/features/accounting/ChartOfAccounts.jsx` (new), `frontend/src/features/accounting/JournalEntryList.jsx` (new), `frontend/src/hooks/queries/useJournal.js` (new)
- **Change:** ChartOfAccounts page: tree/table view of all accounts grouped by type (Asset/Liability/Equity/Revenue/Expense), each showing code, name, balance (computed from journal lines), expandable to show sub-accounts. Add "New Account" modal. JournalEntryList page: table of journal entries (entryNumber, date, description, reference, totalDebit, totalCredit), click to expand and see individual lines (account, debit, credit). Add filters: date range, account, reference type. Add "New Journal Entry" modal (manual entry with dynamic line rows). Wire React Query hooks. Add routes and nav items under Accounting.
- **Complexity:** L
- **Dependencies:** T4

#### T14: Build BalanceSheet page
- **File:** `frontend/src/features/accounting/BalanceSheet.jsx` (new), `frontend/src/hooks/queries/useBalanceSheet.js` (new)
- **Change:** New page that calls `GET /accounting/balance-sheet` and renders a standard balance sheet layout: three-column format (Assets | Liabilities + Equity). Each section shows line items from the account groups, subtotals, and grand total. Include date picker to view as of any date. Add print button that renders A4 HTML for printing. Wire React Query hook. Add route and nav item.
- **Complexity:** M
- **Dependencies:** T6

#### T15: Build FixedAssetRegister page
- **File:** `frontend/src/features/accounting/FixedAssetRegister.jsx` (new), `frontend/src/hooks/queries/useFixedAssets.js` (new)
- **Change:** New page with table: asset name, type, acquisition cost, useful life, depreciation method, monthly depreciation, accumulated depreciation, book value, status. Add "New Asset" modal: name, assetType (dropdown: Medical Equipment, Furniture, Vehicle, Building, IT Equipment, Other), acquisitionCost, installationCost, usefulLifeYears, salvageValue, purchaseDate, location, serialNumber, notes. Auto-calculate monthlyDepreciation and bookValue in the form preview. Add "Run Depreciation" button (calls batch endpoint). Add asset type filter. Wire React Query hooks. Add route and nav item.
- **Complexity:** M
- **Dependencies:** T7

#### T16: Add `useServiceCatalog.js` and `useJournal.js` React Query hooks
- **File:** `frontend/src/hooks/queries/useServiceCatalog.js` (new), `frontend/src/hooks/queries/useJournal.js` (new)
- **Change:** useServiceCatalog.js: `useServiceItems(params)`, `useCreateServiceItem()`, `useUpdateServiceItem()`. useJournal.js: `useAccounts()`, `useCreateAccount()`, `useJournalEntries(params)`, `useJournalEntry(id)`, `useCreateJournalEntry()`, `useReverseJournalEntry()`. Follow existing hook pattern from useAccounting.js (api.get/post/patch, React Query, query key factory, invalidation).
- **Complexity:** S
- **Dependencies:** T1, T4 (can be developed in parallel with page tasks using mock data)

---

## 4. Acceptance Criteria

- [ ] `ServiceItem` model exists with CRUD endpoints; GET /accounting/service-items returns list filtered by category
- [ ] `Invoice` and `InvoiceItem` models exist; POST /accounting/invoices creates invoice with line items and auto-generates invoiceNumber
- [ ] GET /accounting/invoices/:id returns invoice with items, patient info, and payment status
- [ ] PATCH /accounting/invoices/:id/payment updates amountPaid and sets paymentStatus correctly (Pending → PartialPayment → PaidInFull)
- [ ] Receipt data endpoint returns structured data usable by both thermal and A4 formatters
- [ ] `Account` model exists with standard chart of accounts seeded (~20-30 accounts)
- [ ] `JournalEntry` + `JournalEntryLine` models exist; creating a Transaction auto-generates a journal entry (debit Cash/Bank, credit Revenue)
- [ ] Creating an Expense auto-generates a journal entry (debit Expense account, credit Cash/Bank)
- [ ] GET /accounting/balance-sheet returns assets, liabilities, equity with balance check (assets === liabilities + equity)
- [ ] FixedAsset CRUD exists; POST /accounting/fixed-assets/depreciation/run processes all active assets and creates depreciation journal entries
- [ ] CostCenter CRUD endpoints exist; GET /accounting/cost-centers/:id/report returns department expense/revenue summary
- [ ] ServiceItemCatalog page renders item list with category filter and create/edit modals
- [ ] InvoicePage renders invoice list with filters, create modal with line items, detail view with payment recording
- [ ] Receipt printing works in both 80mm thermal and A4 format from invoice detail view
- [ ] ChartOfAccounts page renders account tree grouped by type with balances
- [ ] JournalEntryList page renders entries with expandable line items and date filters
- [ ] BalanceSheet page renders standard three-column balance sheet with date picker
- [ ] FixedAssetRegister page renders asset list with create modal showing auto-calculated depreciation
- [ ] All new pages have routes in App.jsx and nav items in navigation config
- [ ] All new hooks follow the existing pattern (api helper, React Query, query key factories)
- [ ] All new backend endpoints are hospital-scoped (filter by `hospitalId` from authenticated user)

---

## 5. Work Split

### Sr Dev — Database, Core Logic, Backend Endpoints

| Task | File(s) | Description |
|------|---------|-------------|
| T1: ServiceItem model + CRUD endpoints | `schema.prisma`, `serviceCatalog.routes.ts`, `accounting.routes.ts` | New model and full CRUD with hospital scoping |
| T2: Invoice + InvoiceItem models + endpoints | `schema.prisma`, `invoices.routes.ts`, `accounting.routes.ts` | New models, invoice number generation, payment recording |
| T3: Receipt data endpoint | `invoices.routes.ts` | Structured receipt response |
| T4: Account + JournalEntry models + endpoints + seed | `schema.prisma`, `journal.routes.ts`, `accounting.routes.ts`, `seed.js` | Chart of accounts model, journal entry CRUD, seed data |
| T5: Auto journal entries from Transaction/Expense | `transactions.routes.ts`, `expenses.routes.ts`, `journalHelper.ts` | Utility function + integration into existing creation flows |
| T6: Balance sheet endpoint | `summary.routes.ts` | Computed balance sheet from journal entry lines |
| T7: Fixed asset CRUD + depreciation runner | `fixedAssets.routes.ts`, `accounting.routes.ts` | Full CRUD + batch depreciation calculation |
| T8: Cost center CRUD + report | `costCenters.routes.ts`, `accounting.routes.ts` | Existing model needs endpoints |

**Coordination points:** T2 depends on T1 (ServiceItem reference). T5 depends on T4 (journal accounts). T6 and T7 depend on T4 (journal entries). T3 depends on T2 (invoice model).

### Jr Dev — UI Components, Pages, Route Integration

| Task | File(s) | Description |
|------|---------|-------------|
| T9: ServiceItemCatalog page + hooks | `ServiceItemCatalog.jsx`, `useServiceCatalog.js` | Start immediately with mock data, finalize when T1 is done |
| T10: InvoicePage + hooks | `InvoicePage.jsx`, `useInvoices.js` (accounting) | Depends on T2 |
| T11: Receipt printer dual format | `printReceipt.js` | Depends on T3 |
| T12: Enhance AccountingPage tabs | `AccountingPage.jsx` | Depends on T9, T10 |
| T13: ChartOfAccounts + JournalEntryList + hooks | `ChartOfAccounts.jsx`, `JournalEntryList.jsx`, `useJournal.js` | Start immediately with mock data, finalize when T4 is done |
| T14: BalanceSheet page + hook | `BalanceSheet.jsx`, `useBalanceSheet.js` | Depends on T6 |
| T15: FixedAssetRegister page + hook | `FixedAssetRegister.jsx`, `useFixedAssets.js` | Depends on T7 |
| T16: useServiceCatalog.js + useJournal.js hooks | `useServiceCatalog.js`, `useJournal.js` | Start immediately, finalize when T1/T4 are done |

**Coordination points:** Jr Dev can start T9, T13, T16 immediately with mock data. T10, T11, T12, T14, T15 must wait for their respective backend tasks. All Jr Dev tasks use the same import patterns and component library as existing AccountingPage.jsx.

---

## 6. Files Likely Impacted

### New Files
- `backend/prisma/schema.prisma` (modified — add ServiceItem, Invoice, InvoiceItem, Account, JournalEntry, JournalEntryLine models)
- `backend/src/modules/accounting/routes/serviceCatalog.routes.ts`
- `backend/src/modules/accounting/routes/invoices.routes.ts`
- `backend/src/modules/accounting/routes/journal.routes.ts`
- `backend/src/modules/accounting/routes/fixedAssets.routes.ts`
- `backend/src/modules/accounting/routes/costCenters.routes.ts`
- `backend/src/modules/accounting/utils/journalHelper.ts`
- `frontend/src/features/accounting/ServiceItemCatalog.jsx`
- `frontend/src/features/accounting/InvoicePage.jsx`
- `frontend/src/features/accounting/ChartOfAccounts.jsx`
- `frontend/src/features/accounting/JournalEntryList.jsx`
- `frontend/src/features/accounting/BalanceSheet.jsx`
- `frontend/src/features/accounting/FixedAssetRegister.jsx`
- `frontend/src/hooks/queries/useServiceCatalog.js`
- `frontend/src/hooks/queries/useInvoices.js` (accounting-specific — different path from existing POS one)
- `frontend/src/hooks/queries/useJournal.js`
- `frontend/src/hooks/queries/useBalanceSheet.js`
- `frontend/src/hooks/queries/useFixedAssets.js`

### Modified Files
- `backend/prisma/schema.prisma` (add 6 new models + enums)
- `backend/src/modules/accounting/accounting.routes.ts` (register 4 new route modules)
- `backend/src/modules/accounting/routes/transactions.routes.ts` (add journal entry auto-creation)
- `backend/src/modules/accounting/routes/expenses.routes.ts` (add journal entry auto-creation)
- `backend/src/modules/accounting/routes/summary.routes.ts` (add balance sheet endpoint)
- `backend/prisma/seed.js` (add chart of accounts seed data)
- `frontend/src/features/accounting/AccountingPage.jsx` (add tabs for Invoices, Service Items)
- `frontend/src/lib/printReceipt.js` (add A4 format support)
- `frontend/src/App.jsx` (add routes for new pages)
- `frontend/src/config/navigation.tsx` (add nav items for Service Items, Invoices, Chart of Accounts, Journal, Balance Sheet, Fixed Assets)

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Journal entry auto-creation in Transaction/Expense could slow down creation flow | Medium | Use `await` only for the journal entry creation (it's a simple 2-3 row insert); consider queue-based approach if performance degrades |
| Invoice number generation race condition under concurrent requests | Low | Use hospital-scoped unique constraint + retry on conflict; or use a sequence per hospital |
| Balance sheet computation from journal lines could be slow with large datasets | Medium | Add composite index on JournalEntryLine (accountId, entryId); consider caching or materialized view if data grows large |
| Depreciation run endpoint could be expensive with many assets | Low | Process in batches; add a "lastDepreciatedAt" field to FixedAsset to skip already-processed assets |
| Extending AccountingPage.jsx (already ~1258 lines) with more tabs risks becoming unmaintainable | Medium | Consider extracting each tab into its own component file (SummaryTab.jsx, TransactionsTab.jsx, etc.) during this phase |
| Two different `useInvoices.js` files (POS vs accounting) could cause import confusion | Low | Name the accounting one `useAccountingInvoices.js` or put in a different directory path |
| Seed data for chart of accounts may conflict with existing hospital data | Low | Use upsert with unique code constraint; seed only if no accounts exist for the hospital |
