# Phase 18 — Interoperability (HL7/FHIR R4)

**Date:** 2026-07-22
**Status:** Ready for Tech Lead
**Complexity:** XL
**Estimated Tasks:** 22

---

## 1. Phase Goal

Build a FHIR R4 compliance layer that exposes the hospital's clinical data as standard FHIR resources, enabling integration with external hospital systems, national health exchanges, and third-party applications. Also support inbound FHIR resources (external referrals, lab results) and C-CDA document generation for patient summaries.

---

## 2. What Already Exists vs What's Needed

| Component | Exists? | Details |
|-----------|---------|---------|
| Patient model | ✅ | Rich fields (MRN, name, DOB, gender, nationalId, phone, email, chronicConditions) — needs gender enum + structured name |
| Clinical records | ✅ | Vitals, symptoms, medications, ICD-10 codes — maps to Encounter, Observation, Condition, MedicationStatement |
| Lab orders/results | ✅ | DiagnosticOrder + DiagnosticOrderTest — maps to ServiceRequest, DiagnosticReport, Observation |
| Imaging orders | ✅ | ImagingOrder + files — maps to ServiceRequest, ImagingStudy |
| Surgery records | ✅ | Surgery model — maps to Procedure |
| Referrals | ✅ | Internal only — needs external referral type for FHIR ServiceRequest |
| Insurance/Claims | ✅ | InsuranceClaim + Settlement — maps to Coverage, Claim, ClaimResponse |
| Wards/Beds | ✅ | Ward + Bed models — maps to Location |
| HR/Employees | ✅ | Employee model — maps to Practitioner, PractitionerRole |
| Appointments | ✅ | Appointment model with status — maps to FHIR Appointment |
| FHIR server endpoints | ❌ | No FHIR-shaped API |
| FHIR resource mappers | ❌ | No Prisma→FHIR JSON conversion |
| C-CDA document generation | ❌ | No clinical document export |
| SMART on FHIR auth | ❌ | No FHIR-specific authentication |
| Inbound FHIR handler | ❌ | No way to receive external FHIR resources |
| Integration admin UI | ❌ | No way to manage connected systems |
| FHIR endpoint explorer | ❌ | No testing/debugging interface |

---

## 3. Gap Analysis

### Critical Gaps
1. **No FHIR endpoints** — external systems cannot query patient data, lab results, or clinical records in a standard format
2. **No C-CDA documents** — patient summaries and discharge summaries cannot be exchanged with other providers
3. **No inbound FHIR** — external referrals and lab results must be manually re-entered

### Major Gaps
4. **Patient.gender is a free String** — FHIR requires `male|female|other|unknown` enum
5. **Patient name is a single field** — FHIR requires structured name (family, given, prefix)
6. **No FHIR-specific auth** — external systems need SMART on FHIR or OAuth2 bearer tokens
7. **No integration management** — no way to register, monitor, or audit connected external systems
8. **No FHIR XML support** — some legacy systems require XML responses

---

## 4. Tasks

| # | Task | File Paths | Complexity | Dependencies | Owner |
|---|------|-----------|------------|--------------|-------|
| | **Schema & Core** | | | | |
| 1 | Add `FhirEndpoint` model (connected systems, auth config, sync status) | `prisma/schema.prisma`, migration | M | None | Sr Dev |
| 2 | Upgrade Patient.gender to enum (MALE/FEMALE/OTHER/UNKNOWN) with data migration | `prisma/schema.prisma`, migration, update all gender references | L | None | Sr Dev |
| 3 | Add `structuredName` JSON field to Patient (family, given, prefix) + auto-parse from fullName | `prisma/schema.prisma`, migration, `backend/src/utils/nameParser.ts` | M | None | Sr Dev |
| | **FHIR Server** | | | | |
| 4 | Create `/api/fhir/R4/` base router with content-type negotiation (JSON + XML) | `backend/src/modules/fhir/fhir.routes.ts`, `fhir.controller.ts` | M | None | Sr Dev |
| 5 | FHIR Patient resource (read by id/MRN, search by name/DOB/identifier) | `backend/src/modules/fhir/resources/patient.ts` | M | Tasks 2, 3 | Sr Dev |
| 6 | FHIR Encounter resource (read, search by patient/date/type) | `backend/src/modules/fhir/resources/encounter.ts` | M | Task 4 | Jr Dev |
| 7 | FHIR Observation resource (vitals + lab results, search by patient/code/date) | `backend/src/modules/fhir/resources/observation.ts` | M | Task 4 | Jr Dev |
| 8 | FHIR Condition resource (diagnoses from clinical records + ICD-10) | `backend/src/modules/fhir/resources/condition.ts` | M | Task 4 | Jr Dev |
| 9 | FHIR MedicationRequest resource (prescriptions) | `backend/src/modules/fhir/resources/medicationRequest.ts` | M | Task 4 | Jr Dev |
| 10 | FHIR ServiceRequest resource (lab/imaging orders + referrals) | `backend/src/modules/fhir/resources/serviceRequest.ts` | M | Task 4 | Jr Dev |
| 11 | FHIR DiagnosticReport resource (completed lab/imaging results) | `backend/src/modules/fhir/resources/diagnosticReport.ts` | M | Task 7 | Jr Dev |
| 12 | FHIR Appointment resource | `backend/src/modules/fhir/resources/appointment.ts` | S | Task 4 | Jr Dev |
| 13 | FHIR Procedure resource (surgery records) | `backend/src/modules/fhir/resources/procedure.ts` | S | Task 4 | Jr Dev |
| 14 | FHIR Coverage + Claim + ClaimResponse (insurance) | `backend/src/modules/fhir/resources/coverage.ts`, `claim.ts` | L | Task 4 | Sr Dev |
| 15 | FHIR Location (wards, beds, clinics) + Practitioner (doctors, nurses) | `backend/src/modules/fhir/resources/location.ts`, `practitioner.ts` | M | Task 4 | Jr Dev |
| | **Document Exchange** | | | | |
| 16 | C-CDA document generator (patient summary, discharge summary, lab results) | `backend/src/modules/fhir/utils/ccda.ts` | L | Tasks 5-8 | Sr Dev |
| 17 | Inbound FHIR resource handler (receive external referrals, lab results) | `backend/src/modules/fhir/routes/inbound.routes.ts` | L | Task 4 | Sr Dev |
| | **Auth & Security** | | | | |
| 18 | FHIR auth middleware (SMART on FHIR bearer tokens + OAuth2 introspection) | `backend/src/modules/fhir/middleware/fhirAuth.ts` | M | None | Sr Dev |
| 19 | New RBAC permissions: `fhir:read`, `fhir:write`, `integration:manage` | `backend/src/middleware/rbac.ts`, seed data | S | None | Jr Dev |
| | **Frontend** | | | | |
| 20 | Integration admin page (manage connected systems, sync logs, test endpoints) | `frontend/src/features/admin/IntegrationPage.jsx` | M | Tasks 1, 18 | Jr Dev |
| 21 | FHIR endpoint explorer (test queries, view raw FHIR JSON responses) | `frontend/src/features/admin/FhirExplorer.jsx` | M | Task 4 | Jr Dev |
| | **Infrastructure** | | | | |
| 22 | New env vars: `FHIR_SERVER_URL`, `FHIR_AUTH_MODE`, `SMART_ON_FHIR_CLIENT_ID` | `backend/src/config/index.ts`, `backend/.env.example` | S | None | DevOps |

---

## 5. Acceptance Criteria

### FHIR Server
- [ ] `GET /api/fhir/R4/Patient/:id` returns valid FHIR Patient JSON
- [ ] `GET /api/fhir/R4/Patient?name=Smith&birthdate=1990-01-01` returns matching patients
- [ ] All 12 FHIR resources return valid FHIR R4 JSON with `resourceType`, `id`, `meta.lastUpdated`
- [ ] Content-type negotiation: `Accept: application/fhir+json` (default) and `application/fhir+xml`
- [ ] FHIR OperationOutcome returned for errors (not plain JSON error messages)

### Patient Model
- [ ] Patient.gender is an enum (MALE/FEMALE/OTHER/UNKNOWN) — existing string values migrated
- [ ] Patient.structuredName contains `{ family, given, prefix }` — auto-parsed from fullName on migration
- [ ] FHIR Patient resource uses structuredName for `name[0].family` and `name[0].given`

### Document Exchange
- [ ] C-CDA patient summary generated with demographics, problems, medications, allergies, vitals
- [ ] C-CDA discharge summary generated with encounter details, diagnosis, procedures, follow-up
- [ ] External referral received via FHIR ServiceRequest creates internal referral record
- [ ] External lab result received via FHIR Observation creates DiagnosticOrderTest result

### Auth & Security
- [ ] SMART on FHIR bearer token auth works alongside existing JWT auth
- [ ] FHIR endpoints require `fhir:read` permission for GET, `fhir:write` for POST/PUT
- [ ] Connected systems registered in FhirEndpoint model with auth config

### Frontend
- [ ] Integration admin page lists connected systems with status, last sync, error count
- [ ] FHIR explorer allows testing any endpoint with custom parameters and shows raw response

---

## 6. Work Split

### Sr Dev (Complex / Architectural)
- Task 1: FhirEndpoint model
- Task 2: Patient.gender enum upgrade
- Task 3: Patient.structuredName
- Task 4: FHIR base router
- Task 5: FHIR Patient resource
- Task 14: FHIR Coverage + Claim + ClaimResponse
- Task 16: C-CDA generator
- Task 17: Inbound FHIR handler
- Task 18: FHIR auth middleware

### Jr Dev (UI / Repetitive Resources)
- Tasks 6-13, 15: FHIR resource endpoints (Encounter, Observation, Condition, MedicationRequest, ServiceRequest, DiagnosticReport, Appointment, Procedure, Location, Practitioner)
- Task 19: RBAC permissions
- Task 20: Integration admin page
- Task 21: FHIR explorer

### DevOps
- Task 22: Environment config

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| FHIR R4 spec is complex (1000+ pages) | High — implementation takes longer | High | Focus on 12 most-used resources, not full spec. Use existing FHIR JS libs (fhir.r4) for validation |
| Gender enum migration breaks existing data | High — data loss or app crashes | Medium | Write migration that maps all existing string values to enum before altering column |
| C-CDA generation complex | Medium — limited adoption in Middle East | Low | Implement basic C-CDA (patient summary only), defer full C-CDA to future |
| SMART on FHIR adds auth complexity | Medium — two auth systems to maintain | Medium | FHIR auth is a separate middleware, doesn't touch existing JWT system |
| XML support doubles response code | Medium — more maintenance | Low | JSON-first; XML via simple XSLT transform of JSON output |

---

## 8. Key Decisions

1. **FHIR R4** (not R5) — R4 is the mandatory standard for most national health exchanges. R5 is not yet widely adopted.
2. **Lightweight FHIR server** — build custom REST endpoints returning FHIR-shaped JSON. Do NOT use HAPI FHIR Server (Java, too heavy for this stack).
3. **SMART on FHIR auth** — standard for FHIR server authentication. Separate from existing JWT system.
4. **Gender enum upgrade** — breaking schema change but required for FHIR compliance. Migration maps existing values.
5. **C-CDA for document exchange** — the most widely implemented clinical document standard. FHIR DocumentReference can reference C-CDA documents.
6. **No full XDS/IHE** — document exchange via FHIR REST APIs, not XDS.b registries. XDS is too complex for initial deployment.
7. **JSON-first** — XML support via content negotiation but not the primary format.

---

**Estimated Complexity:** XL
**Total Tasks:** 22
**Estimated Duration:** 4–5 sprints
**Focus Roles:** Sr Dev (9 tasks), Jr Dev (11 tasks), DevOps (1 task)
**Next Phase:** Phase 19 — Revenue Cycle Management (or run in parallel)
