# Phase 19 — Revenue Cycle Management

**Date:** 2026-07-20
**Status:** Ready for Tech Lead
**Complexity:** XL
**Estimated Tasks:** 28

---

## 1. Phase Goal

Transform the current billing/accounting module into a complete Revenue Cycle Management (RCM) system — patient payment plans, full insurance lifecycle, AR management, denial appeals, and real payment gateway integration. All patient-facing documents in Arabic. Multi-currency support for Middle East markets (SDG, SAR, AED, EGP, USD).

---

## 2. What Already Exists vs What's Needed

| Component | Exists? | Details |
|-----------|---------|---------|
| Invoice creation with line items | ✅ | `Invoice` + `InvoiceItem` models, CRUD, partial payment tracking |
| Payment recording | ✅ | `Transaction` model (CASH, CARD, INSURANCE, BANK_TRANSFER) |
| Insurance claim lifecycle | ✅ | DRAFT → SUBMITTED → APPROVED/REJECTED → SETTLED → CLOSED |
| Claim dashboard & aging | ✅ | 4-bucket aging, rejection rate, total amounts |
| Insurance pricing rules | ✅ | Per-company standard vs. insurance pricing at POS |
| Pre-authorization | ✅ | Full lifecycle with approval/rejection |
| Insurance settlement | ✅ | Payment recording per claim, partial settlement |
| Shift/cash management | ✅ | Denominations, open/close, cash movements |
| Patient self-pay (portal) | ✅ | View invoices, pay via mock card input |
| General ledger | ✅ | Chart of accounts, journal entries, balance sheet, P&L |
| Supplier AP | ✅ | Supplier invoices, payment recording |
| **Patient statements** | ❌ | No periodic billing statement generation |
| **Payment plans** | ❌ | No installment model, no recurring payments |
| **AR aging (patient)** | ❌ | Insurance aging exists, patient AR is a gap |
| **DSO / collection rate KPIs** | ❌ | No revenue cycle performance metrics |
| **Bad debt / write-offs** | ❌ | No write-off workflow or bad debt tracking |
| **Refunds / credit memos** | ❌ | No invoice voiding, no refund processing |
| **Denial appeal workflow** | ❌ | Rejected claims can only be closed — no appeal/rebill |
| **Coordination of Benefits** | ❌ | No secondary/tertiary payer logic |
| **Real payment gateway** | ❌ | Mock card payment only (`Math.random()`) |
| **Multi-currency** | ❌ | All prices hardcoded to SDG |
| **Arabic billing documents** | ❌ | Only UI has Arabic (Phase 16), billing PDFs are in English |
| **Automated charge capture** | ❌ | No CPT/ICD-10-driven charge generation from encounters |

---

## 3. Gap Analysis

### Revenue Leakage Gaps (Directly Impact Cash Flow)

1. **No payment plans** — patients can't spread large bills, leading to higher bad debt
2. **No patient statements** — no systematic follow-up on outstanding balances
3. **No automated charge capture** — clinic staff must manually create charges, items get missed
4. **No denial appeal workflow** — rejected insurance claims sit in closed state, recoverable revenue is lost
5. **No coordination of benefits** — secondary insurance revenue is never billed

### Operational Efficiency Gaps

6. **No AR aging dashboard** — no consolidated view of who owes what and how overdue
7. **No DSO / net collection rate metrics** — can't measure RCM performance
8. **No bad debt tracking** — write-offs happen invisibly, no trending
9. **No credit memo / refund workflow** — billing errors require manual compensating transactions
10. **Mock payment gateway** — patient portal cannot process real payments

### Market Readiness Gaps

11. **Single currency (SDG)** — can't deploy in Saudi, UAE, Egypt without rework
12. **English-only billing documents** — Middle East patients expect Arabic invoices and statements
13. **No Tap payment gateway** — Tap is the dominant regional payment processor

---

## 4. Tasks

| # | Task | File Paths | Complexity | Dependencies | Owner |
|---|------|-----------|------------|--------------|-------|
| | **Patient Payments & AR** | | | | |
| 1 | PaymentPlan model + CRUD endpoints | `prisma/schema.prisma`, `backend/src/modules/accounting/routes/paymentPlans.routes.ts` | L | None | Sr Dev |
| 2 | Payment plan frontend (create, manage, patient view) | `frontend/src/features/accounting/PaymentPlanPage.jsx` | M | Task 1 | Jr Dev |
| 3 | Auto-payment draft engine (cron/worker for scheduled installments) | `backend/src/modules/accounting/paymentPlan.job.ts` | M | Task 1 | Sr Dev |
| 4 | Patient AR aging report (all outstanding invoices per patient, 4 aging buckets) | `backend/src/modules/accounting/routes/arAging.routes.ts`, frontend component | M | None | Sr Dev |
| 5 | AR aging dashboard frontend | `frontend/src/features/accounting/ARAgingDashboard.jsx` | M | Task 4 | Jr Dev |
| 6 | DSO, net collection rate, clean claim rate KPIs | Backend endpoint + frontend KPI cards in accounting dashboard | M | Task 4 | Sr Dev |
| 7 | Patient statement generation (PDF, HTML email template) | `backend/src/modules/accounting/routes/statements.routes.ts`, `backend/src/utils/pdf/statement.ts` | L | Task 4 | Jr Dev |
| 8 | Patient statement auto-send (email/SMS) via notification queue | `backend/src/modules/accounting/statement.job.ts` | M | Tasks 7, 27 | DevOps |
| | **Billing Corrections & Write-offs** | | | | |
| 9 | Invoice void/credit memo model + endpoints | `prisma/schema.prisma`, `backend/src/modules/accounting/routes/creditMemos.routes.ts` | M | None | Sr Dev |
| 10 | Credit memo frontend (create from invoice, apply to other invoices) | `frontend/src/features/accounting/InvoicePage.jsx` (enhanced) | M | Task 9 | Jr Dev |
| 11 | Refund processing endpoint (reverse transaction + journal entry) | `backend/src/modules/accounting/routes/refunds.routes.ts` | M | Task 9 | Sr Dev |
| 12 | Bad debt write-off workflow + tracking | `backend/src/modules/accounting/routes/writeoffs.routes.ts`, `prisma/schema.prisma` | M | Task 9 | Sr Dev |
| | **Denial Management** | | | | |
| 13 | Denial appeal workflow (appeal status, corrected claim rebill, timeline) | `backend/src/modules/insurance/routes/denialAppeal.routes.ts`, `prisma/schema.prisma` | M | None | Sr Dev |
| 14 | Denial reason taxonomy (coded reasons, not free-text) | seed data, update InsuranceClaim model | S | Task 13 | Jr Dev |
| 15 | Denial appeal frontend (appeal form, timeline view, resubmit) | `frontend/src/features/insurance/ClaimDetail.jsx` (enhanced) | M | Task 13 | Jr Dev |
| 16 | Denial trend analysis (time-series chart by reason, by payer) | `frontend/src/features/insurance/InsuranceReportsPage.jsx` (enhanced) | M | Task 13 | Jr Dev |
| | **Coordination of Benefits** | | | | |
| 17 | Secondary/tertiary policy ordering on InsurancePolicy | `prisma/schema.prisma` (add `coordinationOrder`), backend logic | M | None | Sr Dev |
| 18 | COB adjudication engine (primary payment → secondary residual) | `backend/src/modules/insurance/utils/cobEngine.ts` | L | Task 17 | Sr Dev |
| 19 | COB claim generation (auto-create secondary claim from primary settlement) | `backend/src/modules/insurance/routes/insuranceClaim.routes.ts` (enhanced) | M | Task 18 | Sr Dev |
| 20 | COB frontend (policy ordering UI, multi-payer claim display) | `frontend/src/features/insurance/InsurancePage.jsx` (enhanced) | M | Task 17 | Jr Dev |
| | **Payment Gateway & Multi-Currency** | | | | |
| 21 | Tap payment gateway integration (charge, refund, webhook) | `backend/src/modules/patient-portal/services/tapPayment.ts`, `backend/src/config/index.ts` | L | None | Sr Dev |
| 22 | Multi-currency support: currency field on ServiceItem + Invoice, conversion rate table | `prisma/schema.prisma`, `backend/src/modules/accounting/utils/currency.ts` | M | None | Sr Dev |
| 23 | Currency selector in POS and portal (user-selectable) | `frontend/src/components/ui/CurrencySelect.jsx`, integrate across all billing UIs | M | Task 22 | Jr Dev |
| 24 | Real payment flow in patient portal (replace mock) | `frontend/src/features/patient-portal/BillingPage.jsx` | M | Task 21 | Jr Dev |
| | **Arabic Billing Documents** | | | | |
| 25 | Arabic invoice/statement PDF template | `backend/src/utils/pdf/invoiceAr.ts`, `backend/src/utils/pdf/statementAr.ts` | M | Task 7 | Jr Dev |
| 26 | Arabic receipt template + print function | `frontend/src/lib/printReceipt.js` (enhance with `lang='ar'` param) | M | None | Jr Dev |
| | **Infrastructure** | | | | |
| 27 | Background job queue for statement sending, payment plan auto-draft, denial reminders | `backend/src/workers/`, `docker-compose.yml` (Redis), BullMQ setup | L | None | DevOps |
| 28 | Tap webhook handler + idempotency key processing | `backend/src/modules/patient-portal/routes/tapWebhook.routes.ts` | M | Task 21 | Sr Dev |

---

## 5. Acceptance Criteria

### Patient Payments & AR
- [ ] Payment plans can be created with any number of installments, auto-generate transactions on schedule
- [ ] Missed installment triggers notification to patient
- [ ] Patient AR aging dashboard shows all outstanding patient balances in 4 buckets (0-30, 31-60, 61-90, 90+)
- [ ] DSO metric displayed on accounting dashboard, updated daily
- [ ] Net collection rate calculated (total payments / total charges after contractual adjustments)
- [ ] Patient statements generated as downloadable PDF, grouped by visit or by period

### Billing Corrections
- [ ] Invoice can be voided (must be fully unpaid; creates reversing journal entry)
- [ ] Credit memo can be created and applied to any open invoice
- [ ] Refund processing creates an offsetting transaction and journal entry
- [ ] Bad debt write-off creates audit trail, can track write-off reason and amount over time

### Denial Management
- [ ] Rejected claims can be appealed with reason, corrected claim file, and supporting notes
- [ ] Appeal has status tracking: OPEN → IN_REVIEW → RESUBMITTED → APPROVED / DENIED
- [ ] Denial reason taxonomy (at least 20 coded reasons mapped from common Middle East payer codes)
- [ ] Denial rate trend chart by month, by payer, by reason

### Coordination of Benefits
- [ ] Patient can have multiple insurance policies with explicit ordering (primary → secondary → tertiary)
- [ ] Secondary claim is auto-generated when primary claim is settled
- [ ] Secondary claim amount is calculated as residual (total - primary paid)
- [ ] Portal displays all insurance coverage for the patient

### Payment Gateway & Multi-Currency
- [ ] Tap payment gateway processes real transactions in sandbox mode
- [ ] Webhook handler idempotently processes payment confirmations and failures
- [ ] Currency selection available in POS checkout, invoice creation, and portal billing
- [ ] Supported currencies: SDG, SAR, AED, EGP, USD — configurable per hospital
- [ ] All monetary amounts display in selected currency with proper formatting

### Arabic Documents
- [ ] Invoices render in Arabic when hospital locale is Arabic (RTL text, Arabic labels, Hijri date optional)
- [ ] Payment plan agreements generated in Arabic
- [ ] Receipt prints in Arabic with proper RTL layout
- [ ] Statements sent in patient's preferred language

### Infrastructure
- [ ] Background worker processes statement delivery (email/SMS) reliably
- [ ] Payment plan auto-draft runs daily and processes due installments
- [ ] Denial reminder escalates stale appeals (>30 days without update)
- [ ] Tap webhook idempotent: duplicate events don't produce duplicate transactions
- [ ] `tsc --noEmit` zero errors on both projects
- [ ] i18n parity: all new UI labels have en + ar keys

---

## 6. Work Split

### Sr Dev (Complex / Architectural)
- Task 1: PaymentPlan model + CRUD
- Task 3: Auto-payment draft engine
- Task 4: AR aging backend
- Task 9: Invoice void/credit memo model
- Task 11: Refund processing
- Task 12: Bad debt write-off
- Task 13: Denial appeal workflow
- Task 17: COB policy ordering + adjudication engine
- Task 18: COB engine
- Task 21: Tap payment gateway integration
- Task 22: Multi-currency backend
- Task 28: Tap webhook handler

### Jr Dev (UI / Templates / Repetitive)
- Task 2: Payment plan frontend
- Task 5: AR aging dashboard
- Task 7: Patient statement PDF generation
- Task 10: Credit memo frontend
- Task 14: Denial reason taxonomy seed data
- Task 15: Denial appeal frontend
- Task 16: Denial trend analysis
- Task 20: COB frontend
- Task 23: Currency selector UI
- Task 24: Portal real payment flow
- Task 25: Arabic invoice/statement PDF
- Task 26: Arabic receipt

### DevOps
- Task 8: Patient statement auto-send
- Task 27: BullMQ/Redis background worker setup

---

## 7. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Tap gateway sandbox vs. production differences | Medium — integration works in test but fails in live | Medium | Extensive sandbox testing + Tap's well-documented API |
| Payment plan auto-draft fails on bank side | Medium — missed installment, unhappy patient | Medium | Retry mechanism with exponential backoff; notify patient on failure; allow manual payment |
| Multi-currency exchange rates stale | Medium — inaccurate revenue reporting | Low | Use free exchange rate API (exchangerate-api.com) updated hourly; show rate timestamp |
| COB logic complex — secondary payer rules vary | High — incorrect secondary claims | Medium | Implement only the common case (primary pays first, secondary pays residual); document limitations |
| Arabic PDF rendering issues (RTL, Arabic fonts) | Medium — garbled text | Low | Use pdfmake with embedded Arabic font (Noto Naskh Arabic); test with real Arabic text |
| Scope creep — RCM is broad | High — phase takes too long | Medium | Strictly follow 28 tasks in brief; defer non-critical items to Phase 22 or Phase 23 |

---

## 8. Key Decisions

1. **Tap as payment gateway** — dominant in Saudi/UAE; supports SDG, SAR, AED, EGP, USD. Falls back to mock if `TAP_API_KEY` is not configured.
2. **Multi-currency approach** — `currency` field on `ServiceItem` and `Invoice` with fallback to hospital default. Exchange rates fetched from free API (cache 15 min). No real-time forex — rates are snapshots at transaction time.
3. **COB scope** — primary + secondary only (no tertiary). Tertiary deferred to future.
4. **No EDI 837/835** — deferred to Phase 18 (Interop). Middle East uses different standards.
5. **Currency list per hospital** — configurable in hospital settings JSON; Super Admin sets allowed currencies.
6. **Arabic PDFs** — use `pdfmake` with Noto Naskh Arabic font embedded. LTR/RTL detection via same `isRtl()` utility from Phase 16.

---

**Estimated Complexity:** XL
**Total Tasks:** 28
**Estimated Duration:** 5–6 sprints
**Focus Roles:** Sr Dev (10 tasks), Jr Dev (13 tasks), DevOps (2 tasks)
**Next Phase:** Phase 21 — Patient Engagement & Mobility (after Phase 19)
