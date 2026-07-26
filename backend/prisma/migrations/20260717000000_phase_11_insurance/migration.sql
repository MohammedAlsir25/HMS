-- CreateEnum
CREATE TYPE "ClinicType" AS ENUM ('MEDICINE', 'ENT', 'DENTAL', 'RETINA', 'GLAUCOMA', 'ORBIT', 'PEDS_OPHTH', 'GEN_OPHTH', 'OPTOMETRY', 'IMAGING');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('WALKIN', 'RESERVATION');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('NEW_VISIT', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "DiabetesType" AS ENUM ('NONE', 'TYPE1', 'TYPE2', 'GESTATIONAL');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESERVED');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('INTERNAL_CLINIC', 'PHARMACY_DISPATCH', 'OPTICS_DISPATCH', 'LAB_DISPATCH');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'DISPATCHED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SurgeryStatus" AS ENUM ('SCHEDULED', 'PREP', 'IN_SURGERY', 'RECOVERY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SurgeryDisposition" AS ENUM ('PENDING', 'DISCHARGE_HOME', 'ADMIT_WARD');

-- CreateEnum
CREATE TYPE "PreoperativeStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'PAYMENT_DONE', 'INVESTIGATIONS_DONE', 'SCHEDULED', 'CANCELLED', 'WAITING', 'IN_PROGRESS', 'CLEARED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SELF', 'PARENT', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEPTION', 'PHARMACY', 'OPTICS', 'LAB', 'WARD', 'SURGERY', 'IMAGING', 'PREOP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'INSURANCE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('CLINIC', 'PHARMACY', 'LAB', 'SURGERY', 'ADMIN', 'HR', 'FINANCE', 'IT', 'NURSING', 'OTHER', 'IMAGING');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SALARY', 'SUPPLIES', 'UTILITIES', 'RENT', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'OTHER');

-- CreateEnum
CREATE TYPE "DiagnosticOrderType" AS ENUM ('LAB');

-- CreateEnum
CREATE TYPE "DiagnosticOrderStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResultFlag" AS ENUM ('NORMAL', 'HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'ABNORMAL');

-- CreateEnum
CREATE TYPE "LabSampleStatus" AS ENUM ('COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'UNPAID');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PaidInFull', 'PartialPayment', 'Pending');

-- CreateEnum
CREATE TYPE "ImagingScanType" AS ENUM ('A_SCAN', 'B_SCAN', 'OTT', 'BIOMETRY');

-- CreateEnum
CREATE TYPE "PostOpFollowUpStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED');

-- CreateEnum
CREATE TYPE "ImagingOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ServiceItemCategory" AS ENUM ('CONSULTATION', 'SURGERY', 'LAB', 'IMAGING', 'PHARMACY', 'WARD', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('CONSULTATION', 'PHARMACY', 'LAB', 'IMAGING', 'SURGERY', 'WARD', 'MANUAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PreAuthorizationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'SETTLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'DISPUTED');

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

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" TEXT NOT NULL,
    "clinicId" TEXT,
    "hospitalId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "slug" TEXT NOT NULL,
    "type" "ClinicType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "consultationFee" DECIMAL(65,30),
    "followUpFee" DECIMAL(65,30),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "optometryPreScreeningRequired" BOOLEAN NOT NULL DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "slug" TEXT NOT NULL,
    "type" "DepartmentType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clinicId" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidTo" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,
    "hospitalId" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "nationalId" TEXT,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "chronicConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "diabetesType" "DiabetesType" NOT NULL DEFAULT 'NONE',
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_files" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "patient_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "token" INTEGER NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'WAITING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitType" "VisitType" DEFAULT 'NEW_VISIT',
    "scheduledAt" TIMESTAMP(3),
    "targetClinicId" TEXT,
    "optometryRecordId" TEXT,
    "hospitalId" TEXT,
    "surgeryId" TEXT,
    "remindedAt" TIMESTAMP(3),
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icd10_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "icd10_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "bloodPressureSystolic" INTEGER,
    "bloodPressureDiastolic" INTEGER,
    "heartRate" INTEGER,
    "temperature" DECIMAL(65,30),
    "spo2" INTEGER,
    "bloodGlucose" INTEGER,
    "weight" DECIMAL(65,30),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinicalRecordId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptoms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyArea" TEXT,
    "onset" TEXT,
    "duration" TEXT,
    "severity" INTEGER,
    "description" TEXT,
    "clinicalRecordId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "symptoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "route" TEXT,
    "notes" TEXT,
    "clinicalRecordId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" TEXT NOT NULL,
    "encounterDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosis" TEXT,
    "prescriptions" TEXT,
    "clinicSpecificJson" JSONB DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "type" "ReferralType" NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fromClinicId" TEXT NOT NULL,
    "toClinicId" TEXT,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_medications" (
    "id" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "route" TEXT,
    "notes" TEXT,
    "referralId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "referral_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_tests" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "referral_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgeries" (
    "id" TEXT NOT NULL,
    "orRoom" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "SurgeryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT,
    "departmentId" TEXT NOT NULL,
    "preoperativeRequestId" TEXT,
    "operationTypeId" TEXT,
    "anesthesiaType" TEXT,
    "disposition" "SurgeryDisposition" NOT NULL DEFAULT 'PENDING',
    "admittedWardId" TEXT,

    CONSTRAINT "surgeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_op_follow_ups" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "PostOpFollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "post_op_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postoperative_notes" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "postoperative_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_summaries" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "dischargeDate" TIMESTAMP(3) NOT NULL,
    "dischargeNotes" TEXT,
    "medications" TEXT,
    "followUpInstructions" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "discharge_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "operation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "or_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "or_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preoperative_requests" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "operationTypeId" TEXT NOT NULL,
    "status" "PreoperativeStatus" NOT NULL DEFAULT 'REQUESTED',
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "labOrderId" TEXT,
    "aScanOrderId" TEXT,
    "bScanOrderId" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "scheduledTime" TEXT,
    "scheduledById" TEXT,
    "cancelledReason" TEXT,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "flaggedReason" TEXT,
    "referredTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "preoperative_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_waivers" (
    "id" TEXT NOT NULL,
    "preoperativeRequestId" TEXT NOT NULL,
    "signedBy" TEXT NOT NULL,
    "relationship" "RelationshipType" NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "documentUrl" TEXT,
    "witnessedById" TEXT,
    "isPrintable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "consent_waivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgery_team_members" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "surgery_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intraoperative_event_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "intraoperative_event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intraoperative_events" (
    "id" TEXT NOT NULL,
    "surgeryId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventTypeId" TEXT NOT NULL,
    "description" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hospitalId" TEXT,

    CONSTRAINT "intraoperative_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "type" TEXT,
    "floor" TEXT,
    "capacity" INTEGER,
    "departmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyRate" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'VACANT',
    "patientId" TEXT,
    "surgeryId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inpatient_vitals" (
    "id" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DECIMAL(65,30),
    "heartRate" INTEGER,
    "bloodPressureSystolic" INTEGER,
    "bloodPressureDiastolic" INTEGER,
    "respiratoryRate" INTEGER,
    "oxygenSaturation" INTEGER,
    "painScore" INTEGER,
    "recordedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hospitalId" TEXT,

    CONSTRAINT "inpatient_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_notes" (
    "id" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "nursing_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ward_rounds" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT NOT NULL,
    "notes" TEXT,
    "plan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "ward_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "costPrice" DECIMAL(65,30) DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "pack_size" INTEGER NOT NULL DEFAULT 1,
    "barcode" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "itemId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,
    "unitCost" DECIMAL(65,30),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shiftId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "cogs" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "departmentId" TEXT,
    "patientId" TEXT,
    "surgeryId" TEXT,
    "diagnosticOrderId" TEXT,
    "appointmentId" TEXT,
    "imagingOrderId" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optic_lab_jobs" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "transactionId" TEXT NOT NULL,
    "sphOD" TEXT,
    "cylOD" TEXT,
    "axisOD" TEXT,
    "sphOS" TEXT,
    "cylOS" TEXT,
    "axisOS" TEXT,
    "frameName" TEXT,
    "frameSku" TEXT,
    "frameItemId" TEXT,
    "lensType" TEXT,
    "lensMaterial" TEXT,
    "coating" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hospitalId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdById" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,

    CONSTRAINT "optic_lab_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingBalance" DECIMAL(65,30) DEFAULT 0,
    "expectedTotal" DECIMAL(65,30),
    "actualTotal" DECIMAL(65,30),
    "denominations" JSONB,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "hospitalId" TEXT,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_tests" (
    "id" TEXT NOT NULL,
    "orderType" "DiagnosticOrderType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "category" TEXT NOT NULL,
    "specimen" TEXT,
    "unit" TEXT,
    "refRangeText" TEXT,
    "refRangeLow" DECIMAL(65,30),
    "refRangeHigh" DECIMAL(65,30),
    "lowCritical" DECIMAL(65,30),
    "highCritical" DECIMAL(65,30),
    "price" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_panels" (
    "id" TEXT NOT NULL,
    "orderType" "DiagnosticOrderType" NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "diagnostic_panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_panel_tests" (
    "panelId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,

    CONSTRAINT "diagnostic_panel_tests_pkey" PRIMARY KEY ("panelId","testId")
);

-- CreateTable
CREATE TABLE "diagnostic_orders" (
    "id" TEXT NOT NULL,
    "orderType" "DiagnosticOrderType" NOT NULL DEFAULT 'LAB',
    "status" "DiagnosticOrderStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "clinicalNotes" TEXT,
    "resultNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "fromClinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "panelId" TEXT,
    "referralId" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "hospitalId" TEXT,

    CONSTRAINT "diagnostic_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_order_tests" (
    "id" TEXT NOT NULL,
    "value" TEXT,
    "unit" TEXT,
    "refRangeLow" DECIMAL(65,30),
    "refRangeHigh" DECIMAL(65,30),
    "refRangeText" TEXT,
    "flag" "ResultFlag" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "resultEnteredAt" TIMESTAMP(3),
    "resultEnteredById" TEXT,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "diagnostic_order_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_samples" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "LabSampleStatus" NOT NULL DEFAULT 'COLLECTED',
    "collectedAt" TIMESTAMP(3),
    "collectedById" TEXT,
    "orderId" TEXT NOT NULL,
    "hospitalId" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "position" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "baseSalary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "departmentId" TEXT,
    "gender" TEXT,
    "hospitalId" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "grossPay" DECIMAL(65,30) NOT NULL,
    "deductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(65,30) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "employeeId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "approvedById" TEXT,
    "hospitalId" TEXT,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" TEXT NOT NULL,
    "creditor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceTotal" DECIMAL(65,30) NOT NULL,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplierId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expenseId" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoice_items" (
    "id" TEXT NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalLineCost" DECIMAL(65,30) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "supplier_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisitions" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestedById" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "itemId" TEXT,
    "requisitionId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "departmentType" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "invoiceTotal" DECIMAL(65,30) NOT NULL,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalTier" INTEGER,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "supplierId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "costCenterId" TEXT,
    "expenseId" TEXT,
    "assetId" TEXT,
    "cogsAccountId" TEXT,
    "labFeePaid" DECIMAL(65,30),
    "installationFreight" DECIMAL(65,30),
    "usefulLifeYears" INTEGER,
    "requisitionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "hospitalId" TEXT,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalLineCost" DECIMAL(65,30) NOT NULL,
    "itemId" TEXT,
    "orderId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "acquisitionCost" DECIMAL(65,30) NOT NULL,
    "installationCost" DECIMAL(65,30) DEFAULT 0,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "usefulLifeYears" INTEGER NOT NULL,
    "salvageValue" DECIMAL(65,30) DEFAULT 0,
    "depreciationMethod" TEXT NOT NULL DEFAULT 'straight-line',
    "monthlyDepreciation" DECIMAL(65,30) NOT NULL,
    "accumulatedDepreciation" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bookValue" DECIMAL(65,30) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "serialNumber" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "is_deleted" BOOLEAN DEFAULT false,
    "hospitalId" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crash_logs" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "userId" TEXT,
    "url" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crash_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imaging_procedure_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "scanType" "ImagingScanType" NOT NULL,
    "price" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imaging_procedure_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imaging_orders" (
    "id" TEXT NOT NULL,
    "referralId" TEXT,
    "patientId" TEXT NOT NULL,
    "requestedByClinicId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "scanType" "ImagingScanType" NOT NULL,
    "laterality" TEXT,
    "clinicalInfo" TEXT,
    "status" "ImagingOrderStatus" NOT NULL DEFAULT 'PENDING',
    "findings" TEXT,
    "impression" TEXT,
    "createdById" TEXT NOT NULL,
    "completedById" TEXT,
    "clinicalRecordId" TEXT,
    "procedureTypeId" TEXT,
    "price" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "hospitalId" TEXT,

    CONSTRAINT "imaging_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imaging_files" (
    "id" TEXT NOT NULL,
    "imagingOrderId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hospitalId" TEXT,

    CONSTRAINT "imaging_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clinicType" "ClinicType" NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "hospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "category" "ServiceItemCategory" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceId" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "hospitalId" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "hospitalId" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isTpa" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "hospitalId" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insurance_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,
    "coveragePercent" DECIMAL(5,2) NOT NULL,
    "maxCoverageAmount" DECIMAL(12,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "networkType" TEXT,
    "cardNumber" TEXT,
    "groupNumber" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "hospitalId" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_pricing_rules" (
    "id" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,
    "serviceItemId" TEXT,
    "itemType" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "standardPrice" DECIMAL(12,2) NOT NULL,
    "insurancePrice" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hospitalId" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insurance_pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_authorizations" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insurancePolicyId" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,
    "status" "PreAuthorizationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "diagnosis" TEXT NOT NULL,
    "diagnosisCode" TEXT,
    "plannedProcedures" JSONB NOT NULL,
    "estimatedTotalCost" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "clinicalNotes" TEXT,
    "rejectionReason" TEXT,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "hospitalId" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pre_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claims" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insurancePolicyId" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "preAuthorizationId" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "claimAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "clinicalRecords" JSONB,
    "labResults" JSONB,
    "imagingResults" JSONB,
    "submittedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "hospitalId" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_settlements" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "adjustmentReason" TEXT,
    "createdById" TEXT NOT NULL,
    "hospitalId" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insurance_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_slug_key" ON "hospitals"("slug");

-- CreateIndex
CREATE INDEX "hospitals_isActive_idx" ON "hospitals"("isActive");

-- CreateIndex
CREATE INDEX "hospitals_is_deleted_idx" ON "hospitals"("is_deleted");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_clinicId_idx" ON "users"("clinicId");

-- CreateIndex
CREATE INDEX "users_hospitalId_idx" ON "users"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "users_hospitalId_email_key" ON "users"("hospitalId", "email");

-- CreateIndex
CREATE INDEX "roles_is_deleted_idx" ON "roles"("is_deleted");

-- CreateIndex
CREATE INDEX "roles_hospitalId_idx" ON "roles"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_hospitalId_name_key" ON "roles"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "clinics_isActive_idx" ON "clinics"("isActive");

-- CreateIndex
CREATE INDEX "clinics_is_deleted_idx" ON "clinics"("is_deleted");

-- CreateIndex
CREATE INDEX "clinics_hospitalId_idx" ON "clinics"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_hospitalId_slug_key" ON "clinics"("hospitalId", "slug");

-- CreateIndex
CREATE INDEX "departments_isActive_idx" ON "departments"("isActive");

-- CreateIndex
CREATE INDEX "departments_is_deleted_idx" ON "departments"("is_deleted");

-- CreateIndex
CREATE INDEX "departments_clinicId_idx" ON "departments"("clinicId");

-- CreateIndex
CREATE INDEX "departments_hospitalId_idx" ON "departments"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hospitalId_slug_key" ON "departments"("hospitalId", "slug");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_departmentId_idx" ON "expenses"("departmentId");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_hospitalId_idx" ON "expenses"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_nationalId_key" ON "patients"("nationalId");

-- CreateIndex
CREATE INDEX "patients_is_deleted_idx" ON "patients"("is_deleted");

-- CreateIndex
CREATE INDEX "patients_createdAt_idx" ON "patients"("createdAt");

-- CreateIndex
CREATE INDEX "patients_createdById_idx" ON "patients"("createdById");

-- CreateIndex
CREATE INDEX "patients_hospitalId_idx" ON "patients"("hospitalId");

-- CreateIndex
CREATE INDEX "patients_hospitalId_fullName_idx" ON "patients"("hospitalId", "fullName");

-- CreateIndex
CREATE UNIQUE INDEX "patients_hospitalId_mrn_key" ON "patients"("hospitalId", "mrn");

-- CreateIndex
CREATE INDEX "patient_files_patientId_idx" ON "patient_files"("patientId");

-- CreateIndex
CREATE INDEX "patient_files_is_deleted_idx" ON "patient_files"("is_deleted");

-- CreateIndex
CREATE INDEX "patient_files_hospitalId_idx" ON "patient_files"("hospitalId");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_clinicId_idx" ON "appointments"("clinicId");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_doctorId_idx" ON "appointments"("doctorId");

-- CreateIndex
CREATE INDEX "appointments_targetClinicId_idx" ON "appointments"("targetClinicId");

-- CreateIndex
CREATE INDEX "appointments_createdAt_idx" ON "appointments"("createdAt");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_idx" ON "appointments"("hospitalId");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_doctorId_scheduledAt_idx" ON "appointments"("hospitalId", "doctorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_patientId_idx" ON "appointments"("hospitalId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "icd10_codes_code_key" ON "icd10_codes"("code");

-- CreateIndex
CREATE INDEX "icd10_codes_is_deleted_idx" ON "icd10_codes"("is_deleted");

-- CreateIndex
CREATE INDEX "icd10_codes_category_idx" ON "icd10_codes"("category");

-- CreateIndex
CREATE INDEX "vital_signs_clinicalRecordId_idx" ON "vital_signs"("clinicalRecordId");

-- CreateIndex
CREATE INDEX "vital_signs_is_deleted_idx" ON "vital_signs"("is_deleted");

-- CreateIndex
CREATE INDEX "vital_signs_hospitalId_idx" ON "vital_signs"("hospitalId");

-- CreateIndex
CREATE INDEX "symptoms_clinicalRecordId_idx" ON "symptoms"("clinicalRecordId");

-- CreateIndex
CREATE INDEX "symptoms_is_deleted_idx" ON "symptoms"("is_deleted");

-- CreateIndex
CREATE INDEX "symptoms_hospitalId_idx" ON "symptoms"("hospitalId");

-- CreateIndex
CREATE INDEX "medications_clinicalRecordId_idx" ON "medications"("clinicalRecordId");

-- CreateIndex
CREATE INDEX "medications_is_deleted_idx" ON "medications"("is_deleted");

-- CreateIndex
CREATE INDEX "medications_hospitalId_idx" ON "medications"("hospitalId");

-- CreateIndex
CREATE INDEX "clinical_records_createdAt_idx" ON "clinical_records"("createdAt");

-- CreateIndex
CREATE INDEX "clinical_records_patientId_idx" ON "clinical_records"("patientId");

-- CreateIndex
CREATE INDEX "clinical_records_clinicId_idx" ON "clinical_records"("clinicId");

-- CreateIndex
CREATE INDEX "clinical_records_encounterDate_idx" ON "clinical_records"("encounterDate");

-- CreateIndex
CREATE INDEX "clinical_records_hospitalId_idx" ON "clinical_records"("hospitalId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referrals_fromClinicId_idx" ON "referrals"("fromClinicId");

-- CreateIndex
CREATE INDEX "referrals_toClinicId_idx" ON "referrals"("toClinicId");

-- CreateIndex
CREATE INDEX "referrals_patientId_idx" ON "referrals"("patientId");

-- CreateIndex
CREATE INDEX "referrals_hospitalId_idx" ON "referrals"("hospitalId");

-- CreateIndex
CREATE INDEX "referral_medications_referralId_idx" ON "referral_medications"("referralId");

-- CreateIndex
CREATE INDEX "referral_medications_is_deleted_idx" ON "referral_medications"("is_deleted");

-- CreateIndex
CREATE INDEX "referral_medications_hospitalId_idx" ON "referral_medications"("hospitalId");

-- CreateIndex
CREATE INDEX "referral_tests_referralId_idx" ON "referral_tests"("referralId");

-- CreateIndex
CREATE INDEX "referral_tests_testId_idx" ON "referral_tests"("testId");

-- CreateIndex
CREATE INDEX "referral_tests_hospitalId_idx" ON "referral_tests"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_tests_referralId_testId_key" ON "referral_tests"("referralId", "testId");

-- CreateIndex
CREATE UNIQUE INDEX "surgeries_preoperativeRequestId_key" ON "surgeries"("preoperativeRequestId");

-- CreateIndex
CREATE INDEX "surgeries_createdAt_idx" ON "surgeries"("createdAt");

-- CreateIndex
CREATE INDEX "surgeries_status_idx" ON "surgeries"("status");

-- CreateIndex
CREATE INDEX "surgeries_patientId_idx" ON "surgeries"("patientId");

-- CreateIndex
CREATE INDEX "surgeries_departmentId_idx" ON "surgeries"("departmentId");

-- CreateIndex
CREATE INDEX "surgeries_startTime_idx" ON "surgeries"("startTime");

-- CreateIndex
CREATE INDEX "surgeries_hospitalId_idx" ON "surgeries"("hospitalId");

-- CreateIndex
CREATE INDEX "post_op_follow_ups_surgeryId_idx" ON "post_op_follow_ups"("surgeryId");

-- CreateIndex
CREATE INDEX "post_op_follow_ups_patientId_idx" ON "post_op_follow_ups"("patientId");

-- CreateIndex
CREATE INDEX "post_op_follow_ups_status_idx" ON "post_op_follow_ups"("status");

-- CreateIndex
CREATE INDEX "post_op_follow_ups_scheduledAt_idx" ON "post_op_follow_ups"("scheduledAt");

-- CreateIndex
CREATE INDEX "post_op_follow_ups_hospitalId_idx" ON "post_op_follow_ups"("hospitalId");

-- CreateIndex
CREATE INDEX "postoperative_notes_surgeryId_idx" ON "postoperative_notes"("surgeryId");

-- CreateIndex
CREATE INDEX "postoperative_notes_hospitalId_idx" ON "postoperative_notes"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "discharge_summaries_surgeryId_key" ON "discharge_summaries"("surgeryId");

-- CreateIndex
CREATE INDEX "discharge_summaries_surgeryId_idx" ON "discharge_summaries"("surgeryId");

-- CreateIndex
CREATE INDEX "discharge_summaries_hospitalId_idx" ON "discharge_summaries"("hospitalId");

-- CreateIndex
CREATE INDEX "operation_types_isActive_idx" ON "operation_types"("isActive");

-- CreateIndex
CREATE INDEX "operation_types_is_deleted_idx" ON "operation_types"("is_deleted");

-- CreateIndex
CREATE INDEX "operation_types_departmentId_idx" ON "operation_types"("departmentId");

-- CreateIndex
CREATE INDEX "operation_types_hospitalId_idx" ON "operation_types"("hospitalId");

-- CreateIndex
CREATE INDEX "or_roles_isActive_idx" ON "or_roles"("isActive");

-- CreateIndex
CREATE INDEX "or_roles_is_deleted_idx" ON "or_roles"("is_deleted");

-- CreateIndex
CREATE INDEX "preoperative_requests_status_idx" ON "preoperative_requests"("status");

-- CreateIndex
CREATE INDEX "preoperative_requests_patientId_idx" ON "preoperative_requests"("patientId");

-- CreateIndex
CREATE INDEX "preoperative_requests_departmentId_idx" ON "preoperative_requests"("departmentId");

-- CreateIndex
CREATE INDEX "preoperative_requests_operationTypeId_idx" ON "preoperative_requests"("operationTypeId");

-- CreateIndex
CREATE INDEX "preoperative_requests_createdAt_idx" ON "preoperative_requests"("createdAt");

-- CreateIndex
CREATE INDEX "preoperative_requests_hospitalId_idx" ON "preoperative_requests"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "consent_waivers_preoperativeRequestId_key" ON "consent_waivers"("preoperativeRequestId");

-- CreateIndex
CREATE INDEX "consent_waivers_preoperativeRequestId_idx" ON "consent_waivers"("preoperativeRequestId");

-- CreateIndex
CREATE INDEX "consent_waivers_hospitalId_idx" ON "consent_waivers"("hospitalId");

-- CreateIndex
CREATE INDEX "surgery_team_members_surgeryId_idx" ON "surgery_team_members"("surgeryId");

-- CreateIndex
CREATE INDEX "surgery_team_members_roleId_idx" ON "surgery_team_members"("roleId");

-- CreateIndex
CREATE INDEX "surgery_team_members_userId_idx" ON "surgery_team_members"("userId");

-- CreateIndex
CREATE INDEX "surgery_team_members_hospitalId_idx" ON "surgery_team_members"("hospitalId");

-- CreateIndex
CREATE INDEX "intraoperative_event_types_isActive_idx" ON "intraoperative_event_types"("isActive");

-- CreateIndex
CREATE INDEX "intraoperative_event_types_is_deleted_idx" ON "intraoperative_event_types"("is_deleted");

-- CreateIndex
CREATE INDEX "intraoperative_events_surgeryId_idx" ON "intraoperative_events"("surgeryId");

-- CreateIndex
CREATE INDEX "intraoperative_events_eventTypeId_idx" ON "intraoperative_events"("eventTypeId");

-- CreateIndex
CREATE INDEX "intraoperative_events_timestamp_idx" ON "intraoperative_events"("timestamp");

-- CreateIndex
CREATE INDEX "intraoperative_events_hospitalId_idx" ON "intraoperative_events"("hospitalId");

-- CreateIndex
CREATE INDEX "wards_isActive_idx" ON "wards"("isActive");

-- CreateIndex
CREATE INDEX "wards_is_deleted_idx" ON "wards"("is_deleted");

-- CreateIndex
CREATE INDEX "wards_departmentId_idx" ON "wards"("departmentId");

-- CreateIndex
CREATE INDEX "wards_hospitalId_idx" ON "wards"("hospitalId");

-- CreateIndex
CREATE INDEX "beds_wardId_idx" ON "beds"("wardId");

-- CreateIndex
CREATE INDEX "beds_status_idx" ON "beds"("status");

-- CreateIndex
CREATE INDEX "beds_patientId_idx" ON "beds"("patientId");

-- CreateIndex
CREATE INDEX "beds_surgeryId_idx" ON "beds"("surgeryId");

-- CreateIndex
CREATE INDEX "beds_hospitalId_idx" ON "beds"("hospitalId");

-- CreateIndex
CREATE INDEX "inpatient_vitals_bedId_idx" ON "inpatient_vitals"("bedId");

-- CreateIndex
CREATE INDEX "inpatient_vitals_recordedAt_idx" ON "inpatient_vitals"("recordedAt");

-- CreateIndex
CREATE INDEX "inpatient_vitals_hospitalId_idx" ON "inpatient_vitals"("hospitalId");

-- CreateIndex
CREATE INDEX "nursing_notes_bedId_idx" ON "nursing_notes"("bedId");

-- CreateIndex
CREATE INDEX "nursing_notes_createdAt_idx" ON "nursing_notes"("createdAt");

-- CreateIndex
CREATE INDEX "nursing_notes_hospitalId_idx" ON "nursing_notes"("hospitalId");

-- CreateIndex
CREATE INDEX "ward_rounds_wardId_idx" ON "ward_rounds"("wardId");

-- CreateIndex
CREATE INDEX "ward_rounds_date_idx" ON "ward_rounds"("date");

-- CreateIndex
CREATE INDEX "ward_rounds_hospitalId_idx" ON "ward_rounds"("hospitalId");

-- CreateIndex
CREATE INDEX "inventory_items_isActive_idx" ON "inventory_items"("isActive");

-- CreateIndex
CREATE INDEX "inventory_items_is_deleted_idx" ON "inventory_items"("is_deleted");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE INDEX "inventory_items_hospitalId_idx" ON "inventory_items"("hospitalId");

-- CreateIndex
CREATE INDEX "inventory_items_barcode_idx" ON "inventory_items"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_hospitalId_sku_key" ON "inventory_items"("hospitalId", "sku");

-- CreateIndex
CREATE INDEX "inventory_locations_itemId_idx" ON "inventory_locations"("itemId");

-- CreateIndex
CREATE INDEX "inventory_locations_is_deleted_idx" ON "inventory_locations"("is_deleted");

-- CreateIndex
CREATE INDEX "inventory_locations_hospitalId_idx" ON "inventory_locations"("hospitalId");

-- CreateIndex
CREATE INDEX "inventory_transactions_itemId_idx" ON "inventory_transactions"("itemId");

-- CreateIndex
CREATE INDEX "inventory_transactions_is_deleted_idx" ON "inventory_transactions"("is_deleted");

-- CreateIndex
CREATE INDEX "inventory_transactions_createdAt_idx" ON "inventory_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_transactions_hospitalId_idx" ON "inventory_transactions"("hospitalId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_paymentMethod_idx" ON "transactions"("paymentMethod");

-- CreateIndex
CREATE INDEX "transactions_shiftId_idx" ON "transactions"("shiftId");

-- CreateIndex
CREATE INDEX "transactions_cashierId_idx" ON "transactions"("cashierId");

-- CreateIndex
CREATE INDEX "transactions_departmentId_idx" ON "transactions"("departmentId");

-- CreateIndex
CREATE INDEX "transactions_patientId_idx" ON "transactions"("patientId");

-- CreateIndex
CREATE INDEX "transactions_surgeryId_idx" ON "transactions"("surgeryId");

-- CreateIndex
CREATE INDEX "transactions_diagnosticOrderId_idx" ON "transactions"("diagnosticOrderId");

-- CreateIndex
CREATE INDEX "transactions_appointmentId_idx" ON "transactions"("appointmentId");

-- CreateIndex
CREATE INDEX "transactions_imagingOrderId_idx" ON "transactions"("imagingOrderId");

-- CreateIndex
CREATE INDEX "transactions_is_deleted_idx" ON "transactions"("is_deleted");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_hospitalId_idx" ON "transactions"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "optic_lab_jobs_transactionId_key" ON "optic_lab_jobs"("transactionId");

-- CreateIndex
CREATE INDEX "optic_lab_jobs_createdAt_idx" ON "optic_lab_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "optic_lab_jobs_status_idx" ON "optic_lab_jobs"("status");

-- CreateIndex
CREATE INDEX "optic_lab_jobs_hospitalId_idx" ON "optic_lab_jobs"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "optic_lab_jobs_hospitalId_jobNumber_key" ON "optic_lab_jobs"("hospitalId", "jobNumber");

-- CreateIndex
CREATE INDEX "shifts_userId_idx" ON "shifts"("userId");

-- CreateIndex
CREATE INDEX "shifts_is_deleted_idx" ON "shifts"("is_deleted");

-- CreateIndex
CREATE INDEX "shifts_openedAt_idx" ON "shifts"("openedAt");

-- CreateIndex
CREATE INDEX "shifts_hospitalId_idx" ON "shifts"("hospitalId");

-- CreateIndex
CREATE INDEX "cash_movements_shiftId_idx" ON "cash_movements"("shiftId");

-- CreateIndex
CREATE INDEX "cash_movements_hospitalId_idx" ON "cash_movements"("hospitalId");

-- CreateIndex
CREATE INDEX "diagnostic_tests_isActive_idx" ON "diagnostic_tests"("isActive");

-- CreateIndex
CREATE INDEX "diagnostic_tests_category_idx" ON "diagnostic_tests"("category");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_tests_orderType_code_key" ON "diagnostic_tests"("orderType", "code");

-- CreateIndex
CREATE INDEX "diagnostic_panels_isActive_idx" ON "diagnostic_panels"("isActive");

-- CreateIndex
CREATE INDEX "diagnostic_panels_is_deleted_idx" ON "diagnostic_panels"("is_deleted");

-- CreateIndex
CREATE INDEX "diagnostic_orders_status_idx" ON "diagnostic_orders"("status");

-- CreateIndex
CREATE INDEX "diagnostic_orders_patientId_idx" ON "diagnostic_orders"("patientId");

-- CreateIndex
CREATE INDEX "diagnostic_orders_fromClinicId_idx" ON "diagnostic_orders"("fromClinicId");

-- CreateIndex
CREATE INDEX "diagnostic_orders_assignedToId_idx" ON "diagnostic_orders"("assignedToId");

-- CreateIndex
CREATE INDEX "diagnostic_orders_requestedById_idx" ON "diagnostic_orders"("requestedById");

-- CreateIndex
CREATE INDEX "diagnostic_orders_orderType_idx" ON "diagnostic_orders"("orderType");

-- CreateIndex
CREATE INDEX "diagnostic_orders_createdAt_idx" ON "diagnostic_orders"("createdAt");

-- CreateIndex
CREATE INDEX "diagnostic_orders_paid_idx" ON "diagnostic_orders"("paid");

-- CreateIndex
CREATE INDEX "diagnostic_orders_paidById_idx" ON "diagnostic_orders"("paidById");

-- CreateIndex
CREATE INDEX "diagnostic_orders_hospitalId_idx" ON "diagnostic_orders"("hospitalId");

-- CreateIndex
CREATE INDEX "diagnostic_order_tests_orderId_idx" ON "diagnostic_order_tests"("orderId");

-- CreateIndex
CREATE INDEX "diagnostic_order_tests_testId_idx" ON "diagnostic_order_tests"("testId");

-- CreateIndex
CREATE INDEX "diagnostic_order_tests_is_deleted_idx" ON "diagnostic_order_tests"("is_deleted");

-- CreateIndex
CREATE INDEX "diagnostic_order_tests_hospitalId_idx" ON "diagnostic_order_tests"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_order_tests_orderId_testId_key" ON "diagnostic_order_tests"("orderId", "testId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_samples_label_key" ON "lab_samples"("label");

-- CreateIndex
CREATE INDEX "lab_samples_orderId_idx" ON "lab_samples"("orderId");

-- CreateIndex
CREATE INDEX "lab_samples_hospitalId_status_idx" ON "lab_samples"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "lab_samples_label_idx" ON "lab_samples"("label");

-- CreateIndex
CREATE INDEX "employees_departmentId_idx" ON "employees"("departmentId");

-- CreateIndex
CREATE INDEX "employees_isActive_idx" ON "employees"("isActive");

-- CreateIndex
CREATE INDEX "employees_hospitalId_idx" ON "employees"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_hospitalId_employeeCode_key" ON "employees"("hospitalId", "employeeCode");

-- CreateIndex
CREATE INDEX "payroll_records_employeeId_idx" ON "payroll_records"("employeeId");

-- CreateIndex
CREATE INDEX "payroll_records_period_idx" ON "payroll_records"("period");

-- CreateIndex
CREATE INDEX "payroll_records_status_idx" ON "payroll_records"("status");

-- CreateIndex
CREATE INDEX "payroll_records_is_deleted_idx" ON "payroll_records"("is_deleted");

-- CreateIndex
CREATE INDEX "payroll_records_hospitalId_idx" ON "payroll_records"("hospitalId");

-- CreateIndex
CREATE INDEX "attendance_employeeId_idx" ON "attendance"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE INDEX "attendance_status_idx" ON "attendance"("status");

-- CreateIndex
CREATE INDEX "attendance_is_deleted_idx" ON "attendance"("is_deleted");

-- CreateIndex
CREATE INDEX "attendance_hospitalId_idx" ON "attendance"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employeeId_date_key" ON "attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "leave_requests_employeeId_idx" ON "leave_requests"("employeeId");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_hospitalId_idx" ON "leave_requests"("hospitalId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_hospitalId_idx" ON "audit_logs"("hospitalId");

-- CreateIndex
CREATE INDEX "accounts_payable_paymentStatus_idx" ON "accounts_payable"("paymentStatus");

-- CreateIndex
CREATE INDEX "accounts_payable_creditor_idx" ON "accounts_payable"("creditor");

-- CreateIndex
CREATE INDEX "accounts_payable_dueDate_idx" ON "accounts_payable"("dueDate");

-- CreateIndex
CREATE INDEX "accounts_payable_hospitalId_idx" ON "accounts_payable"("hospitalId");

-- CreateIndex
CREATE INDEX "suppliers_is_deleted_idx" ON "suppliers"("is_deleted");

-- CreateIndex
CREATE INDEX "suppliers_category_idx" ON "suppliers"("category");

-- CreateIndex
CREATE INDEX "suppliers_hospitalId_idx" ON "suppliers"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_expenseId_key" ON "supplier_invoices"("expenseId");

-- CreateIndex
CREATE INDEX "supplier_invoices_supplierId_idx" ON "supplier_invoices"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_invoices_paymentStatus_idx" ON "supplier_invoices"("paymentStatus");

-- CreateIndex
CREATE INDEX "supplier_invoices_is_deleted_idx" ON "supplier_invoices"("is_deleted");

-- CreateIndex
CREATE INDEX "supplier_invoices_hospitalId_idx" ON "supplier_invoices"("hospitalId");

-- CreateIndex
CREATE INDEX "supplier_invoice_items_invoiceId_idx" ON "supplier_invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "supplier_invoice_items_itemId_idx" ON "supplier_invoice_items"("itemId");

-- CreateIndex
CREATE INDEX "supplier_invoice_items_is_deleted_idx" ON "supplier_invoice_items"("is_deleted");

-- CreateIndex
CREATE INDEX "supplier_invoice_items_hospitalId_idx" ON "supplier_invoice_items"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_departmentId_key" ON "cost_centers"("departmentId");

-- CreateIndex
CREATE INDEX "cost_centers_isActive_idx" ON "cost_centers"("isActive");

-- CreateIndex
CREATE INDEX "cost_centers_is_deleted_idx" ON "cost_centers"("is_deleted");

-- CreateIndex
CREATE INDEX "cost_centers_departmentId_idx" ON "cost_centers"("departmentId");

-- CreateIndex
CREATE INDEX "cost_centers_hospitalId_idx" ON "cost_centers"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_hospitalId_code_key" ON "cost_centers"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "requisitions_status_idx" ON "requisitions"("status");

-- CreateIndex
CREATE INDEX "requisitions_departmentId_idx" ON "requisitions"("departmentId");

-- CreateIndex
CREATE INDEX "requisitions_requestedById_idx" ON "requisitions"("requestedById");

-- CreateIndex
CREATE INDEX "requisitions_createdAt_idx" ON "requisitions"("createdAt");

-- CreateIndex
CREATE INDEX "requisitions_hospitalId_idx" ON "requisitions"("hospitalId");

-- CreateIndex
CREATE INDEX "requisition_items_requisitionId_idx" ON "requisition_items"("requisitionId");

-- CreateIndex
CREATE INDEX "requisition_items_itemId_idx" ON "requisition_items"("itemId");

-- CreateIndex
CREATE INDEX "requisition_items_is_deleted_idx" ON "requisition_items"("is_deleted");

-- CreateIndex
CREATE INDEX "requisition_items_hospitalId_idx" ON "requisition_items"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_expenseId_key" ON "purchase_orders"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_assetId_key" ON "purchase_orders"("assetId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_createdById_idx" ON "purchase_orders"("createdById");

-- CreateIndex
CREATE INDEX "purchase_orders_departmentType_idx" ON "purchase_orders"("departmentType");

-- CreateIndex
CREATE INDEX "purchase_orders_paymentStatus_idx" ON "purchase_orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "purchase_orders_createdAt_idx" ON "purchase_orders"("createdAt");

-- CreateIndex
CREATE INDEX "purchase_orders_hospitalId_idx" ON "purchase_orders"("hospitalId");

-- CreateIndex
CREATE INDEX "purchase_order_items_orderId_idx" ON "purchase_order_items"("orderId");

-- CreateIndex
CREATE INDEX "purchase_order_items_itemId_idx" ON "purchase_order_items"("itemId");

-- CreateIndex
CREATE INDEX "purchase_order_items_is_deleted_idx" ON "purchase_order_items"("is_deleted");

-- CreateIndex
CREATE INDEX "purchase_order_items_hospitalId_idx" ON "purchase_order_items"("hospitalId");

-- CreateIndex
CREATE INDEX "fixed_assets_isActive_idx" ON "fixed_assets"("isActive");

-- CreateIndex
CREATE INDEX "fixed_assets_assetType_idx" ON "fixed_assets"("assetType");

-- CreateIndex
CREATE INDEX "fixed_assets_hospitalId_idx" ON "fixed_assets"("hospitalId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_is_deleted_idx" ON "notifications"("is_deleted");

-- CreateIndex
CREATE INDEX "notifications_hospitalId_idx" ON "notifications"("hospitalId");

-- CreateIndex
CREATE INDEX "crash_logs_createdAt_idx" ON "crash_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "imaging_procedure_types_scanType_key" ON "imaging_procedure_types"("scanType");

-- CreateIndex
CREATE INDEX "imaging_procedure_types_scanType_idx" ON "imaging_procedure_types"("scanType");

-- CreateIndex
CREATE INDEX "imaging_procedure_types_isActive_idx" ON "imaging_procedure_types"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "imaging_orders_referralId_key" ON "imaging_orders"("referralId");

-- CreateIndex
CREATE INDEX "imaging_orders_patientId_idx" ON "imaging_orders"("patientId");

-- CreateIndex
CREATE INDEX "imaging_orders_clinicId_idx" ON "imaging_orders"("clinicId");

-- CreateIndex
CREATE INDEX "imaging_orders_status_idx" ON "imaging_orders"("status");

-- CreateIndex
CREATE INDEX "imaging_orders_procedureTypeId_idx" ON "imaging_orders"("procedureTypeId");

-- CreateIndex
CREATE INDEX "imaging_orders_createdAt_idx" ON "imaging_orders"("createdAt");

-- CreateIndex
CREATE INDEX "imaging_orders_hospitalId_idx" ON "imaging_orders"("hospitalId");

-- CreateIndex
CREATE INDEX "imaging_files_imagingOrderId_idx" ON "imaging_files"("imagingOrderId");

-- CreateIndex
CREATE INDEX "imaging_files_hospitalId_idx" ON "imaging_files"("hospitalId");

-- CreateIndex
CREATE INDEX "clinical_templates_clinicType_idx" ON "clinical_templates"("clinicType");

-- CreateIndex
CREATE INDEX "clinical_templates_hospitalId_idx" ON "clinical_templates"("hospitalId");

-- CreateIndex
CREATE INDEX "clinical_templates_createdById_idx" ON "clinical_templates"("createdById");

-- CreateIndex
CREATE INDEX "service_items_category_idx" ON "service_items"("category");

-- CreateIndex
CREATE INDEX "service_items_hospitalId_idx" ON "service_items"("hospitalId");

-- CreateIndex
CREATE INDEX "service_items_isActive_idx" ON "service_items"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "service_items_hospitalId_name_key" ON "service_items"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId");

-- CreateIndex
CREATE INDEX "invoices_sourceType_idx" ON "invoices"("sourceType");

-- CreateIndex
CREATE INDEX "invoices_paymentStatus_idx" ON "invoices"("paymentStatus");

-- CreateIndex
CREATE INDEX "invoices_hospitalId_idx" ON "invoices"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_hospitalId_invoiceNumber_key" ON "invoices"("hospitalId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_items_serviceItemId_idx" ON "invoice_items"("serviceItemId");

-- CreateIndex
CREATE INDEX "accounts_type_idx" ON "accounts"("type");

-- CreateIndex
CREATE INDEX "accounts_hospitalId_idx" ON "accounts"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_hospitalId_code_key" ON "accounts"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_entries_hospitalId_idx" ON "journal_entries"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_hospitalId_entryNumber_key" ON "journal_entries"("hospitalId", "entryNumber");

-- CreateIndex
CREATE INDEX "journal_entry_lines_entryId_idx" ON "journal_entry_lines"("entryId");

-- CreateIndex
CREATE INDEX "journal_entry_lines_accountId_idx" ON "journal_entry_lines"("accountId");

-- CreateIndex
CREATE INDEX "insurance_companies_hospitalId_idx" ON "insurance_companies"("hospitalId");

-- CreateIndex
CREATE INDEX "insurance_companies_isActive_idx" ON "insurance_companies"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_companies_hospitalId_name_key" ON "insurance_companies"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "insurance_policies_patientId_idx" ON "insurance_policies"("patientId");

-- CreateIndex
CREATE INDEX "insurance_policies_insuranceCompanyId_idx" ON "insurance_policies"("insuranceCompanyId");

-- CreateIndex
CREATE INDEX "insurance_policies_hospitalId_idx" ON "insurance_policies"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_policies_hospitalId_patientId_insuranceCompanyId__key" ON "insurance_policies"("hospitalId", "patientId", "insuranceCompanyId", "policyNumber");

-- CreateIndex
CREATE INDEX "insurance_pricing_rules_insuranceCompanyId_idx" ON "insurance_pricing_rules"("insuranceCompanyId");

-- CreateIndex
CREATE INDEX "insurance_pricing_rules_hospitalId_idx" ON "insurance_pricing_rules"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_pricing_rules_hospitalId_insuranceCompanyId_itemT_key" ON "insurance_pricing_rules"("hospitalId", "insuranceCompanyId", "itemType", "itemName");

-- CreateIndex
CREATE INDEX "pre_authorizations_patientId_idx" ON "pre_authorizations"("patientId");

-- CreateIndex
CREATE INDEX "pre_authorizations_insuranceCompanyId_idx" ON "pre_authorizations"("insuranceCompanyId");

-- CreateIndex
CREATE INDEX "pre_authorizations_status_idx" ON "pre_authorizations"("status");

-- CreateIndex
CREATE INDEX "pre_authorizations_hospitalId_idx" ON "pre_authorizations"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "pre_authorizations_hospitalId_referenceNumber_key" ON "pre_authorizations"("hospitalId", "referenceNumber");

-- CreateIndex
CREATE INDEX "insurance_claims_patientId_idx" ON "insurance_claims"("patientId");

-- CreateIndex
CREATE INDEX "insurance_claims_insuranceCompanyId_idx" ON "insurance_claims"("insuranceCompanyId");

-- CreateIndex
CREATE INDEX "insurance_claims_status_idx" ON "insurance_claims"("status");

-- CreateIndex
CREATE INDEX "insurance_claims_invoiceId_idx" ON "insurance_claims"("invoiceId");

-- CreateIndex
CREATE INDEX "insurance_claims_hospitalId_idx" ON "insurance_claims"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claims_hospitalId_claimNumber_key" ON "insurance_claims"("hospitalId", "claimNumber");

-- CreateIndex
CREATE INDEX "insurance_settlements_claimId_idx" ON "insurance_settlements"("claimId");

-- CreateIndex
CREATE INDEX "insurance_settlements_insuranceCompanyId_idx" ON "insurance_settlements"("insuranceCompanyId");

-- CreateIndex
CREATE INDEX "insurance_settlements_hospitalId_idx" ON "insurance_settlements"("hospitalId");

