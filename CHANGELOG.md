## Compose Email Modal

- Added POST `app/api/emails/send/route.ts` using Resend (`RESEND_API_KEY`, `RESEND_FROM`). Returns `{ id }`.
- Added TanStack Query hook `src/hooks/useSendEmail.ts`.
- Implemented centered ShadCN dialog `components/emails/ComposeEmailDialog.tsx` with fullscreen toggle, recipients chips input, subject field, and TipTap editor.
- Added provider `components/providers/compose-email.tsx` and wired a top-level "Mail" button in `components/app-sidebar.tsx` to open the dialog.
- Implemented new `components/emails/MinimalTiptap.tsx` and deprecated the reference-only `src/components/ui/shadcn-io/minimal-tiptap/index.tsx`.
- feat(applications): Add Mail button to Applications page toolbar
  - Collects primary emails from all filtered rows (ignoring pagination) and prefills Compose Email dialog
  - Button placed before Filter button, shows toast error if no emails found
  - Supports status tabs (Submitted, Accepted, etc.) and advanced filters
## 2025-10-27

- feat(invoices): Implement Invoices DataTable parity with Applications
  - Tabs: All, Overdue, Paid, Scheduled
  - Advanced filtering (status, date ranges, amounts, balance, emailed, PDF, overdue days)
  - Column visibility (+ Columns) with persisted widths
  - Sorting, column resize, drag-reorder (session-only), pagination
  - CSV/XLSX export with contextual filenames


