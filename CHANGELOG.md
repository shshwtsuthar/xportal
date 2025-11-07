## 2025-11-07

- refactor(settings): SSR prefetch Twilio configuration & senders
  - Converted `/settings/twilio` page to server component with TanStack Query hydration
  - Removed suspense loaders so forms render immediately with prefetched data

## 2025-11-02

- refactor(students): Refresh assignments pane layout on `students/{id}`
  - Converted subject selector into accessible list rows
  - Split submissions into student uploads vs trainer feedback with dedicated actions
  - Added trainer feedback upload flow using structured notes metadata
- feat(students): Add grading workflow and automatic unit outcomes
  - Allow tutors to mark assignments as `S` or `NYS` with inline controls
  - Surface subject outcome badges across assignments pane and course progression
  - Trigger enrollment subject outcomes to flip to `C` or `NYC` via database trigger
- feat(rto): Add profile image upload backed by Supabase storage
  - Added nullable `profile_image_path` on `public.rtos` and private `rto-assets` bucket policies
  - Built drag-and-drop uploader with previews on the RTO management page
  - Display the uploaded image in the sidebar branding beside the XPortal title

## Student Display ID Overhaul

- Implemented human-friendly student IDs generated in the database:
  - Format: `STU-<RTO>-<YY>-<NNNNN>-<C>` with per-RTO/year sequencing and a check character.
  - Added `student_id_sequences` table, generator functions, and a BEFORE INSERT trigger on `public.students`.
  - Updated `approve-application` edge function to defer `student_id_display` to DB generation.
  - No backfill required (pre-deployment).

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

## 2025-11-05 - Communications: Mail Logging & Page

- feat(db): Email logging schema
  - Enums: `email_status`, `email_participant_type`
  - Tables: `email_messages`, `email_message_participants`, `email_message_attachments`, `email_message_status_events`
  - RLS scoped by `get_my_rto_id()` with admin override
- feat(api): Persist and track email sends
  - Upgraded `POST /api/emails/send` to queue, send via Resend, and update status with events
  - Added webhook `POST /api/webhooks/resend` (requires `RESEND_WEBHOOK_SECRET`) to record delivered/bounced/complained
- feat(hooks): Added `useGetEmailStats`, `useGetEmails`, `useGetEmailById`
- feat(ui): New Mail page at `/communications/mail`
  - 4 KPI cards (Total Sent, Sent 7d, Delivered 7d, Failed 7d)
  - Data table with subject/status/subject-search filters, pagination, and drawer preview with HTML body
## 2025-10-27

- feat(invoices): Implement Invoices DataTable parity with Applications
  - Tabs: All, Overdue, Paid, Scheduled
  - Advanced filtering (status, date ranges, amounts, balance, emailed, PDF, overdue days)
  - Column visibility (+ Columns) with persisted widths
  - Sorting, column resize, drag-reorder (session-only), pagination
  - CSV/XLSX export with contextual filenames


