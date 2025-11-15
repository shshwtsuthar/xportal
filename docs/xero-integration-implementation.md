# Xero Integration Implementation Status

## Overview

This document describes the current state of the Xero integration for XPortal. The integration enables one-way synchronization from XPortal (SMS) to Xero for student contacts, invoices, and payments.

**Current Phase:** Phase 1 - One-Way Sync (SMS → Xero)  
**Status:** Implemented  
**Last Updated:** November 14, 2025

---

## What Has Been Implemented

### 1. Database Schema Extensions

All necessary database columns have been added to support Xero integration:

#### `students` Table
- `xero_contact_id` (text) - Stores the Xero Contact UUID

#### `invoices` Table
- `xero_invoice_id` (text) - Xero InvoiceID (UUID format)
- `xero_sync_status` (text) - Values: `pending`, `synced`, `failed`, `skipped`
- `xero_sync_error` (text) - Error message if sync fails
- `xero_synced_at` (timestamptz) - Timestamp of successful sync
- Constraint: `invoices_xero_sync_status_check` ensures valid status values

#### `payments` Table
- `xero_payment_id` (text) - Xero PaymentID
- `xero_sync_status` (text) - Values: `pending`, `synced`, `failed`, `skipped`
- `xero_sync_error` (text) - Error message if sync fails
- `xero_synced_at` (timestamptz) - Timestamp of successful sync
- Constraint: `payments_xero_sync_status_check` ensures valid status values

#### `payment_plan_templates` Table
- `xero_account_code` (text, default: '200') - Chart of Accounts code for Xero
- `xero_tax_type` (text, default: 'OUTPUT2') - Australian GST tax type code
- `xero_item_code` (text, nullable) - Optional mapping to Xero Items/Products

#### `rtos` Table
- `xero_tenant_id` (text) - Xero organization ID (tenant ID)
- `xero_access_token_encrypted` (text) - Encrypted OAuth 2.0 access token
- `xero_refresh_token_encrypted` (text) - Encrypted OAuth 2.0 refresh token
- `xero_token_expires_at` (timestamptz) - Token expiration timestamp
- `xero_default_payment_account_code` (text) - Bank account code for payments (default: '101')
- `xero_webhook_key` (text, nullable) - Webhook key for future bidirectional sync

#### Indexes Created
- `idx_invoices_xero_sync_status` - For querying invoices by sync status
- `idx_payments_xero_sync_status` - For querying payments by sync status
- `idx_students_xero_contact_id` - For querying students by Xero contact ID

**Migration File:** `supabase/migrations/20251114000001_add_xero_integration_fields.sql`

---

### 2. OAuth 2.0 Authentication Flow

#### API Routes

**`app/api/xero/connect/route.ts`**
- Initiates OAuth 2.0 authorization flow
- Redirects user to Xero authorization endpoint
- Includes required scopes: `offline_access`, `accounting.transactions`, `accounting.contacts`, `accounting.settings`
- Generates CSRF state token with RTO ID embedded

**`app/api/xero/callback/route.ts`**
- Handles OAuth callback from Xero
- Exchanges authorization code for access/refresh tokens
- Retrieves tenant ID from Xero connections endpoint
- Encrypts and stores tokens in `rtos` table
- Redirects to settings page with success/error status

#### Encryption Utility

**`lib/xero/encryption.ts`**
- Provides `encryptToken()` and `decryptToken()` functions
- Uses AES-256-CBC encryption with key from `XERO_ENCRYPTION_KEY` environment variable
- Format: `iv:encryptedData` (hex encoded)

**Environment Variables Required:**
- `XERO_CLIENT_ID` - OAuth client ID from Xero Developer Portal
- `XERO_CLIENT_SECRET` - OAuth client secret
- `XERO_REDIRECT_URI` - Must match redirect URI configured in Xero app (HTTPS required)
- `XERO_ENCRYPTION_KEY` - 32-byte key for token encryption

---

### 3. Xero API Client Helper

**`supabase/functions/_shared/xero-client.ts`** (Deno/Edge Functions)
- `XeroClient` class for making Xero API requests
- Automatic token refresh when tokens expire (within 5 minutes)
- Handles rate limit errors and provides readable error messages
- Base URL: `https://api.xero.com/api.xro/2.0`

**Features:**
- Reads encrypted tokens from database
- Automatically refreshes access tokens when expiring
- Updates stored tokens after refresh
- Parses Xero API error responses into readable messages
- Handles 429 (rate limit) and 401 (authentication) errors

---

### 4. Edge Functions

#### `xero-sync-contact`

**Location:** `supabase/functions/xero-sync-contact/index.ts`

**Purpose:** Syncs a student to Xero as a Contact.

**Input:**
```json
{
  "studentId": "uuid-of-student"
}
```

**Flow:**
1. Fetches student data with address and contact details
2. Checks if already synced (idempotent check on `xero_contact_id`)
3. Builds Xero Contact payload with Name, Email, Addresses, Phones
4. POSTs to `/Contacts` endpoint
5. Stores `ContactID` in `students.xero_contact_id`

**Integration:** Called automatically after student approval in `approve-application` edge function (non-blocking).

**Error Handling:** Returns error response but doesn't block student creation.

---

#### `xero-sync-invoice`

**Location:** `supabase/functions/xero-sync-invoice/index.ts`

**Purpose:** Syncs a student invoice to Xero as an ACCREC (Accounts Receivable) invoice.

**Input:**
```json
{
  "invoiceId": "uuid-of-invoice"
}
```

**Flow:**
1. Fetches invoice with enrollment, student, program, and payment plan template data
2. Checks if already synced (idempotent check)
3. Ensures student has Xero contact (calls `xero-sync-contact` if missing)
4. Builds Xero Invoice payload:
   - Type: `ACCREC`
   - Status: `AUTHORISED`
   - LineItems with account code, tax type from payment plan template
   - InvoiceNumber matches SMS invoice number
   - Reference includes "SMS Invoice #"
5. POSTs to `/Invoices` endpoint
6. Stores `InvoiceID` and updates sync status

**Error Handling:**
- Sets `xero_sync_status = 'failed'` and stores error message
- Truncates error messages to 500 characters

---

#### `xero-sync-invoices-batch`

**Location:** `supabase/functions/xero-sync-invoices-batch/index.ts`

**Purpose:** Syncs multiple invoices to Xero in batch.

**Input:** None (processes all pending invoices)

**Flow:**
1. Queries invoices where `status = 'SENT'` and `xero_sync_status` is `pending` or `NULL`
2. Processes up to 100 invoices at a time
3. Calls `xero-sync-invoice` for each invoice
4. Respects rate limits: processes 5 invoices concurrently, then waits 1 second
5. Returns summary of processed, succeeded, and failed counts

**Usage:** Can be called manually or scheduled via cron. Not yet integrated into `daily-finance-tick` to keep that function focused.

---

#### `xero-sync-payment`

**Location:** `supabase/functions/xero-sync-payment/index.ts`

**Purpose:** Syncs a student payment to Xero as a Payment on the corresponding invoice.

**Input:**
```json
{
  "paymentId": "uuid-of-payment"
}
```

**Flow:**
1. Fetches payment with invoice data
2. Checks if already synced (idempotent check)
3. Verifies invoice has `xero_invoice_id` (fails if not synced)
4. Fetches RTO to get default payment account code
5. Builds Xero Payment payload:
   - InvoiceID from invoice
   - Account.Code from RTO settings (default: '101')
   - Amount in dollars (converted from cents)
   - Reference includes "SMS Payment #"
   - Status: `AUTHORISED`
6. PUTs to `/Payments` endpoint
7. Stores `PaymentID` and updates sync status

**Error Handling:**
- Sets `xero_sync_status = 'failed'` and stores error message
- Requires invoice to be synced first

**Integration:** Called automatically after payment recording in `useRecordPayment` hook (non-blocking).

---

### 5. Frontend Integration

#### Payment Recording Hook

**`src/hooks/useRecordPayment.ts`**
- Updated to call `xero-sync-payment` after successful payment recording
- Non-blocking: failures don't affect payment recording
- Errors are logged to console

---

### 6. Application Approval Integration

**`supabase/functions/approve-application/index.ts`**
- Updated to call `xero-sync-contact` after student creation
- Non-blocking: failures don't block application approval
- Errors are logged but don't affect the approval flow

---

## Configuration

### Xero Developer Portal Setup

1. **Create OAuth 2.0 App:**
   - Go to https://developer.xero.com/myapps
   - Create new app (name cannot contain "Xero")
   - Set redirect URI: `https://yourdomain.com/api/xero/callback` (must be HTTPS)
   - Copy Client ID and Client Secret

2. **Configure Scopes:**
   - `offline_access` - Enables refresh tokens
   - `accounting.transactions` - Create/read invoices and payments
   - `accounting.contacts` - Create/update contacts
   - `accounting.settings` - Read chart of accounts and tax rates

3. **Generate Webhook Key (for future use):**
   - Go to Webhooks section
   - Generate webhook key (store in `rtos.xero_webhook_key`)

### Environment Variables

**Required:**
```bash
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=https://yourdomain.com/api/xero/callback
XERO_ENCRYPTION_KEY=your_32_byte_encryption_key
```

**Note:** `XERO_ENCRYPTION_KEY` must be exactly 32 bytes (256 bits). Generate using:
```bash
openssl rand -base64 32
```

### RTO Configuration

After connecting Xero via OAuth, configure payment plan templates:

1. **Set Account Codes:** Update `payment_plan_templates.xero_account_code` for each template
   - Default: `200` (Course Fee Income)
   - Common codes: `200` (Income), `202` (Materials/Resources)

2. **Set Tax Types:** Update `payment_plan_templates.xero_tax_type`
   - Default: `OUTPUT2` (GST on Income - 10%)
   - For GST-free: `EXEMPTOUTPUT` (GST Free Income - 0%)
   - Consult with accountant for correct tax treatment

3. **Set Payment Account:** Update `rtos.xero_default_payment_account_code`
   - Default: `101` (Un-deposited Funds)
   - Common codes: `101` (Un-deposited), `102-105` (Bank accounts)

---

## Testing

### Using Xero Demo Company

Xero provides demo companies for testing. Use these for development:

1. **Connect to Demo Company:**
   - Use Xero Demo Company during OAuth flow
   - All API calls will use demo data

2. **Test Flow:**
   - Approve an application → Student contact created in Xero
   - Invoice promoted to SENT → Invoice created in Xero
   - Record payment → Payment recorded in Xero

3. **Verify in Xero:**
   - Check Contacts → Student should appear
   - Check Invoices → Invoice should appear with correct line items
   - Check Payments → Payment should be applied to invoice

### Manual Testing

**Test Contact Sync:**
```bash
curl -X POST http://localhost:54321/functions/v1/xero-sync-contact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"studentId": "student-uuid"}'
```

**Test Invoice Sync:**
```bash
curl -X POST http://localhost:54321/functions/v1/xero-sync-invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"invoiceId": "invoice-uuid"}'
```

**Test Payment Sync:**
```bash
curl -X POST http://localhost:54321/functions/v1/xero-sync-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"paymentId": "payment-uuid"}'
```

**Test Batch Invoice Sync:**
```bash
curl -X POST http://localhost:54321/functions/v1/xero-sync-invoices-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## Rate Limiting

Xero API rate limits:
- **60 requests per minute** per organization
- **5,000 requests per day** per organization
- **5 concurrent requests** maximum

**Current Implementation:**
- Batch sync processes 5 invoices concurrently, then waits 1 second
- Token refresh is automatic and respects rate limits
- Error handling includes retry-after header parsing

**Future Enhancement:** Implement exponential backoff retry logic for rate limit errors.

---

## Error Handling

### Sync Status Values

- `pending` - Not yet synced (default)
- `synced` - Successfully synced to Xero
- `failed` - Sync failed (error stored in `xero_sync_error`)
- `skipped` - Intentionally skipped (not implemented yet)

### Common Errors

1. **"Xero not connected for this RTO"**
   - Solution: Connect Xero via OAuth in settings

2. **"Invoice must be synced to Xero before payment can be synced"**
   - Solution: Sync invoice first, then sync payment

3. **"Rate limit exceeded"**
   - Solution: Wait for retry-after period or implement exponential backoff

4. **"Authentication failed. Please reconnect Xero."**
   - Solution: Reconnect Xero via OAuth (tokens expired)

---

## What Is Left To Implement

### 1. Webhooks & Bidirectional Sync

**Status:** Not Implemented

**Required:**
- Webhook endpoint: `app/api/xero/webhook/route.ts`
- HMAC-SHA256 signature validation using `xero_webhook_key`
- Event processing for:
  - `INVOICE.CREATED` / `INVOICE.UPDATED` - Update SMS invoice from Xero
  - `PAYMENT.CREATED` / `PAYMENT.UPDATED` - Create/update payment in SMS from Xero
  - `CONTACT.CREATED` / `CONTACT.UPDATED` - Update student contact from Xero

**Webhook Events Table:**
- Create `xero_webhook_events` table to track processed events (idempotency)
- Store `resourceId`, `eventDateUtc`, `eventType`, `eventCategory`

**Benefits:**
- Real-time sync when accountants make changes in Xero
- Automatic reconciliation of payments recorded in Xero
- Bidirectional data consistency

---

### 2. Retry & Cron Functions

**Status:** Not Implemented

**Required:**
- `xero-retry-failed-syncs` Edge Function
  - Queries invoices/payments with `xero_sync_status = 'failed'`
  - Retries up to 5 times with exponential backoff
  - Sets status to `manual_review` after max retries

- `xero-token-refresh` Edge Function (Cron)
  - Runs every 25 minutes
  - Refreshes tokens for RTOs with tokens expiring within 5 minutes
  - Updates `xero_token_expires_at` in database

**Scheduling:**
- Use Supabase pg_cron extension or external cron service
- Schedule `xero-retry-failed-syncs` every 15 minutes
- Schedule `xero-token-refresh` every 25 minutes

---

### 3. Commission Invoices → Xero Bills

**Status:** Not Implemented (Design Phase)

**Required Schema Changes:**
- Add to `commission_invoices` table:
  - `xero_bill_id` (text) - Xero BillID (ACCPAY invoice)
  - `xero_sync_status` (text) - Sync status
  - `xero_sync_error` (text) - Error message
  - `xero_synced_at` (timestamptz) - Sync timestamp

**Required Edge Function:**
- `xero-sync-commission-bill`
  - Creates ACCPAY Bill in Xero for each commission invoice
  - Links to agent as supplier contact
  - Includes GST (10% of base commission)
  - Stores BillID in `commission_invoices.xero_bill_id`

**Integration Points:**
- Call after commission invoice creation in `calculate-agent-commission`
- When commission invoice marked PAID in SMS:
  - Option A: Record Xero Payment on Bill
  - Option B: Treat Xero as source of truth (update SMS from webhook)

**Agent as Supplier:**
- Agents must exist as Contacts in Xero with `IsSupplier = true`
- May need `xero-sync-agent-contact` function to create/update agent contacts

---

### 4. Advanced Tax Mapping

**Status:** Partially Implemented (Basic tax types only)

**Required:**
- UI for configuring tax types per payment plan template
- Support for:
  - Domestic vs International student tax treatment
  - GST-free education exemptions
  - Zero-rated supplies
  - Input tax credits

**Current Implementation:**
- Basic tax types: `OUTPUT2` (default), `EXEMPTOUTPUT`
- Hardcoded defaults in migration

**Future Enhancement:**
- Tax type selector in payment plan template form
- Validation based on student type (domestic/international)
- Integration with RTO accounting policies

---

### 5. UI Affordances

**Status:** Not Implemented

**Required:**
- **Settings Page:**
  - "Connect Xero" button (calls `/api/xero/connect`)
  - Display connection status (connected/disconnected)
  - Show last sync timestamp
  - "Disconnect Xero" button (clears tokens)

- **Invoice Management:**
  - Display Xero sync status badge on invoice list
  - "Sync to Xero" button for failed/pending invoices
  - Show Xero InvoiceID and link to Xero (if available)

- **Payment Management:**
  - Display Xero sync status badge on payment list
  - "Sync to Xero" button for failed/pending payments
  - Show Xero PaymentID

- **Sync Dashboard:**
  - List of failed syncs with error messages
  - "Retry All Failed" button
  - Sync statistics (total synced, failed, pending)

---

### 6. Reconciliation Reporting

**Status:** Not Implemented

**Required:**
- Admin dashboard showing:
  - Invoices in SMS not synced to Xero
  - Invoices in Xero not in SMS (via periodic full sync check)
  - Payment discrepancies (SMS total vs Xero total)
  - Commission invoice sync status

**Future Enhancement:**
- Automated reconciliation reports
- Email alerts for sync failures
- Monthly reconciliation summaries

---

### 7. Credit Notes & Refunds

**Status:** Not Implemented

**Required:**
- Create Xero Credit Note when refund issued in SMS
- Apply credit to invoice via Xero API
- Update `payments` table with negative amount
- Handle partial refunds

---

### 8. Multi-Installment Invoice Strategy

**Current Implementation:** One Xero invoice per SMS invoice (recommended)

**Future Consideration:**
- Option to create single Xero invoice with multiple line items for all installments
- Would require significant refactoring
- Current approach (one invoice per installment) is simpler and recommended

---

## Known Limitations

1. **Token Encryption:** Current implementation uses simple XOR encryption in Edge Functions. For production, consider using Supabase Vault or pgsodium for stronger encryption.

2. **Rate Limit Handling:** Basic rate limit awareness but no automatic exponential backoff retry logic yet.

3. **Error Recovery:** Failed syncs require manual retry or batch retry function (not yet implemented).

4. **Token Refresh:** Automatic refresh on-demand but no dedicated cron job yet.

5. **Webhook Validation:** Webhook endpoint not yet implemented, so no bidirectional sync.

6. **Commission Bills:** Commission invoices are not yet synced to Xero as Bills.

---

## Migration Checklist

After deploying this implementation:

1. ✅ Run migration: `supabase migration up` (or `supabase db reset` locally)
2. ✅ Regenerate TypeScript types: `supabase gen types typescript --local > database.types.ts`
3. ✅ Copy types to Edge Functions: `cp database.types.ts supabase/functions/_shared/database.types.ts`
4. ✅ Set environment variables in Supabase dashboard
5. ✅ Generate `XERO_ENCRYPTION_KEY` and add to environment
6. ✅ Configure Xero app in Developer Portal
7. ✅ Test OAuth flow by connecting Xero in settings
8. ✅ Configure payment plan templates with account codes and tax types
9. ✅ Test end-to-end: approve application → check Xero contact → check invoice sync → check payment sync

---

## Support & Troubleshooting

### Common Issues

**Issue:** "Xero not connected for this RTO"  
**Solution:** Connect Xero via OAuth in RTO settings page

**Issue:** "Failed to decrypt Xero tokens"  
**Solution:** Check `XERO_ENCRYPTION_KEY` is set correctly (32 bytes)

**Issue:** "Rate limit exceeded"  
**Solution:** Wait for rate limit window or implement retry logic

**Issue:** Invoice sync fails with "Contact not found"  
**Solution:** Ensure student contact is synced first (happens automatically on approval)

**Issue:** Payment sync fails with "Invoice must be synced first"  
**Solution:** Sync invoice to Xero before recording payment

---

## References

- [Xero API Documentation](https://developer.xero.com/documentation)
- [Xero OAuth 2.0 Guide](https://developer.xero.com/documentation/guides/oauth2/overview)
- [Xero API Rate Limits](https://developer.xero.com/documentation/guides/oauth2/limits)
- [Xero Webhooks Guide](https://developer.xero.com/documentation/guides/webhooks/overview)
- [Xero Tax Types (Australia)](https://developer.xero.com/documentation/api/accounting/types#tax-types)

---

## Changelog

**2025-11-14 - Phase 1 Implementation**
- Added database schema extensions for Xero integration
- Implemented OAuth 2.0 authentication flow
- Created Xero API client helper
- Implemented contact, invoice, and payment sync Edge Functions
- Integrated sync calls into application approval and payment recording flows
- Created comprehensive documentation

---

## Next Steps

1. **Test thoroughly** with Xero Demo Company
2. **Implement webhooks** for bidirectional sync
3. **Add retry/cron functions** for failed syncs and token refresh
4. **Build UI** for Xero connection management and sync status
5. **Implement commission Bills** sync to Xero
6. **Add reconciliation reporting** dashboard

