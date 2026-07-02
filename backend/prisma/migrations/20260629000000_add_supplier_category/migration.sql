-- Add category column to suppliers
ALTER TABLE "suppliers" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'pharmacy';

-- Backfill existing suppliers: if they have pharmacy invoices, keep 'pharmacy';
-- if they have optics invoices, set to 'optics'; if both, prefer the first invoice category
UPDATE "suppliers" s
SET "category" = COALESCE(
  (SELECT si."category" FROM "supplier_invoices" si WHERE si."supplierId" = s.id ORDER BY si."createdAt" ASC LIMIT 1),
  'pharmacy'
);
