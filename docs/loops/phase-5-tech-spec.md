# Phase 5 Tech Spec: Pharmacy Module — Dispensing, POS & Inventory

**Date:** 2026-07-16
**Author:** Tech Lead
**Status:** Ready for implementation
**Depends on:** Phase 0 (multi-tenant), Phase 1 (navigation + role guarding), Phase 2 (patients), Phase 4 (consultation → pharmacy referral)

---

## 1. Key Architectural Decisions

### 1.1 Hospital Scoping Audit is Task #1 — Critical Security Fix

**Decision:** Task 2.5 (hospital scoping audit) is the FIRST task in the implementation order. Every existing query in POS/inventory routes that lacks `hospitalId` filtering gets fixed before any new endpoints are added.

**Rationale:** This is the same security pattern from Phase 2, Phase 3, and Phase 4. The existing POS endpoints (`GET /pos/pharmacy/items`, `GET /pos/alerts`, `GET /pos/items`, `POST /pos/transact`) query across all hospitals. A pharmacist at Hospital A could theoretically see Hospital B's inventory, alerts, or process transactions for Hospital B by guessing item IDs. The fix is a one-line addition to each `where` clause. Doing this FIRST means all new endpoints built in Phase 5 inherit the correct pattern from the start.

### 1.2 Pharmacy Dashboard is a New Dedicated Module, Not an Extension of POS

**Decision:** Create a new `backend/src/modules/pharmacy/pharmacy.routes.ts` with its own router, separate from the existing `pos/routes/pharmacy.routes.ts`. The new module handles aggregated dashboard data and sales reporting.

**Rationale:** The existing `pos/routes/pharmacy.routes.ts` handles CRUD operations for inventory items. The dashboard requires complex aggregation queries (JOIN across Transaction, InventoryTransaction, InventoryItem tables with GROUP BY). Mixing these concerns in one file would make the routes file unwieldy. A separate module keeps the POS CRUD routes clean and gives the dashboard its own namespace (`/pharmacy/dashboard`, `/pharmacy/sales-report`).

### 1.3 Expiry Enhancement Extends Existing Alerts Endpoint, Not a New Endpoint

**Decision:** Enhance the existing `GET /pos/alerts` endpoint to return 30/60/90 day expiry buckets instead of creating a new endpoint. Add a new `POST /pos/validate-items` endpoint for pre-sale validation.

**Rationale:** The `AlertPanel` component already consumes `GET /pos/alerts`. Changing the response shape to include more buckets is backward-compatible (the frontend already renders sections dynamically). The new `/pos/validate-items` endpoint is a separate concern — it's called before each sale to block expired items, not for dashboard display.

### 1.4 PO Auto-Increment Already Exists — Task 2.9 is a Verification, Not New Code

**Decision:** The `purchaseOrders.routes.ts` `POST /:id/receive` endpoint (lines 307-395) already increments `InventoryItem.quantity` when goods are received. Task 2.9 becomes an audit/verification task, not a coding task.

**Rationale:** The existing receive endpoint at `purchaseOrders.routes.ts:354-362` already does:
```ts
await prisma.inventoryItem.update({
  where: { id: ri.itemId },
  data: { quantity: Number(invItem.quantity) + ri.quantityReceived },
});
```
However, it does NOT create an `InventoryTransaction` record (type IN) for audit trail. The enhancement adds that transaction creation. No `procurement.routes.ts` changes needed — the logic lives in `purchaseOrders.routes.ts`.

### 1.5 Barcode Field is Optional and Hospital-Scoped Unique

**Decision:** Add `barcode` as an optional `String?` field on `InventoryItem`. The existing `@@unique([hospitalId, sku])` constraint remains. Barcode uniqueness is NOT enforced at the DB level — duplicate barcodes across different products are allowed (same barcode can appear on different pack sizes of the same drug).

**Rationale:** Pharmacy barcodes are typically EAN-13 or custom store codes. Not all products have barcodes (compounded medications, bulk items). Making it optional avoids breaking existing product creation flows. Hospital-scoped uniqueness via application logic (not DB constraint) keeps the schema simple.

### 1.6 Sales Report Uses Raw SQL Aggregation for Performance

**Decision:** The `GET /pharmacy/sales-report` endpoint uses `$queryRawUnsafe` for date-bucketed aggregation instead of Prisma's `groupBy`, because Prisma doesn't support date truncation (PostgreSQL `date_trunc`).

**Rationale:** The report needs to group transactions by day/week/month. Prisma's `groupBy` can only group by exact field values, not date truncation. Raw SQL with `date_trunc('day', "createdAt")` is the correct approach. This pattern is already used in `inventory.routes.ts` for cross-store queries.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hospital scoping | Fix all existing endpoints FIRST (task 2.5) | Security-critical; blocks everything else |
| Dashboard module | New `pharmacy/pharmacy.routes.ts` | Separates aggregation concerns from CRUD |
| Expiry buckets | Extend existing `GET /pos/alerts` | Backward-compatible; AlertPanel already iterates sections |
| Expiry block | New `POST /pos/validate-items` + transact guard | Pre-sale check + hard block in transact |
| Barcode field | Optional `String?` on InventoryItem | Not all products have barcodes; avoids breaking changes |
| PO auto-increment | Verify existing + add InventoryTransaction | Audit trail; existing logic already works |
| Sales report | Raw SQL with `date_trunc` | Prisma can't do date bucketing |
| Low stock widget | Reuse existing `GET /pos/alerts` | No new backend needed |
| Referral dispensing | Enhance existing `handleDispenseReferral` | Flow already works; verify + fix gaps |

---

## 3. Work Split

### 3.1 Sr Dev — Backend Endpoints & Security (estimated 2.5–3 days)

**Order:** 2.5 (hospital scoping — critical security, unblocks everything) → 2.2 (expiry tracking) → 2.3 (barcode) → 2.4 (pharmacy dashboard endpoint) → 2.8 (sales report endpoint) → 2.9 (PO auto-increment verification).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.5 | Hospital Scoping Audit | `pos/routes/pharmacy.routes.ts`, `pos/routes/transactions.routes.ts`, `pos/routes/invoices.routes.ts`, `pos/routes/suppliers.routes.ts`, `inventory/inventory.routes.ts` | S | Add `hospitalId` to all query `where` clauses. Critical security fix. |
| 2.2 | Expiry Tracking (backend) | `pos/routes/transactions.routes.ts`, `schemas/pos.schema.ts` | M | Add 60/90 day buckets to alerts. Add `validate-items` endpoint. Block expired in transact. |
| 2.3 | Barcode (backend) | Prisma migration, `pos/routes/pharmacy.routes.ts`, `schemas/pos.schema.ts` | S | Add optional barcode field. Update CRUD schemas. Extend POS search. |
| 2.4 | Pharmacy Dashboard Endpoint | `modules/pharmacy/pharmacy.routes.ts` (NEW), `modules/pharmacy/index.ts` (NEW) | M | Aggregated queries. Join Transaction, InventoryTransaction, InventoryItem. Hospital-scoped. |
| 2.8 | Sales Report (backend) | `modules/pharmacy/pharmacy.routes.ts` | M | Interval-based aggregation with `date_trunc`. |
| 2.9 | PO Auto-Increment Enhancement | `procurement/routes/purchaseOrders.routes.ts` | S | Add `InventoryTransaction` creation on receive. Verify existing logic. |

### 3.2 Jr Dev — Frontend Components & UI (estimated 2.5–3 days)

**Start immediately:** 2.1 (pharmacy dashboard — no new backend dependency for layout), 2.2 FE (alert panel update — uses existing endpoint), 2.3 FE (barcode — uses existing forms), 2.6 (low stock widget — uses existing endpoint), 2.7 (dispensing enhancement — uses existing flow).
**After 2.4 complete:** 2.1 FE wiring (pharmacy dashboard needs new backend endpoint).
**After 2.8 complete:** 2.8 FE (sales report needs new backend endpoint).

| # | Task | File(s) | Complexity | Notes |
|---|------|---------|-----------|-------|
| 2.1 FE | Pharmacy Dashboard | `features/pharmacy/PharmacyDashboard.jsx` (NEW), `App.jsx`, `navigation.tsx` | L | Stats cards, top-selling list, recent sales, quick actions. Wire to new backend endpoint. |
| 2.2 FE | AlertPanel Update | `features/pos/PharmacyProducts.jsx` | S | Add 60/90 day expiry categories to existing AlertPanel. |
| 2.3 FE | Barcode (frontend) | `features/pos/PharmacyProducts.jsx`, `features/pos/PharmacyPOS.jsx` | S | Add barcode field to product form. Extend POS search to include barcode. |
| 2.6 | Low Stock Widget | `components/pharmacy/LowStockWidget.jsx` (NEW), `features/dashboard/HospitalOverview.jsx` | S | Fetch from existing `/pos/alerts`. Clickable → products page. |
| 2.7 | Dispensing Enhancement | `features/pos/PharmacyPOS.jsx` | M | Wire referral medication auto-fill. Verify e2e flow works. |
| 2.8 FE | Sales Report | `features/pharmacy/PharmacySalesReport.jsx` (NEW), `App.jsx`, `navigation.tsx` | M | Date range picker, table/chart, CSV export. |

---

## 4. Exact File Lists

### Sr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| 2.4 | `backend/src/modules/pharmacy/pharmacy.routes.ts` | Pharmacy dashboard + sales report endpoints |
| 2.4 | `backend/src/modules/pharmacy/index.ts` | Module registration |
| 2.3 | `backend/prisma/migrations/YYYYMMDD_add_barcode_to_inventory_item/migration.sql` | Migration for barcode field on InventoryItem |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| 2.5 | `backend/src/modules/pos/routes/pharmacy.routes.ts` | Add `hospitalId` to `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/adjust` queries |
| 2.5 | `backend/src/modules/pos/routes/transactions.routes.ts` | Add `hospitalId` to `GET /alerts`, `GET /items`, `POST /transact` queries |
| 2.5 | `backend/src/modules/pos/routes/invoices.routes.ts` | Add `hospitalId` to all invoice queries |
| 2.5 | `backend/src/modules/pos/routes/suppliers.routes.ts` | Add `hospitalId` to all supplier queries |
| 2.5 | `backend/src/modules/inventory/inventory.routes.ts` | Add `hospitalId` to all queries |
| 2.2 | `backend/src/modules/pos/routes/transactions.routes.ts` | Add 60/90 day expiry buckets to alerts. Add `POST /validate-items` endpoint. Add expired-item block in `POST /transact`. |
| 2.3 | `backend/src/modules/pos/routes/pharmacy.routes.ts` | Add barcode to create/update schemas. Extend `GET /` search to include barcode. |
| 2.3 | `backend/src/schemas/pos.schema.ts` | Add barcode field to `posTransactSchema` and new `validateItemsSchema` |
| 2.9 | `backend/src/modules/procurement/routes/purchaseOrders.routes.ts` | Add `InventoryTransaction` creation in `POST /:id/receive` |

### Jr Dev Files

#### NEW — Create

| # | File | Description |
|---|------|-------------|
| 2.1 FE | `frontend/src/features/pharmacy/PharmacyDashboard.jsx` | Pharmacy dashboard page |
| 2.6 | `frontend/src/components/pharmacy/LowStockWidget.jsx` | Reusable low stock alert widget |
| 2.8 FE | `frontend/src/features/pharmacy/PharmacySalesReport.jsx` | Sales report page |

#### MODIFY — Existing

| # | File | Changes |
|---|------|---------|
| 2.2 FE | `frontend/src/features/pos/PharmacyProducts.jsx` | Add 60/90 day expiry categories to AlertPanel |
| 2.3 FE | `frontend/src/features/pos/PharmacyProducts.jsx` | Add barcode input to product form |
| 2.3 FE | `frontend/src/features/pos/PharmacyPOS.jsx` | Add barcode to search filter |
| 2.6 | `frontend/src/features/dashboard/HospitalOverview.jsx` | Add LowStockWidget |
| 2.7 | `frontend/src/features/pos/PharmacyPOS.jsx` | Wire referral medication auto-fill |
| 2.1 FE | `frontend/src/app/App.jsx` | Add `/pharmacy/dashboard` route |
| 2.1 FE | `frontend/src/config/navigation.tsx` | Add pharmacy dashboard nav item |
| 2.8 FE | `frontend/src/app/App.jsx` | Add `/pharmacy/reports` route |
| 2.8 FE | `frontend/src/config/navigation.tsx` | Add sales report nav item |

### Reference Files (read-only)

| File | Purpose |
|------|---------|
| `backend/src/modules/pos/routes/pharmacy.routes.ts` | Existing product CRUD pattern |
| `backend/src/modules/pos/routes/transactions.routes.ts` | Existing alerts, items, transact, shift pattern |
| `backend/src/modules/pos/routes/invoices.routes.ts` | Existing invoice/delivery pattern with `$transaction` |
| `backend/src/modules/procurement/routes/purchaseOrders.routes.ts` | Existing PO receive logic (lines 307-395) |
| `backend/src/middleware/rbac.ts` | Permission constants |
| `backend/src/middleware/auth.ts` | `authenticate` and `requirePermission` middleware |
| `backend/src/lib/prisma.js` | Prisma client instance |
| `backend/src/schemas/pos.schema.ts` | Existing Zod validation schemas |
| `frontend/src/features/pos/PharmacyPOS.jsx` | Existing POS cart/payment UI |
| `frontend/src/features/pos/PharmacyProducts.jsx` | Existing product table, modal, AlertPanel |
| `frontend/src/features/dashboard/HospitalOverview.jsx` | Dashboard pattern reference |
| `frontend/src/hooks/queries/usePOS.js` | Existing React Query hooks |
| `frontend/src/components/ui/Card.jsx` | Reusable Card component |
| `frontend/src/components/ui/Badge.jsx` | Reusable Badge component |
| `frontend/src/components/ui/Button.jsx` | Reusable Button component |
| `frontend/src/components/ui/Input.jsx` | Reusable Input component |
| `frontend/src/components/ui/Table.jsx` | Reusable Table component |
| `frontend/src/lib/api.js` | API utility |
| `frontend/src/stores/authStore.js` | User permissions source |

---

## 5. Implementation Details — Sr Dev

### 2.5 Hospital Scoping Audit — All POS/Inventory Routes

**Priority:** FIRST task. Critical security fix. All existing POS/inventory endpoints must be hospital-scoped before adding new features.

#### Audit Checklist

Every query in POS/inventory routes that reads data must include `hospitalId: req.user!.hospitalId!` in its `where` clause.

**Endpoints to fix:**

| File | Endpoint | Current Issue | Fix |
|------|----------|--------------|-----|
| `pharmacy.routes.ts` | `GET /` (line 27) | Queries by `category` only | Add `hospitalId` to `where` |
| `pharmacy.routes.ts` | `POST /` (line 11) | Creates item without `hospitalId` | Add `hospitalId: req.user!.hospitalId!` to create data |
| `pharmacy.routes.ts` | `POST /:id/adjust` (line 40) | Queries item without hospital check | Add `hospitalId` to `findFirst` |
| `pharmacy.routes.ts` | `PUT /:id` (line 58) | Queries item without hospital check | Add `hospitalId` to `findFirst` |
| `pharmacy.routes.ts` | `DELETE /:id` (line 81) | Queries item without hospital check | Add `hospitalId` to `findFirst` |
| `transactions.routes.ts` | `GET /alerts` (line 14) | Queries all active items | Add `hospitalId` to `where` |
| `transactions.routes.ts` | `GET /items` (line 32) | Queries active items without hospital | Add `hospitalId` to `where` |
| `transactions.routes.ts` | `POST /transact` (line 80) | Queries items without hospital check | Add `hospitalId` to `findMany` |
| `transactions.routes.ts` | `POST /transact` (line 125) | Creates Transaction without `hospitalId` | Add `hospitalId` to create data |
| `invoices.routes.ts` | All GET/POST endpoints | Queries without `hospitalId` | Add `hospitalId` to all queries |
| `suppliers.routes.ts` | All GET/POST endpoints | Queries without `hospitalId` | Add `hospitalId` to all queries |
| `inventory.routes.ts` | All GET/POST endpoints | Queries without `hospitalId` | Add `hospitalId` to all queries |

#### Implementation Pattern

For each endpoint, the fix follows the same pattern. Example for `GET /pos/pharmacy/items`:

```ts
// BEFORE (line 29):
const where: Record<string, unknown> = { category: 'pharmacy', isActive: true };

// AFTER:
const hospitalId = req.user!.hospitalId!;
const where: Record<string, unknown> = { category: 'pharmacy', isActive: true, hospitalId };
```

For item creation, add `hospitalId` to the create data:

```ts
// BEFORE (line 16):
const item = await prisma.inventoryItem.create({
  data: {
    name, nameAr, sku, category: 'pharmacy', quantity: initialQuantity || 0,
    price: price || 0, costPrice: costPrice || 0, minStock: minStock || 0,
    packSize: packSize || 1,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
  },
});

// AFTER:
const hospitalId = req.user!.hospitalId!;
const item = await prisma.inventoryItem.create({
  data: {
    name, nameAr, sku, category: 'pharmacy', quantity: initialQuantity || 0,
    price: price || 0, costPrice: costPrice || 0, minStock: minStock || 0,
    packSize: packSize || 1,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    hospitalId,
  },
});
```

For Transaction creation in `POST /transact`:

```ts
// BEFORE (line 125):
const transaction = await prisma.transaction.create({
  data: {
    type: type as $Enums.TransactionType, amount: Number(amount), cogs: totalCogs, paymentMethod: paymentMethod as $Enums.PaymentMethod,
    description: description || (patientName ? `Sale for ${patientName}` : null),
    shiftId: shift.id, cashierId: req.user!.id, departmentId: resolvedDepartmentId,
  },
});

// AFTER:
const hospitalId = req.user!.hospitalId!;
const transaction = await prisma.transaction.create({
  data: {
    type: type as $Enums.TransactionType, amount: Number(amount), cogs: totalCogs, paymentMethod: paymentMethod as $Enums.PaymentMethod,
    description: description || (patientName ? `Sale for ${patientName}` : null),
    shiftId: shift.id, cashierId: req.user!.id, departmentId: resolvedDepartmentId,
    hospitalId,
  },
});
```

#### Verification Checklist

- [ ] `GET /pos/pharmacy/items` — includes `hospitalId` filter
- [ ] `POST /pos/pharmacy/items` — creates with `hospitalId`
- [ ] `POST /pos/pharmacy/items/:id/adjust` — queries with `hospitalId`
- [ ] `PUT /pos/pharmacy/items/:id` — queries with `hospitalId`
- [ ] `DELETE /pos/pharmacy/items/:id` — queries with `hospitalId`
- [ ] `GET /pos/alerts` — includes `hospitalId` filter
- [ ] `GET /pos/items` — includes `hospitalId` filter
- [ ] `POST /pos/transact` — queries items with `hospitalId`, creates Transaction with `hospitalId`
- [ ] `GET /pos/shift/current` — (queries by userId, no hospitalId needed)
- [ ] All invoice endpoints — include `hospitalId`
- [ ] All supplier endpoints — include `hospitalId`
- [ ] All inventory endpoints — include `hospitalId`

---

### 2.2 Expiry Tracking Enhancement — `transactions.routes.ts` + `pos.schema.ts`

**Route:** Enhanced `GET /pos/alerts` + new `POST /pos/validate-items` + guard in `POST /pos/transact`
**Permission:** `PHARMACY_READ` (alerts), `PHARMACY_WRITE` (validate, transact)

#### 2.2a Enhanced Alerts Endpoint

**Current response shape:**
```ts
{ lowStock: [...], expired: [...], expiringSoon: [...] }
```

**New response shape:**
```ts
{
  lowStock: InventoryItem[],
  expired: InventoryItem[],
  expiring30: InventoryItem[],
  expiring60: InventoryItem[],
  expiring90: InventoryItem[]
}
```

#### Implementation

```ts
router.get('/alerts', authenticate, asyncHandler(async (req, res) => {
  const { category } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;
  const where: Record<string, unknown> = { isActive: true, hospitalId };
  if (category) where.category = { equals: category, mode: 'insensitive' as const };
  const items = await prisma.inventoryItem.findMany({ where: where as Prisma.InventoryItemWhereInput, orderBy: { name: 'asc' } });
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const alerts: {
    lowStock: Array<Record<string, unknown>>;
    expired: Array<Record<string, unknown>>;
    expiring30: Array<Record<string, unknown>>;
    expiring60: Array<Record<string, unknown>>;
    expiring90: Array<Record<string, unknown>>;
  } = { lowStock: [], expired: [], expiring30: [], expiring60: [], expiring90: [] };
  for (const item of items) {
    if (Number(item.quantity) <= item.minStock) alerts.lowStock.push(item);
    if (item.expiryDate) {
      const exp = new Date(item.expiryDate);
      if (exp < now) alerts.expired.push(item);
      else if (exp <= in30Days) alerts.expiring30.push(item);
      else if (exp <= in60Days) alerts.expiring60.push(item);
      else if (exp <= in90Days) alerts.expiring90.push(item);
    }
  }
  res.json(alerts);
}));
```

#### 2.2b New Validate-Items Endpoint

**Route:** `POST /pos/validate-items`
**Permission:** `PHARMACY_WRITE`

#### Request Body

```ts
{
  items: Array<{ id: string; quantity?: number }>  // required, min 1
}
```

#### Zod Schema — `pos.schema.ts`

```ts
export const validateItemsSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    quantity: z.number().positive().optional().default(1),
  })).min(1, 'items array is required'),
});
```

#### Implementation

```ts
router.post('/validate-items', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), validate(validateItemsSchema), asyncHandler(async (req, res) => {
  const { items } = req.body;
  const itemIds = items.map((i: { id: string }) => i.id);
  const dbItems = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
  });
  const now = new Date();
  const expiredItems: Array<{ id: string; name: string; expiryDate: Date }> = [];
  const lowStockItems: Array<{ id: string; name: string; quantity: number; requested: number }> = [];
  const itemMap = new Map(dbItems.map((i) => [i.id, i]));

  for (const item of items) {
    const dbItem = itemMap.get(item.id);
    if (!dbItem) continue;
    if (dbItem.expiryDate && new Date(dbItem.expiryDate) < now) {
      expiredItems.push({ id: dbItem.id, name: dbItem.name, expiryDate: dbItem.expiryDate });
    }
    const requestedQty = (item.quantity || 1) / (dbItem.packSize || 1);
    if (Number(dbItem.quantity) < requestedQty) {
      lowStockItems.push({ id: dbItem.id, name: dbItem.name, quantity: Number(dbItem.quantity), requested: requestedQty });
    }
  }

  res.json({ valid: expiredItems.length === 0, expiredItems, lowStockItems });
}));
```

#### 2.2c Expired-Item Block in Transact

Add to the beginning of `POST /transact` handler, after fetching `dbItems`:

```ts
// After line 112 (itemMap creation):
const now = new Date();
const expiredInCart: Array<{ id: string; name: string; expiryDate: Date }> = [];
for (const item of items) {
  const dbItem = itemMap.get((item as { id: string }).id);
  if (dbItem?.expiryDate && new Date(dbItem.expiryDate) < now) {
    expiredInCart.push({ id: dbItem.id, name: dbItem.name, expiryDate: dbItem.expiryDate });
  }
}
if (expiredInCart.length > 0) {
  return res.status(400).json({
    message: 'Cannot sell expired items',
    expiredItems: expiredInCart,
  });
}
```

#### Edge Cases

- **Item not found in validate-items:** Skip (don't add to error arrays) — the transact endpoint will also validate
- **Expired item in cart:** Return 400 with `expiredItems` array; frontend shows which items are blocked
- **Backward compatibility:** Old `expiringSoon` field removed; frontend must update to use `expiring30`

---

### 2.3 Barcode Field — Prisma Migration + Backend Routes

#### Prisma Migration

Add to `schema.prisma` `InventoryItem` model:

```prisma
model InventoryItem {
  // ... existing fields ...
  barcode          String?               // NEW: optional barcode
  // ... rest of model ...
}
```

Add index:
```prisma
@@index([barcode])
```

**Note:** Do NOT add a unique constraint on barcode — duplicate barcodes across different products are allowed (same barcode on different pack sizes).

#### Pharmacy Routes — Barcode in CRUD

**Create endpoint** (`POST /pos/pharmacy/items`):

```ts
router.post('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, sku, price, costPrice, initialQuantity, minStock, expiryDate, packSize, barcode } = req.body;
  // ... existing validation ...
  const hospitalId = req.user!.hospitalId!;
  const item = await prisma.inventoryItem.create({
    data: {
      name, nameAr, sku, category: 'pharmacy', quantity: initialQuantity || 0,
      price: price || 0, costPrice: costPrice || 0, minStock: minStock || 0,
      packSize: packSize || 1,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      barcode: barcode || null,
      hospitalId,
    },
  });
  res.status(201).json(item);
}));
```

**Update endpoint** (`PUT /pos/pharmacy/items/:id`):

```ts
router.put('/:id', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, nameAr, sku, price, costPrice, minStock, expiryDate, packSize, barcode } = req.body;
  // ... existing logic ...
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name, nameAr, sku,
      price: price !== undefined ? parseFloat(price) : undefined,
      costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
      minStock: minStock !== undefined ? parseInt(minStock) : undefined,
      packSize: packSize !== undefined ? parseInt(packSize) : undefined,
      expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
      barcode: barcode !== undefined ? (barcode || null) : undefined,
    },
  });
  res.json(item);
}));
```

**Search enhancement** (`GET /pos/pharmacy/items`):

```ts
router.get('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const { search } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;
  const where: Record<string, unknown> = { category: 'pharmacy', isActive: true, hospitalId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { sku: { contains: search, mode: 'insensitive' as const } },
      { barcode: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where: where as Prisma.InventoryItemWhereInput, orderBy: { name: 'asc' } });
  res.json(items);
}));
```

#### POS Items Search Enhancement (`GET /pos/items`)

```ts
router.get('/items', authenticate, asyncHandler(async (req, res) => {
  const { category, search } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;
  const where: Record<string, unknown> = { isActive: true, hospitalId };
  if (category) where.category = { contains: category, mode: 'insensitive' as const };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { sku: { contains: search, mode: 'insensitive' as const } },
      { barcode: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where: where as Prisma.InventoryItemWhereInput, orderBy: { name: 'asc' } });
  res.json(items);
}));
```

---

### 2.4 Pharmacy Dashboard Endpoint — `modules/pharmacy/pharmacy.routes.ts`

**Route:** `GET /pharmacy/dashboard`
**Permission:** `PHARMACY_READ`

#### Response Shape

```ts
{
  todaySales: number;           // total amount of today's PHARMACY transactions
  topSelling: Array<{           // top 10 products by sale quantity
    id: string;
    name: string;
    sku: string;
    totalSold: number;
  }>;
  stockValue: number;           // sum of all pharmacy items' quantity * costPrice
  expiringCounts: {
    within30: number;
    within60: number;
    within90: number;
  };
  lowStockCount: number;        // items where quantity <= minStock and isActive = true
  recentSales: Array<{          // last 10 PHARMACY transactions
    id: string;
    amount: number;
    paymentMethod: string;
    createdAt: Date;
    cashier: { fullName: string };
  }>;
}
```

#### Implementation

```ts
import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';

const router = Router();

router.get('/dashboard', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Today's sales total
  const todaySalesResult = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      type: 'PHARMACY',
      createdAt: { gte: startOfDay },
      hospitalId,
    },
  });
  const todaySales = Number(todaySalesResult._sum.amount) || 0;

  // Top 10 selling items (by quantity in InventoryTransaction SALE records)
  const topSelling = await prisma.$queryRawUnsafe(`
    SELECT
      ii.id,
      ii.name,
      ii.sku,
      ABS(SUM(it.quantity))::int as "totalSold"
    FROM inventory_transactions it
    JOIN inventory_items ii ON it."itemId" = ii.id
    WHERE it.type = 'SALE'
      AND it."createdAt" >= $1
      AND ii.category = 'pharmacy'
      AND ii."hospitalId" = $2
    GROUP BY ii.id, ii.name, ii.sku
    ORDER BY "totalSold" DESC
    LIMIT 10
  `, startOfDay, hospitalId);

  // Stock value
  const stockValueResult = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM("quantity" * "costPrice"), 0)::float as "stockValue"
    FROM inventory_items
    WHERE category = 'pharmacy'
      AND "isActive" = true
      AND "hospitalId" = $1
  `, hospitalId);
  const stockValue = stockValueResult[0]?.stockValue || 0;

  // Expiring counts
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [within30, within60, within90] = await Promise.all([
    prisma.inventoryItem.count({
      where: { category: 'pharmacy', isActive: true, hospitalId, expiryDate: { not: null, lte: in30Days, gte: now } },
    }),
    prisma.inventoryItem.count({
      where: { category: 'pharmacy', isActive: true, hospitalId, expiryDate: { not: null, lte: in60Days, gte: now } },
    }),
    prisma.inventoryItem.count({
      where: { category: 'pharmacy', isActive: true, hospitalId, expiryDate: { not: null, lte: in90Days, gte: now } },
    }),
  ]);

  // Low stock count
  const lowStockCount = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as count
    FROM inventory_items
    WHERE category = 'pharmacy'
      AND "isActive" = true
      AND "hospitalId" = $1
      AND "quantity" <= "minStock"
  `, hospitalId);

  // Recent sales (last 10)
  const recentSales = await prisma.transaction.findMany({
    where: { type: 'PHARMACY', hospitalId },
    include: { cashier: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  res.json({
    todaySales,
    topSelling,
    stockValue,
    expiringCounts: { within30, within60, within90 },
    lowStockCount: lowStockCount[0]?.count || 0,
    recentSales,
  });
}));

export default router;
```

#### Module Registration — `modules/pharmacy/index.ts`

```ts
import { Router } from 'express';
import pharmacyRoutes from './pharmacy.routes.js';

const router = Router();
router.use('/', pharmacyRoutes);
export default router;
```

**Note:** This module needs to be registered in the main app file (wherever `app.use('/pharmacy', ...)` is mounted). Check the main server file for the mounting pattern.

---

### 2.8 Sales Report Endpoint — `modules/pharmacy/pharmacy.routes.ts`

**Route:** `GET /pharmacy/sales-report`
**Permission:** `PHARMACY_READ`

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string (ISO date) | No | Start date (default: 30 days ago) |
| `to` | string (ISO date) | No | End date (default: today) |
| `interval` | string | No | `daily` (default), `weekly`, `monthly` |

#### Response Shape

```ts
{
  data: Array<{
    date: string;           // truncated date (2026-07-16, 2026-W29, 2026-07)
    totalAmount: number;
    transactionCount: number;
    itemCount: number;
  }>;
  summary: {
    totalAmount: number;
    totalTransactions: number;
    totalItems: number;
  };
}
```

#### Implementation

```ts
router.get('/sales-report', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { from, to, interval = 'daily' } = req.query as Record<string, string>;

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  let dateTrunc: string;
  switch (interval) {
    case 'weekly': dateTrunc = 'week'; break;
    case 'monthly': dateTrunc = 'month'; break;
    default: dateTrunc = 'day';
  }

  const data = await prisma.$queryRawUnsafe(`
    SELECT
      date_trunc($1, t."createdAt")::date as date,
      SUM(t.amount)::float as "totalAmount",
      COUNT(t.id)::int as "transactionCount",
      COALESCE(SUM(ABS(it.quantity))::int, 0) as "itemCount"
    FROM transactions t
    LEFT JOIN inventory_transactions it ON it."createdAt" >= t."createdAt"
      AND it."createdAt" < t."createdAt" + interval '1 day'
      AND it.type = 'SALE'
    WHERE t.type = 'PHARMACY'
      AND t."hospitalId" = $2
      AND t."createdAt" >= $3
      AND t."createdAt" <= $4
    GROUP BY date_trunc($1, t."createdAt")
    ORDER BY date_trunc($1, t."createdAt") ASC
  `, dateTrunc, hospitalId, fromDate, toDate);

  const summary = await prisma.transaction.aggregate({
    _sum: { amount: true },
    _count: { id: true },
    where: {
      type: 'PHARMACY',
      hospitalId,
      createdAt: { gte: fromDate, lte: toDate },
    },
  });

  res.json({
    data,
    summary: {
      totalAmount: Number(summary._sum.amount) || 0,
      totalTransactions: summary._count.id || 0,
      totalItems: data.reduce((sum: number, row: { itemCount: number }) => sum + (row.itemCount || 0), 0),
    },
  });
}));
```

**Note:** The `itemCount` join is an approximation. For precise item counts, a subquery approach is needed. The above uses a simple LEFT JOIN which may overcount if multiple inventory transactions align with the same time window. A more precise approach:

```sql
SELECT
  date_trunc($1, t."createdAt")::date as date,
  SUM(t.amount)::float as "totalAmount",
  COUNT(t.id)::int as "transactionCount"
FROM transactions t
WHERE t.type = 'PHARMACY'
  AND t."hospitalId" = $2
  AND t."createdAt" >= $3
  AND t."createdAt" <= $4
GROUP BY date_trunc($1, t."createdAt")
ORDER BY date_trunc($1, t."createdAt") ASC
```

And calculate `itemCount` separately via a second query if needed.

---

### 2.9 PO Auto-Increment Enhancement — `purchaseOrders.routes.ts`

**Current state:** `POST /:id/receive` (lines 307-395) already increments `InventoryItem.quantity` but does NOT create an `InventoryTransaction` record.

**Enhancement:** Add `InventoryTransaction` creation for audit trail.

#### Changes

In the `POST /:id/receive` handler, after the `inventoryItem.update` (line 357-361):

```ts
if (ri.itemId && ri.quantityReceived > 0) {
  const invItem = invItemMap.get(ri.itemId);
  if (invItem) {
    await prisma.inventoryItem.update({
      where: { id: ri.itemId },
      data: { quantity: Number(invItem.quantity) + ri.quantityReceived },
    });
    // NEW: Create InventoryTransaction for audit trail
    await prisma.inventoryTransaction.create({
      data: {
        type: 'IN',
        quantity: ri.quantityReceived,
        unitCost: Number(poItem.unitCost),
        notes: `PO ${existing.orderNumber || existing.id} received`,
        itemId: ri.itemId,
        hospitalId: existing.hospitalId,
      },
    });
  }
}
```

**Note:** This is the only change needed. The existing logic is correct; we're just adding an audit trail record.

---

## 6. Implementation Details — Jr Dev

### 2.1 Pharmacy Dashboard — `PharmacyDashboard.jsx`

**File:** `frontend/src/features/pharmacy/PharmacyDashboard.jsx`

#### Route

Add to `App.jsx`:

```jsx
const PharmacyDashboard = lazy(() => import('../features/pharmacy/PharmacyDashboard'));

// In Routes:
<Route path="/pharmacy/dashboard" element={<ProtectedRoute><RoleGuard requiredPermissions={['pharmacy:read']}><PharmacyDashboard /></RoleGuard></ProtectedRoute>} />
```

#### Navigation

Add to `navigation.tsx` in the `pharmacy` group:

```ts
{
  key: 'pharmacy',
  label: 'Pharmacy',
  requiredPermissions: ['pharmacy:read'],
  items: [
    { label: 'Pharmacy Dashboard', icon: LayoutDashboard, path: '/pharmacy/dashboard', requiredPermissions: [] },
    { label: 'Pharmacy POS', icon: ShoppingCart, path: '/pharmacy', requiredPermissions: [] },
    { label: 'Pharmacy Products', icon: Package, path: '/pharmacy/products', requiredPermissions: [] },
  ],
}
```

#### Component Structure

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/currency';
import LowStockWidget from '../../components/pharmacy/LowStockWidget';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pharmacy/dashboard')
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Pharmacy Dashboard</h1>
          <p className="text-body text-slate mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/pharmacy/dashboard/reports')}>Sales Report</Button>
          <Button onClick={() => navigate('/pharmacy')}>New Sale</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{formatCurrency(dashboard?.todaySales)}</p>
            <p className="text-caption text-slate mt-1">Today's Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{formatCurrency(dashboard?.stockValue)}</p>
            <p className="text-caption text-slate mt-1">Stock Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-red-600">{dashboard?.lowStockCount || 0}</p>
            <p className="text-caption text-slate mt-1">Low Stock Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="flex justify-center gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{dashboard?.expiringCounts?.within30 || 0}</p>
                <p className="text-xs text-slate">30 days</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-500">{dashboard?.expiringCounts?.within60 || 0}</p>
                <p className="text-xs text-slate">60 days</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400">{dashboard?.expiringCounts?.within90 || 0}</p>
                <p className="text-xs text-slate">90 days</p>
              </div>
            </div>
            <p className="text-caption text-slate mt-1">Expiring Items</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling */}
        <Card>
          <CardHeader><CardTitle>Top Selling Items (Today)</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {dashboard?.topSelling?.length === 0 && (
              <p className="text-caption text-slate text-center py-8">No sales today</p>
            )}
            {dashboard?.topSelling?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded border border-silver/50">
                <div className="min-w-0">
                  <p className="text-caption font-medium text-obsidian truncate">{item.name}</p>
                  <p className="text-xs text-slate">{item.sku}</p>
                </div>
                <Badge variant="primary" size="sm">{item.totalSold} sold</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {dashboard?.recentSales?.length === 0 && (
              <p className="text-caption text-slate text-center py-8">No recent sales</p>
            )}
            {dashboard?.recentSales?.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-2 rounded border border-silver/50">
                <div className="min-w-0">
                  <p className="text-caption font-medium text-obsidian">{formatCurrency(sale.amount)}</p>
                  <p className="text-xs text-slate">{sale.cashier?.fullName} — {new Date(sale.createdAt).toLocaleTimeString()}</p>
                </div>
                <Badge variant="default" size="sm">{sale.paymentMethod}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Low Stock Widget */}
        <LowStockWidget />
      </div>
    </div>
  );
}
```

---

### 2.2 AlertPanel Update — `PharmacyProducts.jsx`

**File:** `frontend/src/features/pos/PharmacyProducts.jsx`

#### Changes

Update the `AlertPanel` component to use the new response shape:

```jsx
function AlertPanel({ alerts, onDismiss }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(null);
  const hasAlerts = alerts.lowStock.length > 0 || alerts.expired.length > 0 || alerts.expiring30.length > 0 || alerts.expiring60.length > 0 || alerts.expiring90.length > 0;
  if (!hasAlerts) return null;
  const sections = [
    { key: "expired", label: t("pharmacyProducts.alertExpired"), items: alerts.expired, color: "red", icon: "!" },
    { key: "expiring30", label: "Expiring within 30 days", items: alerts.expiring30, color: "red", icon: "!" },
    { key: "expiring60", label: "Expiring within 60 days", items: alerts.expiring60, color: "yellow", icon: "!" },
    { key: "expiring90", label: "Expiring within 90 days", items: alerts.expiring90, color: "yellow", icon: "!" },
    { key: "lowStock", label: t("pharmacyProducts.alertLowStock"), items: alerts.lowStock, color: "yellow", icon: "\u25bc" },
  ];
  // ... rest unchanged
}
```

Also update the `loadAlerts` function to handle the new response shape:

```js
const loadAlerts = useCallback(async () => {
  try {
    const data = await api.get("/pos/alerts?category=pharmacy");
    // Map old shape to new if needed
    setAlerts({
      lowStock: data.lowStock || [],
      expired: data.expired || [],
      expiring30: data.expiring30 || data.expiringSoon || [],
      expiring60: data.expiring60 || [],
      expiring90: data.expiring90 || [],
    });
  } catch (err) { notifyError(err); }
}, []);
```

---

### 2.3 Barcode (Frontend) — `PharmacyProducts.jsx` + `PharmacyPOS.jsx`

#### PharmacyProducts.jsx — Product Form

Add barcode input to the product form (after SKU input):

```jsx
<Input label="Barcode (optional)" value={form.barcode || ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="EAN-13 or custom code" />
```

Update the `form` state initialization:

```js
const [form, setForm] = useState({
  name: "", sku: "", price: "", costPrice: "", initialQuantity: "", minStock: "", packSize: "1", expiryDate: "", barcode: "",
});
```

Update `openEdit` to include barcode:

```js
const openEdit = (item) => {
  setEditItem(item);
  setForm({
    name: item.name || "",
    sku: item.sku || "",
    price: item.price ? String(item.price) : "",
    costPrice: item.costPrice ? String(item.costPrice) : "",
    initialQuantity: "",
    minStock: item.minStock ? String(item.minStock) : "",
    packSize: item.packSize ? String(item.packSize) : "1",
    expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
    barcode: item.barcode || "",
  });
  setShowModal(true);
};
```

Update `handleSubmit` to include barcode:

```js
const payload = {
  name: form.name,
  sku: form.sku,
  price: form.price ? parseFloat(form.price) : 0,
  costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
  minStock: form.minStock ? parseInt(form.minStock) : 0,
  packSize: parseInt(form.packSize) || 1,
  expiryDate: form.expiryDate || null,
  barcode: form.barcode || null,
};
```

#### PharmacyProducts.jsx — Table Columns

Add barcode column:

```js
{ key: "barcode", label: "Barcode", render: (row) => row.barcode || "-" },
```

#### PharmacyPOS.jsx — Search Filter

Update `filteredItems` to include barcode:

```js
const filteredItems = items.filter((i) =>
  !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()) || (i.barcode && i.barcode.toLowerCase().includes(search.toLowerCase()))
);
```

Update search placeholder:

```jsx
<Input
  label="Search"
  placeholder="Search by name, SKU, or barcode..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="mb-3"
/>
```

---

### 2.6 Low Stock Widget — `LowStockWidget.jsx`

**File:** `frontend/src/components/pharmacy/LowStockWidget.jsx`

#### Component API

```jsx
<LowStockWidget />
```

No props needed — fetches from `/pos/alerts?category=pharmacy` internally.

#### Implementation

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';

export default function LowStockWidget() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState({ lowStock: [], expired: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pos/alerts?category=pharmacy')
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const criticalCount = alerts.lowStock.filter(i => Number(i.quantity) === 0).length;
  const lowCount = alerts.lowStock.filter(i => Number(i.quantity) > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Alert</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-caption text-slate">Loading...</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Critical (out of stock)</span>
              <Badge variant="danger" size="sm">{criticalCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Low stock</span>
              <Badge variant="warning" size="sm">{lowCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Expired</span>
              <Badge variant="danger" size="sm">{alerts.expired.length}</Badge>
            </div>
            <button
              onClick={() => navigate('/pharmacy/products')}
              className="w-full mt-2 px-3 py-2 text-sm font-medium text-lilac-bloom hover:bg-bone rounded-lg transition-colors"
            >
              View All Alerts →
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

#### HospitalOverview.jsx Integration

Add to `HospitalOverview.jsx`:

```jsx
import LowStockWidget from '../../components/pharmacy/LowStockWidget';

// Add inside the grid (after Surgery Pipeline card):
<LowStockWidget />
```

---

### 2.7 Dispensing Enhancement — `PharmacyPOS.jsx`

**File:** `frontend/src/features/pos/PharmacyPOS.jsx`

**Current state:** `handleDispenseReferral` (line 72-76) sets patient name and referral ID, but does NOT pre-fill cart from referral medications.

**Enhancement:** When dispensing a referral, pre-fill cart from `ref.medications`.

#### Updated `handleDispenseReferral`

```js
const handleDispenseReferral = useCallback((referral) => {
  setPatientName(referral.patient?.fullName || '');
  setActiveReferralId(referral.id);

  // Pre-fill cart from referral medications
  if (referral.medications?.length > 0) {
    const newCart = [];
    for (const med of referral.medications) {
      // Find matching inventory item by name
      const match = items.find(i =>
        i.name.toLowerCase().includes(med.drugName.toLowerCase())
      );
      if (match) {
        const packSize = match.packSize || 1;
        const existing = newCart.find(c => c.id === match.id);
        if (existing) {
          existing.quantity += packSize;
        } else {
          newCart.push({
            id: match.id,
            name: match.name,
            sku: match.sku,
            price: Number(match.price),
            packSize,
            quantity: packSize,
            mode: 'box',
          });
        }
      }
    }
    setCart(newCart);
  }

  setActiveTab('sale');
}, [items]);
```

#### Error Handling for Unmatched Medications

Add a warning if some medications couldn't be matched:

```js
const handleDispenseReferral = useCallback((referral) => {
  setPatientName(referral.patient?.fullName || '');
  setActiveReferralId(referral.id);

  if (referral.medications?.length > 0) {
    const newCart = [];
    const unmatched = [];
    for (const med of referral.medications) {
      const match = items.find(i =>
        i.name.toLowerCase().includes(med.drugName.toLowerCase())
      );
      if (match) {
        const packSize = match.packSize || 1;
        const existing = newCart.find(c => c.id === match.id);
        if (existing) {
          existing.quantity += packSize;
        } else {
          newCart.push({
            id: match.id,
            name: match.name,
            sku: match.sku,
            price: Number(match.price),
            packSize,
            quantity: packSize,
            mode: 'box',
          });
        }
      } else {
        unmatched.push(med.drugName);
      }
    }
    setCart(newCart);
    if (unmatched.length > 0) {
      setError(`Could not find in inventory: ${unmatched.join(', ')}`);
    }
  }

  setActiveTab('sale');
}, [items]);
```

---

### 2.8 Sales Report (Frontend) — `PharmacySalesReport.jsx`

**File:** `frontend/src/features/pharmacy/PharmacySalesReport.jsx`

#### Route

Add to `App.jsx`:

```jsx
const PharmacySalesReport = lazy(() => import('../features/pharmacy/PharmacySalesReport'));

// In Routes:
<Route path="/pharmacy/reports" element={<ProtectedRoute><RoleGuard requiredPermissions={['pharmacy:read']}><PharmacySalesReport /></RoleGuard></ProtectedRoute>} />
```

#### Navigation

Add to `navigation.tsx` in the `pharmacy` group:

```ts
{ label: 'Sales Report', icon: BarChart3, path: '/pharmacy/reports', requiredPermissions: [] },
```

#### Component Structure

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/currency';

export default function PharmacySalesReport() {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [interval, setInterval] = useState('daily');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, interval });
      const result = await api.get(`/pharmacy/sales-report?${params}`);
      setData(result.data);
      setSummary(result.summary);
    } catch (err) {
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  }, [from, to, interval]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportCSV = () => {
    const headers = ['Date', 'Total Amount', 'Transactions', 'Items'];
    const rows = data.map(r => [r.date, r.totalAmount, r.transactionCount, r.itemCount]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-sales-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Pharmacy Sales Report</h1>
          <p className="text-body text-slate mt-1">View sales data by date range</p>
        </div>
        <Button variant="secondary" onClick={exportCSV} disabled={data.length === 0}>Export CSV</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-4 items-end">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">Interval</label>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly'].map((i) => (
                  <button
                    key={i}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-target ${interval === i ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                    onClick={() => setInterval(i)}
                  >{i.charAt(0).toUpperCase() + i.slice(1)}</button>
                ))}
              </div>
            </div>
            <Button onClick={fetchReport}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="text-center py-4"><p className="text-2xl font-bold text-obsidian">{formatCurrency(summary.totalAmount)}</p><p className="text-caption text-slate">Total Revenue</p></CardContent></Card>
          <Card><CardContent className="text-center py-4"><p className="text-2xl font-bold text-obsidian">{summary.totalTransactions}</p><p className="text-caption text-slate">Transactions</p></CardContent></Card>
          <Card><CardContent className="text-center py-4"><p className="text-2xl font-bold text-obsidian">{summary.totalItems}</p><p className="text-caption text-slate">Items Sold</p></CardContent></Card>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader><CardTitle>Sales by {interval}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-body text-slate">Loading...</p>
          ) : data.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No data for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-silver">
                    <th className="text-left py-2 text-caption font-medium text-graphite">Date</th>
                    <th className="text-right py-2 text-caption font-medium text-graphite">Amount</th>
                    <th className="text-right py-2 text-caption font-medium text-graphite">Transactions</th>
                    <th className="text-right py-2 text-caption font-medium text-graphite">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-b border-bone">
                      <td className="py-2 text-body text-obsidian">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="py-2 text-body text-obsidian text-right">{formatCurrency(row.totalAmount)}</td>
                      <td className="py-2 text-body text-obsidian text-right">{row.transactionCount}</td>
                      <td className="py-2 text-body text-obsidian text-right">{row.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 7. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHARMACY MODULE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │ PharmacyPOS  │     │ Pharmacy     │     │ Pharmacy     │   │
│  │ (Jr Dev)     │     │ Products     │     │ Dashboard    │   │
│  │              │     │ (Jr Dev)     │     │ (Jr Dev)     │   │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘   │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Layer (Express)                    │  │
│  │  /pos/transact  /pos/pharmacy/items  /pharmacy/dashboard │  │
│  │  /pos/alerts    /pos/validate-items  /pharmacy/sales-rpt │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Prisma ORM                             │  │
│  │  InventoryItem  Transaction  InventoryTransaction  Shift  │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  PostgreSQL Database                      │  │
│  │  inventory_items | transactions | inventory_transactions  │  │
│  │  shifts | suppliers | supplier_invoices                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  CROSS-CUTTING:                                                │
│  - Hospital scoping (hospitalId on all queries)                │
│  - RBAC (pharmacy:read, pharmacy:write permissions)            │
│  - Audit logging (auditMiddleware on mutations)                 │
│  - Expiry blocking (validate-items + transact guard)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Key Gotchas

1. **Hospital scoping is FIRST:** Do not build any new endpoints until all existing queries have `hospitalId`. This is a security vulnerability.

2. **Transaction type is enum:** `TransactionType` enum includes `PHARMACY` and `OPTICS`. The `POST /transact` endpoint filters by this type. New dashboard queries must also filter by `type: 'PHARMACY'`.

3. **InventoryTransaction type is string:** Unlike `Transaction.type`, `InventoryTransaction.type` is a plain string (`'SALE'`, `'IN'`, `'OUT'`). Not an enum.

4. **Pack size math:** The POS uses strip/box math extensively. `packSize` is the number of strips per box. Price is per box. Strip price = `price / packSize`. Cart quantity is in strips. Box mode = `quantity / packSize`.

5. **Expiry date is nullable:** `InventoryItem.expiryDate` is `DateTime?`. Items without expiry dates should be excluded from expiry alerts, not flagged as expired.

6. **Alerts endpoint lacks permission check:** `GET /pos/alerts` (line 14) uses `authenticate` but not `requirePermission`. This is intentional — the alerts are used by multiple roles. Do NOT add a permission check.

7. **PO receive already increments stock:** `purchaseOrders.routes.ts:357-361` already does `quantity: Number(invItem.quantity) + ri.quantityReceived`. Do NOT duplicate this. Only add the `InventoryTransaction` creation for audit trail.

8. **Module registration:** The new `pharmacy/pharmacy.routes.ts` module needs to be registered in the main app file. Find where other modules are mounted (e.g., `app.use('/pos', posRoutes)`) and add `app.use('/pharmacy', pharmacyRoutes)`.

9. **Date truncation raw SQL:** Prisma cannot do `date_trunc`. Use `$queryRawUnsafe` with parameterized queries to prevent SQL injection.

10. **Barcode search is case-insensitive:** Use `mode: 'insensitive'` in the `contains` filter for barcode search, same as name and SKU.

---

## 9. Verification Checklist

### Backend
- [ ] All POS/inventory routes have `hospitalId` in queries
- [ ] Transaction creation includes `hospitalId`
- [ ] Alerts return 30/60/90 day buckets
- [ ] `POST /validate-items` checks expiry and stock
- [ ] `POST /transact` blocks expired items
- [ ] Barcode field added to InventoryItem
- [ ] CRUD endpoints accept and store barcode
- [ ] POS search includes barcode
- [ ] Pharmacy dashboard endpoint returns aggregated data
- [ ] Sales report endpoint works with date ranges
- [ ] PO receive creates InventoryTransaction

### Frontend
- [ ] Pharmacy dashboard shows stats cards
- [ ] AlertPanel shows 30/60/90 day categories
- [ ] Product form includes barcode input
- [ ] POS search includes barcode
- [ ] Low stock widget works on dashboard and overview
- [ ] Referral dispensing pre-fills cart
- [ ] Sales report has date range picker and CSV export
- [ ] All new routes have RoleGuard
- [ ] All nav items have correct permissions
- [ ] No TypeScript/ESLint errors
