# Agent Commissions System

## Overview

The Agent Commissions system automatically calculates and tracks commission invoices when students make commissionable payments. Commissions are calculated as a percentage of the payment amount, with GST (10%) added on top.

## Commission Calculation Formula

**Base Commission** = Payment Amount × (Commission Rate / 100)

**GST** = Base Commission × 0.10

**Total Commission** = Base Commission + GST

### Example

If a student pays $5,000 and the agent commission rate is 20%:

- Base commission: $5,000 × 20% = $1,000
- GST: $1,000 × 10% = $100
- **Total payable to agent: $1,100**

## Commission Trigger Flow

Commissions are generated automatically when a student payment is recorded. The flow is:

1. **Payment Recorded** → User records a payment via the "Record Payment" dialog
2. **Payment Saved** → `record_payment` RPC inserts payment and updates invoice
3. **Commission Calculation Triggered** → `calculate-agent-commission` Edge Function is invoked with the payment ID
4. **Preconditions Checked**:
   - Payment amount > 0
   - Installment is commissionable (`payment_plan_template_installments.is_commissionable = true`)
   - Student has an active agent (`applications.agent_id` is not null)
   - Agent commissions are active (`agents.commission_active = true`)
   - Current date is within agent's commission validity period (if set)
   - Agent has a commission rate set (`agents.commission_rate_percent > 0`)
5. **Commission Invoice Created** → If all conditions are met, a commission invoice is inserted into `commission_invoices` table
6. **Commission Invoice Number Generated** → Format: `COM-YYYY-NNNNNN` (e.g., `COM-2025-000001`)

## Database Schema

### Agents Table Extensions

The `agents` table has been extended with commission-related fields:

- `commission_rate_percent` (numeric(5,2), NOT NULL, default 0): Commission percentage (0-100)
- `commission_active` (boolean, NOT NULL, default true): Whether commissions are currently active
- `commission_start_date` (date, nullable): Optional start date for commission validity
- `commission_end_date` (date, nullable): Optional end date for commission validity

### Commission Invoices Table

The `commission_invoices` table tracks all commission invoices:

**Core Fields:**
- `id` (uuid, PK)
- `rto_id` (uuid, FK → rtos)
- `agent_id` (uuid, FK → agents)
- `student_id` (uuid, FK → students)
- `enrollment_id` (uuid, FK → enrollments)
- `student_payment_id` (uuid, FK → payments, UNIQUE) - Ensures idempotency

**Amount Fields:**
- `base_amount_cents` (integer): Base commission before GST
- `gst_amount_cents` (integer): GST amount (10% of base)
- `total_amount_cents` (integer): Total commission (base + GST)
- `commission_rate_applied` (numeric(5,2)): Snapshot of agent rate at calculation time

**Invoice Metadata:**
- `invoice_number` (text, UNIQUE): Generated commission invoice number
- `issue_date` (date): Date commission was calculated (same as payment date)
- `due_date` (date): Due date (payment date + 30 days)
- `status` (text): One of 'UNPAID', 'PAID', 'CANCELLED'

**Payment Tracking:**
- `amount_paid_cents` (integer, default 0): Amount paid so far
- `paid_date` (date, nullable): Date commission was paid
- `payment_reference` (text, nullable): Payment reference

### Commission Payments Table

The `commission_payments` table tracks when the RTO pays agents:

- `id` (uuid, PK)
- `rto_id` (uuid, FK → rtos)
- `commission_invoice_id` (uuid, FK → commission_invoices)
- `payment_date` (date)
- `amount_cents` (integer)
- `payment_method` (text, nullable)
- `reference` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `created_by` (uuid, FK → profiles, nullable)

### Payment Plan Template Installments

The `payment_plan_template_installments` table includes:

- `is_commissionable` (boolean, NOT NULL, default false): Whether this installment generates commissions

## Edge Function: `calculate-agent-commission`

**Location:** `supabase/functions/calculate-agent-commission/index.ts`

**Input:**
```json
{
  "paymentId": "uuid-of-payment"
}
```

**Output:**
```json
{
  "created": true,
  "commissionInvoiceId": "uuid-of-commission-invoice"
}
```

Or if commission was not created:
```json
{
  "created": false,
  "reason": "reason why commission was not created"
}
```

**Behavior:**
- Idempotent: Multiple calls with the same `paymentId` will not create duplicate commission invoices
- Silent failures: Returns `created: false` with a reason instead of throwing errors for expected conditions (e.g., installment not commissionable, no agent assigned)
- Uses service role client to bypass RLS for commission calculation logic

## Frontend Components

### Commissions Page

**Route:** `/financial/commissions`

**Features:**
- Table view of all commission invoices
- Filter by status (All, Unpaid, Paid, Cancelled)
- Search across invoice numbers, agent names, and student names
- Sortable columns
- Pagination
- Column visibility preferences

### Agent Form

**Location:** `/agents/new` or `/agents/edit/[id]`

**New Fields:**
- Commission Rate (%) - Required numeric input (0-100)
- Commissions Active - Toggle switch
- Commission Start Date - Optional date picker
- Commission End Date - Optional date picker (must be >= start date)

### Payment Plan Template Installments

**Location:** `/financial/templates/new` or `/financial/templates/edit/[id]`

**New Field:**
- Commissionable checkbox per installment row
- Defaults to `true` for new installments

## Limitations & Future Enhancements

### Current Limitations (Vertical Slice)

1. **No Xero Integration**: Commission invoices are not synced to Xero yet
2. **No Commission Payment Recording UI**: The `commission_payments` table exists but there's no UI to record payments yet
3. **No Refund Handling**: Refunds do not automatically reverse commissions
4. **No Transfer Handling**: Internal student transfers are not excluded from commissions yet
5. **No Commission Caps**: Maximum commission per student is not enforced
6. **No PDF Generation**: Commission invoice PDFs are not generated yet
7. **No Reporting**: Commission summary reports are not available yet

### Future Enhancements

- Xero sync for commission invoices (as Bills/ACCPAY)
- Commission payment recording UI
- Commission invoice PDF generation
- Commission summary reports
- Agent performance dashboards
- Refund and transfer handling
- Commission caps per student
- Bulk commission export

## Business Rules

1. **Commissions are earned on actual payments**, not on invoice generation
2. **Partial payments generate partial commissions** - Each payment creates its own commission invoice
3. **Commission rate is snapshotted** - The rate at calculation time is stored for audit purposes
4. **GST is mandatory** - Always 10% of base commission amount
5. **One commission invoice per payment** - Enforced by unique constraint on `student_payment_id`

## Troubleshooting

### Commission Not Generated

Check the following:

1. **Agent assigned?** - Verify `applications.agent_id` is not null
2. **Agent active?** - Check `agents.commission_active = true`
3. **Commission rate set?** - Verify `agents.commission_rate_percent > 0`
4. **Installment commissionable?** - Check `payment_plan_template_installments.is_commissionable = true`
5. **Date range valid?** - If agent has `commission_start_date` or `commission_end_date`, ensure current date is within range
6. **Payment amount > 0?** - Negative or zero payments do not generate commissions

### Commission Invoice Already Exists

This is expected behavior for idempotency. The system prevents duplicate commission invoices for the same payment.

## Related Files

- Migrations: `supabase/migrations/20251113000001_*.sql`
- Edge Function: `supabase/functions/calculate-agent-commission/`
- Hooks: `src/hooks/useGetCommissionInvoices.ts`, `src/hooks/useRecordPayment.ts`
- Components: `app/(app)/financial/commissions/`
- Agent Form: `app/(app)/agents/_components/AgentForm.tsx`
- Payment Plan Form: `app/(app)/financial/templates/_components/PaymentPlanTemplateForm.tsx`

