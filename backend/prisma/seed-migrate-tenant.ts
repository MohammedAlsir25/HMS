import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_HOSPITAL_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_HOSPITAL_NAME = 'Default Hospital';
const DEFAULT_HOSPITAL_SLUG = 'default';

const TENANT_TABLES = [
  'users', 'roles', 'clinics', 'departments', 'expenses',
  'patients', 'patient_files', 'appointments',
  'vital_signs', 'symptoms', 'medications', 'clinical_records',
  'referrals', 'referral_medications', 'referral_tests',
  'surgeries', 'post_op_follow_ups', 'postoperative_notes', 'discharge_summaries',
  'operation_types', 'preoperative_requests', 'consent_waivers',
  'surgery_team_members', 'intraoperative_events',
  'wards', 'beds', 'inpatient_vitals', 'nursing_notes', 'ward_rounds',
  'inventory_items', 'inventory_locations', 'inventory_transactions',
  'transactions', 'optic_lab_jobs', 'shifts', 'cash_movements',
  'diagnostic_orders', 'diagnostic_order_tests',
  'employees', 'payroll_records', 'attendance', 'leave_requests',
  'audit_logs', 'accounts_payable', 'suppliers', 'supplier_invoices', 'supplier_invoice_items',
  'cost_centers', 'requisitions', 'requisition_items',
  'purchase_orders', 'purchase_order_items', 'fixed_assets', 'notifications',
  'imaging_orders', 'imaging_files',
];

const UNIQUE_CONSTRAINTS_TO_DROP: Record<string, string[]> = {
  patients: ['patients_mrn_key'],
  users: ['users_email_key'],
  employees: ['employees_employeeCode_key'],
  clinics: ['clinics_slug_key'],
  departments: ['departments_slug_key'],
  inventory_items: ['inventory_items_sku_key'],
  roles: ['roles_name_key'],
  optic_lab_jobs: ['optic_lab_jobs_jobNumber_key'],
  cost_centers: ['cost_centers_code_key'],
};

const UNIQUE_CONSTRAINTS_TO_ADD: Record<string, { name: string; columns: string[] }> = {
  patients: { name: 'patients_hospitalId_mrn_key', columns: ['"hospitalId"', 'mrn'] },
  users: { name: 'users_hospitalId_email_key', columns: ['"hospitalId"', 'email'] },
  employees: { name: 'employees_hospitalId_employeeCode_key', columns: ['"hospitalId"', '"employeeCode"'] },
  clinics: { name: 'clinics_hospitalId_slug_key', columns: ['"hospitalId"', 'slug'] },
  departments: { name: 'departments_hospitalId_slug_key', columns: ['"hospitalId"', 'slug'] },
  inventory_items: { name: 'inventory_items_hospitalId_sku_key', columns: ['"hospitalId"', 'sku'] },
  roles: { name: 'roles_hospitalId_name_key', columns: ['"hospitalId"', 'name'] },
  optic_lab_jobs: { name: 'optic_lab_jobs_hospitalId_jobNumber_key', columns: ['"hospitalId"', '"jobNumber"'] },
  cost_centers: { name: 'cost_centers_hospitalId_code_key', columns: ['"hospitalId"', 'code'] },
};

async function main() {
  console.log('Starting tenant migration...');

  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  const hospitalExists = await prisma.$queryRawUnsafe<[{ exists: boolean }]>(
    `SELECT EXISTS(SELECT 1 FROM hospitals WHERE id = $1)`,
    DEFAULT_HOSPITAL_ID,
  );
  if (!hospitalExists[0]!.exists) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO hospitals (id, name, slug, "isActive", "createdAt", "updatedAt", is_deleted)
       VALUES ($1, $2, $3, true, NOW(), NOW(), false)`,
      DEFAULT_HOSPITAL_ID,
      DEFAULT_HOSPITAL_NAME,
      DEFAULT_HOSPITAL_SLUG,
    );
    console.log('Created default hospital');
  }

  for (const table of TENANT_TABLES) {
    const colExists = await prisma.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'hospitalId')`,
      table,
    );
    if (!colExists[0]!.exists) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "hospitalId" TEXT`);
      console.log(`Added hospitalId to ${table}`);
    }
  }

  for (const table of TENANT_TABLES) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "hospitalId" = $1 WHERE "hospitalId" IS NULL`,
      DEFAULT_HOSPITAL_ID,
    );
  }
  console.log('Backfilled all tables');

  for (const [table, constraints] of Object.entries(UNIQUE_CONSTRAINTS_TO_DROP)) {
    for (const constraintName of constraints) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraintName}"`,
      );
    }
  }
  console.log('Dropped old unique constraints');

  for (const [table, { name, columns }] of Object.entries(UNIQUE_CONSTRAINTS_TO_ADD)) {
    const colList = columns.join(', ');
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" UNIQUE (${colList})`,
    );
  }
  console.log('Added new composite unique constraints');

  for (const table of TENANT_TABLES) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ALTER COLUMN "hospitalId" SET NOT NULL`,
    );
  }
  console.log('Set NOT NULL on all hospitalId columns');

  for (const table of TENANT_TABLES) {
    const indexExists = await prisma.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = $1 AND indexname = $2)`,
      table,
      `idx_${table}_hospitalId`,
    );
    if (!indexExists[0]!.exists) {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX "idx_${table}_hospitalId" ON "${table}"("hospitalId")`,
      );
    }
  }
  console.log('Created indexes');

  console.log('Validating row counts...');
  for (const table of TENANT_TABLES) {
    const result = await prisma.$queryRawUnsafe<[{ total: bigint; nullCount: bigint }]>(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE "hospitalId" IS NULL) as null_count FROM "${table}"`,
    );
    const { total, nullCount } = result[0]!;
    if (Number(nullCount) > 0) {
      console.warn(`WARNING: ${table} has ${nullCount} rows with null hospitalId out of ${total} total`);
    } else {
      console.log(`OK: ${table} - ${total} rows, all backfilled`);
    }
  }

  console.log('Tenant migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
