import { PrismaClient } from '@prisma/client';
import { getRequestContext } from './requestContext.js';

const TENANT_SCOPED_MODELS = new Set([
  'User', 'Role', 'Clinic', 'Department', 'Expense',
  'Patient', 'PatientFile', 'Appointment',
  'VitalSign', 'Symptom', 'Medication', 'ClinicalRecord',
  'Referral', 'ReferralMedication', 'ReferralTest',
  'Surgery', 'PostOpFollowUp', 'PostoperativeNote', 'DischargeSummary',
  'OperationType', 'PreoperativeRequest', 'ConsentWaiver',
  'SurgeryTeamMember', 'IntraoperativeEvent',
  'Ward', 'Bed', 'InpatientVital', 'NursingNote', 'WardRound',
  'InventoryItem', 'InventoryLocation', 'InventoryTransaction',
  'Transaction', 'OpticLabJob', 'Shift', 'CashMovement',
  'DiagnosticOrder', 'DiagnosticOrderTest', 'LabSample',
  'Employee', 'PayrollRecord', 'Attendance', 'LeaveRequest',
  'AuditLog', 'AccountsPayable', 'Supplier', 'SupplierInvoice', 'SupplierInvoiceItem',
  'CostCenter', 'Requisition', 'RequisitionItem',
  'PurchaseOrder', 'PurchaseOrderItem', 'FixedAsset', 'Notification',
  'ImagingOrder', 'ImagingFile',
  'ServiceItem', 'Invoice', 'Account', 'JournalEntry',
  'PatientUser', 'NotificationPreference',
]);

type WhereClause = Record<string, unknown>;

function mergeWhere(existing: WhereClause | undefined, extra: WhereClause): WhereClause {
  if (!existing || Object.keys(existing).length === 0) return extra;
  if ('AND' in existing && Array.isArray(existing['AND'])) {
    return { ...existing, AND: [...(existing['AND'] as WhereClause[]), extra] };
  }
  return { AND: [existing, extra] };
}

const READ_OPS = new Set(['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy']);
const WRITE_OPS = new Set(['create', 'createMany']);
const UPDATE_DELETE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany']);
const UPSERT_OPS = new Set(['upsert']);

export function createTenantPrisma(basePrisma: PrismaClient) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: {
          model: string;
          operation: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }) {
          const ctx = getRequestContext();
          const hospitalId = ctx?.hospitalId;

          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          if (!hospitalId) {
            return query(args);
          }

          if (READ_OPS.has(operation)) {
            if (operation === 'findUnique') {
              const result = await query(args) as Record<string, unknown> | null;
              if (result && 'hospitalId' in result && result['hospitalId'] !== hospitalId) {
                return null;
              }
              return result;
            }
            const newArgs = { ...args };
            newArgs['where'] = mergeWhere(args['where'] as WhereClause | undefined, { hospitalId });
            return query(newArgs);
          }

          if (WRITE_OPS.has(operation)) {
            const newArgs = { ...args };
            if ('data' in newArgs) {
              const data = newArgs['data'] as Record<string, unknown> | Array<Record<string, unknown>>;
              if (Array.isArray(data)) {
                newArgs['data'] = data.map((d) => ({ ...d, hospitalId: d['hospitalId'] ?? hospitalId }));
              } else {
                newArgs['data'] = { ...data, hospitalId: data['hospitalId'] ?? hospitalId };
              }
            }
            return query(newArgs);
          }

          if (UPDATE_DELETE_OPS.has(operation)) {
            const newArgs = { ...args };
            newArgs['where'] = mergeWhere(args['where'] as WhereClause | undefined, { hospitalId });
            return query(newArgs);
          }

          if (UPSERT_OPS.has(operation)) {
            const newArgs = { ...args };
            newArgs['where'] = mergeWhere(args['where'] as WhereClause | undefined, { hospitalId });
            if ('create' in newArgs) {
              const create = newArgs['create'] as Record<string, unknown>;
              newArgs['create'] = { ...create, hospitalId: create['hospitalId'] ?? hospitalId };
            }
            return query(newArgs);
          }

          return query(args);
        },
      },
    },
  });
}
