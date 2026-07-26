import prisma from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { DEFAULT_ROLES } from '../../middleware/rbac.js';
import { DEPARTMENT_TEMPLATES } from '../departments/departmentTemplates.js';
import type { CreateHospitalInput, UpdateHospitalInput } from './hospital.types.js';
import type { HospitalType } from '@prisma/client';

const DEFAULT_CLINIC_NAME = 'General Clinic';

export async function createHospital(data: CreateHospitalInput) {
  const existing = await prisma.hospital.findUnique({ where: { slug: data.slug } });
  if (existing) throw new ConflictError('Hospital with this slug already exists');

  return prisma.$transaction(async (tx) => {
    const hospital = await tx.hospital.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: (data.type as HospitalType) || null,
        address: data.address,
        phone: data.phone,
        email: data.email,
        logoUrl: data.logoUrl,
        settings: data.settings ?? undefined,
      },
    });

    const roleEntries = Object.entries(DEFAULT_ROLES);
    if (roleEntries.length > 0) {
      await tx.role.createMany({
        data: roleEntries.map(([, def]) => ({
          name: def.name,
          permissions: def.permissions,
          hospitalId: hospital.id,
        })),
        skipDuplicates: true,
      });
    }

    const clinic = await tx.clinic.create({
      data: {
        name: DEFAULT_CLINIC_NAME,
        slug: 'general-clinic',
        type: 'MEDICINE',
        hospitalId: hospital.id,
      },
    });

    const hospitalType = (data.type || 'GENERAL') as HospitalType;
    const templates = DEPARTMENT_TEMPLATES[hospitalType] || DEPARTMENT_TEMPLATES.GENERAL;
    for (const tmpl of templates) {
      const isClinicType = tmpl.type === 'CLINIC';
      await tx.department.create({
        data: {
          name: tmpl.name,
          nameAr: tmpl.nameAr,
          slug: tmpl.slug,
          type: tmpl.type,
          clinicId: isClinicType ? clinic.id : null,
          hospitalId: hospital.id,
        },
      });
    }

    return hospital;
  });
}

export async function listHospitals(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [hospitals, total] = await Promise.all([
    prisma.hospital.findMany({
      where: { is_deleted: false },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, clinics: true, patients: true },
        },
      },
    }),
    prisma.hospital.count({ where: { is_deleted: false } }),
  ]);
  return { hospitals, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getHospitalById(id: string) {
  const hospital = await prisma.hospital.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true, clinics: true, patients: true, departments: true, employees: true },
      },
    },
  });
  if (!hospital || hospital.is_deleted) throw new NotFoundError('Hospital not found');
  return hospital;
}

export async function updateHospital(id: string, data: UpdateHospitalInput) {
  const hospital = await prisma.hospital.findUnique({ where: { id } });
  if (!hospital || hospital.is_deleted) throw new NotFoundError('Hospital not found');

  if (data.slug && data.slug !== hospital.slug) {
    const existing = await prisma.hospital.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictError('Hospital with this slug already exists');
  }

  return prisma.hospital.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.settings !== undefined && { settings: data.settings }),
    },
  });
}

export async function deactivateHospital(id: string) {
  const hospital = await prisma.hospital.findUnique({ where: { id } });
  if (!hospital || hospital.is_deleted) throw new NotFoundError('Hospital not found');

  return prisma.hospital.update({
    where: { id },
    data: { isActive: false },
  });
}
