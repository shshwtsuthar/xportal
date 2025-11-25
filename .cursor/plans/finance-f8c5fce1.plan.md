<!-- f8c5fce1-6737-4912-b0ed-eb5dd1d748e8 74e7fa8c-a7ac-48a7-ad9d-be192c6f8ceb -->
# Finance & Invoicing Redesign (Lines, Lifecycle, Xero Sync)

## Overview & Architecture Evaluation

- **Current strengths**:
  - Database-driven design (RPCs like `record_payment`, `promote_scheduled_invoices`) and clear tables for `invoices`, `payments`, `payment_plan_templates`, and Xero sync metadata.
  - Edge functions (`approve-application`, `daily-finance-tick`, `xero-sync-*`) encapsulate cross-cutting concerns (PDF, email, Xero) and keep the app router relatively thin.
  - One invoice per installment is simple to reason about and already aligns with Xero's ACCREC invoice model.
- **Current issues to fix**:
  - **Status semantics are loose**: `SENT` is set in multiple ways (on creation for first invoice, via `promote_scheduled_invoices` based on due_date), but not tied strictly to “PDF generated + email sent”.
  - **Sending is due_date-driven, not issue_date-driven**, and is partially duplicated: DB RPC promotes by due_date window, while `daily-finance-tick` emails based on `due_date = today` regardless of status.
  - **Payments mix internal vs Xero-confirmed state**: invoices are marked `PAID` purely from internal payments; Xero sync is best-effort and not reflected cleanly in invoice-level semantics.
  - **No line-level structure**: invoices and installments are single-amount entities, limiting future commission logic and Xero line-item fidelity.
- **High-level goals of the redesign**:
  - Make `SENT` a **strong, verifiable state**: invoice is SENT only when PDF is generated and email has successfully been queued/sent.
  - Base sending strictly on **`issue_date`**, not due_date or fuzzy windows, and drive Xero invoice sync solely from `SENT`.
  - Introduce **line-level modelling** under installments and invoices (with per-line Xero mapping and commissionability).
  - Separate **internal payment state** from **Xero-confirmed state** so `PAID` can be defined as “confirmed in Xero”, while still exposing internal progress.
  - Make payment sync to Xero **explicit and human-controlled** via a Payment Confirmations UI instead of automatic sync on `record_payment`.

## Target Domain Model Changes

### 1. Payment Plan Templates → Installments → Lines

- **Extend schema** to introduce a new `payment_plan_template_installment_lines` table:
  - Suggested columns:
    - `id` (uuid, PK, default `uuid_generate_v4()`).
    - `installment_id` (FK to `payment_plan_template_installments.id`, ON DELETE CASCADE).
    - `name` (text, required) – short label for the line.
    - `description` (text, nullable) – optional detailed description.
    - `amount_cents` (int, required).
    - `sequence_order` (int, required, default 0) – order lines appear in invoices.
    - `is_commissionable` (boolean, default false).
    - `xero_account_code` (text, nullable, overrides template default when set).
    - `xero_tax_type` (text, nullable, overrides template default when set).
    - `xero_item_code` (text, nullable).
  - **Invariant** (enforced by code, optionally DB constraint later): for each installment, `installment.amount_cents` should equal `SUM(lines.amount_cents)`.
- **Template semantics** after change:
  - Payment plan template defines **installments** (timing + aggregate amounts) and **lines** nested under each installment.
  - Existing code reading `payment_plan_template_installments.amount_cents` remains valid; new code should ensure line sums are consistent whenever installments are edited.

### 2. Invoice-Level Lines (`invoice_lines`)

- **Introduce an `invoice_lines` table** capturing a snapshot of template lines at the moment of invoice creation:
  - Suggested columns:
    - `id` (uuid PK).
    - `invoice_id` (FK to `invoices.id` ON DELETE CASCADE).
    - `name` (text) – copied from template line.
    - `description` (text, nullable).
    - `amount_cents` (int).
    - `sequence_order` (int).
    - `is_commissionable` (boolean).
    - `xero_account_code` (text, nullable).
    - `xero_tax_type` (text, nullable).
    - `xero_item_code` (text, nullable).
  - **Behaviour**:
    - On invoice creation, lines are **copied** from the relevant installment's template lines (or from a snapshot if/when you introduce an explicit `application_payment_schedule_lines` snapshot).
    - Once created, `invoice_lines` are **immutable** for accounting integrity; if something changes, a credit + new invoice should be issued rather than mutating lines.
  - **Invariant**: `invoices.amount_due_cents` must equal `SUM(invoice_lines.amount_cents)` for that invoice.

### 3. Invoice & Payment Statuses (Internal vs Xero-Confirmed)

- **Keep the existing `invoices.status` enum** for customer-facing lifecycle:
  - Primary states: `SCHEDULED`, `SENT`, `OVERDUE`, `VOID`, `PAID` (plus `DRAFT` only if used explicitly).
  - Redefine semantics:
    - `SCHEDULED`: invoice exists but has **not yet been sent**; `issue_date` is in future or today, `pdf_path` may be null.
    - `SENT`: system has successfully generated a PDF and sent the invoice email at least once; invoice is now visible/committed to the student and Xero-eligible.
    - `OVERDUE`: invoice is `SENT`, not confirmed as fully paid, and `current_date > due_date`.
    - `PAID`: invoice is **fully paid and confirmed in Xero**, per the internal/Xero sync logic below.
    - `VOID`: invoice cancelled/invalid; never synced or reversed appropriately.
- **Add a separate internal payment status column**, e.g. `invoices.internal_payment_status`:
  - Enum `internal_payment_status` with values:
    - `UNPAID`
    - `PARTIALLY_PAID`
    - `PAID_INTERNAL` (fully covered by internal payments, regardless of Xero)
    - `PAID_CONFIRMED` (internal payments recorded AND corresponding payments confirmed in Xero)
  - **Semantics**:
    - `record_payment` mutates `amount_paid_cents` and **internal_payment_status** only.
    - A separate confirmation/Xero-sync step can elevate `internal_payment_status` from `PAID_INTERNAL` to `PAID_CONFIRMED`.
    - A small mapping decides when to flip `invoices.status` to `PAID` (e.g. when `internal_payment_status = 'PAID_CONFIRMED'`).

### 4. Payments & Xero Sync Flags

- Continue using the `payments` table with these Xero metadata columns:
  - `xero_payment_id`, `xero_sync_status`, `xero_sync_error`, `xero_synced_at`.
- Define **crisp semantics**:
  - `xero_sync_status = 'pending'` (or null) → recorded internally, not yet confirmed in Xero.
  - `xero_sync_status = 'synced'` → payment successfully created in Xero.
  - `xero_sync_status = 'failed'` → last attempt failed; may be retried.
- Use payment-level sync status plus the invoice's `amount_paid_cents` to derive `internal_payment_status` and, when all covering payments are synced, mark `internal_payment_status = 'PAID_CONFIRMED'` and `status = 'PAID'`.

## Behaviour Changes (Invoices)

### 5. Invoice Creation on Application Approval

- **Update `approve-application` edge function** (`supabase/functions/approve-application/index.ts`):
  - **Invoice status on creation**:
    - Create **all** invoices with `status = 'SCHEDULED'` (including the first) regardless of installment index.
    - Set `issue_date` based on schedule rules:
      - Either from `application_payment_schedule.issue_date` if you later store it, or from computed anchor + offset.
      - Today you set first issue_date = today and others = due_date; in the redesign, prefer deriving `issue_date` from a clear rule, but the key is: **no invoice is `SENT` at creation**.
  - **Invoice amount & lines**:
    - When snapshot exists and you still get only `amount_cents` + `due_date`, treat that as the aggregate, but for new templates you will define lines under installments.
    - For each installment → for each template line:
      - Insert an invoice record (as today) with aggregate `amount_due_cents = SUM(lines.amount_cents)`.
      - Insert corresponding `invoice_lines` rows copying fields from the template lines.
  - **Return payload** remains unchanged (`studentId`, `enrollmentId`), to keep frontend unaffected.

### 6. Sending Logic: From Issue Date to SENT + Xero Eligibility

- **Refactor/replace `promote_scheduled_invoices`**:
  - Option A (preferred): change its semantics to:
    ```sql
    UPDATE public.invoices
    SET status = 'SENT'
    WHERE status = 'SCHEDULED'
      AND issue_date <= CURRENT_DATE
      AND status <> 'VOID';
    ```


But in the redesigned system, we want to only set `SENT` **after** PDF + email succeed, so this function should instead just act as a **selector** (or be deprecated).

  - Option B (cleaner): leave `promote_scheduled_invoices` as-is for now but **stop calling it** from `daily-finance-tick`, and instead have the job itself:
    - Find all invoices where:
      - `status = 'SCHEDULED'`.
      - `issue_date <= CURRENT_DATE`.
- **Update `daily-finance-tick` (`supabase/functions/daily-finance-tick/index.ts`)** to be the **single source of truth for sending**:
  - Step 1: Query candidate invoices to send:
    - `status = 'SCHEDULED'`.
    - `issue_date <= CURRENT_DATE`.
    - `pdf_path IS NULL OR last_email_sent_at IS NULL` (to avoid repeated sending unless you explicitly want reminders).
  - Step 2: For each candidate:
    - Build a rich invoice PDF using your shared `lib/pdf/InvoiceTemplate.tsx` + `lib/pdf/buildInvoiceData.ts`, now enriched with `invoice_lines`.
    - Upload to storage bucket `invoices` with the same `{rto_id}/{year}/{invoice_number}.pdf` convention; save `pdf_path`.
  - Step 3: Email the invoice using Resend:
    - Build a clear email subject/body (can include due_date, total amount, and a summary of lines).
    - If email send succeeds:
      - Set `status = 'SENT'`.
      - Update `last_email_sent_at = now()`.
      - Optionally set `xero_sync_status = 'pending'` if you want to explicitly track readiness for Xero.
    - If email or PDF generation fails:
      - Leave invoice as `SCHEDULED` and log error; optionally set an `error` column for finance to review.
- **Adjust due-date-based behaviour**:
  - Remove the `due_date = today` gating for PDF and email; `due_date` becomes a display/overdue cutoff, not a sending trigger.
  - Add a separate step (either in the same job or a small RPC) to mark invoices `OVERDUE` when `status = 'SENT'` and `current_date > due_date`.

### 7. Xero Invoice Sync (ACCREC)

- **Keep `xero-sync-invoice` and `xero-sync-invoices-batch` as the Xero integration layer**, but update their selection criteria and payloads:
  - **Batch selection** (`xero-sync-invoices-batch`): remains `status = 'SENT'` and `xero_sync_status in (NULL, 'pending')`.
  - **Payload changes** in `xero-sync-invoice`:
    - Instead of a single line item for the whole installment, construct **one Xero LineItem per `invoice_lines` row**:
      - `Description`: from `invoice_lines.description` (fallback to `name`).
      - `Quantity`: 1.0 (unless you introduce explicit quantities later).
      - `UnitAmount`: `amount_cents / 100`.
      - `AccountCode`: `invoice_lines.xero_account_code` if set, else template default (`payment_plan_templates.xero_account_code`), else fallback `'200'`.
      - `TaxType`: from line or template if you choose to use it.
      - `ItemCode`: from `invoice_lines.xero_item_code` if present.
    - Keep invoice-level fields (Contact, Date, DueDate, Reference, Status `AUTHORISED`, Currency, InvoiceNumber) as currently implemented.
  - **When to trigger**:
    - Keep Xero sync decoupled from sending, but conceptually: once invoices are `SENT`, a scheduled `xero-sync-invoices-batch` run (or manual trigger) picks them up.

## Behaviour Changes (Payments & Confirmations)

### 8. Recording Payments Internally

- **Update the `record_payment` RPC** only for internal status handling:
  - Stop mutating `invoices.status` directly to `PAID` inside `record_payment`.
  - Instead, after updating `amount_paid_cents`, compute and set `internal_payment_status`:
    - If `amount_paid_cents = 0` → `UNPAID`.
    - If `0 < amount_paid_cents < amount_due_cents` → `PARTIALLY_PAID`.
    - If `amount_paid_cents >= amount_due_cents` → `PAID_INTERNAL`.
  - Leave `status` as `SENT`/`OVERDUE` until Xero confirmation.
- **Update `useRecordPayment` hook (`src/hooks/useRecordPayment.ts`)**:
  - Continue calling `record_payment` and returning the `paymentId`.
  - **Remove the automatic call to `xero-sync-payment`** here.
  - Make it purely an internal accounting action, invalidating relevant queries as today.

### 9. Payment Confirmations Page & Manual Xero Sync

- **New page**: `app/(app)/financial/payment-confirmations/page.tsx`.
  - Use a similar table pattern as existing `financial/invoices` pages:
    - Columns: Student, Invoice Number, Payment Date, Amount, Method, Reconciliation Notes, Xero Sync Status, Actions.
    - Data source: payments where `xero_sync_status IS NULL OR xero_sync_status = 'pending' OR xero_sync_status = 'failed'` (with filters for each state).
- **New hooks**:
  - `src/hooks/useGetUnconfirmedPayments.ts`:
    - `useQuery` fetching payments for the current RTO with `xero_sync_status IN ('pending', 'failed')`.
  - `src/hooks/useConfirmPayment.ts`:
    - `useMutation` that:

      1. Calls `xero-sync-payment` edge function with `{ paymentId }`.
      2. On success:

         - Invalidates payments queries.
         - Optionally calls a small RPC, e.g. `refresh_invoice_internal_payment_status(invoice_id)` to recompute `internal_payment_status` and, if all covering payments are synced and `amount_paid_cents >= amount_due_cents`, set `internal_payment_status = 'PAID_CONFIRMED'` and `status = 'PAID'`.

      1. On error:

         - Leaves `xero_sync_status = 'failed'` for that payment.
         - Surfaces a toast using `sonner`.
- **Edge function `xero-sync-payment`** (`supabase/functions/xero-sync-payment/index.ts`):
  - Logic largely remains the same, but now it’s only called from the **Confirm Payment** action (or future batch tools), not automatically.
  - Optional refinement: after successful sync, the function can itself call a DB helper to update `internal_payment_status` and invoice `status` to reduce client-side orchestration.

## Behaviour Changes (Commission & Reporting Hooks)

### 10. Commissionability Based on Lines

- **Short term** (within this redesign):
  - Keep any existing commission logic (e.g. `commission_invoices` and related hooks) referencing total invoice amounts for now.
  - Introduce a new helper (DB function or TypeScript util) that, given an invoice, computes:
    - `commissionable_amount_cents = SUM(invoice_lines.amount_cents WHERE is_commissionable = true)`.
    - `non_commissionable_amount_cents = SUM(invoice_lines.amount_cents WHERE is_commissionable = false)`.
  - Use this helper in any new commission logic, but avoid large refactors in this iteration.
- **Later enhancement** (recommended):
  - Refactor commission invoice generation to explicitly use `commissionable_amount_cents` from `invoice_lines` rather than installment-level flags.

## UI & Hooks Adjustments

### 11. Invoice Listing & Details UI

- **Invoices table pages** (`app/(app)/financial/invoices/...`):
  - Display new fields:
    - `status` (customer lifecycle) and `internal_payment_status` (internal/Xero state) side by side with clear badges.
    - Xero sync status for invoices (existing fields) so staff can see which SENT invoices are in Xero.
  - Optionally add filters for `status` and `internal_payment_status`.
- **Invoice details / PDF**:
  - Ensure that invoice details views (if present) fetch and display `invoice_lines` in a table.
  - PDF generation (centralized in `lib/pdf/InvoiceTemplate.tsx`) should accept a list of lines and render them as line items.

### 12. Student Page & Financial Tab

- On the student page (`app/(app)/students/[id]/page.tsx`), within the financial section:
  - Show a per-invoice breakdown including:
    - Lines table for each invoice.
    - Internal vs Xero-confirmed payment states using `internal_payment_status` and `status`.
  - Wire actions to existing hooks (`useGetStudentInvoices`, `useRecordPayment`) and the new confirmation flow.

## Implementation Order & Safety

### 13. Step-by-Step Implementation Order

1. **Schema changes (migrations)**:

   - Add `payment_plan_template_installment_lines` and `invoice_lines` tables.
   - Add `internal_payment_status` enum and column to `public.invoices`.
   - Update `record_payment` to maintain `internal_payment_status` instead of setting `status = 'PAID'`.

2. **Backend logic for invoice creation**:

   - Update `approve-application` to:
     - Create all invoices as `SCHEDULED`.
     - Create corresponding `invoice_lines` (initially 1 line per installment if you don’t yet have real template lines).
   - Ensure `amount_due_cents` matches `SUM(invoice_lines.amount_cents)`.

3. **Sending pipeline refactor**:

   - Update `daily-finance-tick` to:
     - Stop using `due_date = today` and `promote_scheduled_invoices`.
     - Use `issue_date <= today` and `status = 'SCHEDULED'` as the send condition.
     - Generate PDFs using the shared PDF template and `invoice_lines`.
     - On success, set `status = 'SENT'` and `last_email_sent_at`.

4. **Xero invoice sync update**:

   - Update `xero-sync-invoice` to build LineItems from `invoice_lines`.
   - Keep `xero-sync-invoices-batch` batching logic but verify it only targets `SENT` invoices.

5. **Payments & confirmation flow**:

   - Remove the auto-call to `xero-sync-payment` from `useRecordPayment`.
   - Add Payment Confirmations page, `useGetUnconfirmedPayments`, and `useConfirmPayment`.
   - Optionally add a small RPC/helper to recompute invoice `internal_payment_status` + `status` on payment sync.

6. **UI enhancements**:

   - Update invoices and student financial UIs to show internal vs external payment states, line items, and Xero sync badges.

7. **Testing & validation (manual/Playwright by you)**:

   - Test the full flow: approve application → invoices + lines created → issue_date hit → PDF+email+SENT → Xero invoice sync → record payments → confirm payments → Xero payments created → statuses update.

### 14. Recommendations & Future Enhancements

- **Centralize PDF & email templates** so both manual sends and scheduled sends use the same rendering logic and avoid divergence.
- **Consider removing `DRAFT`** from invoices if you don’t have a manual “draft invoice” UI; fewer statuses = clearer mental model.
- **Add small reporting endpoints** for reconciliation (e.g. counts of invoices/payments by sync status and internal payment status) to make it easy to build lightweight admin dashboards later.
- **Introduce explicit audit tables or events** (optional) to log transitions of invoice status, internal_payment_status, and Xero sync status for compliance and debugging.

### To-dos

- [ ] Add new DB tables for payment plan installment lines and invoice_lines, plus internal_payment_status enum/column on invoices and any supporting indexes.
- [ ] Change approve-application edge function to create all invoices as SCHEDULED, compute issue_date correctly, and insert matching invoice_lines per installment.
- [ ] Refactor daily-finance-tick and related logic to send invoices based on issue_date, generate PDFs using invoice_lines, and only mark invoices SENT after successful PDF+email.
- [ ] Update xero-sync-invoice (and batch sync) to construct Xero LineItems from invoice_lines with per-line account/tax/item mapping.
- [ ] Modify record_payment and related code to maintain internal_payment_status, stop setting invoice.status = PAID, and rely on confirmation logic to mark invoices PAID.
- [ ] Implement Payment Confirmations page and hooks, remove auto xero-sync-payment from useRecordPayment, and wire Confirm Payment to xero-sync-payment and invoice status updates.
- [ ] Update invoice and student financial UIs to show line items, internal vs external payment states, and Xero sync badges.