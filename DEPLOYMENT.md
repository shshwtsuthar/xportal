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


