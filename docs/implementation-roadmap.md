### Progress Log (Today)

- Programs UI consistency
  - Replaced native selects with ShadCN `Select` (e.g., `ProgramSelector`).
  - Standardized all buttons to ShadCN `Button` with correct variants/sizes and rounded corners.
  - Updated inputs to ShadCN components (`Input`, `Checkbox`, `Select`) across `CoursePlans`, `Offerings`, and `PaymentTemplates`.

- Payment Templates editor
  - Implemented guided editor modal (add/remove/reorder instalments with icon buttons; responsive grid; accessible labels).
  - Currency-safe amount input (string formatting, 2dp normalization, numeric storage).
  - Presets menu (50/50, Monthly ×6/×12, Fortnightly ×4) with even distribution and offsets.
  - Bulk tools: shift offsets ±7/±30 days; scale to target total (2dp rounding with remainder fix).
  - Live preview: instalment table with computed due dates (assumes enrolment date = today), shows range and totals.
  - Create Template modal polished to ShadCN; added “Make default” toggle using `Switch`.

- Backend APIs (Supabase Edge)
  - Added `PATCH /payment-plan-templates/{templateId}` to set/unset `is_default`; when setting default, unsets siblings in the same program in one transaction.
  - POST create already supports `is_default`.

- Frontend hooks/UI wiring
  - Added `useSetTemplateDefault` mutation and row action “Make default”.
  - Create Template modal passes `is_default` on create.

- OpenAPI + types
  - Updated OpenAPI: added `PATCH /payment-plan-templates/{templateId}` and `PaymentPlanTemplate` schema; POST supports `is_default` per backend.
  - Regenerated types per `docs/flow.md` (backend and frontend).

---

### XPortal Roadmap: Qualifications, Course Plans, Offerings, Wizard, Finance, Documents, CoE

This document sequences the required work so we can deliver end-to-end New Application → Offer Letter → Payment → Approval → Enrolment (+ CoE for internationals) without overwhelm. Each section lists DB, API, Frontend, and Ops.

---

## 0) Foundations already aligned
- Status machine for applications (ApplicationSubmitted → OfferGenerated → OfferSent → AwaitingPayment → EnrolmentCreated).
- Storage architecture for documents under `rto-docs` (private), metadata table, RLS (see `application-documents-architecture.md`).

---

## 1) Qualifications and Course Plans (Default Study Plans)

Backend (DB + APIs)
- `core.program_subjects` already models program↔subject with `unit_type` (Core/Elective).
- New: `core.program_course_plans` (id, program_id, name, version, is_active, created_at).
- New: `core.program_course_plan_subjects` (plan_id, subject_id, unit_type, sort_order).

- CRUD: `/programs/{programId}/course-plans` (list/create/update/activate)
- GET: `/programs/{programId}/course-plans/{planId}/subjects`

Frontend (UI + Hooks)
- Programs → “Course Plans” tab: manage default plans, versions, and subjects (core locked, electives selectable subset).
- Wizard Step 3: dropdown to pick course plan; “Custom course plan” checkbox reveals subject selectors (pre-populated from selected plan).

Ops
- Seed one default plan per active program using current `program_subjects` as baseline.

---

## 2) Course Offerings with Rolling Intake

Backend (DB + APIs)
- `sms_op.course_offerings` exists. Add columns:
  - `is_rolling boolean NOT NULL DEFAULT false`
  - Optional `default_plan_id uuid REFERENCES core.program_course_plans(id)`

- CRUD: `/programs/{programId}/offerings` supports `is_rolling` and optional `default_plan_id`.

Frontend (UI + Hooks)
- Course Offerings page: manage offerings, toggle Rolling Intake; if rolling, hide fixed dates when not applicable.
- Wizard Step 3: dropdown of offerings; “Custom offering” checkbox enables start/end date inputs.

---

## 3) Payment Plan Templates and Enrolment Derivation

Backend (DB + APIs)
- `sms_op.payment_plans` currently enrolment-scoped. Add templates:
  - `sms_op.payment_plan_templates` (id, program_id, name, is_default, created_at)
  - `sms_op.payment_plan_template_instalments` (id, template_id, description, amount, offset_days, sort_order)

- CRUD: `/programs/{programId}/payment-plan-templates` and `/{templateId}/instalments`
- Derivation endpoint: `/applications/{id}/derive-payment-plan` returns a concrete schedule from selected template (accounts for start date).

Frontend (UI + Hooks)
- Courses (Programs) page: “Payment Plans” tab to define templates; every program must have ‘Full upfront’ default.
- Wizard Step 5: replace “payment method” with “Payment plan” select. Show schedule preview. “Custom payment plan” checkbox launches mini-builder (same schema as templates) for this application.

Notes
- Approval checks “first instalment due at day 0” amount as the payment gating threshold.

---

## 4) Documents and Offer Letters

Backend (DB + APIs + Renderer)
- `sms_op.application_documents` (metadata) and application status columns (offer_letter_url, offer_* timestamps).

- Documents: list/signed-upload/confirm/delete.
- Offer Letter: `POST /applications/{id}/offer-letter` (render + store), `POST /applications/{id}/send-offer` (email + log).

Frontend (UI + Hooks)
- Wizard Step 1: dropzone with list, delete, progress; Offer Letter appears after generation.

Renderer Choice
- Prefer HTML+CSS templates + headless Chromium (e.g., Gotenberg) or SaaS renderer. Record `template_version` on each artifact.

---

## 5) Approval, Enrolment, and CoE

Backend (DB + APIs)
- No new tables required beyond statuses; ensure `cricos.confirmations_of_enrolment` used at approval for international students.

- `POST /applications/{id}/approve` (preconditions: OfferSent, cleared funds >= first instalment)
  - Creates enrolment (+ enrolment_subjects snapshot from plan or custom)
  - International: creates CoE (PRISMS), stores payload/artifacts; CoE.status=Issued
  - Sets application → EnrolmentCreated and links IDs

Frontend (UI + Hooks)
- Admin Approval screen shows payment gating and renders success path (domestic vs international with CoE info).

---

## 6) OpenAPI and Types
- Update `openapi.yaml` with new resources and statuses.
- Regenerate types for backend and frontend per `docs/flow.md`.

---

## 7) Wizard UX Corrections
- Step 3: plan selection + custom toggle; offering selection + custom dates when needed.
- Step 5: remove payment method; add plan/template select; show derived schedule; optional custom builder.

Accessibility
- Ensure all controls have labels/aria, keyboard navigation, and live regions for async states.

---

## 8) Security, RLS, and Auditing
- RLS on `application_documents` and future program-level plan/template tables (read/write by roles).
- Email logs for offer letter sending (messageId, recipients, sentAt).
- State transition guards with 409/412 errors and idempotency keys for generating/sending offer letters.

Logging/Observability
- Add structured logs for render errors, email failures, and state transitions.
- Emit metrics counters (functions invoked, PDFs generated, email sent success/failure) for dashboards later.

---

## 9) Testing Plan
- Contract tests for new endpoints.
- E2E: wizard happy path with default plan; custom plan; rolling intake custom dates; payment gating and approval (domestic/international).
- PDF baseline checksum or visual acceptance for templates.

---

## Sequencing (Minimal viable increments)
1) DB: program_course_plans + plan_subjects; offerings: is_rolling; application_documents + app columns/statuses. [DONE: plans, offerings]
2) API/Spec: course plans/offerings/payment templates paths in OpenAPI; typegen backend+frontend. [DONE]
3) Implement offerings CRUD (create/list/update/delete). [DONE]
4) Implement course plans CRUD (+ subjects). [DONE]
5) DB: payment plan templates + instalments; implement CRUD + derive endpoint. [DONE]
6) **Programs Admin UI** - Complete rebuild with ShadCN components and applications page design patterns. [DONE]
7) **UI Consistency** - All buttons, forms, and components now use proper ShadCN styling. [DONE]
8) **Authentication Issues** - Fixed 401 errors and environment variable configuration. [DONE]
9) Frontend: wizard Step 1 dropzone; Step 3 plan selection + custom; Step 3 custom offering. [PENDING]
10) Payment plan templates UI and Step 5 integration replacing payment method. [PENDING]
11) Offer letter generation + send; wire status transitions. [PENDING]
12) Approve flow with payment gating and CoE issuance. [PENDING]
13) E2E tests. [PENDING]

---

## Detailed Task Checklists (Backend)

- [x] Migrations: `core.program_course_plans`, `core.program_course_plan_subjects`
- [x] Migrations: `sms_op.course_offerings.is_rolling`, `default_plan_id`
- [x] Migrations: `sms_op.payment_plan_templates`, `sms_op.payment_plan_template_instalments`
- [ ] Migrations: `sms_op.application_documents` and application columns + statuses
- [x] RLS policies for new tables + seeds (default plans, "Full upfront")
- [x] Edge: course plans CRUD + subjects
- [x] Edge: offerings CRUD with rolling intake
- [x] Edge: payment plan templates CRUD + derive endpoint
- [ ] Edge: documents list/upload-url/confirm/delete
- [ ] Edge: offer-letter render/store + send email endpoints
- [ ] Edge: approve endpoint with payment gating and CoE issuance
- [x] OpenAPI updated for all routes, errors; typegen in backend+frontend
- [x] **Fixed 401 authentication issues** - Environment variables and auth headers properly configured
- [x] Dev posture: RLS disabled for development on new program/finance tables
- [x] Seeds: default course plan per program; default "Full upfront" payment template
- [x] Edge functions structured with shared handler/db/utils/validators modules
- [x] Smoke-test function to validate deployment/runtime
- [x] Local workflows verified: `supabase db reset`, `.env.local` loading, anon/service keys

## Detailed Task Checklists (Frontend)

- [x] **Programs → Course Plans tab** (list/create/edit/activate) - Complete with ShadCN UI
- [x] **Course Offerings page** with rolling toggle and default plan linkage - Complete with ShadCN UI
- [x] **Payment Plan Templates UI** - Complete with ShadCN UI and proper form controls
- [x] **Programs page complete rebuild** - Following applications page design patterns
- [x] **UI consistency fixes** - All components now use ShadCN components with proper styling
- [x] **Hooks: useCoursePlans, useOfferings, usePaymentPlanTemplates** - All implemented and working
- [ ] Wizard Step 1: documents dropzone (upload, list, delete)
- [ ] Wizard Step 3: plan selector + custom plan toggle and editor
- [ ] Wizard Step 3: offering selector + custom dates toggle
- [ ] Wizard Step 5: payment plan templates selector, schedule preview, custom builder
- [ ] Offer letter generate + send actions (post-submit admin or right after ApplicationSubmitted per flow)
- [ ] Admin approval screen: payment gating, success flows (domestic/international)
- [ ] Hooks: useApplicationDocuments, useOfferLetters
- [ ] Accessibility: labels/aria, keyboard, live regions



What I recommend (systematic, lowest rework)
Contracts-first at each phase: update OpenAPI first, then write migrations aligned to the spec, then minimal endpoints, then frontend hooks/UI. Repeat per domain slice.
Order of domains (with rationale)
1) Programs/Course Plans/Offerings
Step 3 depends on default study plans and offerings (including rolling intake).
Payment scheduling needs start/end and plan defaults.
Deliverables: program_course_plans (+ subjects), offerings.is_rolling (+ default_plan_id), CRUD APIs, Step 3 UI.
2) Finance: Payment Plan Templates
Approval/CoE is gated by first-instalment paid; that requires template-derived schedules.
Deliverables: payment_plan_templates (+ instalments), derive endpoint, Step 5 replaces “payment method” with template selection and custom builder.
3) Documents + Storage
Users need to upload evidence early; offer letter will live here too.
Deliverables: application_documents table + RLS, storage endpoints (upload-url/confirm/list/delete), Step 1 dropzone.
4) Offer Letter Generation/Send
Now we have program/plan/fees and organization/agent context to render letters correctly.
Deliverables: HTML+CSS template + Gotenberg integration, POST /offer-letter, POST /send-offer, status transitions.
5) Approval + CoE (International only)
Finalize once payment gating and letter flows exist.
Deliverables: POST /approve with payment checks, enrolment creation, CoE issuance + storage, status transitions.
Why not do finance first?
Templates depend on catalog semantics (plan, offering dates). Doing finance first risks rework when catalog finalizes.
Why not do offer letters first?
Content depends on catalog and finance values; you’d create mocks and refactor later. Waste.
Why not do CoE first?
CoE issuance preconditions (payment, enrolment creation, data payload) rely on prior phases.
Actionable next steps (do now)
Update OpenAPI for Phase 1 (course plans + offerings) and Phase 2 (payment templates) only.
Write migrations for those two phases.
Implement minimal endpoints and seed defaults.
Wire Step 3 (plans/offering + custom toggles) and Step 5 (payment template + custom builder).
Then proceed to documents/offer letter; finally approval/CoE.