## 2025-09-11 — Application Wizard Pipeline, Offer/Email, Status Flow, CoE Upload

### Business Logic (authoritative summary)
- Status lifecycle (allowed transitions only):
  1) Draft → 2) Submitted → 3) AwaitingPayment → 4) Accepted → 5) Approved → 6) Rejected (terminal)
- Key rules by stage:
  - Draft: fully editable; PATCH allowed.
  - Submitted: editing locked; staff can either send/download offer and move to AwaitingPayment; can Reject.
  - AwaitingPayment: only Accept or Reject allowed; Approve is NOT allowed here.
  - Accepted: staff may Approve (finalize) or Reject; optional CoE upload at this stage (metadata stored in Storage).
  - Approved: student becomes formal; no further transitions.
  - Rejected: closed.

### Backend — Supabase Edge Functions (applications)
- Endpoints implemented/updated:
  - POST `/applications/{id}/offer-letter`: robust template loading; uploads HTML and (optional) PDF; records `sms_op.application_documents` metadata.
  - POST `/applications/{id}/send-offer`: sends via Resend, attaches PDF/HTML; transitions → AwaitingPayment; idempotency via `Idempotency-Key`.
  - POST `/applications/{id}/mark-awaiting`: transitions → AwaitingPayment without sending email (requires existing offer).
  - POST `/applications/{id}/accept`: transitions Submitted/AwaitingPayment → Accepted; idempotent (200 if already Accepted).
  - POST `/applications/{id}/approve`: now requires current status = Accepted (not Submitted). Payload optional; falls back to stored snapshots if missing.
  - GET `/applications/{id}/documents`: lists stored docs.
  - GET `/applications/{id}/offer-latest`: streams latest offer artifact (PDF preferred) for download.
  - POST `/applications/{id}/coe`: accepts PDF, stores to `student-docs/applications/{id}/coe/vYYYY-MM-DD/coe.pdf`, records metadata. Guards: 404 if app missing; 400 if not Accepted.
  - Lists: added routes `GET /applications/awaiting`, `GET /applications/accepted`, `GET /applications/rejected` and widened general filter to include these statuses.

- CORS/headers: all actions use `FUNCTIONS_URL` + `getFunctionHeaders()` from the frontend.

- Structured logs: added `logTransition()` emitting JSON for `APPLICATION_STATUS_CHANGED` and `APPLICATION_DOC_UPLOADED` with `timestamp`, `applicationId`, and context (e.g., `from`, `to`, `via`, `idempotencyKey`). Responses include `transition` details where relevant.

### Backend — Storage, templates, resilience
- Offer template resolution tries both `applications/templates/offer_letter.html` and `_shared/templates/offer_letter.html`; falls back to minimal HTML to prevent 500s.
- Storage uploads use service role and `x-upsert`; paths:
  - Offer: `student-docs/applications/{id}/offer-letter/vYYYY-MM-DD/offer.html` and `offer.pdf`.
  - CoE: `student-docs/applications/{id}/coe/vYYYY-MM-DD/coe.pdf`.

### Backend — DB & migrations
- Status CHECK updated to include: `Draft, Submitted, AwaitingPayment, Accepted, Approved, Rejected`.
- New migration to permit `application_documents.doc_type` values: `OFFER_LETTER, COE, EVIDENCE, OTHER`.
- Note: Editing older migrations does not affect existing DBs; applied a new migration per policy.

### Frontend — Wizard & Review
- Wizard Step hydration fixed across Steps 2–4; selects are controlled; USI/exemption mutually exclusive; autosave sanitizes payload (does not clobber with blanks).
- Review Step: only “Submit” is shown now. On success it best‑effort generates the offer then redirects to `students/applications` (Submitted tab).

### Frontend — Applications list & actions
- Filters/views now include: Drafts, Submitted, Awaiting Payment, Accepted, Approved, Rejected, All.
- Actions by status:
  - Submitted: “Download Offer Letter & mark as Awaiting Payment”, “Send Offer Letter & mark as Awaiting Payment”, Reject.
  - Awaiting Payment: Accept, Reject (no Approve).
  - Accepted: Upload CoE (PDF), Approve, Reject.
- All actions switched to use `FUNCTIONS_URL` and central hooks; mutations invalidate queries so tabs refresh correctly post-action.

### Email (Resend) & env
- `RESEND_API_KEY` and `EMAIL_FROM` must be set for functions runtime (e.g., `supabase/.env` or `supabase secrets`). `.env.local` is only for Next.js and is not visible to Edge Functions.

### Known safeguards & idempotency
- `send-offer` supports `Idempotency-Key`; on repeat key, no duplicate sends.
- `accept`: idempotent (returns 200 if already Accepted).
- Robust error messages for missing app (404) and invalid status (400) across critical endpoints.

### Next (Phase 10 — E2E & hardening)
- Newman suites for happy path and negative cases; Assert logs/transition details; optional correlation-id pass-through; optional funds gating (APPROVAL_REQUIRE_FUNDS off by default).

---

## 2025-01-27 — Passport Processing Feature

### Added
- **Passport Processing Feature**: Automatic data extraction from passport documents using Mindee API
  - Auto-detection of passport files during upload (filename contains "passport")
  - Automatic form field population with extracted data
  - Visual feedback with emoji indicators (✅) for auto-filled fields
  - Country code mapping for nationality and issuing country conversion
  - Graceful error handling and partial data extraction
  - New `/passport-process` API endpoint with comprehensive OpenAPI specification

### Backend — Supabase Edge Functions
- **New Function**: `passport-process/index.ts`
  - Integrates with Mindee API for passport data extraction
  - Validates extracted data format and completeness
  - Maps country codes to internal system identifiers
  - Updates application payload with extracted personal information
  - Handles CRICOS details for international students
  - Stores raw extraction data for reference

### Frontend — Document Upload & Form Integration
- **Enhanced Document Upload**: Automatic passport processing on upload
- **UI Feedback**: Success notifications and emoji indicators for auto-filled fields
- **Form Integration**: Seamless data population in Step 2 (Personal Information)
- **Error Handling**: Graceful fallback when processing fails

### API Specification
- **New Endpoint**: `POST /passport-process`
- **New Schemas**: `PassportProcessRequest`, `PassportProcessResponse`, `ExtractedPassportData`
- **Type Generation**: Updated for both frontend and backend

### Environment Configuration
- **Mindee API**: Added `MINDEE_API_KEY` and `MINDEE_MODEL_ID` to `.env.local`
- **Security**: API keys stored server-side, never exposed to client

### Data Mapping
- **Personal Details**: First name, last name, gender, date of birth
- **International Students**: Passport number, issuing country, expiry date
- **Additional Data**: Nationality, place of birth, MRZ data for verification


