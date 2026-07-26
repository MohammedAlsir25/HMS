-- DropIndex
DROP INDEX "clinics_slug_key";

-- DropIndex
DROP INDEX "cost_centers_code_key";

-- DropIndex
DROP INDEX "departments_slug_key";

-- DropIndex
DROP INDEX "employees_employeeCode_key";

-- DropIndex
DROP INDEX "inventory_items_sku_key";

-- DropIndex
DROP INDEX "optic_lab_jobs_jobNumber_key";

-- DropIndex
DROP INDEX "patients_mrn_key";

-- DropIndex
DROP INDEX "roles_name_key";

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "beds" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "clinical_records" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "consent_waivers" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "cost_centers" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "diagnostic_order_tests" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "diagnostic_orders" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "discharge_summaries" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "fixed_assets" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "imaging_files" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "imaging_orders" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "inpatient_vitals" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "intraoperative_events" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "inventory_locations" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "medications" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "nursing_notes" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "operation_types" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "optic_lab_jobs" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "patient_files" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "payroll_records" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "post_op_follow_ups" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "postoperative_notes" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "preoperative_requests" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "referral_medications" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "referral_tests" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "referrals" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "requisition_items" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "requisitions" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "supplier_invoice_items" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "supplier_invoices" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "surgeries" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "surgery_team_members" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "symptoms" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "vital_signs" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "ward_rounds" ADD COLUMN     "hospitalId" TEXT;

-- AlterTable
ALTER TABLE "wards" ADD COLUMN     "hospitalId" TEXT;

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_slug_key" ON "hospitals"("slug");

-- CreateIndex
CREATE INDEX "hospitals_isActive_idx" ON "hospitals"("isActive");

-- CreateIndex
CREATE INDEX "hospitals_is_deleted_idx" ON "hospitals"("is_deleted");

-- CreateIndex
CREATE INDEX "accounts_payable_hospitalId_idx" ON "accounts_payable"("hospitalId");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_idx" ON "appointments"("hospitalId");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_doctorId_scheduledAt_idx" ON "appointments"("hospitalId", "doctorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_patientId_idx" ON "appointments"("hospitalId", "patientId");

-- CreateIndex
CREATE INDEX "attendance_hospitalId_idx" ON "attendance"("hospitalId");

-- CreateIndex
CREATE INDEX "audit_logs_hospitalId_idx" ON "audit_logs"("hospitalId");

-- CreateIndex
CREATE INDEX "beds_hospitalId_idx" ON "beds"("hospitalId");

-- CreateIndex
CREATE INDEX "cash_movements_hospitalId_idx" ON "cash_movements"("hospitalId");

-- CreateIndex
CREATE INDEX "clinical_records_hospitalId_idx" ON "clinical_records"("hospitalId");

-- CreateIndex
CREATE INDEX "clinics_hospitalId_idx" ON "clinics"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_hospitalId_slug_key" ON "clinics"("hospitalId", "slug");

-- CreateIndex
CREATE INDEX "consent_waivers_hospitalId_idx" ON "consent_waivers"("hospitalId");

-- CreateIndex
CREATE INDEX "cost_centers_hospitalId_idx" ON "cost_centers"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_hospitalId_code_key" ON "cost_centers"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "departments_hospitalId_idx" ON "departments"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hospitalId_slug_key" ON "departments"("hospitalId", "slug");

-- CreateIndex
CREATE INDEX "diagnostic_order_tests_hospitalId_idx" ON "diagnostic_order_tests"("hospitalId");

-- CreateIndex
CREATE INDEX "diagnostic_orders_hospitalId_idx" ON "diagnostic_orders"("hospitalId");

-- CreateIndex
CREATE INDEX "discharge_summaries_hospitalId_idx" ON "discharge_summaries"("hospitalId");

-- CreateIndex
CREATE INDEX "employees_hospitalId_idx" ON "employees"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_hospitalId_employeeCode_key" ON "employees"("hospitalId", "employeeCode");

-- CreateIndex
CREATE INDEX "expenses_hospitalId_idx" ON "expenses"("hospitalId");

-- CreateIndex
CREATE INDEX "fixed_assets_hospitalId_idx" ON "fixed_assets"("hospitalId");

-- CreateIndex
CREATE INDEX "imaging_files_hospitalId_idx" ON "imaging_files"("hospitalId");

-- CreateIndex
CREATE INDEX "imaging_orders_hospitalId_idx" ON "imaging_orders"("hospitalId");

-- CreateIndex
CREATE INDEX "inpatient_vitals_hospitalId_idx" ON "inpatient_vitals"("hospitalId");

-- CreateIndex
CREATE INDEX "intraoperative_events_hospitalId_idx" ON "intraoperative_events"("hospitalId");

-- CreateIndex
CREATE INDEX "inventory_items_hospitalId_idx" ON "inventory_items"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_hospitalId_sku_key" ON "inventory_items"("hospitalId", "sku");

-- CreateIndex
CREATE INDEX "inventory_locations_hospitalId_idx" ON "inventory_locations"("hospitalId");

-- CreateIndex
CREATE INDEX "inventory_transactions_hospitalId_idx" ON "inventory_transactions"("hospitalId");

-- CreateIndex
CREATE INDEX "leave_requests_hospitalId_idx" ON "leave_requests"("hospitalId");

-- CreateIndex
CREATE INDEX "medications_hospitalId_idx" ON "medications"("hospitalId");

-- CreateIndex
CREATE INDEX "notifications_hospitalId_idx" ON "notifications"("hospitalId");

-- CreateIndex
CREATE INDEX "nursing_notes_hospitalId_idx" ON "nursing_notes"("hospitalId");

-- CreateIndex
CREATE INDEX "operation_types_hospitalId_idx" ON "operation_types"("hospitalId");

-- CreateIndex
CREATE INDEX "optic_lab_jobs_hospitalId_idx" ON "optic_lab_jobs"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "optic_lab_jobs_hospitalId_jobNumber_key" ON "optic_lab_jobs"("hospitalId", "jobNumber");

-- CreateIndex
CREATE INDEX "patient_files_hospitalId_idx" ON "patient_files"("hospitalId");

-- CreateIndex
CREATE INDEX "patients_hospitalId_idx" ON "patients"("hospitalId");

-- CreateIndex
CREATE INDEX "patients_hospitalId_fullName_idx" ON "patients"("hospitalId", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "patients_hospitalId_mrn_key" ON "patients"("hospitalId", "mrn");

-- CreateIndex
CREATE INDEX "payroll_records_hospitalId_idx" ON "payroll_records"("hospitalId");

-- CreateIndex
CREATE INDEX "post_op_follow_ups_hospitalId_idx" ON "post_op_follow_ups"("hospitalId");

-- CreateIndex
CREATE INDEX "postoperative_notes_hospitalId_idx" ON "postoperative_notes"("hospitalId");

-- CreateIndex
CREATE INDEX "preoperative_requests_hospitalId_idx" ON "preoperative_requests"("hospitalId");

-- CreateIndex
CREATE INDEX "purchase_order_items_hospitalId_idx" ON "purchase_order_items"("hospitalId");

-- CreateIndex
CREATE INDEX "purchase_orders_hospitalId_idx" ON "purchase_orders"("hospitalId");

-- CreateIndex
CREATE INDEX "referral_medications_hospitalId_idx" ON "referral_medications"("hospitalId");

-- CreateIndex
CREATE INDEX "referral_tests_hospitalId_idx" ON "referral_tests"("hospitalId");

-- CreateIndex
CREATE INDEX "referrals_hospitalId_idx" ON "referrals"("hospitalId");

-- CreateIndex
CREATE INDEX "requisition_items_hospitalId_idx" ON "requisition_items"("hospitalId");

-- CreateIndex
CREATE INDEX "requisitions_hospitalId_idx" ON "requisitions"("hospitalId");

-- CreateIndex
CREATE INDEX "roles_hospitalId_idx" ON "roles"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_hospitalId_name_key" ON "roles"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "shifts_hospitalId_idx" ON "shifts"("hospitalId");

-- CreateIndex
CREATE INDEX "supplier_invoice_items_hospitalId_idx" ON "supplier_invoice_items"("hospitalId");

-- CreateIndex
CREATE INDEX "supplier_invoices_hospitalId_idx" ON "supplier_invoices"("hospitalId");

-- CreateIndex
CREATE INDEX "suppliers_hospitalId_idx" ON "suppliers"("hospitalId");

-- CreateIndex
CREATE INDEX "surgeries_hospitalId_idx" ON "surgeries"("hospitalId");

-- CreateIndex
CREATE INDEX "surgery_team_members_hospitalId_idx" ON "surgery_team_members"("hospitalId");

-- CreateIndex
CREATE INDEX "symptoms_hospitalId_idx" ON "symptoms"("hospitalId");

-- CreateIndex
CREATE INDEX "transactions_hospitalId_idx" ON "transactions"("hospitalId");

-- CreateIndex
CREATE INDEX "users_hospitalId_idx" ON "users"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "users_hospitalId_email_key" ON "users"("hospitalId", "email");

-- CreateIndex
CREATE INDEX "vital_signs_hospitalId_idx" ON "vital_signs"("hospitalId");

-- CreateIndex
CREATE INDEX "ward_rounds_hospitalId_idx" ON "ward_rounds"("hospitalId");

-- CreateIndex
CREATE INDEX "wards_hospitalId_idx" ON "wards"("hospitalId");

