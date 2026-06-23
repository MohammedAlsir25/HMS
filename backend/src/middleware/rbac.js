/**
 * Role definitions with granular feature-level permissions.
 * Structure: { "module:action": true/false }
 */
export const PERMISSIONS = {
  PATIENT_READ: 'patient:read',
  PATIENT_CREATE: 'patient:create',
  PATIENT_UPDATE: 'patient:update',
  CLINICAL_READ: 'clinical:read',
  CLINICAL_WRITE: 'clinical:write',
  APPOINTMENT_READ: 'appointment:read',
  APPOINTMENT_WRITE: 'appointment:write',
  PHARMACY_READ: 'pharmacy:read',
  PHARMACY_WRITE: 'pharmacy:write',
  OPTICS_READ: 'optics:read',
  OPTICS_WRITE: 'optics:write',
  SURGERY_READ: 'surgery:read',
  SURGERY_WRITE: 'surgery:write',
  ACCOUNTING_READ: 'accounting:read',
  ACCOUNTING_WRITE: 'accounting:write',
  WAREHOUSE_READ: 'warehouse:read',
  WAREHOUSE_WRITE: 'warehouse:write',
  ADMIN_USERS: 'admin:users',
  ADMIN_RBAC: 'admin:rbac',
  HR_READ: 'hr:read',
  HR_WRITE: 'hr:write',
  DIAGNOSTICS_READ: 'diagnostics:read',
  DIAGNOSTICS_ORDER: 'diagnostics:order',
  DIAGNOSTICS_WRITE: 'diagnostics:write',
  DIAGNOSTICS_RESULTS: 'diagnostics:results',
  DIAGNOSTICS_CATALOG: 'diagnostics:catalog',
};

export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    permissions: Object.values(PERMISSIONS),
  },
  DOCTOR: {
    name: 'Doctor',
    permissions: [
      PERMISSIONS.PATIENT_READ,
      PERMISSIONS.PATIENT_CREATE,
      PERMISSIONS.CLINICAL_READ,
      PERMISSIONS.CLINICAL_WRITE,
      PERMISSIONS.APPOINTMENT_READ,
      PERMISSIONS.APPOINTMENT_WRITE,
      PERMISSIONS.SURGERY_READ,
      PERMISSIONS.WAREHOUSE_READ,
      PERMISSIONS.DIAGNOSTICS_READ,
      PERMISSIONS.DIAGNOSTICS_ORDER,
    ],
  },
  NURSE: {
    name: 'Nurse',
    permissions: [
      PERMISSIONS.PATIENT_READ,
      PERMISSIONS.CLINICAL_READ,
      PERMISSIONS.APPOINTMENT_READ,
      PERMISSIONS.APPOINTMENT_WRITE,
    ],
  },
  RECEPTIONIST: {
    name: 'Receptionist',
    permissions: [
      PERMISSIONS.PATIENT_READ,
      PERMISSIONS.PATIENT_CREATE,
      PERMISSIONS.PATIENT_UPDATE,
      PERMISSIONS.APPOINTMENT_READ,
      PERMISSIONS.APPOINTMENT_WRITE,
      PERMISSIONS.ACCOUNTING_READ,
    ],
  },
  PHARMACIST: {
    name: 'Pharmacist',
    permissions: [
      PERMISSIONS.PATIENT_READ,
      PERMISSIONS.PHARMACY_READ,
      PERMISSIONS.PHARMACY_WRITE,
    ],
  },
  OPTICIAN: {
    name: 'Optician',
    permissions: [
      PERMISSIONS.PATIENT_READ,
      PERMISSIONS.OPTICS_READ,
      PERMISSIONS.OPTICS_WRITE,
    ],
  },
  ACCOUNTANT: {
    name: 'Accountant',
    permissions: [
      PERMISSIONS.ACCOUNTING_READ,
      PERMISSIONS.ACCOUNTING_WRITE,
    ],
  },
  HR_MANAGER: {
    name: 'HR Manager',
    permissions: [
      PERMISSIONS.HR_READ,
      PERMISSIONS.HR_WRITE,
    ],
  },
  LAB_TECHNICIAN: {
    name: 'Lab Technician',
    permissions: [
      PERMISSIONS.PATIENT_READ,
      PERMISSIONS.DIAGNOSTICS_READ,
      PERMISSIONS.DIAGNOSTICS_WRITE,
      PERMISSIONS.DIAGNOSTICS_RESULTS,
    ],
  },
  LAB_ADMIN: {
    name: 'Lab Admin',
    permissions: [
      PERMISSIONS.PATIENT_READ,
      PERMISSIONS.DIAGNOSTICS_READ,
      PERMISSIONS.DIAGNOSTICS_ORDER,
      PERMISSIONS.DIAGNOSTICS_WRITE,
      PERMISSIONS.DIAGNOSTICS_RESULTS,
      PERMISSIONS.DIAGNOSTICS_CATALOG,
    ],
  },
};
