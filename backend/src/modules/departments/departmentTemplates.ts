import type { DepartmentType, HospitalType } from '@prisma/client';

interface DepartmentTemplate {
  name: string;
  nameAr: string;
  slug: string;
  type: DepartmentType;
}

type HospitalTemplates = Record<HospitalType, DepartmentTemplate[]>;

const shared: DepartmentTemplate[] = [
  { name: 'Administration', nameAr: 'الإدارة', slug: 'admin-dept', type: 'ADMIN' as DepartmentType },
  { name: 'Human Resources', nameAr: 'الموارد البشرية', slug: 'hr-dept', type: 'HR' as DepartmentType },
  { name: 'Finance', nameAr: 'المالية', slug: 'finance-dept', type: 'FINANCE' as DepartmentType },
  { name: 'IT', nameAr: 'تقنية المعلومات', slug: 'it-dept', type: 'IT' as DepartmentType },
  { name: 'Nursing', nameAr: 'التمريض', slug: 'nursing-dept', type: 'NURSING' as DepartmentType },
  { name: 'Pharmacy', nameAr: 'الصيدلية', slug: 'pharmacy-dept', type: 'PHARMACY' as DepartmentType },
  { name: 'Hospital Operations', nameAr: 'العمليات المستشفى', slug: 'hospital-dept', type: 'OTHER' as DepartmentType },
];

export const DEPARTMENT_TEMPLATES: HospitalTemplates = {
  GENERAL: [
    ...shared,
    { name: 'General Medicine Clinic', nameAr: 'عيادة الطب العام', slug: 'medicine-dept', type: 'CLINIC' as DepartmentType },
    { name: 'ENT Clinic', nameAr: 'عيادة الأنف والأذن والحنجرة', slug: 'ent-dept', type: 'CLINIC' as DepartmentType },
    { name: 'Dental Clinic', nameAr: 'عيادة الأسنان', slug: 'dental-dept', type: 'CLINIC' as DepartmentType },
    { name: 'Laboratory', nameAr: 'المختبر', slug: 'lab-dept', type: 'LAB' as DepartmentType },
    { name: 'Surgery', nameAr: 'الجراحة', slug: 'surgery-dept', type: 'SURGERY' as DepartmentType },
    { name: 'Emergency', nameAr: 'الطوارئ', slug: 'emergency-dept', type: 'EMERGENCY' as DepartmentType },
    { name: 'Imaging', nameAr: 'الأشعة', slug: 'imaging-dept', type: 'IMAGING' as DepartmentType },
  ],
  OPHTHALMOLOGY: [
    ...shared,
    { name: 'Retina Clinic', nameAr: 'عيادة الشبكية', slug: 'retina-dept', type: 'CLINIC' as DepartmentType },
    { name: 'Glaucoma Clinic', nameAr: 'عيادة الجلوكوما', slug: 'glaucoma-dept', type: 'CLINIC' as DepartmentType },
    { name: 'Pediatrics Ophthalmology', nameAr: 'طب عيون الأطفال', slug: 'peds-ophth-dept', type: 'CLINIC' as DepartmentType },
    { name: 'General Ophthalmology', nameAr: 'طب العيون العام', slug: 'gen-ophth-dept', type: 'CLINIC' as DepartmentType },
    { name: 'Optometry', nameAr: 'قياس البصر', slug: 'optometry-dept', type: 'CLINIC' as DepartmentType },
    { name: 'Orbit Clinic', nameAr: 'عيادة الحجاج', slug: 'orbit-dept', type: 'CLINIC' as DepartmentType },
    { name: 'Optics', nameAr: 'النظارات', slug: 'optics-dept', type: 'OTHER' as DepartmentType },
    { name: 'Laboratory', nameAr: 'المختبر', slug: 'lab-dept', type: 'LAB' as DepartmentType },
    { name: 'Surgery', nameAr: 'الجراحة', slug: 'surgery-dept', type: 'SURGERY' as DepartmentType },
    { name: 'Emergency', nameAr: 'الطوارئ', slug: 'emergency-dept', type: 'EMERGENCY' as DepartmentType },
    { name: 'Imaging', nameAr: 'الأشعة', slug: 'imaging-dept', type: 'IMAGING' as DepartmentType },
  ],
  DENTAL: [
    ...shared,
    { name: 'Dental Clinic', nameAr: 'عيادة الأسنان', slug: 'dental-dept', type: 'CLINIC' as DepartmentType },
    { name: 'Oral Surgery', nameAr: 'جراحة الفم', slug: 'oral-surgery-dept', type: 'SURGERY' as DepartmentType },
    { name: 'Laboratory', nameAr: 'المختبر', slug: 'lab-dept', type: 'LAB' as DepartmentType },
    { name: 'Imaging', nameAr: 'الأشعة', slug: 'imaging-dept', type: 'IMAGING' as DepartmentType },
    { name: 'Emergency', nameAr: 'الطوارئ', slug: 'emergency-dept', type: 'EMERGENCY' as DepartmentType },
  ],
  CLINIC: [
    { name: 'Administration', nameAr: 'الإدارة', slug: 'admin-dept', type: 'ADMIN' as DepartmentType },
    { name: 'Nursing', nameAr: 'التمريض', slug: 'nursing-dept', type: 'NURSING' as DepartmentType },
    { name: 'Pharmacy', nameAr: 'الصيدلية', slug: 'pharmacy-dept', type: 'PHARMACY' as DepartmentType },
    { name: 'Laboratory', nameAr: 'المختبر', slug: 'lab-dept', type: 'LAB' as DepartmentType },
  ],
  OTHER: [...shared],
};
