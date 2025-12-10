Here’s a concise but exhaustive account of the finance gaps to fix (clustered by theme, highest impact first).

Security / data integrity
- Tenant enforcement: `record_payment` is SECURITY DEFINER and only selects `rto_id` by invoice ID; it never checks caller’s tenant/session, so any known invoice UUID can be mutated cross-tenant.
- Payment validation: RPC accepts zero/negative amounts and any method; negative or zero amounts both insert payments and flip `internal_payment_status`. No currency guard; relies solely on client behavior.
- Amount constraints: `amount_due_cents` has no CHECK ≥ 0; over/under/negative scenarios not blocked at the database.
- RLS not visible here, but payment RPC bypasses it via SECURITY DEFINER—needs explicit tenant check.

Schema / constraints
- Default plan uniqueness is on a non-existent `program_id` column; should be `qualification_id` (or correct column) so “one default per qualification/program per RTO” is never enforced today.

Status model (invoice vs payment)
- `record_payment` updates only `internal_payment_status`, leaving `invoices.status` unchanged (SCHEDULED/SENT). UI actions, filters, and Xero sync still key off `status`, so paid invoices appear unpaid and remain actionable.
- No clear canonical status: `status`, `internal_payment_status`, and Xero sync status can diverge.

Invoice creation / idempotency
- Approval path skips `invoice_lines` whenever invoices already exist; no re-seeding or reconciliation even if lines are missing or templates changed.
- `amount_due_cents` is never reconciled against line totals when invoices pre-exist.

PDF / email issuance (duplicate pipelines)
- `issue-due-invoices`: claims rows, generates rich PDFs with lines, marks SENT even if email not actually sent when Resend missing.
- `daily-finance-tick`: generates minimal PDFs, sends emails, marks SENT whenever it emails; no row-claiming, so possible double-send/races.
- Next.js API route generates PDFs on-demand and uploads independently. Three parallel paths mean inconsistent templates, statuses, and resend behavior.

Payments / commissions coupling
- Commission calculation uses invoice_lines if present, otherwise matches schedule by exact `due_date`; manual date edits or duplicate due dates break commissions. Hybrid intent (line vs installment) is undefined.
- Commission line flags (`is_commissionable`) ignored when lines are absent; fallback to template installment flag is fragile.
- Payment confirmation to Xero is manual; no event-driven sync on payment/issue.

Xero sync and drift
- Invoice sync and payment confirmation are manual/batch; no trigger on SENT/PAID (or internal payment status). Backlogs and drift are easy to accumulate.
- Line-level Xero mappings are stored on invoice_lines, but sync uses template-level mappings; post-approval edits to line mappings don’t propagate to payloads.

Operational resilience
- `issue-due-invoices` has attempt caps/locking; `daily-finance-tick` does not claim rows—concurrent runs can re-send.
- No dead-letter/alerting for repeated PDF/email failures beyond attempt caps.
- No automatic reconciliation if PDF generation or email fails; statuses may stay SCHEDULED while PDFs exist, or become SENT without email when Resend is missing.

UI/UX gaps (current behavior)
- “Record Payment” button hides only when `status` is PAID/VOID; because status isn’t updated on payment, users can keep recording payments against already-paid balances. Internal payment status is shown but not used for enablement.
- Lists and filters (finance tables, student finance pane) read `status` for paid/overdue badges, so dashboards can remain stale even when balances are zero.
- No UI flow to regenerate/reseed invoice_lines when invoices pre-exist or templates change.
- No UI visibility into commission skips (e.g., due_date mismatch, no commissionable lines) or Xero sync drift beyond the manual confirmation table.
- No surfaced validation against over/under/negative payments beyond client-side check; backend allows it.

Anchors / schedules
- Commission matching and schedule lookups depend on exact due_date equality; any manual date change or duplicates can break linkage.
- Payment plan anchor/date immutability is enforced only while application is DRAFT; unclear guardrails post-approval.

Quick, high-value fixes to unblock stability (not implemented yet)
- Enforce tenant via session (`get_my_rto_id()`) + `p_amount_cents > 0` in `record_payment`; add CHECK ≥ 0 on amounts.
- Fix the default plan unique index to the correct column.
- Decide status source of truth and update both `status` and `internal_payment_status` on payment, or migrate UI/Xero logic to internal status exclusively.
- Pick one issuance pipeline (likely `issue-due-invoices`), make others delegate or remove; align templates and status transitions.
- Define commission basis (line vs installment) and remove the hybrid fallback.
- Make Xero sync event-driven on SENT/PAID (or internal equivalent); keep manual overrides as backup.
- Add reconciliation/reseeding of invoice_lines when invoices exist but lines are missing or stale.