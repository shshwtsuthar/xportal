## 2025-01-27 — Application Delete Functionality

### Business Logic (authoritative summary)
- **Application Deletion**: Implemented comprehensive delete functionality for applications across all status stages
  - **Universal Access**: Delete button available for applications in any status (Draft, Submitted, AwaitingPayment, Accepted, Approved, Rejected)
  - **Complete Removal**: Applications are permanently deleted from the `sms_op.applications` table with no soft delete
  - **User Safety**: Clear visual separation with destructive styling and confirmation through UI feedback

### Backend — Supabase Edge Functions (applications)
- **New DELETE Endpoint**: `DELETE /applications/{applicationId}`
  - **Complete Deletion**: Permanently removes application from database
  - **Transaction Safety**: Uses database transactions to ensure data integrity
  - **Error Handling**: Proper 404 responses for non-existent applications
  - **CORS Support**: Added DELETE method to CORS headers for cross-origin requests

### Frontend — Application Management
- **Enhanced Applications Table**: Added delete functionality to Actions dropdown
  - **Visual Design**: Delete button with destructive styling (red text, trash icon)
  - **UI Separation**: Clear visual separation with border-top styling
  - **Loading States**: Proper loading indicators during delete operations
  - **Error Handling**: User-friendly error messages for failed deletions
- **React Hooks**: New `useDeleteApplication` hook for API integration
  - **Query Invalidation**: Automatically refreshes application lists after deletion
  - **ETag Cleanup**: Removes cached ETags for deleted applications
  - **Error Management**: Comprehensive error handling and user feedback

### API Specification & Type Safety
- **OpenAPI Schema**: Added DELETE endpoint specification
  - **Response Codes**: 204 No Content for successful deletion
  - **Error Responses**: 404 for not found, 500 for server errors
  - **Type Generation**: Updated TypeScript types for both frontend and backend
- **CORS Configuration**: Fixed CORS headers to include DELETE method
  - **Cross-Origin Support**: Proper handling of DELETE requests from frontend
  - **Method Allowance**: Added DELETE to Access-Control-Allow-Methods header

### Technical Improvements
- **Database Operations**: Transaction-based deletion for data integrity
- **Type Safety**: Full TypeScript compliance throughout the implementation
- **Error Handling**: Comprehensive error management with user feedback
- **Performance**: Efficient query invalidation and cache management

### User Experience Enhancements
- **Intuitive Design**: Delete button clearly separated and styled as destructive action
- **Consistent UI**: Follows existing ShadCN design patterns and theme system
- **Accessibility**: Proper ARIA labels and keyboard navigation support
- **Responsive Design**: Works across all device sizes and screen resolutions

---

## 2025-09-13 — Dual Intake Model System & Advanced Course Plan Management

### Business Logic (authoritative summary)
- **Dual Intake Models**: Implemented comprehensive system supporting both Fixed and Rolling intake models for course delivery
  - **Fixed Intake**: Traditional cohort-based model with rigid start/end dates for groups of students
  - **Rolling Intake**: Flexible, individual-based model allowing students to start at any time with self-directed progression
- **Course Plan Architecture**: Separated course structure (Course Plan) from delivery schedule (Course Offering)
  - Course Plans define units, durations, and prerequisite rules (the "what")
  - Course Offerings define delivery model and scheduling (the "when")
- **Progression Logic**: Advanced prerequisite system with circular dependency detection and phase-based progression calculation

### Backend — Supabase Edge Functions (course-plans)
- **Enhanced Course Plans API**: Major expansion of course plan management capabilities
  - **New Endpoints**:
    - `GET /programs/{programId}/course-plans/{planId}/structure`: Retrieve course plan structure with subjects and durations
    - `GET /programs/{programId}/course-plans/{planId}/prerequisites`: Get prerequisite relationships between subjects
    - `PUT /programs/{programId}/course-plans/{planId}/prerequisites`: Update prerequisite rules
    - `POST /programs/{programId}/course-plans/{planId}/validate-progression`: Validate progression logic for circular dependencies
    - `POST /programs/{programId}/course-plans/{planId}/progression-preview`: Generate timeline preview for both intake models
  - **Advanced Features**:
    - Real-time date calculations for Fixed intake timelines
    - Rolling intake sequence generation with availability dates
    - Progression phase calculation with prerequisite validation
    - Support for estimated durations and complexity levels per subject

### Backend — Database Schema & Migrations
- **New Migration**: `20250913142411_add_course_plan_prerequisites.sql`
  - Added `core.subject_prerequisites` table for prerequisite relationships
  - Enhanced `core.program_course_plan_subjects` with `estimated_duration_weeks` and `complexity_level`
  - **Advanced Functions**:
    - `core.detect_circular_prerequisites()`: Identifies circular dependencies in prerequisite chains
    - `core.get_subject_progression_phases()`: Calculates optimal progression phases based on prerequisites
- **Schema Validation**: CHECK constraints for prerequisite types ('Required', 'Recommended') and complexity levels ('Basic', 'Intermediate', 'Advanced')

### Frontend — Advanced Course Plan Management
- **New Component**: `AdvancedCoursePlans.tsx` - Sophisticated course plan editor
  - **Three-Tab Interface**:
    - **Subjects Tab**: Manage subjects with durations and complexity levels
    - **Prerequisites Tab**: Define prerequisite relationships with visual validation
    - **Progression Preview Tab**: Real-time preview of course progression logic
  - **Advanced Features**:
    - Drag-and-drop subject reordering
    - Prerequisite validation with circular dependency detection
    - Real-time progression phase calculation
    - Visual timeline preview for both intake models
- **Enhanced Programs Page**: Replaced basic course plans interface with advanced editor
  - Integrated with existing program management workflow
  - Maintains ShadCN design consistency
  - Full-featured editor comparable to Payment Templates UI

### Frontend — New Application Wizard (Step 4)
- **Complete Redesign**: Transformed Step 4 from basic program selection to comprehensive dual intake system
  - **New UI Structure**:
    - **Program Selection**: Enhanced with course plan integration
    - **Course Plan Selection**: Dynamic dropdown based on selected program
    - **Intake Model Selection**: Radio buttons for Fixed vs Rolling intake
    - **Course Offering Selection**: Only shown for Fixed intake (with start/end dates)
    - **Start Date Selection**: Calendar picker for Rolling intake
    - **Course Timeline Preview**: Real-time progression visualization
  - **Smart Logic**:
    - Conditional field visibility based on intake model
    - Automatic progression preview updates
    - Date calculations for both intake models
    - Real-time timeline generation

### Frontend — Enhanced User Experience
- **Removed Redundancy**: Eliminated duplicate "Subjects" card from Step 4 (now handled by course plan selection)
- **Date Visualization**: 
  - **Fixed Intake**: Shows actual start/end dates for each subject in blue text
  - **Rolling Intake**: Displays availability date and estimated completion date in green text
- **Progressive Disclosure**: UI elements appear contextually based on user selections
- **Real-time Updates**: Timeline preview refreshes automatically when selections change

### API Specification & Type Safety
- **Enhanced OpenAPI Schema**: Comprehensive updates for dual intake system
  - **New Schemas**:
    - `CoursePlanStructure`: Complete course plan definition with subjects and durations
    - `PrerequisiteItem`: Prerequisite relationship with type (Required/Recommended)
    - `ProgressionPreview`: Timeline data for both intake models
    - `FixedIntakeTimelineItem`: Subject timeline with actual dates
    - `RollingIntakeSequenceItem`: Rolling progression with availability dates
  - **Date Fields**: Added `start_date`, `end_date`, `available_from_date`, `estimated_completion_date`
- **Type Generation**: Updated both frontend and backend types using flow.md procedures
- **Validation**: Enhanced Zod schemas for intake model validation and conditional field requirements

### Application Schema Updates
- **Enhanced Enrolment Details**: Updated `EnrolmentDetailsSchema` to support dual intake models
  - Added `coursePlanId` for Rolling intake
  - Added `intakeModel` field ('Fixed' | 'Rolling')
  - Made `courseOfferingId`, `startDate`, `expectedCompletionDate` conditional based on intake model
  - **Smart Validation**: Conditional requirements based on selected intake model

### Technical Improvements
- **Error Handling**: Fixed 500 Internal Server Error in progression preview API
- **TypeScript Compliance**: Resolved all compilation errors in Supabase Edge Functions
- **Kysely Query Optimization**: Fixed database query syntax for proper type safety
- **API Endpoint Corrections**: Fixed incorrect URL paths in frontend hooks
- **Date Calculations**: Implemented robust date arithmetic for timeline generation

### Development Workflow
- **API-First Development**: Followed flow.md procedures for type generation and validation
- **Type Safety**: Generated types for both frontend and backend from OpenAPI specification
- **Database Management**: Created properly ordered migrations with schema validation
- **Testing**: Comprehensive testing of progression preview functionality

### User Interface Enhancements
- **Modern Design**: Maintained ShadCN UI consistency throughout
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive Layout**: Mobile-first design with proper breakpoints
- **Loading States**: Skeleton loading and progress indicators
- **Error States**: Graceful error handling with user-friendly messages

### Known Limitations & Future Enhancements
- **Prerequisites**: Currently simplified (no complex prerequisite chains implemented)
- **Progression Logic**: Basic phase calculation (all subjects in single phase)
- **Date Calculations**: Weekly-based calculations (could be enhanced with business days)
- **Validation**: Could be enhanced with more sophisticated prerequisite validation

---

## 2025-09-13 — Payment Templates Migration & Enhanced Finance Management

### Business Logic (authoritative summary)
- **Payment Templates Migration**: Moved payment templates from Programs page to dedicated Finance section
- **Enhanced Finance Structure**: Created comprehensive finance management system with dedicated payment plans page
- **Improved User Experience**: Separated concerns between program management and financial management

### Frontend — Payment Templates Migration
- **New Finance Page**: Created dedicated `/finance/payment-plans` page with advanced payment template management
  - **Enhanced UI**: Modern, polished interface with comprehensive template management
  - **Advanced Features**: Template duplication, bulk operations, enhanced preview system
  - **Better Organization**: Templates organized in a clean grid layout with detailed previews
- **Removed from Programs**: Eliminated payment templates tab from programs page for better separation of concerns
- **Updated Navigation**: Enhanced sidebar navigation with proper Finance section organization

### Frontend — Advanced Payment Templates Component
- **Enhanced Template Management**: 
  - **Template Grid**: Clean, organized display of all payment templates with status indicators
  - **Template Details**: Comprehensive template information with instalment previews
  - **Advanced Editor**: Full-featured modal editor with enhanced UI and better user experience
- **Improved Functionality**:
  - **Template Duplication**: Easy duplication of existing templates with custom names
  - **Enhanced Presets**: Quick preset templates for common payment structures
  - **Bulk Operations**: Advanced tools for managing multiple instalments simultaneously
  - **Real-time Preview**: Live preview of payment schedules with actual dates
- **Better User Experience**:
  - **Loading States**: Comprehensive skeleton loading states throughout the interface
  - **Error Handling**: Improved error messages and validation feedback
  - **Responsive Design**: Mobile-first design with proper responsive layouts
  - **Accessibility**: Enhanced accessibility with proper ARIA labels and keyboard navigation

### Frontend — Enhanced Finance Dashboard
- **Comprehensive Stats**: Real-time statistics showing total templates, active programs, and financial metrics
- **Program Integration**: Seamless integration with existing program management system
- **Smart Selection**: Program selector with payment plan context and statistics
- **Visual Indicators**: Clear visual feedback for default templates and template status

### Frontend — Programs Page Cleanup
- **Simplified Interface**: Removed payment templates tab for cleaner, more focused program management
- **Updated Layout**: Adjusted grid layout from 3 columns to 2 columns after removing payment templates
- **Cleaner Navigation**: Streamlined tabs with only Course Plans and Offerings
- **Updated Descriptions**: Revised page descriptions to reflect the new structure

### Technical Improvements
- **Component Architecture**: Created modular, reusable components for payment template management
- **Type Safety**: Maintained full TypeScript compliance throughout the migration
- **Performance**: Optimized component rendering with proper state management
- **Code Organization**: Better separation of concerns between program and finance management

### Navigation & UX Enhancements
- **Finance Section**: Properly organized Finance section in sidebar navigation
- **Icon Updates**: Updated payment plans icon to CalendarDays for better visual distinction
- **Breadcrumb Context**: Clear navigation context for finance-related operations
- **Consistent Design**: Maintained ShadCN design system consistency throughout

### Migration Benefits
- **Better Organization**: Clear separation between academic and financial management
- **Enhanced Usability**: Dedicated space for comprehensive payment template management
- **Improved Scalability**: Better foundation for future finance-related features
- **User Experience**: More intuitive workflow for finance operations

---

## 2025-09-11 — Application Wizard Pipeline, Offer/Email, Status Flow, CoE Upload

### Business Logic (authoritative summary)
- Status lifecycle (allowed transitions only):
  1) Draft → 2) Submitted → 3) AwaitingPayment → 4) Accepted → 5) Approved → 6) Rejected (terminal)
- Key rules by stage:
  - Draft: fully editable; PATCH allowed.
  - Submitted: editing locked; staff can either send/download offer and move to AwaitingPayment; can Reject.
  - AwaitingPayment: only Accept or Reject allowed; Approve is NOT allowed here.
  - Accepted: staff may Approve (finalize) or Reject; optional CoE upload at this stage (metadata stored in Storage).
  - Approved: student becomes formal; no further transitions.
  - Rejected: closed.

### Backend — Supabase Edge Functions (applications)
- Endpoints implemented/updated:
  - POST `/applications/{id}/offer-letter`: robust template loading; uploads HTML and (optional) PDF; records `sms_op.application_documents` metadata.
  - POST `/applications/{id}/send-offer`: sends via Resend, attaches PDF/HTML; transitions → AwaitingPayment; idempotency via `Idempotency-Key`.
  - POST `/applications/{id}/mark-awaiting`: transitions → AwaitingPayment without sending email (requires existing offer).
  - POST `/applications/{id}/accept`: transitions Submitted/AwaitingPayment → Accepted; idempotent (200 if already Accepted).
  - POST `/applications/{id}/approve`: now requires current status = Accepted (not Submitted). Payload optional; falls back to stored snapshots if missing.
  - GET `/applications/{id}/documents`: lists stored docs.
  - GET `/applications/{id}/offer-latest`: streams latest offer artifact (PDF preferred) for download.
  - POST `/applications/{id}/coe`: accepts PDF, stores to `student-docs/applications/{id}/coe/vYYYY-MM-DD/coe.pdf`, records metadata. Guards: 404 if app missing; 400 if not Accepted.
  - Lists: added routes `GET /applications/awaiting`, `GET /applications/accepted`, `GET /applications/rejected` and widened general filter to include these statuses.

- CORS/headers: all actions use `FUNCTIONS_URL` + `getFunctionHeaders()` from the frontend.

- Structured logs: added `logTransition()` emitting JSON for `APPLICATION_STATUS_CHANGED` and `APPLICATION_DOC_UPLOADED` with `timestamp`, `applicationId`, and context (e.g., `from`, `to`, `via`, `idempotencyKey`). Responses include `transition` details where relevant.

### Backend — Storage, templates, resilience
- Offer template resolution tries both `applications/templates/offer_letter.html` and `_shared/templates/offer_letter.html`; falls back to minimal HTML to prevent 500s.
- Storage uploads use service role and `x-upsert`; paths:
  - Offer: `student-docs/applications/{id}/offer-letter/vYYYY-MM-DD/offer.html` and `offer.pdf`.
  - CoE: `student-docs/applications/{id}/coe/vYYYY-MM-DD/coe.pdf`.

### Backend — DB & migrations
- Status CHECK updated to include: `Draft, Submitted, AwaitingPayment, Accepted, Approved, Rejected`.
- New migration to permit `application_documents.doc_type` values: `OFFER_LETTER, COE, EVIDENCE, OTHER`.
- Note: Editing older migrations does not affect existing DBs; applied a new migration per policy.

### Frontend — Wizard & Review
- Wizard Step hydration fixed across Steps 2–4; selects are controlled; USI/exemption mutually exclusive; autosave sanitizes payload (does not clobber with blanks).
- Review Step: only “Submit” is shown now. On success it best‑effort generates the offer then redirects to `students/applications` (Submitted tab).

### Frontend — Applications list & actions
- Filters/views now include: Drafts, Submitted, Awaiting Payment, Accepted, Approved, Rejected, All.
- Actions by status:
  - Submitted: “Download Offer Letter & mark as Awaiting Payment”, “Send Offer Letter & mark as Awaiting Payment”, Reject.
  - Awaiting Payment: Accept, Reject (no Approve).
  - Accepted: Upload CoE (PDF), Approve, Reject.
- All actions switched to use `FUNCTIONS_URL` and central hooks; mutations invalidate queries so tabs refresh correctly post-action.

### Email (Resend) & env
- `RESEND_API_KEY` and `EMAIL_FROM` must be set for functions runtime (e.g., `supabase/.env` or `supabase secrets`). `.env.local` is only for Next.js and is not visible to Edge Functions.

### Known safeguards & idempotency
- `send-offer` supports `Idempotency-Key`; on repeat key, no duplicate sends.
- `accept`: idempotent (returns 200 if already Accepted).
- Robust error messages for missing app (404) and invalid status (400) across critical endpoints.

### Next (Phase 10 — E2E & hardening)
- Newman suites for happy path and negative cases; Assert logs/transition details; optional correlation-id pass-through; optional funds gating (APPROVAL_REQUIRE_FUNDS off by default).

---

## 2025-01-27 — Passport Processing Feature

### Added
- **Passport Processing Feature**: Automatic data extraction from passport documents using Mindee API
  - Auto-detection of passport files during upload (filename contains "passport")
  - Automatic form field population with extracted data
  - Visual feedback with emoji indicators (✅) for auto-filled fields
  - Country code mapping for nationality and issuing country conversion
  - Graceful error handling and partial data extraction
  - New `/passport-process` API endpoint with comprehensive OpenAPI specification

### Backend — Supabase Edge Functions
- **New Function**: `passport-process/index.ts`
  - Integrates with Mindee API for passport data extraction
  - Validates extracted data format and completeness
  - Maps country codes to internal system identifiers
  - Updates application payload with extracted personal information
  - Handles CRICOS details for international students
  - Stores raw extraction data for reference

### Frontend — Document Upload & Form Integration
- **Enhanced Document Upload**: Automatic passport processing on upload
- **UI Feedback**: Success notifications and emoji indicators for auto-filled fields
- **Form Integration**: Seamless data population in Step 2 (Personal Information)
- **Error Handling**: Graceful fallback when processing fails

### API Specification
- **New Endpoint**: `POST /passport-process`
- **New Schemas**: `PassportProcessRequest`, `PassportProcessResponse`, `ExtractedPassportData`
- **Type Generation**: Updated for both frontend and backend

### Environment Configuration
- **Mindee API**: Added `MINDEE_API_KEY` and `MINDEE_MODEL_ID` to `.env.local`
- **Security**: API keys stored server-side, never exposed to client

### Data Mapping
- **Personal Details**: First name, last name, gender, date of birth
- **International Students**: Passport number, issuing country, expiry date
- **Additional Data**: Nationality, place of birth, MRZ data for verification


