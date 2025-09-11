### New Application Pipeline: API‑First Plan (Payment Plans, Offer Letters, Storage)

- Scope
  - Replace Step 5 cards with program-scoped Payment Plan Template selection, schedule derivation, and snapshot persistence.
  - Autogenerate Offer Letter from application data; store artifacts in Supabase Storage; transition statuses accordingly.
  - Prepare for end-to-end lifecycle: Draft → Submitted → AwaitingPayment → Accepted → Approved/Enrolment → (International) CoE.
  - Implement using contracts-first per `docs/flow.md`.

### Guiding Principles
- API‑first: Update `openapi.yaml` before backend/frontend.
- Type‑safe: Regenerate types for backend (`supabase/functions/_shared/api.types.ts`) and frontend (`src/types/api.ts`).
- Immutable snapshots for finance: store `payment_schedule` and tuition/commission snapshots on application.
- Idempotency and validation on all write endpoints.
- Accessibility and predictable UX in the wizard; gating enforced at submit, not per-step.

### Target State: Lifecycle and Statuses
- Draft: created at Step 0; autosaved via PATCH.
- Submitted: POST `/applications/{id}/submit` (validates all required sections including payment plan snapshot).
- Offer Letter:
  - POST `/applications/{id}/offer-letter` → render HTML/PDF from application snapshot; write to storage; return URLs + metadata.
  - POST `/applications/{id}/send-offer` → send via email provider; on success set status `AwaitingPayment`.
- AwaitingPayment → Accepted: POST `/applications/{id}/accept` (student acceptance captured by staff or callback); status `Accepted`.
- Approval/Enrolment: POST `/applications/{id}/approve` (later gated by cleared funds ≥ day‑0 instalment if required); create enrolment and subjects; set `Approved`.
- International: CoE issuance (future phase) after approval; store artifacts in storage.

### Payment Plans: Model and Flow
- Templates
  - Program‑scoped templates with instalments (description, amount, offset_days ≥ 0, sort_order).
  - Default template per program; UI managed in Programs → Payment Templates (already implemented and fixed).
- Derivation
  - Endpoint: POST `/applications/{id}/derive-payment-plan`.
  - Request (update): `{ templateId: uuid, anchor: 'OFFER_LETTER' | 'COMMENCEMENT' | 'CUSTOM', anchorDate?: date }`.
  - Response: `{ items: [{ description, amount, dueDate }] }` with currency enforcement (2dp) and nonnegative offsets.
- Persistence on Draft
  - Application payload additions: `selected_payment_template_id`, `payment_schedule` (array), `payment_anchor`, `payment_anchor_date`, `tuition_fee_snapshot`.
  - Constraints: amounts > 0; total > 0; max instalments ≤ 24; template belongs to selected program; offsets ≥ 0.
- Submit Gating
  - At submit time, require a valid schedule snapshot and selected template.

### Offer Letter: Generation, Storage, Sending
- Data Source
  - Derived entirely from the application snapshot (personal, program, offering dates, payment schedule, organization details).
- Rendering
  - HTML+CSS templates rendered to PDF (local headless Chromium or external service). Version templates and include `template_version` metadata.
- Storage
  - Supabase Storage buckets:
    - `rto-docs` (private):
      - `applications/{applicationId}/offer-letter/{version}/offer.pdf`
      - `clients/{clientId}/...` for post‑enrolment artifacts
  - Metadata table `sms_op.application_documents` (planned): id, application_id, path, type, version, created_at.
- Endpoints
  - POST `/applications/{id}/offer-letter` → render & store; return metadata + signed URL (if needed in dev).
  - POST `/applications/{id}/send-offer` → email with link or attachment; on success set status `AwaitingPayment`.

### API Work: Incremental Plan
1) Contracts (OpenAPI)
  - Add/extend schemas:
    - Payment derive request with `anchor`, `anchorDate?`.
    - Application update payload fields for payment plan snapshot and anchors.
    - Offer letter generate/send endpoints and response shapes.
    - Accept endpoint and status semantics.
  - Document errors and validation rules (currency precision, max instalments, program-template match).
2) Types
  - Regenerate backend and frontend types per `docs/flow.md`.
3) Backend Functions
  - payment-plan-templates: extend derive handler to resolve anchor to a concrete start date.
  - applications:
    - PATCH: merge in payment fields; validate.
    - submit: enforce presence and validity of payment snapshot.
    - offer-letter: render + store + record metadata.
    - send-offer: email + set `AwaitingPayment`.
    - accept: set `Accepted`.
4) Database
  - Migration: add application columns for payment snapshot fields.
  - Migration: add `sms_op.application_documents` for storage metadata.
  - Seeds: ensure each active program has a default payment template (e.g., "Full upfront").
5) Frontend
  - Wizard Step 5:
    - Replace tuition/commission/method cards with: Template Select (program‑scoped), Anchor Select, Derived Schedule Preview.
    - On change call derive endpoint; on save write snapshot via PATCH.
  - Confirm/no custom per‑application editor (per decision); editing stays in Programs admin.
  - Submit button: call submit endpoint; then show offer generation flow.
6) Ops
  - Storage policies (RLS) for `rto-docs` private bucket.
  - Email provider configuration and secrets.
  - Local dev helpers (signed URLs) and smoke tests.

### Validation & Rules (Server‑Side)
- Currency: 2dp; reject > 2dp; numeric types in DB; normalize in code.
- Instalments: 1..24 items; each amount > 0; offsets ≥ 0; sorted by offset; total > 0.
- Template/program integrity: template.program_id must equal selected program.
- Submit preconditions: payment snapshot present and valid; other step validations via `validateFullEnrolmentPayload`.

### Edge Cases & Behaviors
- Default template changes mid‑draft: do not auto‑mutate draft. Surface a UI prompt to re‑apply default; derive again on user action.
- Offering dates change: keep payment snapshot; surface a "Re‑derive schedule" prompt; never auto‑change snapshot.
- Missing offering date with COMMENCEMENT anchor: return 400 with actionable message or require custom anchor date.

### Security & Observability
- RLS: restrict document metadata and storage paths to authorized roles.
- Logs: structured logs for derive, offer render, send, and status transitions.
- Idempotency: support `Idempotency-Key` on PATCH/submit/send operations.

### Rollout Plan (Milestones)
- M1: OpenAPI contracts for payment snapshot, derive(anchor), offer-letter generate/send, accept.
- M2: Migrations for application fields and documents table.
- M3: Backend derive(anchor) + PATCH handling + submit gating.
- M4: Wizard Step 5 UI integration (template/anchor/preview) saving snapshot.
- M5: Offer letter generation + storage + send + AwaitingPayment transition.
- M6: Acceptance endpoint + status + frontend UX.
- M7: QA: Newman collection for new endpoints; E2E happy paths; error cases.

### Out‑of‑Scope (for now)
- Discounts/scholarships, taxes/surcharges.
- Agent commission calculations and ledger entries (estimates may be shown in UI later).
- CoE issuance APIs (follow after approval phase).

### Next Actions
- Approve this plan. Then I will:
  - Draft OpenAPI changes for the endpoints/fields above.
  - Propose migration filenames and column definitions.
  - Prepare a minimal frontend wiring outline for Step 5 using the new contracts.
