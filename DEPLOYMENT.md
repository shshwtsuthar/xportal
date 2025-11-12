### New Application Wizard Hardening (AVETMISS/CRICOS)

1) Database migration
- Apply the migration adding submission-time constraints:
  - `supabase/migrations/20251111_wizard_submission_constraints.sql`
- Command:
  - supabase db reset

2) Regenerate types
- Command:
  - supabase gen types typescript --local > database.types.ts

3) Edge function
- No action needed if deploying via Supabase CLI; function `submit-application` now imports shared validator from `src/validation/application.ts`.
- Ensure the build includes this file; with the current repo layout, relative import is used.

4) Client
- No environment changes. UI remains identical; behavior is improved.

5) Rollback
- Drop constraints:
  - ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_email_required_on_submit;
  - ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_mobile_required_on_submit;
  - ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_disability_flag_required_on_submit;
  - ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_prior_education_flag_required_on_submit;

### CRICOS Optional For Domestic (2025-11-11)

- No database changes required (CRICOS columns are nullable).
- Deployed change lives in `src/validation/application.ts`:
  - CRICOS block is enforced only when `is_international` is true.
  - Normalization maps `null` to `undefined` and supports `is_international_student` alias.
- Actions:
  - Rebuild and deploy the web app and the `submit-application` Edge Function so both pick up the shared validator changes.
  - No type regeneration needed unless schema changed elsewhere.

### Remove “Written Agreement & Consent” (2025-11-12)

1) Database migration
- Create a new migration and drop the 3 columns (safe with IF EXISTS):
  ```sql
  -- applications: remove written agreement & consent fields
  ALTER TABLE public.applications
    DROP COLUMN IF EXISTS written_agreement_accepted,
    DROP COLUMN IF EXISTS written_agreement_date,
    DROP COLUMN IF EXISTS privacy_notice_accepted;
  ```
- Commands (run locally):
  - supabase migration new "remove-written-agreement-consent-fields"
  - Paste the SQL above into the generated file in `supabase/migrations/`
  - supabase db reset

2) Regenerate types
- Command:
  - supabase gen types typescript --local > database.types.ts

3) Client
- No environment changes. UI was removed and validators updated.

4) Rollback
- Re-add columns (nullable) if needed:
  ```sql
  ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS written_agreement_accepted boolean,
    ADD COLUMN IF NOT EXISTS written_agreement_date date,
    ADD COLUMN IF NOT EXISTS privacy_notice_accepted boolean;
  ```

## Deployment Notes - RTO Profile Image Upload (2025-11-02)

- Run migration `20251102120000_rto_profile_image.sql` to add `profile_image_path` and provision the private `rto-assets` bucket and RLS policies.
- After the migration, regenerate types: `supabase gen types typescript --local > database.types.ts`.
- No environment variables required. Confirm Supabase storage public CDN is enabled if logos should load outside authenticated sessions.
- Communicate to admins that the RTO logo uploader accepts PNG/JPG/WebP/GIF/SVG up to 5MB.

## Deployment Notes - Assignments Pane Refresh (2025-11-02)

- No migrations required; storage buckets unchanged.
- Trainer feedback uploads store metadata in `student_assignment_submissions.notes` as JSON `{ "type": "trainer-feedback", "message": string | null }`. Existing plain-text notes continue to render under student submissions.
- After deploy, brief trainers on the new "Upload feedback" action within the student assignments pane.
- Run migration `20251102094500_assignment_grading_status.sql` to enable automatic unit outcome recalculation, then regenerate types with `supabase gen types typescript --local > database.types.ts`.
- Communicate the new grading flow: tutors select `S` or `NYS` per assignment, and subjects flip to `C`/`NYC` automatically when all assessments are satisfactory.

### Compose Email API

- Ensure environment variables are configured:
  - `RESEND_API_KEY`
  - `RESEND_FROM` (e.g. `Acme RTO <no-reply@yourdomain.com>`)

- API Route: `POST /api/emails/send`
  - Body: `{ to: string[], subject: string, html: string }`
  - Response: `{ id: string | null }`

## Deployment Notes - Communications: Mail Logging (2025-11-05)

1. Run the migration to create email logging schema:
   - `supabase/migrations/20251105100000_email_logging.sql`
2. Regenerate types immediately after:
   - `supabase gen types typescript --local > database.types.ts`
3. Configure environment variables:
   - `RESEND_API_KEY`
   - `RESEND_FROM` (e.g. `Acme RTO <no-reply@yourdomain.com>`)
   - `RESEND_WEBHOOK_SECRET` (shared secret for webhook verification)
4. Set up Resend webhook pointing to your deployment URL:
   - Endpoint: `POST https://<your-domain>/api/webhooks/resend`
   - Subscribe to events: `email.sent`, `email.delivered`, `email.bounced`, `email.complained` (optional: `email.delivery_delayed`)
   - Add header `x-resend-secret: <RESEND_WEBHOOK_SECRET>`
5. Smoke test:
   - Send a test email via the compose dialog; verify a row appears on `/communications/mail`
   - Trigger a delivery (or use Resend test addresses) and verify KPI cards increment
   - Confirm status changes after webhook delivery
## Deployment Notes - Twilio Settings Prefetch (2025-11-07)

- No database changes or environment variables required.
- The settings page now performs server-side prefetches against `/api/settings/twilio/*`; ensure your deployment platform forwards `x-forwarded-proto` and `x-forwarded-host` headers (default on Vercel) so requests resolve the correct origin.
- If your hosting setup does not forward those headers, set `NEXT_PUBLIC_APP_URL` to the public base URL so server-side fetches resolve correctly.
- Smoke test: load `/settings/twilio` after deploy and confirm the Account and Senders forms render instantly without showing the loading placeholders.

## Deployment Notes - Dashboard Cumulative Metrics (2025-11-07)

- No database schema changes or regenerated types required.
- Ensure Supabase already contains `applications` and `students` data so the chart shows meaningful progressions; empty datasets render a flat baseline.
- Optional: rerun `supabase db reset` locally if you want the enriched seed timestamps that better demonstrate cumulative growth through 2025.
- Post-deploy checks:
  - Load `/dashboard` and confirm the cumulative chart renders under the KPI cards without errors.
  - Hover over the chart to verify tooltip values and legend entries for both applications and students series.
## Deployment Notes - Twilio WhatsApp Prerequisites (2025-11-06)

1. Run the migrations:
   - `supabase/migrations/20251106103000_twilio_settings.sql`
   - `supabase/migrations/20251106120000_whatsapp_logging.sql`
2. Regenerate types immediately after:
   - `supabase gen types typescript --local > database.types.ts`
3. Configure environment variables (server):
   - `TWILIO_CFG_ENC_KEY` (min 32 chars; used to encrypt/decrypt Twilio Auth Token)
4. In-app configuration (Settings > Twilio):
   - Enter Account SID and Auth Token (masked after save)
   - Optionally set Messaging Service SID
   - Add WhatsApp sender numbers (E.164) with channel `whatsapp`
   - Toggle "Validate Webhooks" as desired
5. Twilio Console setup:
   - Inbound Webhook (WhatsApp): `POST https://<your-domain>/api/communications/whatsapp/webhook`
   - Status Callback: `POST https://<your-domain>/api/communications/whatsapp/status`
6. Smoke test:
   - Use "Test Connection" on Settings > Twilio
   - Send a WhatsApp message to your registered number; verify a row in `whatsapp_messages`
   - Confirm status updates via Twilio callback change `whatsapp_messages.status`


- UI Integration:
  - The compose dialog is globally available via the provider `components/providers/compose-email.tsx` and can be opened from the sidebar "Mail" button.
  - Applications page has a "Mail" toolbar button that prefills recipients from filtered applications (all rows, ignoring pagination).
## Deployment Notes - Invoices DataTable Parity (2025-10-27)

No database migrations required. Ensure the following steps post-deploy:

1. Regenerate types if schema changed elsewhere (not required for this feature):
   supabase gen types typescript --local > database.types.ts
2. Verify user table preferences RLS allows selecting/upserting for `invoices.datatable` key.
3. Confirm scheduled job updating invoice statuses (OVERDUE/SCHEDULED) is active.
4. Smoke test in production:
   - Tabs switching and counts
   - Filters apply and persist in URL
   - + Columns persists visibility/widths per-user
   - Export CSV/XLSX contains expected columns and data


