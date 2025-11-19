# New Application Wizard - Complete Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Design Philosophy](#architecture--design-philosophy)
3. [Component Structure](#component-structure)
4. [Data Flow & State Management](#data-flow--state-management)
5. [Step-by-Step Flow](#step-by-step-flow)
6. [Validation System](#validation-system)
7. [Backend Integration](#backend-integration)
8. [User Experience Features](#user-experience-features)
9. [Error Handling & Edge Cases](#error-handling--edge-cases)
10. [Performance Optimizations](#performance-optimizations)

---

## Overview

The New Application Wizard is a comprehensive multi-step form system designed to collect student application data for Australian RTOs (Registered Training Organizations). It ensures compliance with AVETMISS (Australian Vocational Education and Training Management Information Statistical Standard) and CRICOS (Commonwealth Register of Institutions and Courses for Overseas Students) requirements.

### Key Characteristics

- **7-Step Wizard**: Personal Details → AVETMISS → CRICOS → Additional Info → Enrollment → Payment → Documents
- **Draft System**: Applications can be saved at any point with status `DRAFT`
- **Real-time Validation**: Submission readiness checker with animated counter
- **Server-First Validation**: Shared validation schema between client and server
- **Type-Safe**: Full TypeScript integration with generated database types
- **Progressive Enhancement**: Works with partial data, validates only on submission

---

## Architecture & Design Philosophy

### Core Principles

1. **Database Schema as Single Source of Truth**: All code serves the data model
2. **Backend-First Development**: Database → API/Hooks → UI
3. **Type Safety**: `database.types.ts` is the authoritative type source
4. **Shared Validation**: `src/lib/applicationSchema.ts` is used by both client and server
5. **TanStack Query**: All server state managed through React Query hooks
6. **React Hook Form**: Form state management with Zod validation

### Technology Stack

- **Frontend Framework**: Next.js 15 (App Router) with React 19
- **Form Management**: React Hook Form with Zod resolvers
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: ShadCN UI components
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Validation**: Zod schemas shared between client and server
- **Type Generation**: Auto-generated from Supabase migrations

---

## Component Structure

### Main Wizard Component

**File**: `app/(app)/applications/_components/NewApplicationWizard.tsx`

The main orchestrator component that:

- Manages the 7-step navigation
- Maintains form state using React Hook Form
- Handles draft saving and application submission
- Displays submission readiness status
- Coordinates between step components

**Key Props**:
```typescript
type Props = { applicationId?: string };
```

**Key State**:
- `activeStep`: Current step index (0-6)
- `isSubmitting`: Prevents double submission
- `isMounted`: Prevents hydration mismatches
- `isReadOnly`: Derived from application status (read-only if not DRAFT)

**Key Hooks Used**:
- `useForm` from React Hook Form with `draftApplicationSchema` resolver
- `useCreateApplication`: Creates new DRAFT application
- `useGetApplication`: Fetches existing application
- `useUpdateApplication`: Updates application fields
- `useSubmitApplication`: Calls edge function to submit
- `useSubmissionReadiness`: Real-time readiness checking
- `useUploadApplicationFile`: File uploads

### Step Components

#### Step 1: Personal Details
**File**: `app/(app)/applications/_components/steps/Step1_PersonalDetails.tsx`

**Fields Collected**:
- Personal identity: salutation, first/middle/last name, preferred name, date of birth
- Agent selection (optional)
- Contact details: email (required), work phone, mobile phone (required), alternative email
- Street address: Building name, unit details, street number/name, PO Box, suburb, state, postcode, country
- Postal address: Same as street checkbox, or separate postal address fields
- Emergency contact: Name, relationship, phone number
- Parent/Guardian: Name, email, phone number, relationship

**Special Features**:
- **Address Autocomplete**: Mappify integration via `AddressSearchCommand` component
  - Searches Australian addresses via Mappify API
  - Auto-fills street address fields
  - Optionally syncs to postal address if "same as street" is checked
  - Postal address search maintains independence when checkbox is unchecked
- **Country/State Selectors**: Smart dropdowns that filter based on context
- **Date of Birth Validation**: Must be valid date, student must be at least 15 years old

**Reactive Logic**:
- `is_international` flag derived from `citizenship_status_code` (set in Step 2)
- Street country required for international students
- Postal address fields conditionally shown based on `postal_is_same_as_street` checkbox

#### Step 2: AVETMISS Details
**File**: `app/(app)/applications/_components/steps/Step2_AvetmissDetails.tsx`

**Fields Collected**:
- **Demographic Information**:
  - Gender (M/F/X/@) - NAT00080 compliant
  - Indigenous status (1-9 codes)
  - Country of birth
  - Main language at home (language codes)
  - Citizenship status (AUS/PR/INTL) - **Critical**: Sets `is_international` flag

- **Education Background**:
  - Highest school level completed (08-12, 02 for "Did not go to school")
  - Year highest school level completed:
    - If level = "02" → Must be "@@@@"
    - Otherwise → 2-digit year (e.g., "95") or "@@" for not provided
  - Currently at school flag (Y/N)

- **Employment Status**:
  - Labour force status (01-06 codes)

- **Student Identifiers**:
  - **VSN (Victorian Student Number)**: 
    - Conditionally required: VIC state + age < 25 + domestic student
    - Format: 9 digits or "000000000" if not available
    - Checkbox to mark "I don't have a VSN"
  - **USI (Unique Student Identifier)**:
    - Required for domestic students (unless exemption)
    - Format: 10 alphanumeric characters (uppercase)
    - Link to create USI at usi.gov.au
    - Exemption codes: INDIV (Individual), INTOFF (Overseas/International)

**Reactive Logic**:
- Age calculation from date of birth (used for VSN requirement)
- VSN field visibility based on state, age, and international status
- USI requirement based on international status
- Citizenship status change automatically updates `is_international` flag

**AVETMISS Compliance**:
- All field codes match NAT00080 and NAT00085 specifications
- Year field logic matches AVETMISS rules exactly
- Gender codes restricted to M/F/X/@
- Flags use Y/N/@ format

#### Step 3: CRICOS
**File**: `app/(app)/applications/_components/steps/Step3_Cricos.tsx`

**Visibility**: Only shown if `is_international === true`

**Status Display**: Read-only badge showing "International" or "Domestic" (derived from citizenship)

**Fields Collected** (only for international students):

- **Passport & Visa Information**:
  - Passport number (required if student in Australia)
  - Holds Australian visa (checkbox)
  - Passport issue date
  - Passport expiry date
  - Place of birth
  - Visa type
  - Visa number (required if `holds_visa === true`)
  - Visa application office
  - Country of citizenship (required)

- **Under 18 Welfare Arrangements**:
  - Is student under 18 at course commencement? (checkbox)
  - Provider accepting welfare responsibility? (Yes/No)
  - Welfare start date (required if provider accepts responsibility)
  - If provider does NOT accept responsibility:
    - Parent/Legal Guardian full name (required)
    - Relationship to student (required)
    - Mobile phone (required)
    - Email (required)

- **OSHC (Overseas Student Health Cover)**:
  - Provider arranged OSHC? (checkbox)
  - If yes:
    - OSHC provider name (required) - Select from: Allianz, BUPA, Medibank, NIB, AHM
    - OSHC start date (required)
    - OSHC end date (required)

- **English Language Proficiency**:
  - Has student undertaken English test? (checkbox)
  - If yes:
    - Test type (required) - IELTS, TOEFL iBT, PTE, Cambridge CAE, OET, Other
    - Test score (required) - e.g., "6.5"
    - Test date

- **Previous Study in Australia**:
  - Has student previously studied in Australia? (checkbox)
  - If yes:
    - Previous provider name (required)
    - Completed previous course? (Yes/No, required)
    - Has release letter? (Yes/No, required)

**Reactive Logic**:
- All CRICOS fields conditionally shown based on parent checkboxes
- Under 18 calculation can be derived from age at commencement date
- Passport number required only if student address is in Australia
- Visa number required only if `holds_visa === true`

**CRICOS Compliance**:
- All fields match CRICOS data collection requirements
- Welfare arrangements comply with ESOS Act
- OSHC requirements match visa duration rules

#### Step 4: Additional Info
**File**: `app/(app)/applications/_components/steps/Step3_AdditionalInfo.tsx`

**Fields Collected**:

- **Disability Information** (NAT00090):
  - Disability flag (Y/N/@) - AVETMISS compliant
  - If flag = "Y":
    - Disability types (checkboxes, multiple allowed):
      - 11: Hearing/deaf
      - 12: Physical
      - 13: Intellectual
      - 14: Learning
      - 15: Mental illness
      - 16: Acquired brain impairment
      - 17: Vision
      - 18: Medical condition
      - 19: Other
    - Validation: Cannot select "Other" (19) if specific types (11-18) are selected

- **Prior Educational Achievement** (NAT00085):
  - Prior education flag (Y/N/@) - AVETMISS compliant
  - If flag = "Y":
    - Qualifications (checkboxes with recognition types):
      - 008: Bachelor degree or higher
      - 410: Advanced Diploma or Associate Degree
      - 420: Diploma
      - 511: Certificate IV
      - 514: Certificate III
      - 521: Certificate II
      - 524: Certificate I
      - 990: Other education
    - Recognition types (for each qualification):
      - A: Australian
      - E: Australian Equivalent
      - I: International
    - Each qualification can have multiple recognition types selected

**Data Persistence**:
- Disabilities stored in `application_disabilities` junction table
- Prior education stored in `application_prior_education` junction table
- Flags stored directly in `applications` table
- Form state synced with database on load and save

**Special Logic**:
- Loading existing disabilities/prior education from database on mount
- Syncing form state with database state
- Preventing duplicate selections
- Clearing arrays when flags change to N or @

#### Step 5: Enrollment
**File**: `app/(app)/applications/_components/steps/Step4_Enrollment.tsx`

**Fields Collected**:
- Program selection (required)
- Timetable selection (required, filtered by program)
- Proposed commencement date (required, must be future date)

**Features**:
- **Program Dropdown**: Loads all available programs via `useGetPrograms()`
- **Timetable Dropdown**: 
  - Loads timetables filtered by selected program via `useGetTimetables(programId)`
  - Cleared when program changes
  - Shows loading/empty states appropriately
- **Commencement Date Picker**:
  - Calendar component with date restrictions
  - Disables past dates
  - Updates form state on selection
- **Enrollment Preview**: Shows learning plan preview via `EnrollmentPreview` component
- **Ongoing Subject Preview**: Shows ongoing subjects via `OngoingSubjectPreview` component

**Reactive Logic**:
- Timetable options filtered by program selection
- Commencement date cleared when program/timetable changes
- Local state management for immediate UI reactivity
- Form state synced with local state

**Learning Plan**:
- When program, timetable, and commencement date are set, a draft learning plan is generated
- Learning plan is frozen on submission (cannot be changed after submit)
- Preview shows subject enrollments and progression

#### Step 6: Payment
**File**: `app/(app)/applications/_components/PaymentStep.tsx`

**Fields Collected**:
- Payment plan template selection (optional)
- Payment anchor date (required if template selected)

**Features**:
- **Template Selection**: 
  - Loads payment plan templates filtered by program via `useGetPaymentPlanTemplates(programId)`
  - Shows default template if available
  - Displays template name with "(Default)" indicator
- **Anchor Date Picker**: 
  - Calendar component for selecting anchor date
  - Used to calculate payment due dates
- **Schedule Preview Table**:
  - Shows calculated payment schedule based on template and anchor date
  - Displays installment name, amount, and due date
  - Updates reactively when template or anchor date changes
  - Uses `calculateDueDates()` utility function

**Payment Schedule Generation**:
- When template and anchor date are set, installments are calculated
- Each installment has:
  - Name (from template)
  - Amount (from template)
  - Due date (calculated from anchor date + offset)
- Schedule is persisted as draft on save
- Final schedule created on application approval

**Reactive Logic**:
- Template selection updates form state
- Anchor date updates form state
- Preview recalculates when either changes
- Form values synced with component state

#### Step 7: Documents
**File**: `app/(app)/applications/_components/DocumentsPane.tsx`

**Features**:
- **File Upload**:
  - Drag-and-drop zone using `react-dropzone`
  - Click to select files
  - Accepted types: PDF, Images (PNG/JPG/JPEG/GIF/WebP), DOCX
  - Max file size: 10MB per file
  - Multiple files can be uploaded
- **File List**:
  - Table showing all uploaded files
  - Download button (generates signed URL)
  - Delete button (with confirmation dialog)
- **File Management**:
  - Files stored in Supabase Storage bucket
  - Path: `applications/{applicationId}/{filename}`
  - Signed URLs generated for downloads (60-second expiry)
  - Files can be deleted individually

**Hooks Used**:
- `useListApplicationFiles`: Lists files for application
- `useUploadApplicationFile`: Uploads file to storage
- `useDeleteApplicationFile`: Deletes file from storage
- `useCreateSignedUrl`: Generates temporary download URL

**State Management**:
- Files list fetched via TanStack Query
- Upload mutations invalidate file list query
- Loading and error states handled

---

## Data Flow & State Management

### Form State Architecture

The wizard uses **React Hook Form** for form state management:

```typescript
const form = useForm({
  resolver: zodResolver(draftApplicationSchema), // Draft schema allows partial data
  defaultValues: { /* 50+ fields with defaults */ }
});
```

**Key Characteristics**:
- **Draft Schema**: Uses `draftApplicationSchema` which is `applicationSchema.partial()` - allows empty strings and optional fields
- **Full Schema**: Used only for submission validation via `validateSubmission()`
- **Default Values**: All fields have sensible defaults (empty strings, false, '@' for flags)
- **Type Safety**: Form values typed as `Partial<ApplicationFormValues>`

### Server State Architecture

**TanStack Query** manages all server state:

**Query Hooks** (Read Operations):
- `useGetApplication(id)`: Fetches single application
- `useGetApplications(filters)`: Fetches application list
- `useGetAgents()`: Fetches agents for dropdown
- `useGetPrograms()`: Fetches programs
- `useGetTimetables(programId)`: Fetches timetables for program
- `useGetPaymentPlanTemplates(programId)`: Fetches payment templates
- `useGetTemplateInstallments(templateId)`: Fetches installment schedule
- `useGetApplicationDisabilities(applicationId)`: Fetches disabilities
- `useGetApplicationPriorEducation(applicationId)`: Fetches prior education
- `useListApplicationFiles(applicationId)`: Lists uploaded files

**Mutation Hooks** (Write Operations):
- `useCreateApplication()`: Creates new DRAFT application
- `useUpdateApplication()`: Updates application fields
- `useSubmitApplication()`: Calls edge function to submit
- `useUploadApplicationFile()`: Uploads file to storage
- `useDeleteApplicationFile()`: Deletes file from storage

**Query Invalidation Strategy**:
- Updates invalidate relevant queries to keep UI in sync
- `onSuccess` callbacks invalidate queries
- Optimistic updates where appropriate

### Application Lifecycle

1. **Creation**:
   - User navigates to `/applications/new`
   - No application exists initially
   - User fills form and clicks "Save Draft"
   - `useCreateApplication()` creates DRAFT application
   - URL updates to `/applications/edit/{id}`

2. **Editing**:
   - User navigates to `/applications/edit/{id}`
   - `useGetApplication(id)` fetches application
   - Form populated via `form.reset()` in `useEffect`
   - User makes changes
   - "Save Draft" calls `useUpdateApplication()`

3. **Submission**:
   - User clicks "Submit Application"
   - `handleSubmitApplication()` executes:
     - Saves draft (ensures DB is up-to-date)
     - Fetches complete application + arrays from DB
     - Validates using `validateSubmission()`
     - Calls `useSubmitApplication()` → Edge Function
     - Edge function validates again and updates status to SUBMITTED
   - Redirects to `/applications`

### Data Persistence Flow

**Draft Save Process**:

1. **Form Values Extraction**:
   ```typescript
   const values = form.getValues();
   ```

2. **Date Normalization**:
   - Date objects converted to ISO strings (YYYY-MM-DD)
   - Empty strings converted to `null` for optional fields

3. **Array Separation**:
   - `disabilities` and `prior_education` arrays extracted
   - Not stored in `applications` table (stored in junction tables)

4. **Flag Normalization**:
   - `null` → `undefined` for optional flags
   - Ensures consistency with schema

5. **Database Update**:
   - `useUpdateApplication()` updates `applications` table
   - `afterPersistDisabilitiesAndPriorEducation()` updates junction tables:
     - Deletes all existing records
     - Inserts new records from form arrays

6. **Related Data Persistence**:
   - `afterPersistLearningPlan()`: Generates draft learning plan if timetable + date exist
   - `afterPersistPaymentSchedule()`: Generates draft payment schedule if template + anchor date exist

**Submission Process**:

1. **Pre-Submission Save**:
   - Ensures form state is synced to database
   - Critical because server validation reads from DB, not form

2. **Database Fetch**:
   - Fetches complete application row
   - Fetches disabilities array from `application_disabilities`
   - Fetches prior_education array from `application_prior_education`

3. **Client-Side Validation**:
   - Uses `validateSubmission()` with full schema
   - Shows user-friendly error messages
   - Prevents unnecessary server calls

4. **Server-Side Validation**:
   - Edge function fetches application again
   - Validates using same shared schema
   - Ensures data integrity

5. **Status Transition**:
   - Updates status from DRAFT → SUBMITTED
   - Freezes learning plan snapshot
   - Computes and persists derived fields

---

## Step-by-Step Flow

### Initial Load

**Scenario 1: New Application** (`/applications/new`):
1. Component mounts with `applicationId = undefined`
2. Form initialized with default values
3. No application data loaded
4. User can start filling form immediately
5. On first "Save Draft", application is created

**Scenario 2: Edit Existing** (`/applications/edit/{id}`):
1. Component mounts with `applicationId = {id}`
2. `useGetApplication(id)` fetches application
3. `useEffect` watches `currentApplication`
4. When data loads, `form.reset()` populates form
5. Related data (disabilities, prior education) loaded separately
6. Form ready for editing

### Step Navigation

**Navigation Methods**:
- **Step Buttons**: Click step button in header to jump to any step
- **Previous/Next Buttons**: Navigate sequentially
- **Auto-Save on Navigation**: `goStep()` calls `handleSaveDraft()` before changing step

**Step Validation**:
- No step-level validation (allows partial completion)
- Validation only occurs on submission
- User can navigate freely between steps

### Draft Saving

**Trigger Points**:
1. **Manual**: Click "Save Draft" button (or Ctrl+S / Cmd+S)
2. **Automatic**: Navigate to different step
3. **Keyboard Shortcut**: Ctrl+S (Windows/Linux) or Cmd+S (Mac)

**Save Process**:
1. Check if read-only (prevent save if submitted)
2. Extract form values
3. Normalize dates and flags
4. Separate arrays from main data
5. Update `applications` table
6. Update junction tables (disabilities, prior education)
7. Generate learning plan (if conditions met)
8. Generate payment schedule (if conditions met)
9. Show success toast

**Error Handling**:
- Network errors show error toast
- Validation errors prevented (draft schema allows partial data)
- Retry logic for transient failures

### Submission Readiness

**Real-Time Checking**:
- `useSubmissionReadiness()` hook monitors form state
- Debounced (150ms) to avoid excessive computation
- Single subscription to form changes (not 45+ watchers)

**Readiness Calculation**:
1. Normalize form values (dates, flags, arrays)
2. Derive `is_international` from citizenship
3. Call `getSubmissionMissingFields()` with normalized values
4. Returns array of missing field names
5. `isReady = missing.length === 0`

**UI Display**:
- **SubmissionReadinessCard**: Shows readiness status
- **Animated Counter**: Uses `NumberFlow` component for smooth transitions
- **Missing Fields Preview**: Shows first 10 missing fields as badges
- **Remainder Count**: "+X more" badge if more than 10 missing
- **Validation State**: Shows "Updating..." spinner while validating

**Submit Button**:
- Only enabled when `isFormReadyForSubmission === true`
- Disabled during submission or validation
- Shows "Submitting..." state

### Submission Process

**Detailed Flow**:

1. **Pre-Submission Validation**:
   ```typescript
   if (!currentApplication?.id) {
     toast.error('No application found. Please save your draft first.');
     return;
   }
   ```

2. **Save Draft First**:
   - Ensures form state (especially arrays) is synced to database
   - Critical because server validation reads from DB
   - Uses Promise wrapper to await completion

3. **Fetch Complete State**:
   ```typescript
   // Fetch application
   const { data: savedApplication } = await supabase
     .from('applications')
     .select('*')
     .eq('id', currentApplication.id)
     .single();
   
   // Fetch arrays
   const { data: disabilitiesData } = await supabase
     .from('application_disabilities')
     .select('disability_type_id')
     .eq('application_id', currentApplication.id);
   
   const { data: priorEdData } = await supabase
     .from('application_prior_education')
     .select('prior_achievement_id, recognition_type')
     .eq('application_id', currentApplication.id);
   ```

4. **Transform to Schema Format**:
   ```typescript
   const applicationWithArrays = {
     ...savedApplication,
     disabilities: disabilitiesData.map(d => ({
       disability_type_id: d.disability_type_id
     })),
     prior_education: priorEdData.map(e => ({
       prior_achievement_id: e.prior_achievement_id,
       recognition_type: e.recognition_type || undefined
     }))
   };
   ```

5. **Client-Side Validation**:
   ```typescript
   const validation = validateSubmission(applicationWithArrays);
   if (!validation.ok) {
     toast.error(`Validation failed: ${errorMessages}`);
     return;
   }
   ```

6. **Call Edge Function**:
   ```typescript
   submitMutation.mutate(
     { applicationId: currentApplication.id },
     {
       onSuccess: () => {
         toast.success('Application submitted successfully');
         window.location.href = '/applications';
       },
       onError: (e) => {
         toast.error(`Failed to submit: ${String(e)}`);
       }
     }
   );
   ```

7. **Edge Function Processing**:
   - Validates application status is DRAFT
   - Fetches application + arrays from database
   - Validates using shared schema
   - Freezes learning plan snapshot
   - Computes derived fields (survey_contact_status, is_under_18)
   - Updates status to SUBMITTED
   - Returns success response

---

## Validation System

### Schema Architecture

**Master Schema**: `src/lib/applicationSchema.ts`
- Single source of truth for all validation rules
- Used by both client and server
- Exported to edge functions via `_shared/application.ts`

**Draft Schema**: `src/schemas/application-draft.ts`
```typescript
export const draftApplicationSchema = applicationSchema.partial();
```
- Makes all fields optional
- Allows empty strings
- Used for form validation (allows partial completion)

**Submission Schema**: `src/schemas/application-submission.ts`
- Uses master schema directly
- Adds normalization functions
- Includes `getSubmissionMissingFields()` helper
- Includes `validateSubmission()` function

### Validation Layers

**Layer 1: Form Validation (Draft Schema)**
- Purpose: Format validation only
- When: On field blur/change
- Schema: `draftApplicationSchema` (all optional)
- Errors: Format errors only (e.g., invalid email format)

**Layer 2: Submission Readiness (Client)**
- Purpose: Check if all required fields are filled
- When: Real-time (debounced 150ms)
- Function: `getSubmissionMissingFields()`
- Errors: Lists missing required fields
- Non-blocking: User can still navigate/save draft

**Layer 3: Client-Side Submission Validation**
- Purpose: Final check before server call
- When: On "Submit Application" click
- Function: `validateSubmission()`
- Schema: Full `applicationSchema`
- Errors: Blocks submission, shows user-friendly messages

**Layer 4: Server-Side Validation (Edge Function)**
- Purpose: Authoritative validation
- When: In `submit-application` edge function
- Function: `validateSubmission()` (shared)
- Schema: Full `applicationSchema`
- Errors: Returns 400 with error details

### Validation Rules

**AVETMISS Rules**:

1. **Date of Birth**:
   - Required
   - Must be valid date
   - Student must be at least 15 years old
   - Format: YYYY-MM-DD (stored as Date in DB)

2. **Year Highest School Level Completed**:
   - If `highest_school_level_id === '02'` → Must be "@@@@"
   - Otherwise → Must be 2-digit year (e.g., "95") or "@@"
   - Required if level is not "02"

3. **USI**:
   - Required for domestic students
   - Format: 10 alphanumeric characters (uppercase)
   - Exemptions: INDIV (Individual), INTOFF (Overseas/International)
   - Not required if exemption code present

4. **VSN**:
   - Required for VIC domestic students under 25
   - Format: 9 digits or "000000000"
   - Calculated from: state === 'VIC' && age < 25 && is_international === false

5. **Disability Flag**:
   - Required on submission: Y, N, or @
   - If Y → `disabilities` array must have at least one item
   - If N or @ → `disabilities` array must be empty

6. **Prior Education Flag**:
   - Required on submission: Y, N, or @
   - If Y → `prior_education` array must have at least one item
   - If N or @ → `prior_education` array must be empty

7. **Mobile Phone**:
   - Required for all students (database constraint)
   - Must not be empty string

8. **Email**:
   - Required (database constraint on submission)
   - Must be valid email format

**CRICOS Rules** (International Students Only):

1. **Country of Citizenship**: Required

2. **Street Country**: Required

3. **Passport Number**: Required if student address is in Australia

4. **Visa Number**: Required if `holds_visa === true`

5. **Under 18 Welfare**:
   - If `is_under_18 === true`:
     - `provider_accepting_welfare_responsibility` required
     - If provider accepts → `welfare_start_date` required
     - If provider does NOT accept → Guardian fields required:
       - `g_name`, `g_relationship`, `g_phone_number`, `g_email`

6. **OSHC**:
   - If `provider_arranged_oshc === true`:
     - `oshc_provider_name`, `oshc_start_date`, `oshc_end_date` required

7. **English Test**:
   - If `has_english_test === true`:
     - `english_test_type`, `ielts_score` required

8. **Previous Study**:
   - If `has_previous_study_australia === true`:
     - `previous_provider_name`, `completed_previous_course`, `has_release_letter` required

**Derived Fields**:

1. **is_international**:
   - Derived from `citizenship_status_code === 'INTL'`
   - Cannot be manually set (read-only badge in CRICOS step)

2. **survey_contact_status**:
   - Computed on server:
     - 'O' if international
     - 'M' if age < 15 at commencement
     - 'A' otherwise

3. **is_under_18**:
   - Can be manually set
   - Or computed from age at commencement date
   - Used for welfare requirements

### Normalization Functions

**Date Normalization**:
```typescript
function normalizeIncomingValues(values: unknown): unknown {
  // Convert Date objects to ISO strings (YYYY-MM-DD)
  // Ensure string dates are in YYYY-MM-DD format
}
```

**Flag Normalization**:
```typescript
function normalizeBooleanFlagToAvetmiss(value: unknown): 'Y' | 'N' | '@' | undefined {
  // Convert boolean → Y/N
  // Convert string → Y/N/@
  // null/undefined → undefined
}
```

**Null to Undefined**:
```typescript
function nullToUndefinedDeep<T>(value: T): T {
  // Recursively convert null → undefined
  // Needed because Zod treats null and undefined differently
}
```

**Alias Support**:
```typescript
// Support is_international_student alias
if (withUndef.is_international === undefined && 
    typeof withUndef.is_international_student === 'boolean') {
  withUndef.is_international = withUndef.is_international_student;
}
```

---

## Backend Integration

### Edge Function: submit-application

**File**: `supabase/functions/submit-application/index.ts`

**Purpose**: 
- Server-side validation and status transition
- Ensures data integrity before submission
- Freezes learning plan snapshot

**Flow**:

1. **CORS Handling**:
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
   ```

2. **Authentication**:
   ```typescript
   const supabaseClient = createClient(
     Deno.env.get('SUPABASE_URL'),
     Deno.env.get('SUPABASE_ANON_KEY'),
     {
       global: {
         headers: { Authorization: req.headers.get('Authorization')! }
       }
     }
   );
   ```

3. **Status Check**:
   ```typescript
   if (application.status !== 'DRAFT') {
     return new Response(/* 409 Conflict */);
   }
   ```

4. **Fetch Arrays**:
   - Fetches disabilities from `application_disabilities`
   - Fetches prior education from `application_prior_education`

5. **Validation**:
   ```typescript
   const validation = validateSubmission(applicationWithArrays);
   if (!validation.ok) {
     return new Response(/* 400 Bad Request */);
   }
   ```

6. **Freeze Learning Plan**:
   ```typescript
   await supabaseClient.rpc('freeze_application_learning_plan', {
     app_id: applicationId
   });
   ```

7. **Compute Derived Fields**:
   ```typescript
   const { survey_contact_status, is_under_18 } = computeDerivedFields(
     application as SubmissionValues
   );
   ```

8. **Update Status**:
   ```typescript
   await supabaseClient
     .from('applications')
     .update({ 
       status: 'SUBMITTED',
       survey_contact_status,
       is_under_18
     })
     .eq('id', applicationId);
   ```

**Error Responses**:
- 400: Validation failed (with error details)
- 404: Application not found
- 409: Application already submitted
- 500: Internal server error

### Database Functions

**freeze_application_learning_plan**:
- Creates snapshot of learning plan
- Prevents changes after submission
- Called before status update

**upsert_application_learning_plan_draft**:
- Generates draft learning plan
- Called on draft save if timetable + date exist
- Can be regenerated until submission

**upsert_application_payment_schedule_draft**:
- Generates draft payment schedule
- Called on draft save if template + anchor date exist
- Can be regenerated until submission

### Storage Integration

**File Upload**:
- Bucket: `application-files` (or similar)
- Path: `applications/{applicationId}/{filename}`
- RLS policies restrict access to application owner/RTO

**Signed URLs**:
- Generated for downloads
- 60-second expiry
- Secure access without public bucket

---

## User Experience Features

### Keyboard Shortcuts

**Save Draft**: Ctrl+S (Windows/Linux) or Cmd+S (Mac)
- Prevents default browser save dialog
- Only works when form is not read-only
- Shows keyboard shortcut hint in button

**Implementation**:
```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && 
        event.key === 's' && 
        !event.shiftKey && 
        !event.altKey) {
      event.preventDefault();
      handleSaveDraftRef.current();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [/* deps */]);
```

### Submission Readiness Indicator

**Visual Design**:
- Card with dashed border
- Shows "Submission readiness" header
- Animated counter using NumberFlow
- Missing fields shown as badges
- "Updating..." spinner during validation

**States**:
1. **Ready**: Green text "All mandatory fields are completed. You can submit."
2. **Not Ready**: Shows count + "requirements remaining" + field badges
3. **Validating**: Shows spinner + "Updating..." text

**Performance**:
- Debounced 150ms to avoid excessive computation
- Single form subscription (not per-field)
- Memoized preview (first 10 fields + remainder count)

### Step Navigation

**Step Buttons**:
- Click any step button to jump to that step
- Current step highlighted (default variant)
- Other steps outlined (outline variant)
- Auto-saves draft before navigation

**Previous/Next Buttons**:
- Sequential navigation
- Previous disabled on first step
- Next disabled on last step
- Auto-saves draft before navigation

### Address Autocomplete

**Mappify Integration**:
- Searches Australian addresses
- Debounced search (300ms)
- Shows suggestions in command palette
- Auto-fills all street address fields
- Optionally syncs to postal address

**User Flow**:
1. Click "Search address" button
2. Type address (e.g., "252 Botany Road")
3. Select suggestion from dropdown
4. All fields auto-filled
5. If "postal same as street" checked → postal fields also filled

**Postal Address Independence**:
- Can search postal address separately
- Unchecks "same as street" automatically
- Maintains separate postal address state

### File Upload

**Drag & Drop**:
- Large dropzone area
- Visual feedback on drag over
- Click to select files
- Multiple files supported

**File Types**:
- PDF documents
- Images (PNG, JPG, JPEG, GIF, WebP)
- DOCX documents
- Max size: 10MB per file

**Upload Flow**:
1. Select/drop files
2. Validate file type and size
3. Upload to Supabase Storage
4. Show success toast
5. Refresh file list
6. Files appear in table

**File Management**:
- Download: Generates signed URL, opens in new tab
- Delete: Confirmation dialog, removes from storage
- List: Shows all files for application

### Loading States

**Data Fetching**:
- Skeleton loaders for initial data
- Loading spinners for mutations
- Disabled buttons during operations

**Form Loading**:
- Application data: Shows loading state
- Form populated when data arrives
- Related data (disabilities, etc.) loaded separately

**Optimistic Updates**:
- Some mutations update cache immediately
- UI feels responsive
- Errors roll back if mutation fails

### Error Handling

**User-Friendly Messages**:
- Toast notifications for errors
- Specific error messages (not generic)
- Actionable guidance (e.g., "Save draft to enable uploads")

**Error Types**:
1. **Network Errors**: "Failed to save draft: {message}"
2. **Validation Errors**: "Validation failed: {field}: {message}"
3. **Permission Errors**: "Cannot save: Application is read-only"
4. **File Errors**: "File too large (max 10MB)"

**Error Recovery**:
- Retry buttons for failed operations
- Form state preserved on error
- No data loss on transient failures

---

## Error Handling & Edge Cases

### Read-Only Mode

**Trigger**: Application status is not DRAFT

**Behavior**:
- Form fields disabled (pointer-events-none, opacity-60)
- Save Draft button disabled
- Submit button hidden
- Step navigation disabled
- File upload disabled

**Implementation**:
```typescript
const isReadOnly = currentApplication?.status
  ? currentApplication.status !== 'DRAFT'
  : false;
```

### Missing Application ID

**Scenario**: User tries to submit before saving draft

**Handling**:
```typescript
if (!currentApplication?.id) {
  toast.error('No application found. Please save your draft first.');
  return;
}
```

### Concurrent Edits

**Scenario**: Multiple tabs editing same application

**Handling**:
- Last save wins (no conflict resolution)
- TanStack Query cache keeps UI in sync
- Refetch on window focus (if configured)

### Network Failures

**Scenario**: Save fails due to network error

**Handling**:
- Error toast shown
- Form state preserved
- User can retry
- No data loss

### Validation Failures

**Scenario**: Submission fails validation

**Handling**:
- Client-side validation shows errors before server call
- Server validation returns detailed error messages
- User can fix errors and retry
- Form state preserved

### Array Sync Issues

**Scenario**: Disabilities/prior education not syncing

**Handling**:
- Defensive checks: `values.disabilities || []`
- Database state loaded on mount
- Form state synced with database state
- Delete-all-then-insert strategy prevents duplicates

### Date Format Issues

**Scenario**: Date objects vs strings inconsistency

**Handling**:
- Normalization functions convert Date → string
- Schema accepts both Date and string
- Storage always uses ISO string (YYYY-MM-DD)

### Flag Normalization

**Scenario**: Flags are null/undefined/boolean instead of Y/N/@

**Handling**:
- Normalization converts boolean → Y/N
- null/undefined → '@' (default)
- Schema validation ensures correct format

### International Status Derivation

**Scenario**: is_international flag out of sync

**Handling**:
- Derived from citizenship_status_code on change
- Server recomputes on submission
- Read-only badge prevents manual changes

---

## Performance Optimizations

### Form Subscription Optimization

**Problem**: Watching 50+ fields individually causes excessive re-renders

**Solution**: Single form subscription
```typescript
useEffect(() => {
  const subscription = form.watch(() => {
    setIsValidating(true);
    recompute();
  });
  return () => subscription.unsubscribe();
}, [form, recompute]);
```

### Debounced Readiness Check

**Problem**: Validation runs on every keystroke

**Solution**: 150ms debounce
```typescript
const recompute = useDebouncedCallback(() => {
  // Validation logic
}, 150);
```

### Memoized Components

**Problem**: Unnecessary re-renders of step components

**Solution**: `useMemo` for step content
```typescript
const StepContent = useMemo(() => {
  if (activeStep === 0) return <Step1_PersonalDetails />;
  // ...
}, [activeStep, currentApplication, form]);
```

### Query Caching

**Problem**: Refetching same data repeatedly

**Solution**: TanStack Query caching
- Queries cached by key
- Stale time configuration
- Background refetching

### Optimistic Updates

**Problem**: UI feels slow on mutations

**Solution**: Optimistic cache updates
```typescript
onSuccess: (data, variables) => {
  queryClient.setQueryData(['application', variables.id], data);
  queryClient.invalidateQueries({ queryKey: ['applications'] });
}
```

### Lazy Loading

**Problem**: Loading all step components upfront

**Solution**: Dynamic imports (if needed)
- Currently all steps loaded (acceptable for 7 steps)
- Could use `React.lazy()` for code splitting if needed

### Array Operations

**Problem**: Recreating arrays on every render

**Solution**: Memoization and stable references
```typescript
const priorEducation = useMemo(
  () => priorEducationWatched || [],
  [priorEducationWatched]
);
```

### Ref Callbacks

**Problem**: Recreating event handlers

**Solution**: `useRef` for stable references
```typescript
const handleSaveDraftRef = useRef(handleSaveDraft);
useEffect(() => {
  handleSaveDraftRef.current = handleSaveDraft;
}, [handleSaveDraft]);
```

---

## Conclusion

The New Application Wizard is a sophisticated, production-ready system that handles complex validation requirements while providing an excellent user experience. Its architecture emphasizes type safety, shared validation logic, and progressive enhancement, making it maintainable and reliable.

Key strengths:
- **Single Source of Truth**: Database schema drives everything
- **Type Safety**: Full TypeScript integration
- **Shared Validation**: Client and server use same rules
- **Progressive Enhancement**: Works with partial data
- **Performance**: Optimized for responsiveness
- **User Experience**: Intuitive, helpful, forgiving

The system successfully balances the need for comprehensive data collection with user-friendly workflows, ensuring compliance with AVETMISS and CRICOS requirements while minimizing user friction.

