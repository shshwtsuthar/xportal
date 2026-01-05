## [Unreleased]
- feat(timetables): Integrate group capacity tracking into timetable creation and enrollment
  - Added database validation trigger (`validate_timetable_group_consistency`) to ensure all program plans in a timetable belong to the same group
  - Created migration script (`migrate_existing_timetables_to_groups.sql`) to auto-assign groups to existing timetables with comprehensive logging
  - Added backend hooks: `useGetGroupsByProgram` (fetch groups by program), `useGetTimetableGroup` (derive timetable's group from program plans)
  - Updated `useGetProgramPlans` to support filtering by both program_id and group_id
  - Updated `useGetTimetables` to include group capacity information (current enrollment/max capacity) via JOIN with groups table
  - Enhanced `useAddProgramPlansToTimetable` with client-side validation to prevent adding plans from different groups or plans without groups
  - Timetable creation flow now requires group selection: Program → Group → Program Plans (all filtered by selected group)
  - Timetable creation UI displays group capacity badges and real-time enrollment counts
  - Timetable detail page shows read-only group badge with capacity in header, filters available plans by timetable's group
  - Application enrollment step displays group capacity for each timetable with visual indicators (badges, disabled states)
  - Hard-block enrollment when group is at full capacity - disabled timetables show tooltip explaining capacity limits
  - All UI components use ShadCN design system for consistency (Badge, Alert, Tooltip components)
  - Group selection is now locked after timetable creation to maintain data integrity
- feat(students): Add Attendance tab to student profile page
  - Added `StudentAttendanceTable` and Attendance tab on `students/{id}` with a full classes data table mirroring Course Progression styling.
  - Introduced `useGetStudentAllClasses` hook to fetch enrollment classes with delivery location, classroom, and attendance data, wired to the existing attendance mutation.
- feat(mail): Introduce per-RTO mail templates
  - Added migration `20251119100000_create_mail_templates.sql` defining the `mail_templates` table, RLS policies, and default `rto_id` trigger.
  - Regenerated Supabase types (`database.types.ts` + `supabase/functions/_shared/database.types.ts`) and added TanStack mutation hook `useCreateMailTemplate`.
  - Replaced the Mail page Compose button with a two-step template flow (TemplateNameDialog + TemplateComposeDialog) so Subject/Body pairs can be saved via the new hook.
- feat(applications): Introduce ARCHIVED status and read-only workflows
  - Added migration `20251119090000_add_archived_application_status.sql` which appends the `ARCHIVED` enum value and installs a trigger preventing updates/deletes once archived (except pure status flips).
  - Updated Supabase Edge Functions (`submit-application`, `approve-application`) to fail fast when invoked against archived applications.
  - Applications UI now hides archived rows from the default "All" view, adds a dedicated "Archived" tab/filter, renders a read-only badge in the table, and blocks inline actions for archived records.
- refactor(applications): Improve address card layout and styling in new application wizard
  - Removed subheadings ("Search and autofill via Mappify", "Keep enabled only when different from street") from street and postal address cards.
  - Moved address search buttons inline with the relevant input fields (street number/name and postal street number/name).
  - Updated AddressSearchCommand hover and selected states to use sidebar-accent colors for consistency with sidebar navigation.
  - Hidden scrollbar in address search results list (scrollbar-none utility) while maintaining scroll functionality.
- feat(applications): Address autocomplete via Mappify
  - Added TanStack Query hook `useAddressAutocomplete` and `AddressSearchCommand` UI to surface Mappify suggestions.
  - Street and postal cards in the new application wizard now include in-card command palettes that search, select, and auto-fill both address blocks (with postal sync awareness).
- feat(applications): Animate submission readiness counter
  - Extracted readiness summary into `SubmissionReadinessCard` to minimize rerenders.
  - Replaced the static missing-fields count with `NumberFlow` for smooth animated transitions.
  - Added local module typings for `@number-flow/react` so the component remains fully typed.
- fix(applications): Align wizard validation with edge functions
  - Promoted `src/lib/applicationSchema.ts` as the single source of truth and re-exported it into Supabase edge code to eliminate drift.
  - Restored domestic USI exemptions, derived under-18 welfare checks, and Australian-only passport rules on both client and server.
  - `is_international` now derives from citizenship; CRICOS step shows a read-only badge instead of a second toggle.
  - `useSubmissionReadiness` derives flags before validation and surfaces the remaining blocking fields beside the Submit action.
- feat(commissions): Agent commission calculation and tracking system
  - Added commission fields to agents table (rate, active status, validity dates)
  - Created commission_invoices table to track commission invoices generated from student payments
  - Created commission_payments table to track RTO payments to agents
  - Implemented `calculate-agent-commission` Edge Function that automatically generates commission invoices when payments are recorded
  - Commission calculation: Base = Payment × Commission Rate, GST = Base × 10%, Total = Base + GST
  - Added commissionable flag to payment plan template installments (UI already existed)
  - Extended Agent form with commission rate, active toggle, and validity date range fields
  - New Commissions page at `/financial/commissions` with table view, filters, and search
  - Commission invoices are generated automatically when commissionable payments are recorded
  - Idempotent commission calculation (one commission invoice per payment)
  - See `docs/commissions.md` for full documentation
- New Application Wizard hardening:
  - Server-first validation with shared rules (AVETMISS/CRICOS) via `src/validation/application.ts`
  - Edge function `submit-application` now imports shared validator and persists derived fields
  - Submission-time DB constraints for `email`, `mobile_phone`, `disability_flag`, `prior_education_flag`
  - Removed heavy useWatch; added debounced readiness hook `useSubmissionReadiness`
  - Fixed VSN, year_highest_school_level_completed rules; survey_contact_status derived on server
  - Reduced race conditions; co-located conditional UI logic in step components
- chore(edge): Add Deno import mappings for `zod` and `@/` in edge functions to fix runtime import resolution
- fix(wizard): CRICOS step fully optional for domestic students
  - Treat all CRICOS fields as optional unless `is_international` is true
  - Accept `null` from forms by normalizing to `undefined` before Zod parsing
  - Support alias `is_international_student` by mapping it to `is_international` during validation

- feat(cricos): Remove "Written Agreement & Consent" card and fields
  - UI: Deleted the entire card from CRICOS step and student details page
  - Validation: Removed fields from Zod schemas and submission checks
  - Backend: Drop columns `written_agreement_accepted`, `written_agreement_date`, and `privacy_notice_accepted` from `applications` (see DEPLOYMENT.md)

## 2025-11-07

- refactor(settings): SSR prefetch Twilio configuration & senders
  - Converted `/settings/twilio` page to server component with TanStack Query hydration
  - Removed suspense loaders so forms render immediately with prefetched data
- feat(dashboard): Visualise cumulative applications vs students
  - Added client dashboard chart showing year-to-date cumulative totals sourced from Supabase
  - Introduced TanStack Query hook `useGetDashboardCumulativeMetrics` producing a daily series for charting
- chore(seed): Stagger application and student timestamps
  - Added `seed_created_at` values to seed data so cumulative metrics chart displays meaningful growth over 2025
  - Students now inherit timestamps roughly one month after their originating application for realistic progression

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


