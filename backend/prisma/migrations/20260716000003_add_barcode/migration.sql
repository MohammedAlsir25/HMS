-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE INDEX "inventory_items_barcode_idx" ON "inventory_items" ("barcode");
