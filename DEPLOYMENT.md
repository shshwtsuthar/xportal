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


