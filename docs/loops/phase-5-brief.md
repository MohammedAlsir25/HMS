# Phase 5 Brief: Pharmacy Module — Dispensing, POS & Inventory

**Date:** 2026-07-16
**Complexity:** XL | **Estimated Effort:** 4–6 days
**Focus Role:** fullstack
**Dependencies:** Phase 0 (multi-tenant), Phase 1 (navigation + role guarding), Phase 2 (patients), Phase 4 (consultation → pharmacy referral)

---

## Executive Summary — What Already Exists

The HMS codebase already has substantial POS/pharmacy infrastructure. This phase enhances and hardens what's built rather than building from scratch.

**Already built:**

| Area | What Exists | Status |
|------|-------------|--------|
| Product model | `InventoryItem` with name, sku, category, price, costPrice, minStock, expiryDate, packSize, hospitalId | ✅ Complete |
| Product CRUD | `routes/pharmacy.routes.ts` (create/update/soft-delete/adjust) + `PharmacyProducts.jsx` (table, modal, stock adjustment, delivery modal) | ✅ Complete |
| Inventory locations | `InventoryLocation` model + `GET /inventory/locations` | ✅ Complete |
| Inventory transactions | `InventoryTransaction` model (IN/OUT/SALE) + `GET /inventory/transactions/:itemId` + `POST /inventory/transactions` | ✅ Complete |
| POS sale | `PharmacyPOS.jsx` (cart, strip counter, payment, receipt print) + `POST /pos/transact` (creates Transaction, decrements stock, fulfills referrals) | ✅ Complete |
| Shift management | Shift open/close with expected/actual totals | ✅ Complete |
| Supplier management | `SuppliersTab.jsx` + `routes/suppliers.routes.ts` | ✅ Complete |
| Delivery invoices | `DeliveryModal.jsx` + `routes/invoices.routes.ts` (auto stock increment, cost recalculation) | ✅ Complete |
| Alerts | `GET /pos/alerts` (lowStock, expired, expiringSoon) + `AlertPanel` in PharmacyProducts | ✅ Complete |
| Cross-store inventory | `InventoryPOS.jsx` (pharmacy/optics/hospital tabs) | ✅ Complete |
| RBAC | `pharmacy:read/write`, `inventory:read/write`, `warehouse:read/write` | ✅ Complete |
| Procurement | `ProcurementPage.jsx` with purchase orders | ✅ Complete |
| Referral dispensing | `Referral` PHARMACY_DISPATCH type + referralId in posTransact → auto-fulfill on sale | ✅ Complete |

**What needs enhancement:**

| Gap | Description |
|-----|-------------|
| Pharmacy dashboard | No dedicated dashboard with daily sales, top selling, stock value, expiring count |
| Expiry tracking | Only 30-day window. Need 30/60/90 day buckets + block dispensing of expired items |
| Low stock widget | AlertPanel is buried in PharmacyProducts tab. Need dashboard widget |
| PO auto-increment | Purchase order receipt should auto-increment stock (may be partially wired via DeliveryModal) |
| Drug autocomplete | Need brand+generic search in PharmacyPOS / connection to consultation Rx |
| Barcode scanning | Product catalog lacks barcode field for scanner integration |
| Hospital scoping | POS routes may lack consistent hospitalId filtering — audit needed |
| Expiry block | Backend `transact` should reject expired items |
| Dispensing from referral | Direct link from referral page → POS with pre-filled cart |
| Reporting | Basic sales reports (daily/weekly/monthly) |

---

## 2. Tasks

### 2.1 Pharmacy Dashboard — `frontend/src/features/pharmacy/PharmacyDashboard.jsx` (NEW)

**What's needed:** Create a dedicated pharmacy dashboard accessible at `/pharmacy/dashboard` with:

- Daily sales total (today's `Transaction` sum with type PHARMACY)
- Top 10 selling items (by quantity in InventoryTransaction SALE records)
- Stock value (sum of `quantity * costPrice` across all pharmacy items)
- Expiring items count (within 30/60/90 day buckets)
- Low stock count (items where `quantity <= minStock`)
- Recent sales list (last 10 transactions)
- Quick-action buttons: New Sale, Receive Stock, View Alerts

**Data source:** New `GET /pharmacy/dashboard` endpoint that aggregates data from Transaction, InventoryTransaction, InventoryItem tables.

**Complexity:** L

### 2.2 Expiry Tracking Enhancement — Backend

**What's needed:**
- Add 60-day and 90-day expiry buckets to `GET /pos/alerts` endpoint (currently only 30-day)
- Add `POST /pos/validate-items` endpoint that checks expiry for an items array — used by POS before completing sale
- Add expired-item check to `POST /pos/transact`: reject transaction if any item is expired (return 400 with `expiredItems: [...]`)
- Update `AlertPanel` in `PharmacyProducts.jsx` to show 30/60/90 day categories

**Complexity:** M

### 2.3 Barcode Field + Scanning — Backend + Frontend

**What's needed:**
- Add `barcode` field to `InventoryItem` model (optional, unique per hospital if present)
- Update product create/update schemas and endpoints to accept barcode
- Update `PharmacyProducts.jsx` product form to include barcode input
- Update `PharmacyPOS.jsx` product search to include barcode lookup (`?search=` already searches SKU and name — extend to also search barcode)

**Complexity:** S

### 2.4 Pharmacy Dashboard Endpoint — `backend/src/modules/pharmacy/pharmacy.routes.ts` (NEW)

**What's needed:** Create a new pharmacy module with aggregated data endpoint:

- `GET /pharmacy/dashboard` — returns:
  - `todaySales`: total amount of today's PHARMACY transactions
  - `topSelling`: top 10 products by sale quantity (from InventoryTransaction where type=SALE, joined to InventoryItem)
  - `stockValue`: sum of all pharmacy items' `quantity * costPrice`
  - `expiringCounts`: `{ within30: N, within60: N, within90: N }`
  - `lowStockCount`: count of items where `quantity <= minStock` and `isActive = true`
  - `recentSales`: last 10 PHARMACY transactions with cashier name, amount, payment method
- Must filter by `hospitalId` from auth context
- Require `pharmacy:read` permission

**Complexity:** M

### 2.5 Hospital Scoping Audit — Backend

**Critical fix:** Audit all POS and inventory routes for consistent `hospitalId` filtering:

- `routes/pharmacy.routes.ts` — add `hospitalId` to all item queries
- `routes/transactions.routes.ts` — add `hospitalId` to shift/transact/alerts queries
- `routes/invoices.routes.ts` — add `hospitalId` to invoice queries
- `routes/suppliers.routes.ts` — add `hospitalId` to supplier queries
- `routes/inventory.routes.ts` — add `hospitalId` to all queries
- Note: `InventoryItem` already has `hospitalId` field. The middleware auto-injects on create, but READ queries must filter explicitly.

**Complexity:** S

### 2.6 Low Stock Dashboard Widget — Frontend

**What's needed:**
- Create `LowStockWidget.jsx` component that:
  - Fetches `GET /pos/alerts?category=pharmacy`
  - Shows count of critical items (quantity = 0) in red
  - Shows count of low items (quantity <= minStock) in amber
  - Clickable → navigates to `/pharmacy/products` with alert filter
- Add widget to `PharmacyDashboard.jsx`
- Also add to main dashboard (`HospitalOverview.jsx`) for super admins

**Complexity:** S

### 2.7 Dispensing from Consultation Referral — Frontend Enhancement

**What's needed:**
- In `PharmacyPOS.jsx`, the "Referrals" tab already lists pending `PHARMACY_DISPATCH` referrals
- Enhancement: when pharmacist clicks "Dispense" on a referral item:
  - Auto-populate patient name
  - Pre-fill cart from referral's `ReferralMedication` items (using `GET /referrals/:id` which already includes medications)
  - Set `referralId` on the transaction
  - On completion, referral marked FULFILLED and stock decremented
- This flow already works in the e2e test (`06-referral-pharmacy-lab.spec.js`) — verify it works in the UI and fix any gaps

**Complexity:** M

### 2.8 Sales Reporting — Backend + Frontend

**What's needed:**
- `GET /pharmacy/sales-report?from=&to=&interval=daily|weekly|monthly` endpoint:
  - Group by the interval, return date, total amount, transaction count, item count
- Simple sales report page (`PharmacySalesReport.jsx`):
  - Date range picker
  - Bar chart or table showing daily totals
  - Export to CSV button
- Linked from PharmacyDashboard

**Complexity:** M

### 2.9 Purchase Order → Inventory Auto-Increment — Backend

**What's needed:**
- When a purchase order is marked as `RECEIVED`, auto-create `InventoryTransaction` (type IN) for each PO item and increment `InventoryItem.quantity`
- Currently the `DeliveryModal.jsx` handles this via supplier invoices — audit if PO receipt also triggers stock update
- Add hook to purchase order status change → stock update

**Complexity:** S

---

## 3. Acceptance Criteria

- [ ] Pharmacy dashboard shows today's sales, top 10 items, stock value, expiring counts, low stock count, and recent sales
- [ ] Expiry tracking shows 30/60/90 day buckets
- [ ] Expired items are blocked from POS sale (backend rejects with clear error)
- [ ] Barcode field added to product model and searchable in POS
- [ ] All POS/inventory routes filter by `hospitalId` (cross-tenant isolation verified)
- [ ] Low stock widget is visible on pharmacy dashboard and main overview
- [ ] Dispensing from consultation referral pre-fills cart and auto-fulfills on sale
- [ ] Sales report shows daily/weekly/monthly totals with date range filter + CSV export
- [ ] Purchase order receipt auto-increments inventory quantities
- [ ] All new endpoints include Zod validation, permission checks, and error handling
- [ ] All new frontend components have loading, empty, and error states
- [ ] No TypeScript/ESLint errors introduced

---

## 4. Work Split

### Sr Dev — Backend (estimated 2.5–3 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.4 Pharmacy Dashboard Endpoint | `backend/src/modules/pharmacy/pharmacy.routes.ts` (NEW) + `pharmacy/index.ts` | M | Aggregated queries. Join Transaction, InventoryTransaction, InventoryItem. Hospital-scoped. |
| 2.2 Expiry Tracking | `backend/src/modules/pos/routes/transactions.routes.ts` + `pos.schema.ts` | M | Add 60/90 day buckets to alerts. Add validate-items endpoint. Block expired in transact. |
| 2.3 Barcode (backend) | Prisma migration + `routes/pharmacy.routes.ts` + `pos.schema.ts` | S | Add optional barcode field to InventoryItem. Update CRUD schemas. Extend POS search. |
| 2.5 Hospital Scoping Audit | All POS/inventory routes | S | Add `hospitalId` to all query `where` clauses. Systematic audit. |
| 2.8 Sales Report (backend) | `backend/src/modules/pharmacy/pharmacy.routes.ts` | M | Interval-based aggregation endpoint. |
| 2.9 PO Auto-Increment | `backend/src/modules/procurement/procurement.routes.ts` | S | Hook into purchase order RECEIVED status change. |

### Jr Dev — Frontend (estimated 2.5–3 days)

| Task | File(s) | Complexity | Notes |
|------|---------|-----------|-------|
| 2.1 Pharmacy Dashboard | `frontend/src/features/pharmacy/PharmacyDashboard.jsx` (NEW) + route + nav | L | Stats cards, top-selling list, recent sales, quick actions. Wire to new backend endpoint. |
| 2.2 AlertPanel Update | `frontend/src/features/pos/PharmacyProducts.jsx` | S | Add 60/90 day expiry categories to existing AlertPanel. |
| 2.3 Barcode (frontend) | `frontend/src/features/pos/PharmacyProducts.jsx` + `PharmacyPOS.jsx` | S | Add barcode field to product form. Extend POS search to include barcode. |
| 2.6 Low Stock Widget | `frontend/src/components/pharmacy/LowStockWidget.jsx` (NEW) + dashboard integration | S | Fetch from existing `/pos/alerts`. Clickable → products page. |
| 2.7 Dispensing Enhancement | `frontend/src/features/pos/PharmacyPOS.jsx` | M | Wire referral medication auto-fill. Verify e2e flow works. |
| 2.8 Sales Report (frontend) | `frontend/src/features/pharmacy/PharmacySalesReport.jsx` (NEW) + route | M | Date range picker, table/chart, CSV export. |

---

## 5. Files Likely Impacted

### New Files (5)

| File | Description |
|------|-------------|
| `backend/src/modules/pharmacy/pharmacy.routes.ts` | Pharmacy dashboard + sales report endpoints |
| `backend/src/modules/pharmacy/index.ts` | Module registration |
| `backend/prisma/migrations/...` | Migration for barcode field on InventoryItem |
| `frontend/src/features/pharmacy/PharmacyDashboard.jsx` | Pharmacy dashboard page |
| `frontend/src/features/pharmacy/PharmacySalesReport.jsx` | Sales report page |
| `frontend/src/components/pharmacy/LowStockWidget.jsx` | Reusable low stock alert widget |

### Modified Files (12)

| File | Changes |
|------|---------|
| `backend/src/modules/pos/routes/transactions.routes.ts` | Add 60/90 day expiry, validate-items endpoint, expired-item block in transact, hospitalId scoping |
| `backend/src/modules/pos/routes/pharmacy.routes.ts` | Add barcode to CRUD, hospitalId scoping |
| `backend/src/modules/pos/routes/suppliers.routes.ts` | HospitalId scoping |
| `backend/src/modules/pos/routes/invoices.routes.ts` | HospitalId scoping |
| `backend/src/modules/inventory/inventory.routes.ts` | HospitalId scoping |
| `backend/src/modules/procurement/procurement.routes.ts` | Auto-increment on PO receipt |
| `backend/src/schemas/pos.schema.ts` | Add barcode to schemas, validate-items schema |
| `frontend/src/features/pos/PharmacyProducts.jsx` | Add barcode field, update AlertPanel with 60/90 day categories |
| `frontend/src/features/pos/PharmacyPOS.jsx` | Add barcode search, referral auto-fill enhancement |
| `frontend/src/app/App.jsx` | Add pharmacy dashboard + sales report routes |
| `frontend/src/config/navigation.tsx` | Add pharmacy dashboard nav item |
| `frontend/src/features/dashboard/HospitalOverview.jsx` | Add LowStockWidget |

---

## 6. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Expiry block breaks POS sales | Medium | Error returns `expiredItems` array with clear messages. Frontend shows which items are blocked. |
| Hospital scoping audit misses a route | Medium | All routes enumerated in task 2.5. Checker verifies all queries have `hospitalId`. |
| Dashboard aggregate queries are slow | Low | Keep queries simple — today's sales is a single count. Top selling uses `groupBy`. Index on `createdAt`, `type`, `hospitalId`. |
| PO auto-increment doubles inventory | Low | Ensure idempotent — check if already processed. Use `status` transition guard. |

---

*This brief is based on: `docs/06-implementation-plan.md` (Phase 5), `docs/01-prd.md`, `docs/02-trd.md`, `docs/03-backend-schema.md`, `docs/04-ui-ux.md`, `docs/05-app-flow.md`, and inspection of existing POS/pharmacy code in `frontend/src/features/pos/` and `backend/src/modules/pos/routes/`.*
