import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError } from '../../utils/errors.js';

const router = Router();
import prisma from '../../lib/prisma.js';

const REFERENCE_TABLES = [
  'role', 'clinic', 'department', 'icd10Code', 'diagnosticTest',
  'diagnosticPanel', 'diagnosticPanelTest', 'costCenter',
] as const;

const TRANSACTIONAL_MODELS = [
  'user', 'expense', 'patient', 'patientFile', 'appointment',
  'vitalSign', 'symptom', 'medication', 'clinicalRecord',
  'referral', 'referralMedication', 'referralTest', 'surgery',
  'inventoryItem', 'inventoryLocation', 'inventoryTransaction',
  'transaction', 'shift', 'diagnosticOrder', 'diagnosticOrderTest',
  'employee', 'payrollRecord', 'attendance', 'leaveRequest',
  'auditLog', 'accountsPayable', 'supplier', 'supplierInvoice',
  'supplierInvoiceItem', 'requisition', 'requisitionItem',
  'purchaseOrder', 'purchaseOrderItem', 'fixedAsset', 'notification',
] as const;

const ALL_MODELS = [...REFERENCE_TABLES, ...TRANSACTIONAL_MODELS];

type PrismaDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
};

function getModel(table: string): PrismaDelegate | null {
  const modelName = table.charAt(0).toUpperCase() + table.slice(1);
  const delegate = (prisma as unknown as Record<string, unknown>)[modelName];
  if (!delegate || typeof delegate !== 'object') return null;
  return delegate as PrismaDelegate;
}

function tableName(table: string): string {
  const map: Record<string, string> = {
    user: 'users',
    role: 'roles',
    clinic: 'clinics',
    department: 'departments',
    expense: 'expenses',
    patient: 'patients',
    patientFile: 'patient_files',
    appointment: 'appointments',
    icd10Code: 'icd10_codes',
    vitalSign: 'vital_signs',
    symptom: 'symptoms',
    medication: 'medications',
    clinicalRecord: 'clinical_records',
    referral: 'referrals',
    referralMedication: 'referral_medications',
    referralTest: 'referral_tests',
    surgery: 'surgeries',
    inventoryItem: 'inventory_items',
    inventoryLocation: 'inventory_locations',
    inventoryTransaction: 'inventory_transactions',
    transaction: 'transactions',
    shift: 'shifts',
    diagnosticTest: 'diagnostic_tests',
    diagnosticPanel: 'diagnostic_panels',
    diagnosticPanelTest: 'diagnostic_panel_tests',
    diagnosticOrder: 'diagnostic_orders',
    diagnosticOrderTest: 'diagnostic_order_tests',
    employee: 'employees',
    payrollRecord: 'payroll_records',
    attendance: 'attendance',
    leaveRequest: 'leave_requests',
    auditLog: 'audit_logs',
    accountsPayable: 'accounts_payable',
    supplier: 'suppliers',
    supplierInvoice: 'supplier_invoices',
    supplierInvoiceItem: 'supplier_invoice_items',
    costCenter: 'cost_centers',
    requisition: 'requisitions',
    requisitionItem: 'requisition_items',
    purchaseOrder: 'purchase_orders',
    purchaseOrderItem: 'purchase_order_items',
    fixedAsset: 'fixed_assets',
    notification: 'notifications',
  };
  return map[table] || table;
}

function hasCamelCaseUpdatedAt(table: string): boolean {
  return ['user', 'expense', 'patient', 'appointment', 'clinicalRecord', 'referral',
    'surgery', 'diagnosticTest', 'diagnosticOrder', 'employee', 'leaveRequest',
    'accountsPayable', 'requisition', 'purchaseOrder', 'fixedAsset'].includes(table);
}

router.get('/initial', authenticate, asyncHandler(async (_req, res) => {
  const result: Record<string, unknown[]> = {};
  for (const table of REFERENCE_TABLES) {
    const delegate = getModel(table);
    if (!delegate) continue;
    const records = await delegate.findMany({});
    result[table] = records;
  }
  res.json({ data: result, timestamp: new Date().toISOString() });
}));

router.get('/pull', authenticate, asyncHandler(async (req, res) => {
  const since = req.query.since as string;
  if (!since) throw new ValidationError('since query parameter is required');

  const sinceDate = since;
  const queries = ALL_MODELS.map(async (table) => {
    const tbl = tableName(table);
    const col = hasCamelCaseUpdatedAt(table) ? 'updatedAt' : 'updated_at';
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${tbl}" WHERE "${col}" >= $1::timestamptz`,
        sinceDate,
      );
      return { table, rows: Array.isArray(rows) ? rows : [] };
    } catch {
      return { table, rows: [] };
    }
  });

  const results = await Promise.all(queries);
  const changes: Record<string, unknown[]> = {};
  for (const { table, rows } of results) {
    if (rows.length > 0) changes[table] = rows;
  }

  res.json({ changes, timestamp: new Date().toISOString() });
}));

router.post('/push', authenticate, asyncHandler(async (req, res) => {
  const { mutations } = req.body as {
    mutations: Array<{ table: string; action: 'create' | 'update' | 'delete'; recordId: string; data: Record<string, unknown>; clientTimestamp: string }>;
  };
  if (!mutations || !Array.isArray(mutations)) throw new ValidationError('mutations array is required');

  const results: Array<{ recordId: string; status: string; serverData?: unknown; error?: string }> = [];

  for (const mutation of mutations) {
    const { table, action, recordId, data } = mutation;
    const tbl = tableName(table);
    try {
      if (action === 'create') {
        const safeData = { ...data };
        const now = new Date();
        if (!safeData.updated_at && !safeData.updatedAt) safeData.updated_at = now;
        if (!safeData.created_at && !safeData.createdAt) safeData.created_at = now;
        const cols = ['"id"', ...Object.keys(safeData).map(k => `"${k}"`)];
        const vals = [`$${1}`, ...Object.keys(safeData).map((_, i) => `$${i + 2}`)];
        const updates = Object.keys(safeData)
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(', ');
        const rows = await prisma.$queryRawUnsafe(
          `INSERT INTO "${tbl}" (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT ("id") DO UPDATE SET ${updates} RETURNING *`,
          recordId, ...Object.values(safeData),
        );
        results.push({ recordId, status: 'applied', serverData: rows });
      } else if (action === 'update') {
        const setClauses = Object.keys(data)
          .filter(k => k !== 'id')
          .map((k, i) => `"${k}" = $${i + 2}`);
        const rows = await prisma.$queryRawUnsafe(
          `UPDATE "${tbl}" SET ${setClauses.join(', ')} WHERE "id" = $1 RETURNING *`,
          recordId, ...Object.entries(data).filter(([k]) => k !== 'id').map(([, v]) => v),
        );
        results.push({ recordId, status: 'applied', serverData: rows });
      } else if (action === 'delete') {
        await prisma.$executeRawUnsafe(
          `UPDATE "${tbl}" SET "is_deleted" = true WHERE "id" = $1`,
          recordId,
        );
        results.push({ recordId, status: 'applied' });
      } else {
        results.push({ recordId, status: 'error', error: `Unknown action: ${action}` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ recordId, status: 'error', error: message });
    }
  }

  res.json({ results, timestamp: new Date().toISOString() });
}));

export default router;
