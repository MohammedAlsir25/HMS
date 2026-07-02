-- Create CostCenter table
CREATE TABLE "cost_centers" (
    id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT NOT NULL,
    CONSTRAINT "cost_centers_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "cost_centers_code_key" ON "cost_centers"(code);
CREATE UNIQUE INDEX "cost_centers_departmentId_key" ON "cost_centers"("departmentId");
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create Requisition table
CREATE TABLE "requisitions" (
    id TEXT NOT NULL,
    "requestNumber" TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    notes TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestedById" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    CONSTRAINT "requisitions_pkey" PRIMARY KEY (id)
);
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create RequisitionItem table
CREATE TABLE "requisition_items" (
    id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    "itemId" TEXT,
    "requisitionId" TEXT NOT NULL,
    CONSTRAINT "requisition_items_pkey" PRIMARY KEY (id)
);
ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "requisition_items" ADD CONSTRAINT "requisition_items_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "requisitions"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PurchaseOrder table
CREATE TABLE "purchase_orders" (
    id TEXT NOT NULL,
    "orderNumber" TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "departmentType" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "invoiceTotal" DECIMAL(65,30) NOT NULL,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalTier" INTEGER,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "supplierId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "costCenterId" TEXT,
    "expenseId" TEXT,
    "assetId" TEXT,
    "cogsAccountId" TEXT,
    "labFeePaid" DECIMAL(65,30),
    "installationFreight" DECIMAL(65,30),
    "usefulLifeYears" INTEGER,
    "requisitionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX "purchase_orders_expenseId_key" ON "purchase_orders"("expenseId");
CREATE UNIQUE INDEX "purchase_orders_assetId_key" ON "purchase_orders"("assetId");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create PurchaseOrderItem table
CREATE TABLE "purchase_order_items" (
    id TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalLineCost" DECIMAL(65,30) NOT NULL,
    "itemId" TEXT,
    "orderId" TEXT NOT NULL,
    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY (id)
);
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create FixedAsset table
CREATE TABLE "fixed_assets" (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "acquisitionCost" DECIMAL(65,30) NOT NULL,
    "installationCost" DECIMAL(65,30) DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "usefulLifeYears" INTEGER NOT NULL,
    "salvageValue" DECIMAL(65,30) DEFAULT 0,
    "depreciationMethod" TEXT NOT NULL DEFAULT 'straight-line',
    "monthlyDepreciation" DECIMAL(65,30) NOT NULL,
    "accumulatedDepreciation" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bookValue" DECIMAL(65,30) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    location TEXT,
    "serialNumber" TEXT,
    notes TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY (id)
);

-- Create Notification table
CREATE TABLE "notifications" (
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
