# Database Schema & API Catalog

> **Purpose:** Reference document for AI agents implementing backend features in the HMS SaaS product.
> **Stack:** PostgreSQL (via Prisma ORM), Express.js REST API, JWT auth, RBAC permissions.

---

## Part 1: Entity-Relationship Overview

### 1.1 All Models / Tables

| # | Model | DB Table | Purpose |
|---|-------|----------|---------|
| 1 | `User` | `users` | System users (doctors, nurses, admins, cashiers, etc.) |
| 2 | `Role` | `roles` | RBAC roles with JSON permissions array |
| 3 | `Clinic` | `clinics` | Hospital departments/clinics (ophthalmology, optometry, etc.) |
| 4 | `Department` | `departments` | Organizational departments (may or may not map 1:1 to clinics) |
| 5 | `Patient` | `patients` | Patient master record (MRN-based) |
| 6 | `PatientFile` | `patient_files` | Uploaded patient documents (PDF/images in Supabase Storage) |
| 7 | `Appointment` | `appointments` | Walk-in and reservation appointments |
| 8 | `ClinicalRecord` | `clinical_records` | Doctor encounter notes per patient per clinic visit |
| 9 | `VitalSign` | `vital_signs` | Vital signs captured during a clinical encounter |
| 10 | `Symptom` | `symptoms` | Patient-reported symptoms during an encounter |
| 11 | `Medication` | `medications` | Prescriptions/medications from an encounter |
| 12 | `Icd10Code` | `icd10_codes` | ICD-10 diagnosis code reference table |
| 13 | `Referral` | `referrals` | Inter-clinic and dispatch referrals (lab, pharmacy, optics, imaging) |
| 14 | `ReferralMedication` | `referral_medications` | Medication items on a pharmacy-dispatch referral |
| 15 | `ReferralTest` | `referral_tests` | Test items on a lab-dispatch referral |
| 16 | `DiagnosticTest` | `diagnostic_tests` | Catalog of lab tests (code, ref ranges, price) |
| 17 | `DiagnosticPanel` | `diagnostic_panels` | Bundles of tests ordered together |
| 18 | `DiagnosticPanelTest` | `diagnostic_panel_tests` | Many-to-many: panel <-> test |
| 19 | `DiagnosticOrder` | `diagnostic_orders` | A lab order for a patient (contains multiple tests) |
| 20 | `DiagnosticOrderTest` | `diagnostic_order_tests` | Individual test result within an order |
| 21 | `ImagingProcedureType` | `imaging_procedure_types` | Catalog of imaging procedure types (A-Scan, B-Scan, etc.) |
| 22 | `ImagingOrder` | `imaging_orders` | Imaging request with findings/impression |
| 23 | `ImagingFile` | `imaging_files` | Uploaded imaging files (DICOM, JPEG, PDF) |
| 24 | `Surgery` | `surgeries` | Surgery scheduling and tracking |
| 25 | `SurgeryTeamMember` | `surgery_team_members` | Staff assigned to a surgery |
| 26 | `ORRole` | `or_roles` | Operating room team roles (surgeon, anesthetist, etc.) |
| 27 | `IntraoperativeEventType` | `intraoperative_event_types` | Types of intraoperative events |
| 28 | `IntraoperativeEvent` | `intraoperative_events` | Events logged during surgery |
| 29 | `OperationType` | `operation_types` | Types of surgeries (cataract, LASIK, etc.) with pricing |
| 30 | `PreoperativeRequest` | `preoperative_requests` | Pre-op workflow requests with status tracking |
| 31 | `ConsentWaiver` | `consent_waivers` | Surgical consent forms |
| 32 | `PostOpFollowUp` | `post_op_follow_ups` | Scheduled post-operative follow-ups |
| 33 | `PostoperativeNote` | `postoperative_notes` | Notes written after surgery |
| 34 | `DischargeSummary` | `discharge_summaries` | Patient discharge documentation |
| 35 | `Ward` | `wards` | Inpatient wards |
| 36 | `Bed` | `beds` | Individual beds within wards |
| 37 | `InpatientVital` | `inpatient_vitals` | Vitals recorded for admitted patients |
| 38 | `NursingNote` | `nursing_notes` | Nursing notes per bed/admission |
| 39 | `WardRound` | `ward_rounds` | Doctor ward rounds |
| 40 | `Transaction` | `transactions` | Financial transactions (revenue entries) |
| 41 | `Shift` | `shifts` | Cashier shifts (open/close with denomination tracking) |
| 42 | `CashMovement` | `cash_movements` | Cash pickups, drops, and adjustments within a shift |
| 43 | `Expense` | `expenses` | Hospital expense records |
| 44 | `AccountsPayable` | `accounts_payable` | Hospital debts to creditors |
| 45 | `InventoryItem` | `inventory_items` | Master inventory (pharmacy, optics, hospital supplies) |
| 46 | `InventoryLocation` | `inventory_locations` | Sub-locations for inventory items |
| 47 | `InventoryTransaction` | `inventory_transactions` | Stock in/out movements |
| 48 | `Supplier` | `suppliers` | Vendor/supplier master |
| 49 | `SupplierInvoice` | `supplier_invoices` | Goods received from suppliers |
| 50 | `SupplierInvoiceItem` | `supplier_invoice_items` | Line items on a supplier invoice |
| 51 | `CostCenter` | `cost_centers` | Department-level cost centers |
| 52 | `Requisition` | `requisitions` | Internal purchase requests from departments |
| 53 | `RequisitionItem` | `requisition_items` | Line items on a requisition |
| 54 | `PurchaseOrder` | `purchase_orders` | Approved purchase orders to suppliers |
| 55 | `PurchaseOrderItem` | `purchase_order_items` | Line items on a PO |
| 56 | `FixedAsset` | `fixed_assets` | Capital assets with depreciation tracking |
| 57 | `Employee` | `employees` | HR employee records |
| 58 | `PayrollRecord` | `payroll_records` | Monthly payroll entries |
| 59 | `Attendance` | `attendance` | Daily check-in/out records |
| 60 | `LeaveRequest` | `leave_requests` | Leave applications |
| 61 | `OpticLabJob` | `optic_lab_jobs` | Optic lab glass-making jobs |
| 62 | `AuditLog` | `audit_logs` | System-wide audit trail |
| 63 | `Notification` | `notifications` | In-app notifications per user |
| 64 | `CrashLog` | `crash_logs` | Frontend error logs |

### 1.2 Relationships

```
User ──< Role                     (many users per role)
User ──< Clinic                   (users assigned to a clinic, optional)

Clinic ──< Department             (one clinic has many departments, optional)
Clinic ──< Appointment            (appointments belong to a clinic)
Clinic ──< ClinicalRecord         (records belong to a clinic)
Clinic ──< DiagnosticOrder        (orders originate from a clinic)
Clinic ──< Referral (FromClinic)  (referrals sent from a clinic)
Clinic ──< Referral (ToClinic)    (referrals received by a clinic)
Clinic ──< ImagingOrder           (imaging orders belong to a clinic)

Patient ──< Appointment
Patient ──< ClinicalRecord
Patient ──< DiagnosticOrder
Patient ──< PatientFile
Patient ──< Referral
Patient ──< Surgery
Patient ──< PreoperativeRequest
Patient ──< PostOpFollowUp
Patient ──< Bed                   (current admission)
Patient ──< Transaction           (patient-level billing)

ClinicalRecord ──< VitalSign      (one record has many vitals)
ClinicalRecord ──< Symptom
ClinicalRecord ──< Medication

Referral ──< ReferralMedication   (cascade delete)
Referral ──< ReferralTest         (cascade delete)

DiagnosticOrder ──< DiagnosticOrderTest  (cascade delete)
DiagnosticOrder >── DiagnosticPanel      (optional panel)
DiagnosticOrder >── Referral             (linked referral)
DiagnosticOrder >── User (requestedBy, assignedTo, paidBy)

DiagnosticPanel ──< DiagnosticPanelTest  (composite PK: panelId+testId)
DiagnosticTest  ──< DiagnosticPanelTest

Surgery >── Patient
Surgery >── Department
Surgery >── PreoperativeRequest   (unique: preoperativeRequestId)
Surgery >── OperationType
Surgery >── Ward                  (admittedWard, optional)
Surgery ──< SurgeryTeamMember     (cascade delete)
Surgery ──< IntraoperativeEvent   (cascade delete)
Surgery ──< PostOpFollowUp        (cascade delete)
Surgery ──< PostoperativeNote     (cascade delete)
Surgery ──< DischargeSummary      (one-to-one via surgeryId unique)
Surgery ──< Bed                   (surgery admission)
Surgery ──< Appointment

PreoperativeRequest >── Department
PreoperativeRequest >── Patient
PreoperativeRequest >── OperationType
PreoperativeRequest ──< ConsentWaiver (one-to-one via preoperativeRequestId unique)

Ward >── Department
Ward ──< Bed
Ward ──< WardRound

Bed >── Ward
Bed >── Patient (optional)
Bed >── Surgery (optional)
Bed ──< InpatientVital    (cascade delete)
Bed ──< NursingNote       (cascade delete)

Transaction >── User (cashier)
Transaction >── Department (optional)
Transaction >── Shift
Transaction >── Patient (optional)
Transaction >── Surgery (optional)
Transaction >── DiagnosticOrder (optional)
Transaction >── Appointment (optional)
Transaction >── ImagingOrder (optional)
Transaction >── OpticLabJob (optional)

Shift >── User
Shift ──< Transaction
Shift ──< CashMovement

CashMovement >── Shift
CashMovement >── User

Expense >── Department (optional)

InventoryItem ──< InventoryLocation
InventoryItem ──< InventoryTransaction
InventoryItem ──< PurchaseOrderItem
InventoryItem ──< RequisitionItem
InventoryItem ──< SupplierInvoiceItem

Supplier ──< PurchaseOrder
Supplier ──< SupplierInvoice

SupplierInvoice >── Supplier
SupplierInvoice >── User (createdBy)
SupplierInvoice ──< SupplierInvoiceItem (cascade delete)

PurchaseOrder >── Supplier
PurchaseOrder >── User (createdBy, approvedBy)
PurchaseOrder >── CostCenter (optional)
PurchaseOrder >── Expense (optional, unique)
PurchaseOrder >── FixedAsset (optional, unique)
PurchaseOrder ──< PurchaseOrderItem (cascade delete)

CostCenter >── Department (unique: departmentId)

Requisition >── Department
Requisition >── User (requestedBy)
Requisition ──< RequisitionItem (cascade delete)

FixedAsset ──< PurchaseOrder (optional)

Employee >── Department (optional)
Employee >── User (optional)
Employee ──< Attendance
Employee ──< LeaveRequest
Employee ──< PayrollRecord

Attendance >── Employee  (unique composite: employeeId+date)
PayrollRecord >── Employee
LeaveRequest >── Employee
LeaveRequest >── User (approvedBy, optional)

OpticLabJob >── Transaction
OpticLabJob >── User (createdBy, completedBy, optional)

Department ──< Expense
Department ──< Requisition
Department ──< Surgery
Department ──< OperationType
Department ──< Ward
```

### 1.3 Enums

| Enum | Values |
|------|--------|
| `ClinicType` | MEDICINE, ENT, DENTAL, RETINA, GLAUCOMA, ORBIT, PEDS_OPHTH, GEN_OPHTH, OPTOMETRY, IMAGING |
| `DepartmentType` | CLINIC, PHARMACY, LAB, SURGERY, ADMIN, HR, FINANCE, IT, NURSING, OTHER, IMAGING |
| `AppointmentType` | WALKIN, RESERVATION |
| `AppointmentStatus` | WAITING, CALLED, IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED, RESERVED |
| `VisitType` | NEW_VISIT, FOLLOW_UP |
| `DiabetesType` | NONE, TYPE1, TYPE2, GESTATIONAL |
| `ReferralType` | INTERNAL_CLINIC, PHARMACY_DISPATCH, OPTICS_DISPATCH, LAB_DISPATCH |
| `ReferralStatus` | PENDING, DISPATCHED, FULFILLED, CANCELLED |
| `SurgeryStatus` | SCHEDULED, PREP, IN_SURGERY, RECOVERY, COMPLETED, CANCELLED |
| `SurgeryDisposition` | PENDING, DISCHARGE_HOME, ADMIT_WARD |
| `PreoperativeStatus` | REQUESTED, CONFIRMED, PAYMENT_DONE, INVESTIGATIONS_DONE, SCHEDULED, CANCELLED, WAITING, IN_PROGRESS, CLEARED, FLAGGED |
| `BedStatus` | VACANT, OCCUPIED, RESERVED, MAINTENANCE |
| `RelationshipType` | SELF, PARENT, GUARDIAN |
| `TransactionType` | RECEPTION, PHARMACY, OPTICS, LAB, WARD, SURGERY, IMAGING, PREOP |
| `PaymentMethod` | CASH, CARD, INSURANCE, BANK_TRANSFER |
| `ExpenseCategory` | SALARY, SUPPLIES, UTILITIES, RENT, EQUIPMENT, MAINTENANCE, MARKETING, OTHER |
| `DiagnosticOrderType` | LAB |
| `DiagnosticOrderStatus` | SUBMITTED, IN_PROGRESS, COMPLETED, CANCELLED |
| `ResultFlag` | NORMAL, HIGH, LOW, CRITICAL_HIGH, CRITICAL_LOW, ABNORMAL |
| `PaymentStatus` | PaidInFull, PartialPayment, Pending |
| `ImagingScanType` | A_SCAN, B_SCAN, OTT, BIOMETRY |
| `ImagingOrderStatus` | PENDING, IN_PROGRESS, COMPLETED, DISMISSED |
| `LeaveType` | ANNUAL, SICK, PERSONAL, MATERNITY, UNPAID |
| `LeaveStatus` | PENDING, APPROVED, REJECTED, CANCELLED |
| `AttendanceStatus` | PRESENT, ABSENT, LATE, HALF_DAY |
| `PayrollStatus` | DRAFT, PAID, CANCELLED |
| `PostOpFollowUpStatus` | SCHEDULED, COMPLETED, MISSED |

---

## Part 2: Key Table Details (Per Module)

### 2.1 Auth & Users

**`User`** (`users`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `email` | String (unique) | Login credential |
| `passwordHash` | String | bcrypt hash |
| `fullName` | String | |
| `phone` | String? | |
| `avatarUrl` | String? | |
| `isActive` | Boolean | Account enable/disable |
| `lastLogin` | DateTime? | |
| `roleId` | String (FK) | References `Role.id` |
| `clinicId` | String? (FK) | Optional: scopes user to a clinic |
| `createdAt` / `updatedAt` | DateTime | |

**`Role`** (`roles`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `name` | String (unique) | e.g. "Doctor", "Nurse", "Receptionist" |
| `description` | String? | |
| `permissions` | Json | Array of permission strings like `patient:read` |

**Indexes:** `isActive`, `roleId`, `clinicId` on User. `is_deleted` on Role.

**Auth Flow:** JWT tokens carry `{ id, email, role, clinicId, clinicSlug, permissions[] }`. Refresh tokens carry `{ id }` only.

### 2.2 Multi-Tenant (Clinic Model)

**`Clinic`** (`clinics`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `name` | String | Display name |
| `nameAr` | String? | Arabic name |
| `slug` | String (unique) | URL-friendly identifier, used in routes |
| `type` | ClinicType (enum) | |
| `isActive` | Boolean | |
| `consultationFee` | Decimal? | Default fee for new visits |
| `followUpFee` | Decimal? | Default fee for follow-ups |
| `optometryPreScreeningRequired` | Boolean | If true, routes to optometry before this clinic |

**`Department`** (`departments`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `name` | String | |
| `nameAr` | String? | |
| `slug` | String (unique) | |
| `type` | DepartmentType (enum) | |
| `clinicId` | String? (FK) | Links department to a clinic |
| `costCenter` | CostCenter? | One-to-one |

**Data Isolation Pattern:** Users are assigned to a `clinicId`. All clinical data (appointments, records, orders) are scoped via `clinicId` foreign keys. The frontend filters by clinic slug. There is no row-level security (RLS) at the database level -- isolation is enforced at the API layer by filtering queries on `clinicId`.

### 2.3 Patient Management

**`Patient`** (`patients`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `mrn` | String (unique) | Medical Record Number, auto-generated: `MRN-YYYY-XXXXX` |
| `fullName` | String | |
| `phone` | String? | |
| `nationalId` | String? (unique) | National ID / civil ID |
| `email` | String? | |
| `dateOfBirth` | DateTime? | |
| `gender` | String? | |
| `chronicConditions` | String[] | Array of conditions |
| `diabetesType` | DiabetesType (enum) | |
| `address` | String? | |
| `notes` | String? | |
| `createdById` | String (FK) | User who created the record |

**Unique Constraints:** `mrn`, `nationalId`

**`PatientFile`** (`patient_files`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `originalName` | String | |
| `storedPath` | String | Supabase Storage path |
| `mimeType` | String | |
| `size` | Int | Bytes |
| `patientId` | String (FK) | |

### 2.4 Appointments

**`Appointment`** (`appointments`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `token` | Int | Sequential queue token per clinic per day |
| `type` | AppointmentType (enum) | WALKIN or RESERVATION |
| `status` | AppointmentStatus (enum) | Default: WAITING |
| `priority` | Int | 0-10, higher = higher priority |
| `visitType` | VisitType? | NEW_VISIT or FOLLOW_UP |
| `scheduledAt` | DateTime? | For reservations |
| `patientId` | String (FK) | |
| `clinicId` | String (FK) | |
| `doctorId` | String (FK) | The user (doctor) assigned |
| `targetClinicId` | String? (FK) | For optometry pre-screening routing |
| `optometryRecordId` | String? | Links to optometry clinical record |
| `surgeryId` | String? (FK) | Links appointment to surgery |

**Check-in Flow:** Receptionist calls `POST /reception/check-in` with `{ patientId, clinicId, type, visitType, collectPayment, paymentMethod }`. If the clinic has `optometryPreScreeningRequired`, patient is auto-routed to the optometry clinic with `targetClinicId` set. A `Transaction` (type: RECEPTION) is created if `collectPayment` is true. Queue token is auto-incremented per clinic.

### 2.5 Clinical Records

**`ClinicalRecord`** (`clinical_records`)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `encounterDate` | DateTime | |
| `diagnosis` | String? | Free-text diagnosis |
| `prescriptions` | String? | Free-text prescriptions |
| `clinicSpecificJson` | Json? | Extensible per-clinic data |
| `notes` | String? | |
| `patientId` | String (FK) | |
| `clinicId` | String (FK) | |

**`VitalSign`** (`vital_signs`) -- belongs to ClinicalRecord
- `bloodPressureSystolic`, `bloodPressureDiastolic`, `heartRate`, `temperature`, `spo2`, `bloodGlucose`, `weight`

**`Symptom`** (`symptoms`) -- belongs to ClinicalRecord
- `name`, `bodyArea`, `onset`, `duration`, `severity` (Int), `description`

**`Medication`** (`medications`) -- belongs to ClinicalRecord
- `drugName`, `dosage`, `frequency`, `duration`, `route`, `notes`

### 2.6 Laboratory

**`DiagnosticTest`** (`diagnostic_tests`) -- catalog
| Column | Type | Notes |
|--------|------|-------|
| `orderType` | DiagnosticOrderType | Always `LAB` currently |
| `code` | String | Unique within orderType (`@@unique([orderType, code])`) |
| `name` | String | |
| `category` | String | Grouping (e.g. "Hematology") |
| `specimen` | String? | e.g. "Blood", "Urine" |
| `unit` | String? | e.g. "mg/dL" |
| `refRangeLow` / `refRangeHigh` | Decimal? | |
| `lowCritical` / `highCritical` | Decimal? | Critical thresholds |
| `price` | Decimal? | |
| `sortOrder` | Int | Display order within category |

**`DiagnosticPanel`** (`diagnostic_panels`) -- bundles of tests
- Many-to-many with DiagnosticTest via `DiagnosticPanelTest` (composite PK: `panelId` + `testId`)

**`DiagnosticOrder`** (`diagnostic_orders`) -- a lab order
| Column | Type | Notes |
|--------|------|-------|
| `orderType` | DiagnosticOrderType | Currently always `LAB` |
| `status` | DiagnosticOrderStatus | SUBMITTED -> IN_PROGRESS -> COMPLETED |
| `priority` | Int | 0=normal, 1=urgent, 2=STAT |
| `patientId` | String (FK) | |
| `fromClinicId` | String (FK) | Ordering clinic |
| `requestedById` | String (FK) | User who ordered |
| `assignedToId` | String? (FK) | Lab tech who claimed it |
| `panelId` | String? (FK) | Optional panel |
| `referralId` | String? (FK) | Linked referral |
| `paid` | Boolean | Must be paid before lab can claim |
| `paidById` / `paidAt` | String? / DateTime? | |

**`DiagnosticOrderTest`** (`diagnostic_order_tests`) -- individual result
- `@@unique([orderId, testId])` -- composite unique constraint
- `value`, `unit`, `refRangeLow`, `refRangeHigh`, `flag` (ResultFlag), `isAbnormal`, `resultEnteredById`

**Checkout flow:** `POST /lab/checkout` creates a `Transaction` (type: LAB) and marks orders as paid. Then lab tech can claim the order.

### 2.7 Imaging

**`ImagingProcedureType`** (`imaging_procedure_types`) -- catalog
- `scanType` (ImagingScanType, unique), `name`, `nameAr`, `price`

**`ImagingOrder`** (`imaging_orders`)
| Column | Type | Notes |
|--------|------|-------|
| `patientId` | String (FK) | |
| `requestedByClinicId` | String (FK) | Ordering clinic |
| `clinicId` | String (FK) | Imaging clinic |
| `scanType` | ImagingScanType (enum) | A_SCAN, B_SCAN, OTT, BIOMETRY |
| `laterality` | String? | Left/Right eye |
| `clinicalInfo` | String? | |
| `status` | ImagingOrderStatus | PENDING -> IN_PROGRESS -> COMPLETED/DISMISSED |
| `findings` | String? | Radiologist findings |
| `impression` | String? | |
| `createdById` | String (FK) | |
| `procedureTypeId` | String? (FK) | |
| `referralId` | String? (unique FK) | |

**`ImagingFile`** (`imaging_files`) -- uploaded files per order

### 2.8 Inpatient (Ward / Bed / Admission)

**`Ward`** (`wards`)
- `name`, `nameAr`, `type`, `floor`, `capacity`, `departmentId` (FK), `dailyRate` (Decimal, used for billing)

**`Bed`** (`beds`)
| Column | Type | Notes |
|--------|------|-------|
| `bedNumber` | String | |
| `wardId` | String (FK) | |
| `status` | BedStatus (enum) | VACANT, OCCUPIED, RESERVED, MAINTENANCE |
| `patientId` | String? (FK) | Set on assign |
| `surgeryId` | String? (FK) | |
| `assignedAt` | DateTime? | Admission timestamp |
| `dischargedAt` | DateTime? | Discharge timestamp |

**Bed lifecycle:** `POST /beds/:id/assign` sets OCCUPIED. `PATCH /beds/:id/discharge` sets VACANT and auto-creates a `Transaction` (type: WARD) calculated as `ward.dailyRate * days_stayed`. `POST /beds/:id/transfer` moves patient between beds. `PATCH /beds/:id/reserve` and `PATCH /beds/:id/maintenance` manage bed states.

**`InpatientVital`** -- vitals per bed admission, recorded by a nurse.
**`NursingNote`** -- nursing notes per bed.
**`WardRound`** -- doctor rounds per ward, with date, notes, plan.

### 2.9 Surgery

**`Surgery`** (`surgeries`)
| Column | Type | Notes |
|--------|------|-------|
| `orRoom` | Int | Operating room number (1-5) |
| `startTime` / `endTime` | DateTime | |
| `status` | SurgeryStatus | SCHEDULED -> PREP -> IN_SURGERY -> RECOVERY -> COMPLETED |
| `patientId` | String (FK) | |
| `departmentId` | String (FK) | |
| `preoperativeRequestId` | String? (unique FK) | Links back to pre-op request |
| `operationTypeId` | String? (FK) | |
| `disposition` | SurgeryDisposition | PENDING, DISCHARGE_HOME, ADMIT_WARD |
| `admittedWardId` | String? (FK) | Ward for ADMIT_WARD disposition |
| `anesthesiaType` | String? | |

**Sub-models:**
- `SurgeryTeamMember` -- staff with ORRole (surgeon, nurse, anesthetist, etc.)
- `IntraoperativeEvent` -- events logged during surgery with timestamps
- `PostOpFollowUp` -- scheduled/completed/missed follow-ups
- `PostoperativeNote` -- notes after surgery
- `DischargeSummary` -- one per surgery (unique on surgeryId)

**Revenue recording:** On `POST /surgery/:id/complete`, if the operation type has a price, a `Transaction` (type: SURGERY) is auto-created.

### 2.10 Preoperative Workflow

**`PreoperativeRequest`** (`preoperative_requests`) -- the central pre-op tracking model
| Column | Type | Notes |
|--------|------|-------|
| `status` | PreoperativeStatus | Multi-step workflow: REQUESTED -> CONFIRMED -> PAYMENT_DONE -> INVESTIGATIONS_DONE -> SCHEDULED |
| `departmentId` | String (FK) | |
| `patientId` | String (FK) | |
| `operationTypeId` | String (FK) | |
| `confirmedById` / `confirmedAt` | String? / DateTime? | |
| `paidById` / `paidAt` | String? / DateTime? | |
| `labOrderId` | String? | |
| `aScanOrderId` / `bScanOrderId` | String? | |
| `scheduledDate` / `scheduledTime` | DateTime? / String? | |
| `cancelledById` / `cancelledAt` / `cancelledReason` | | |
| `flaggedReason` / `referredTo` | String? | |

**`ConsentWaiver`** -- one-to-one with preoperative request, stores signer info and consent status.

**Status transitions:**
1. `POST /preoperative/` -- creates REQUESTED
2. `PATCH /preoperative/:id/confirm` -- CONFIRMED
3. `PATCH /preoperative/:id/waiver` -- consent signed, auto-CONFIRMED
4. `PATCH /preoperative/:id/pay` -- PAYMENT_DONE, creates PREOP transaction
5. `PATCH /preoperative/:id/lab-done` -- INVESTIGATIONS_DONE
6. `PATCH /preoperative/:id/imaging-done` -- INVESTIGATIONS_DONE
7. `PATCH /preoperative/:id/schedule` -- SCHEDULED, auto-creates Surgery record
8. `PATCH /preoperative/:id/cancel` -- CANCELLED

### 2.11 Billing & Financials

**`Transaction`** (`transactions`) -- the core revenue/financial model
| Column | Type | Notes |
|--------|------|-------|
| `type` | TransactionType (enum) | RECEPTION, PHARMACY, OPTICS, LAB, WARD, SURGERY, IMAGING, PREOP |
| `amount` | Decimal | Revenue amount |
| `cogs` | Decimal | Cost of goods sold |
| `paymentMethod` | PaymentMethod (enum) | CASH, CARD, INSURANCE, BANK_TRANSFER |
| `description` | String? | |
| `shiftId` | String (FK) | Always linked to a shift |
| `cashierId` | String (FK) | User processing the payment |
| `departmentId` | String? (FK) | |
| `patientId` | String? (FK) | |
| `surgeryId` | String? (FK) | |
| `diagnosticOrderId` | String? (FK) | |
| `appointmentId` | String? (FK) | |
| `imagingOrderId` | String? (FK) | |

**`Shift`** (`shifts`) -- cashier shift management
- `openedAt`, `closedAt`, `openingBalance`, `expectedTotal`, `actualTotal`, `denominations` (Json)

**`CashMovement`** (`cash_movements`) -- type: PICKUP, DROP, ADJUSTMENT

**`Expense`** (`expenses`)
- `amount`, `category` (ExpenseCategory enum), `description`, `date`, `paidTo`, `paymentMethod`, `receiptUrl`, `departmentId` (FK)

**`AccountsPayable`** (`accounts_payable`) -- hospital debts
- `creditor`, `description`, `amount`, `amountPaid`, `dueDate`, `paymentStatus` (PaymentStatus enum)

### 2.12 Inventory & Procurement

**`InventoryItem`** (`inventory_items`) -- shared across pharmacy, optics, and hospital supplies
| Column | Type | Notes |
|--------|------|-------|
| `name` / `nameAr` | String / String? | |
| `sku` | String (unique) | Stock Keeping Unit |
| `category` | String | "pharmacy", "optics", "hospital" |
| `quantity` | Decimal | Current stock level |
| `price` | Decimal | Retail price |
| `costPrice` | Decimal? | Weighted average cost |
| `minStock` | Int | Low stock threshold |
| `packSize` | Int | Strips per box |
| `expiryDate` | DateTime? | |

**`InventoryTransaction`** -- `type` is string: IN, OUT, SALE

**`Supplier`** -- `name`, `contactPerson`, `phone`, `email`, `category` (pharmacy/optics)

**`SupplierInvoice`** -- goods received, auto-updates inventory quantities on creation. Links to `Expense` for accounting.

**`Requisition`** -- internal department purchase request (status: DRAFT -> submitted)
**`PurchaseOrder`** -- external PO to supplier with multi-tier approval workflow (DRAFT -> PENDING_APPROVAL -> APPROVED -> RECEIVED_IN_FULL)
- Auto-generates `Expense` and `AccountsPayable` on goods receipt for non-CAPEX items
- Auto-creates `FixedAsset` for CAPEX items

**`FixedAsset`** -- depreciation tracking with `monthlyDepreciation`, `accumulatedDepreciation`, `bookValue`

### 2.13 HR

**`Employee`** (`employees`)
| Column | Type | Notes |
|--------|------|-------|
| `employeeCode` | String (unique) | |
| `fullName` | String | |
| `position` | String | |
| `department` | String | Text department name |
| `departmentId` | String? (FK) | Links to Department model |
| `baseSalary` | Decimal | |
| `hireDate` | DateTime | |
| `userId` | String? (FK) | Optional link to system User account |
| `gender` | String? | |

**`Attendance`** -- `@@unique([employeeId, date])` composite unique
**`PayrollRecord`** -- period, grossPay, deductions, netPay, status (DRAFT -> PAID). On PAID status, auto-creates an Expense (category: SALARY).
**`LeaveRequest`** -- type (LeaveType enum), status (LeaveStatus enum), approvedById

### 2.14 Referrals

**`Referral`** (`referrals`) -- the routing hub between clinics
| Column | Type | Notes |
|--------|------|-------|
| `type` | ReferralType | INTERNAL_CLINIC, PHARMACY_DISPATCH, OPTICS_DISPATCH, LAB_DISPATCH |
| `status` | ReferralStatus | PENDING -> DISPATCHED/FULFILLED/CANCELLED |
| `fromClinicId` | String (FK) | |
| `toClinicId` | String? (FK) | |
| `patientId` | String (FK) | |

**Side effects on creation:**
- `LAB_DISPATCH`: Auto-creates a `DiagnosticOrder`
- `PHARMACY_DISPATCH`: Medications stored as `ReferralMedication`
- `INTERNAL_CLINIC` to IMAGING clinic: Auto-creates an `ImagingOrder`

### 2.15 Optic Lab

**`OpticLabJob`** (`optic_lab_jobs`) -- glass-making jobs for optical dispensary
| Column | Type | Notes |
|--------|------|-------|
| `jobNumber` | String (unique) | Format: `LJ-YYYYMMDD-NNN` |
| `status` | String | NEW -> IN_PROGRESS -> COMPLETED |
| `transactionId` | String (unique FK) | Links to the optics sale |
| `sphOD/cylOD/axisOD` | String? | Right eye prescription |
| `sphOS/cylOS/axisOS` | String? | Left eye prescription |
| `frameName`, `frameSku`, `frameItemId` | String? | Frame details |
| `lensType`, `lensMaterial`, `coating` | String? | Lens specifications |
| `customerName`, `customerPhone` | String? | Walk-in customer info |

---

## Part 3: API Catalog

> All endpoints require `Authorization: Bearer <jwt>` unless marked otherwise.
> Base paths are shown relative to `/api/v1`.

### 3.1 Auth

| Method | Path | Description | Auth | Roles/Permissions | Params |
|--------|------|-------------|------|-------------------|--------|
| POST | `/auth/login` | Login, returns tokens + user | No (rate-limited) | -- | Body: `{ email, password }` |
| POST | `/auth/refresh` | Refresh JWT tokens | No | -- | Body: `{ refreshToken }` |
| GET | `/auth/me` | Get current user profile | Yes | Any authenticated | -- |

### 3.2 Admin (Users & RBAC)

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/admin/users` | List all users | Yes | `admin:users` | -- |
| GET | `/admin/users/:id` | Get user by ID | Yes | `admin:users` | -- |
| POST | `/admin/users` | Create user | Yes | `admin:users` | Body: `{ email, password, fullName, roleId, clinicId? }` |
| PATCH | `/admin/users/:id` | Update user | Yes | `admin:users` | Body: `{ fullName?, phone?, roleId?, clinicId?, isActive? }` |
| GET | `/admin/roles` | List all roles with user counts | Yes | `admin:rbac` | -- |
| POST | `/admin/roles` | Create role | Yes | `admin:rbac` | Body: `{ name, description?, permissions? }` |
| PATCH | `/admin/roles/:id` | Update role | Yes | `admin:rbac` | Body: `{ name?, description?, permissions? }` |
| DELETE | `/admin/roles/:id` | Delete role (must have 0 users) | Yes | `admin:rbac` | -- |
| POST | `/admin/roles/seed` | Seed default roles | Yes | `admin:rbac` | -- |
| GET | `/admin/pricing/operation-types` | List operation types with prices | Yes | `pricing:read` | -- |
| PATCH | `/admin/pricing/operation-types/:id` | Update operation type price | Yes | `pricing:write` | Body: `{ price }` |
| GET | `/admin/pricing/clinics` | List clinics with fees | Yes | `pricing:read` | -- |
| PATCH | `/admin/pricing/clinics/:id` | Update clinic fees | Yes | `pricing:write` | Body: `{ consultationFee?, followUpFee? }` |
| GET | `/admin/pricing/wards` | List wards with daily rates | Yes | `pricing:read` | -- |
| PATCH | `/admin/pricing/wards/:id` | Update ward daily rate | Yes | `pricing:write` | Body: `{ dailyRate }` |
| GET | `/admin/pricing/imaging-procedure-types` | List imaging types | Yes | `pricing:read` | -- |
| PATCH | `/admin/pricing/imaging-procedure-types/:id` | Update imaging type price | Yes | `pricing:write` | Body: `{ price }` |
| POST | `/admin/pricing/imaging-procedure-types/seed` | Seed imaging types | Yes | `pricing:write` | -- |
| POST | `/admin/log-error` | Log frontend crash | No | -- | Body: `{ message, stack?, userId?, url?, userAgent? }` |

### 3.3 Users

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/users` | List users | Yes | `admin:users` | -- |
| GET | `/users/roles` | List roles | Yes | `admin:rbac` | -- |
| PUT | `/users/:id/roles` | Update user role/clinic | Yes | `admin:rbac` | Body: `{ roleId, clinicId? }` |

### 3.4 Clinics

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/clinics` | List active clinics | Yes | Any | -- |
| GET | `/clinics/:slug/dashboard` | Clinic dashboard data | Yes | `clinical:read` | -- |
| GET | `/clinics/:slug/queue` | Today's queue for clinic | Yes | `clinical:read` | -- |
| GET | `/clinics/:slug/stats` | Clinic statistics | Yes | `clinical:read` | -- |
| GET | `/clinics/:slug/doctors` | List doctors in clinic | Yes | Any | -- |
| GET | `/clinics/:slug/records` | Clinical records | Yes | `clinical:read` | Query: `patientId?` |
| POST | `/clinics/:slug/record` | Create clinical record | Yes | `clinical:write` | Body: `{ patientId, diagnosis?, prescriptions?, vitalSigns?, symptoms?, medications?, notes? }` |
| GET | `/clinics/:slug/medications` | Search pharmacy items | Yes | `clinical:read` | Query: `search?` |
| POST | `/clinics/:slug/complete-screening` | Complete optometry screening | Yes | `clinical:write` | Body: `{ optometryAppointmentId, diagnosis?, ... }` |
| GET | `/clinics/:slug/print-report/:recordId` | Generate print data | Yes | `clinical:read` | -- |
| GET | `/clinics/:slug/screening-queue` | Optometry screening queue | Yes | `clinical:read` | -- |
| GET | `/clinics/:slug/history` | Appointment history with pagination | Yes | `clinical:read` | Query: `q?, from?, to?, page?, limit?` |
| GET | `/clinics/:slug/upcoming-follow-ups` | Scheduled follow-ups | Yes | `clinical:read` | -- |
| POST | `/clinics/:slug/schedule-follow-up` | Schedule follow-up appointment | Yes | `clinical:write` | Body: `{ patientId, scheduledDate, notes? }` |

### 3.5 Departments

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/departments` | List departments | Yes | Any | Query: `type?` |
| GET | `/departments/:id` | Get department | Yes | Any | -- |
| POST | `/departments` | Create department | Yes | `admin:users` | Body: `{ name, nameAr?, slug, type, clinicId? }` |
| PATCH | `/departments/:id` | Update department | Yes | `admin:users` | Body: `{ name?, nameAr?, slug?, type?, isActive?, clinicId? }` |

### 3.6 Patients

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/patients` | List patients (paginated) | Yes | `patient:read` | Query: `q?, page?, limit?, sortBy?, sortOrder?` |
| GET | `/patients/search` | Search patients | Yes | `patient:read` | Query: `q (min 2 chars), clinicSlug?` |
| POST | `/patients` | Create patient | Yes | `patient:create` | Body: `{ fullName, phone?, dateOfBirth?, gender?, diabetesType?, address?, notes? }` |
| GET | `/patients/:id` | Get patient with relations | Yes | `patient:read` | -- |
| PATCH | `/patients/:id` | Update patient | Yes | `patient:update` | Body: `{ fullName?, phone?, nationalId?, email?, ... }` |
| POST | `/patients/:patientId/files` | Upload files | Yes | `patient:create` | Multipart: `files[]` (max 15MB, PDF/JPEG/PNG/WebP) |
| GET | `/patients/:patientId/files` | List patient files | Yes | `patient:read` | -- |
| GET | `/patients/files/:id/download` | Download file (signed URL redirect) | Yes | `patient:read` | -- |

### 3.7 Reception (Check-in, Queue, Reservations)

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| POST | `/reception/check-in` | Check-in patient (creates appointment + optional payment) | Yes | `appointment:write` | Body: `{ patientId, clinicId, type?, visitType?, priority?, notes?, collectPayment?, paymentMethod? }` |
| POST | `/reception/reservations` | Create reservation | Yes | `appointment:write` | Body: `{ patientId/fullName, clinicId, doctorId?, scheduledAt?, notes? }` |
| GET | `/reception/reservations` | List reservations | Yes | `appointment:read` | Query: `clinicId?, q?` |
| PATCH | `/reception/reservations/:id/arrive` | Mark reservation as arrived | Yes | `appointment:write` | Body: `{ priority?, visitType? }` |
| PATCH | `/reception/appointments/:id/status` | Update appointment status | Yes | `appointment:write` | Body: `{ status }` |
| PATCH | `/reception/appointments/:id/priority` | Set priority (0-10) | Yes | `appointment:write` | Body: `{ priority }` |
| GET | `/reception/follow-ups` | List follow-up reservations | Yes | `appointment:read` | Query: `clinicId?, dateFrom?, dateTo?, q?` |
| GET | `/reception/queue/stats` | Queue stats by clinic | Yes | `appointment:read` | -- |
| GET | `/reception/queue/:clinicId` | Clinic queue with wait estimates | Yes | `appointment:read` | -- |
| POST | `/reception/queue/:clinicId/call-next` | Call next patient | Yes | `appointment:write` | -- |
| GET | `/reception/waiting-room` | Public waiting room display (no auth) | No | -- | -- |
| GET | `/reception/search` | Search patients | Yes | `patient:read` | Query: `q` |
| POST | `/reception/patients` | Quick-create patient from reception | Yes | `patient:create` | Body: `{ fullName, phone?, dateOfBirth?, gender?, diabetesType? }` |
| POST | `/reception/files` | Upload patient files from reception | Yes | `patient:create` | Multipart: `files[], patientId` |
| GET | `/reception/files/:patientId` | List patient files | Yes | `patient:read` | -- |
| GET | `/reception/files/download/:id` | Download patient file | Yes | `patient:read` | -- |
| POST | `/reception/lab/pay` | Pay for lab orders from reception | Yes | `accounting:write` | Body: `{ orderIds[], paymentMethod }` |

### 3.8 Appointments

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| PATCH | `/appointments/:id/status` | Update status | Yes | `appointment:write` | Body: `{ status }` |
| PATCH | `/appointments/:id/priority` | Set priority | Yes | `appointment:write` | Body: `{ priority }` |

### 3.9 Laboratory

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/lab/tests` | List lab tests | Yes | `diagnostics:read` | Query: `search?, category?, isActive?` |
| GET | `/lab/tests/categories` | List distinct test categories | Yes | `diagnostics:read` | -- |
| POST | `/lab/tests` | Create test | Yes | `diagnostics:catalog` | Body: `{ code, name, nameAr?, category, ... }` |
| PUT | `/lab/tests/:id` | Update test | Yes | `diagnostics:catalog` | Body: partial fields |
| DELETE | `/lab/tests/:id` | Soft-delete test (set isActive=false) | Yes | `diagnostics:catalog` | -- |
| GET | `/lab/panels` | List panels with tests | Yes | `diagnostics:read` | -- |
| POST | `/lab/panels` | Create panel | Yes | `diagnostics:catalog` | Body: `{ name, nameAr?, testIds[] }` |
| DELETE | `/lab/panels/:id` | Soft-delete panel | Yes | `diagnostics:catalog` | -- |
| GET | `/lab/orders` | List orders | Yes | `diagnostics:read` | Query: `status?, patientId?, fromClinicId?, search?, pendingPayment?` |
| GET | `/lab/orders/:id` | Get order details | Yes | `diagnostics:read` | -- |
| POST | `/lab/orders` | Create order (also creates referral) | Yes | `diagnostics:order` | Body: `{ patientId, fromClinicId, testIds?, panelId?, clinicalNotes?, priority? }` |
| PATCH | `/lab/orders/:id/claim` | Lab tech claims order | Yes | `diagnostics:write` | -- |
| PATCH | `/lab/orders/:id/unclaim` | Unclaim order | Yes | `diagnostics:write` | -- |
| PATCH | `/lab/orders/:id/status` | Update order status | Yes | `diagnostics:write` | Body: `{ status }` |
| PUT | `/lab/orders/:id/results` | Submit results | Yes | `diagnostics:results` | Body: `{ results: [{ orderTestId, value, flag, ... }] }` |
| GET | `/lab/results` | Get patient's lab history | Yes | `diagnostics:read` | Query: `patientId` |
| GET | `/lab/orders/:id/report` | Get order as report | Yes | `diagnostics:read` | -- |
| POST | `/lab/checkout` | Pay for lab orders (creates transaction) | Yes | `diagnostics:order` | Body: `{ orderIds[], paymentMethod }` |
| GET | `/lab/stats` | Lab statistics | Yes | `diagnostics:read` | -- |

### 3.10 Imaging

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/imaging` | List imaging orders | Yes | `clinical:read` | Query: `clinicId?, clinicSlug?, status?, patientId?, search?` |
| GET | `/imaging/:id` | Get order details | Yes | `clinical:read` | -- |
| POST | `/imaging/:id/start` | Start imaging (PENDING -> IN_PROGRESS) | Yes | `clinical:write` | -- |
| POST | `/imaging/:id/complete` | Complete with findings | Yes | `clinical:write` | Body: `{ findings?, impression? }` |
| POST | `/imaging/:id/dismiss` | Dismiss order | Yes | `clinical:write` | -- |
| POST | `/imaging/:id/upload` | Upload imaging files | Yes | `clinical:write` | Multipart: `files[]` (max 50MB) |
| GET | `/imaging/:id/files` | List uploaded files | Yes | `clinical:read` | -- |
| GET | `/imaging/files/:fileId/download` | Get signed download URL | Yes | `clinical:read` | -- |

### 3.11 Surgery

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/surgery` | List surgeries | Yes | `surgery:read` | Query: `date?, orRoom?, departmentId?` |
| GET | `/surgery/availability` | OR room availability for a date | Yes | `surgery:read` | Query: `date (required)` |
| GET | `/surgery/stats` | Surgery statistics | Yes | `surgery:read` | Query: `startDate?, endDate?` |
| POST | `/surgery` | Create surgery | Yes | `surgery:write` | Body: `{ patientId, departmentId, orRoom, startTime, endTime, ... }` |
| PATCH | `/surgery/:id/status` | Update status | Yes | `surgery:write` | Body: `{ status }` |
| PATCH | `/surgery/:id/disposition` | Set disposition | Yes | `surgery:write` | Body: `{ disposition, admittedWardId? }` |
| PATCH | `/surgery/:id` | Update schedule/notes | Yes | `surgery:write` | Body: `{ startTime?, endTime?, orRoom?, notes? }` |
| PATCH | `/surgery/:id/complete` | Complete surgery (records revenue) | Yes | `surgery:write` | -- |
| GET | `/surgery/:id/team` | List team members | Yes | `surgery:read` | -- |
| POST | `/surgery/:id/team` | Add team member | Yes | `surgery:write` | Body: `{ name, roleId, userId? }` |
| DELETE | `/surgery/:id/team/:memberId` | Remove team member | Yes | `surgery:write` | -- |
| GET | `/surgery/:id/events` | List intraoperative events | Yes | `surgery:read` | -- |
| POST | `/surgery/:id/events` | Log intraoperative event | Yes | `surgery:write` | Body: `{ eventTypeId, description? }` |
| GET | `/surgery/:id/notes` | List post-op notes | Yes | `surgery:read` | -- |
| POST | `/surgery/:id/notes` | Add post-op note | Yes | `surgery:write` | Body: `{ content }` |
| GET | `/surgery/:id/discharge` | Get discharge summary | Yes | `surgery:read` | -- |
| POST | `/surgery/:id/discharge` | Create discharge summary | Yes | `surgery:write` | Body: `{ dischargeDate, dischargeNotes?, medications?, followUpInstructions? }` |
| GET | `/surgery/:id/print` | Generate print HTML | Yes | `surgery:read` | -- |
| GET | `/surgery/:id/report` | Full surgery report | Yes | `surgery:read` | -- |
| POST | `/surgery/:id/follow-ups` | Schedule follow-up | Yes | `surgery:write` | Body: `{ scheduledAt, notes? }` |
| GET | `/surgery/follow-ups` | List follow-ups | Yes | `surgery:read` | Query: `date?, status?, patientId?` |
| PATCH | `/surgery/follow-ups/:followUpId` | Update follow-up | Yes | `surgery:write` | Body: `{ status?, notes? }` |

### 3.12 Preoperative

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/preoperative` | List pre-op requests | Yes | `preoperative:read` | Query: `departmentId?, status?, patientId?` |
| GET | `/preoperative/:id` | Get request details | Yes | `preoperative:read` | -- |
| POST | `/preoperative` | Create request | Yes | `preoperative:write` | Body: `{ departmentId, patientId, operationTypeId, notes? }` |
| PATCH | `/preoperative/:id/confirm` | Confirm request | Yes | `preoperative:write` | -- |
| PATCH | `/preoperative/:id/waiver` | Sign consent waiver | Yes | `preoperative:write` | Body: `{ signedBy, relationship, witnessedById? }` |
| PATCH | `/preoperative/:id/pay` | Record payment | Yes | `preoperative:write` | -- |
| PATCH | `/preoperative/:id/lab-done` | Mark lab done | Yes | `preoperative:write` | Body: `{ diagnosticOrderId? }` |
| PATCH | `/preoperative/:id/imaging-done` | Mark imaging done | Yes | `preoperative:write` | Body: `{ aScanOrderId?, bScanOrderId? }` |
| PATCH | `/preoperative/:id/schedule` | Schedule surgery (creates Surgery record) | Yes | `preoperative:write` | Body: `{ scheduledDate, orRoom, endTime, scheduledTime? }` |
| PATCH | `/preoperative/:id/cancel` | Cancel request | Yes | `preoperative:write` | Body: `{ cancelledReason }` |
| GET | `/preoperative/patients` | List non-cancelled requests | Yes | `preoperative:read` | -- |
| PATCH | `/preoperative/:id/status` | Update status | Yes | `preoperative:write` | Body: `{ status, flaggedReason?, referredTo? }` |
| GET | `/preoperative/stats` | Statistics by status | Yes | `preoperative:read` | -- |
| GET | `/preoperative/operation-types` | List operation types | Yes | `preoperative:read` | Query: `departmentId?` |
| POST | `/preoperative/operation-types` | Create operation type | Yes | `admin:users` | Body: `{ name, nameAr?, departmentId }` |
| PATCH | `/preoperative/operation-types/:id` | Update operation type | Yes | `admin:users` | Body: `{ name?, nameAr?, isActive? }` |
| DELETE | `/preoperative/operation-types/:id` | Soft-delete operation type | Yes | `admin:users` | -- |

### 3.13 Wards & Inpatient

| Method | Path | Description | Auth | Permissions | Params |
|--------|------|-------------|------|-------------|--------|
| GET | `/wards` | List wards with beds | Yes | `ward:read` | Query: `departmentId?` |
| POST | `/wards` | Create ward | Yes | `ward:write` | Body: `{ name, nameAr?, departmentId?, dailyRate? }` |
| PATCH | `/wards/:id` | Update ward | Yes | `ward:write` | Body: `{ name?, nameAr?, isActive?, dailyRate? }` |
| DELETE | `/wards/:id` | Soft-delete ward | Yes | `ward:write` | -- |
| GET | `/beds` | List beds | Yes | `ward:read` | Query: `wardId?, status?` |
| GET | `/beds/available` | List vacant beds | Yes | `ward:read` | Query: `wardId?` |
| POST | `/beds` | Create bed | Yes | `ward:write` | Body: `{ bedNumber, wardId }` |
| PATCH | `/beds/:id/assign` | Assign patient to bed | Yes | `ward:write` | Body: `{ patientId, surgeryId? }` |
| PATCH | `/beds/:id/discharge` | Discharge from bed (auto-bills) | Yes | `ward:write` | Body: `{ paymentMethod? }` |
| PATCH | `/beds/:id/reserve` | Reserve bed | Yes | `ward:write` | Body: `{ patientId?, surgeryId? }` |
| POST | `/beds/:id/transfer` | Transfer to another bed | Yes | `ward:write` | Body: `{ targetBedId }` |
| PATCH | `/beds/:id/maintenance` | Toggle maintenance status | Yes | `ward:write` | -- |
| DELETE | `/beds/:id` | Delete bed | Yes | `ward:write` | -- |
| GET | `/beds/:id/vitals` | List inpatient vitals | Yes | `ward:read` | -- |
| POST | `/beds/:id/vitals` | Record inpatient vitals | Yes | `ward:write` | Body: `{ temperature?, heartRate?, bloodPressureSystolic?, ... }` |
| GET | `/beds/:id/notes` | List nursing notes | Yes | `ward:read` | -- |
| POST | `/beds/:id/notes` | Add nursing note | Yes | `ward:write` | Body: `{ content }` |
| GET | `/rounds` | List ward rounds | Yes | `ward:read` | Query: `wardId?, date?` |
| POST | `/rounds` | Create ward round | Yes | `ward:write` | Body: `{ wardId, date, notes?, plan? }` |

### 3.14 Accounting

#### Summary
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/accounting/summary` | Revenue summary (today/week/month/all-time) | `accounting:read` | -- |
| GET | `/accounting/revenue-by-day` | Daily revenue chart | `accounting:read` | Query: `days?` (default 30) |
| GET | `/accounting/revenue-by-type` | Revenue by transaction type | `accounting:read` | -- |
| GET | `/accounting/revenue-by-department` | Revenue by department | `accounting:read` | Query: `startDate?, endDate?` |
| GET | `/accounting/pnl` | Profit & Loss by department | `accounting:read` | Query: `startDate?, endDate?` |

#### Transactions
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/accounting/transactions` | List transactions | `accounting:read` | Query: `type?, paymentMethod?, startDate?, endDate?, limit?, offset?` |
| GET | `/accounting/transactions/:id` | Get transaction detail | `accounting:read` | -- |
| POST | `/accounting/transactions` | Create transaction | `accounting:write` | Body: `{ type, amount, paymentMethod, description?, departmentId? }` |

#### Expenses
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/accounting/expenses` | List expenses | `accounting:read` | Query: `category?, departmentId?, startDate?, endDate?, limit?, offset?` |
| POST | `/accounting/expenses` | Create expense | `accounting:write` | Body: `{ amount, category, description, date?, paidTo?, ... }` |
| PATCH | `/accounting/expenses/:id` | Update expense | `accounting:write` | Body: partial fields |
| DELETE | `/accounting/expenses/:id` | Delete expense | `accounting:write` | -- |

#### Shifts
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| POST | `/accounting/shifts/open` | Open new shift | `accounting:write` | Body: `{ openingBalance? }` |
| POST | `/accounting/shifts/close` | Close shift | `accounting:write` | Body: `{ expectedTotal?, actualTotal?, denominations?, notes? }` |
| GET | `/accounting/shifts` | List shifts | `accounting:read` | -- |
| GET | `/accounting/shifts/:id` | Get shift with transactions | `accounting:read` | -- |

#### Debts
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/accounting/debts` | List all unpaid debts (supplier invoices + accounts payable) | `accounting:read` | -- |
| GET | `/accounting/debts/:id` | Get debt detail | `accounting:read` | -- |
| POST | `/accounting/debts` | Create hospital debt | `accounting:write` | Body: `{ creditor, description, amount, dueDate?, notes? }` |
| PUT | `/accounting/debts/:id/payment` | Record payment against debt | `accounting:write` | Body: `{ amount }` |

#### Cash Movements
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/accounting/cash-movements` | List cash movements | `accounting:read` | Query: `shiftId?` |
| POST | `/accounting/cash-movements` | Record cash movement | `accounting:write` | Body: `{ shiftId, type (PICKUP/DROP/ADJUSTMENT), amount, reason? }` |

### 3.15 POS (Pharmacy, Optics, Hospital Items)

#### Pharmacy Items
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| POST | `/pos/pharmacy/items` | Create pharmacy item | `pharmacy:write` | Body: `{ name, sku, price, costPrice?, initialQuantity?, ... }` |
| GET | `/pos/pharmacy/items` | List pharmacy items | `pharmacy:read` | Query: `search?` |
| POST | `/pos/pharmacy/items/:id/adjust` | Adjust stock | `pharmacy:write` | Body: `{ type (IN/OUT), quantity, notes? }` |
| PUT | `/pos/pharmacy/items/:id` | Update pharmacy item | `pharmacy:write` | Body: partial fields |
| DELETE | `/pos/pharmacy/items/:id` | Soft-delete item | `pharmacy:write` | -- |

#### Optics Items
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| POST | `/pos/optics/items` | Create optics item | `optics:write` | Body: `{ name, sku, price, ... }` |
| GET | `/pos/optics/items` | List optics items | `optics:read` | Query: `search?` |
| POST | `/pos/optics/items/:id/adjust` | Adjust stock | `optics:write` | Body: `{ type, quantity, notes? }` |
| PUT | `/pos/optics/items/:id` | Update item | `optics:write` | Body: partial fields |
| DELETE | `/pos/optics/items/:id` | Soft-delete item | `optics:write` | -- |

#### Hospital Items
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| POST | `/pos/hospital/items` | Create hospital item | `inventory:write` | Body: `{ name, sku, ... }` |
| GET | `/pos/hospital/items` | List hospital items | `inventory:read` | Query: `search?` |
| POST | `/pos/hospital/items/:id/adjust` | Adjust stock | `inventory:write` | Body: `{ type, quantity, notes? }` |
| PUT | `/pos/hospital/items/:id` | Update item | `inventory:write` | Body: partial fields |
| DELETE | `/pos/hospital/items/:id` | Soft-delete item | `inventory:write` | -- |

#### POS Transactions & Shift
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/pos/alerts` | Stock alerts (low, expired, expiring soon) | Any authenticated | Query: `category?` |
| GET | `/pos/items` | List all active items | Any authenticated | Query: `category?, search?` |
| GET | `/pos/shift/current` | Get or create current shift | Any authenticated | -- |
| POST | `/pos/shift/close` | Close current shift | Any authenticated | Body: `{ expectedTotal?, actualTotal?, notes? }` |
| POST | `/pos/transact` | Process a sale (creates Transaction + InventoryTransactions) | `pharmacy:write` | Body: `{ type, items: [{ id, quantity }], paymentMethod, amount?, description?, patientName?, referralId? }` |

#### Suppliers
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/pos/suppliers` | List suppliers | `pharmacy:read` | Query: `category?` |
| POST | `/pos/suppliers` | Create supplier | `pharmacy:write` | Body: `{ name, contactPerson?, phone?, email?, category? }` |
| PUT | `/pos/suppliers/:id` | Update supplier | `pharmacy:write` | Body: partial fields |
| GET | `/pos/suppliers/:id/balance` | Get supplier balance & invoices | Any authenticated | -- |
| DELETE | `/pos/suppliers/:id` | Delete/archive supplier | `pharmacy:write` | -- |

#### Supplier Invoices
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/pos/:category/invoices/next-ref` | Get next invoice reference number | Any authenticated | -- |
| GET | `/pos/:category/invoices` | List invoices by category | Any authenticated | -- |
| POST | `/pos/:category/invoices` | Create invoice (auto-updates inventory) | `pharmacy:write` | Body: `{ supplierId, invoiceNumber, invoiceTotal, items: [{ itemId, quantityReceived, unitCost }], ... }` |
| GET | `/pos/:category/invoices/:id` | Get invoice detail | Any authenticated | -- |
| PUT | `/pos/:category/invoices/:id/payment` | Record payment | `pharmacy:write` | Body: `{ amountPaid, paymentStatus? }` |

### 3.16 Inventory (Warehouse)

| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/inventory/items` | List items | `warehouse:read` | Query: `search?, category?` |
| GET | `/inventory/items/low-stock` | Low stock alerts | `warehouse:read` | -- |
| GET | `/inventory/items/:id` | Get item with locations & transactions | `warehouse:read` | -- |
| POST | `/inventory/items` | Create item | `warehouse:write` | Body: `{ name, sku, category, quantity?, price?, ... }` |
| PATCH | `/inventory/items/:id` | Update item | `warehouse:write` | Body: partial fields |
| DELETE | `/inventory/items/:id` | Soft-delete item | `warehouse:write` | -- |
| GET | `/inventory/transactions/:itemId` | Item transaction history | `warehouse:read` | -- |
| POST | `/inventory/transactions` | Create stock movement | `warehouse:write` | Body: `{ itemId, type (IN/OUT), quantity, notes? }` |
| GET | `/inventory/locations` | List all locations | `warehouse:read` | -- |

### 3.17 Procurement

#### Requisitions
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/procurement/requisitions` | List requisitions | `purchase:read` | Query: `status?, departmentId?, q?` |
| GET | `/procurement/requisitions/:id` | Get requisition | `purchase:read` | -- |
| POST | `/procurement/requisitions` | Create requisition | `purchase:write` | Body: `{ departmentId, notes?, items: [{ description, quantity, itemId?, notes? }] }` |
| PUT | `/procurement/requisitions/:id` | Update (DRAFT only) | `purchase:write` | Body: `{ status?, notes?, items? }` |
| DELETE | `/procurement/requisitions/:id` | Delete (DRAFT only) | `purchase:write` | -- |

#### Purchase Orders
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/procurement/purchase-orders` | List POs | `purchase:read` | Query: `status?, departmentType?, expenseType?, q?` |
| GET | `/procurement/purchase-orders/pending-approval` | Pending approval list | `approval:read` | -- |
| GET | `/procurement/purchase-orders/:id` | Get PO detail | `purchase:read` | -- |
| POST | `/procurement/purchase-orders` | Create PO | `purchase:write` | Body: `{ departmentType, expenseType, supplierId, items: [...], ... }` |
| PUT | `/procurement/purchase-orders/:id` | Update PO (DRAFT only) | `purchase:write` | Body: partial fields |
| POST | `/procurement/purchase-orders/:id/submit` | Submit for approval (auto-approves Tier 1) | `purchase:write` | -- |
| POST | `/procurement/purchase-orders/:id/approve` | Approve PO | `approval:write` | -- |
| POST | `/procurement/purchase-orders/:id/reject` | Reject PO | `approval:write` | Body: `{ rejectionReason? }` |
| POST | `/procurement/purchase-orders/:id/receive` | Receive goods | `purchase:write` | Body: `{ receivedItems?: [{ itemId, quantityReceived }] }` |
| POST | `/procurement/purchase-orders/:id/payment` | Record payment | `purchase:write` | Body: `{ amount }` |

#### Fixed Assets
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/procurement/assets` | List assets | `asset:read` | -- |
| GET | `/procurement/assets/:id` | Get asset detail | `asset:read` | -- |
| POST | `/procurement/assets` | Create asset | `asset:write` | Body: `{ name, assetType, acquisitionCost, usefulLifeYears, ... }` |
| PUT | `/procurement/assets/:id/depreciate` | Record monthly depreciation | `asset:write` | -- |

#### Cost Centers
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/procurement/cost-centers` | List cost centers | Any authenticated | -- |
| POST | `/procurement/cost-centers` | Create cost center | `purchase:write` | Body: `{ name, code, departmentId }` |
| PATCH | `/procurement/cost-centers/:id` | Update cost center | `purchase:write` | Body: `{ name?, code?, departmentId?, isActive? }` |
| DELETE | `/procurement/cost-centers/:id` | Delete cost center | `purchase:write` | -- |

#### Notifications
| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/procurement/notifications` | List notifications + unread count | `notification:read` | -- |
| PUT | `/procurement/notifications/:id/read` | Mark as read | `notification:read` | -- |
| PUT | `/procurement/notifications/read-all` | Mark all as read | `notification:read` | -- |

### 3.18 Insurance

There is no dedicated insurance module with its own routes. Insurance is handled via:
- `Transaction.paymentMethod = INSURANCE` for payment recording
- `InsuranceClaim` model does not currently exist in the schema

### 3.19 HR

| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/hr/employees` | List employees | `hr:read` | Query: `search?, department?, departmentId?, isActive?` |
| POST | `/hr/employees` | Create employee | `hr:write` | Body: `{ employeeCode, fullName, position, hireDate, departmentId?, createUser?, ... }` |
| PATCH | `/hr/employees/:id` | Update employee | `hr:write` | Body: partial fields |
| GET | `/hr/payroll` | List payroll records | `hr:read` | Query: `period?, employeeId?` |
| POST | `/hr/payroll` | Create payroll record | `hr:write` | Body: `{ employeeId, period, grossPay, deductions?, notes? }` |
| PATCH | `/hr/payroll/:id/status` | Update payroll status (PAID auto-creates expense) | `hr:write` | Body: `{ status }` |
| GET | `/hr/attendance` | List attendance | `hr:read` | Query: `date?, employeeId?` |
| POST | `/hr/attendance` | Upsert attendance (uses composite unique) | `hr:write` | Body: `{ employeeId, date, checkIn?, checkOut?, status?, notes? }` |
| GET | `/hr/leaves` | List leave requests | `hr:read` | Query: `status?, employeeId?` |
| POST | `/hr/leaves` | Create leave request | `hr:write` | Body: `{ employeeId, type, startDate, endDate, reason? }` |
| PATCH | `/hr/leaves/:id/status` | Approve/reject leave | `hr:write` | Body: `{ status }` |

### 3.20 Referrals

| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/referral` | List referrals | `clinical:read` | Query: `patientId?, fromClinicId?` |
| GET | `/referral/:id` | Get referral detail | `clinical:read` | -- |
| POST | `/referral` | Create referral | `clinical:write` | Body: `{ patientId, fromClinicId, toClinicId?, type, notes?, medications?, testIds?, scanType?, ... }` |
| PATCH | `/referral/:id/status` | Update referral status | `clinical:write` | Body: `{ status }` |

### 3.21 Optic Lab

| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/optic-lab/jobs` | List jobs | `optic_lab:read` or `optics:read` | Query: `status?` |
| GET | `/optic-lab/jobs/:id` | Get job detail | `optic_lab:read` or `optics:read` | -- |
| POST | `/optic-lab/jobs` | Create job | `optic_lab:write` or `optics:write` | Body: `{ transactionId, customerName?, sphOD?, ... }` |
| PUT | `/optic-lab/jobs/:id/status` | Update job status (NEW->IN_PROGRESS->COMPLETED) | `optic_lab:write` or `optics:write` | Body: `{ status }` |
| GET | `/optic-lab/customers` | List customers with job history | `optic_lab:read` or `optics:read` | -- |
| GET | `/optic-lab/stats` | Job statistics by status | `optic_lab:read` or `optics:read` | -- |

### 3.22 AI

| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| POST | `/ai/diagnose` | AI-assisted diagnosis | `clinical:read` | Body: `{ patientId, symptoms?, vitals?, specialty? }` |
| GET | `/ai/icd10` | Search ICD-10 codes | `clinical:read` | Query: `q?` (min 2 chars) |

### 3.23 Sync (Offline Support)

| Method | Path | Description | Permissions | Params |
|--------|------|-------------|-------------|--------|
| GET | `/sync/initial` | Full dump of reference tables | Any authenticated | -- |
| GET | `/sync/pull` | Incremental changes since timestamp | Any authenticated | Query: `since (ISO timestamp)` |
| POST | `/sync/push` | Push local mutations | Any authenticated | Body: `{ mutations: [{ table, action, recordId, data }] }` |

---

## Part 4: RLS / Data Isolation

### 4.1 Multi-Tenancy via `clinicId` Pattern

The system is a **single-database, shared-schema** multi-tenant architecture. There is **no Postgres RLS** (Row-Level Security) -- the `relationMode = "prisma"` in the schema indicates Prisma manages relations without foreign key constraints at the DB level (likely Supabase PostgREST compatibility).

**Isolation mechanism:**

1. **User-Clinic Binding:** Each `User` has an optional `clinicId`. On login, the JWT includes `clinicId` and `clinicSlug`.

2. **Query Filtering:** All clinical endpoints filter data by `clinicId`. For example:
   - `GET /clinics/:slug/dashboard` looks up the clinic by slug, then queries appointments WHERE `clinicId = clinic.id`
   - `GET /lab/orders` filters by `fromClinicId`
   - `GET /referral` filters by `fromClinicId`

3. **Cross-Clinic Operations:** Some operations intentionally cross clinic boundaries:
   - Referrals link `fromClinicId` and `toClinicId`
   - Lab orders originate from one clinic but are fulfilled by the lab department
   - Imaging orders link requesting clinic and imaging clinic
   - Pre-operative requests flow through multiple departments

4. **Admin Access:** Super Admin users have permissions to all clinics. Their operations are not scoped to a single clinic.

### 4.2 Role-Based Access Control (RBAC)

**Permission System:**

Permissions follow the format `module:action` (e.g., `patient:read`, `surgery:write`). They are stored as a JSON array on the `Role` model and included in the JWT payload.

**Middleware chain:**
```
authenticate (JWT verification) 
  -> requirePermission(...permissions) (checks req.user.permissions)
    -> route handler
```

**Key Permission Groups:**

| Module | Read Permission | Write Permission | Notes |
|--------|----------------|-----------------|-------|
| Patient | `patient:read` | `patient:create`, `patient:update` | Create and update are separate |
| Clinical | `clinical:read` | `clinical:write` | Records, screening, imaging |
| Appointment | `appointment:read` | `appointment:write` | Check-in, status changes |
| Pharmacy | `pharmacy:read` | `pharmacy:write` | Items, sales, invoices |
| Optics | `optics:read` | `optics:write` | Optics items, sales |
| Surgery | `surgery:read` | `surgery:write` | All surgery operations |
| Diagnostics | `diagnostics:read` | `diagnostics:order`, `diagnostics:write`, `diagnostics:results`, `diagnostics:catalog` | Granular: ordering vs. results vs. catalog management |
| Warehouse | `warehouse:read` | `warehouse:write` | Generic inventory |
| Inventory | `inventory:read` | `inventory:write` | Hospital supplies POS |
| Purchase | `purchase:read` | `purchase:write` | Requisitions, POs |
| Approval | `approval:read` | `approval:write` | PO approval workflow |
| Accounting | `accounting:read` | `accounting:write` | Transactions, expenses, shifts |
| HR | `hr:read` | `hr:write` | Employees, payroll, attendance |
| Admin | `admin:users`, `admin:rbac` | | User and role management |
| Ward | `ward:read` | `ward:write` | Beds, vitals, rounds |
| Preop | `preoperative:read` | `preoperative:write` | Pre-op workflow |
| Optic Lab | `optic_lab:read` | `optic_lab:write` | Glass-making jobs |
| Asset | `asset:read` | `asset:write` | Fixed assets |
| Pricing | `pricing:read` | `pricing:write` | Fee configuration |
| Notification | `notification:read` | | Read-only, write via service |

**Default Roles (17 built-in):**

| Role | Key Permissions |
|------|----------------|
| Super Admin | ALL permissions |
| Doctor | patient:read/create, clinical:read/write, appointment:read/write, surgery:read, diagnostics:read/order, preop:read/write, ward:read |
| Nurse | patient:read, clinical:read, appointment:read/write, ward:read/write |
| Receptionist | patient:read/create/update, appointment:read/write, accounting:read, preop:read |
| Pharmacist | patient:read, clinical:read, pharmacy:read/write |
| Optician | patient:read, optics:read/write |
| Accountant | accounting:read/write, preop:read |
| HR Manager | hr:read/write |
| Lab Technician | patient:read, diagnostics:read/write/results |
| Lab Admin | patient:read, diagnostics:read/order/write/results/catalog |
| Inventory Manager | inventory:read/write, pharmacy:read/write, optics:read/write, warehouse:read/write, purchase:read, asset:read |
| Procurement Manager | purchase:read/write, pharmacy:read, optics:read, inventory:read, warehouse:read |
| Hospital Director | purchase:read, approval:read/write, accounting:read |
| CFO | purchase:read, approval:read/write, accounting:read/write, asset:read/write |
| CEO | purchase:read, approval:read/write, accounting:read/write, asset:read/write |
| Optic Lab | patient:read, optic_lab:read/write |
| PreOp Office | patient:read, clinical:read, appointment:read/write, preop:read/write, ward:read/write, surgery:read/write |

### 4.3 Audit Trail

Every significant state change is logged via `AuditLog` records through the `auditMiddleware`. The audit log captures:
- `userId` -- who performed the action
- `action` -- e.g., "CHECK_IN", "CREATE_REFERRAL", "CLOSE_SHIFT"
- `entity` -- table name
- `entityId` -- record ID
- `details` -- JSON with request metadata
- `ipAddress`

---

## Appendix: Common Patterns

### Pagination
Most list endpoints support cursor-free pagination:
```
GET /patients?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```
Response shape: `{ patients: [...], total, page, limit, totalPages }`

### Search
Search queries use `contains` with `mode: 'insensitive'`. Minimum 2 characters required. Common pattern:
```typescript
where.OR = [
  { fullName: { contains: q, mode: 'insensitive' } },
  { mrn: { contains: q, mode: 'insensitive' } },
  { phone: { contains: q } },
];
```

### Soft Deletion
Most models use `is_deleted` boolean rather than hard deletes. Operations filter on `is_deleted: false`. Notable exceptions: `Expense` and `Bed` use hard deletes.

### Shift Auto-Creation
Many payment endpoints auto-create a `Shift` if none is open:
```typescript
let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
if (!shift) shift = await prisma.shift.create({ data: { userId: req.user!.id } });
```

### Error Codes
Custom error classes: `UnauthorizedError` (401), `ForbiddenError` (403), `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409).
