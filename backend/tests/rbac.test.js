import { describe, it, expect } from '@jest/globals';
import { PERMISSIONS, DEFAULT_ROLES } from '../src/middleware/rbac.js';

describe('RBAC - Role Definitions', () => {
  it('should have all permission constants defined', () => {
    const values = Object.values(PERMISSIONS);
    expect(values.length).toBeGreaterThan(15);
    values.forEach((p) => {
      expect(typeof p).toBe('string');
      expect(p).toMatch(/^[a-z]+:[a-z]+$/);
    });
  });

  it('should have all default roles', () => {
    const roleNames = Object.keys(DEFAULT_ROLES);
    const expected = ['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'OPTICIAN', 'ACCOUNTANT', 'HR_MANAGER', 'LAB_TECHNICIAN'];
    expected.forEach((name) => {
      expect(roleNames).toContain(name);
    });
  });

  it('SUPER_ADMIN should have all permissions', () => {
    const allPerms = Object.values(PERMISSIONS);
    const adminPerms = DEFAULT_ROLES.SUPER_ADMIN.permissions;
    allPerms.forEach((p) => {
      expect(adminPerms).toContain(p);
    });
  });

  it('DOCTOR should not have admin permissions', () => {
    const doctorPerms = DEFAULT_ROLES.DOCTOR.permissions;
    expect(doctorPerms).not.toContain(PERMISSIONS.ADMIN_USERS);
    expect(doctorPerms).not.toContain(PERMISSIONS.ADMIN_RBAC);
    expect(doctorPerms).not.toContain(PERMISSIONS.HR_READ);
  });

  it('RECEPTIONIST should have patient create but not clinical write', () => {
    const perms = DEFAULT_ROLES.RECEPTIONIST.permissions;
    expect(perms).toContain(PERMISSIONS.PATIENT_CREATE);
    expect(perms).not.toContain(PERMISSIONS.CLINICAL_WRITE);
  });

  it('LAB_TECHNICIAN should have diagnostics read/write and patient read', () => {
    const perms = DEFAULT_ROLES.LAB_TECHNICIAN.permissions;
    expect(perms).toContain(PERMISSIONS.PATIENT_READ);
    expect(perms).toContain(PERMISSIONS.DIAGNOSTICS_READ);
    expect(perms).toContain(PERMISSIONS.DIAGNOSTICS_WRITE);
    expect(perms).not.toContain(PERMISSIONS.ADMIN_USERS);
    expect(perms).not.toContain(PERMISSIONS.CLINICAL_WRITE);
    expect(perms).not.toContain(PERMISSIONS.SURGERY_WRITE);
  });

  it('no role should have undefined permissions', () => {
    Object.values(DEFAULT_ROLES).forEach((role) => {
      role.permissions.forEach((p) => {
        expect(Object.values(PERMISSIONS)).toContain(p);
      });
    });
  });
});
