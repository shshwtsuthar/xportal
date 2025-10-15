# Student Data Structure & Storage

This document describes the normalized student data structure implemented in XPortal, including where each piece of application data is stored after approval.

## Overview

When an application transitions from `ACCEPTED` to `APPROVED`, all relevant data is copied from the application domain to the student domain using normalized sub-tables. This separation ensures clean data architecture and supports future student lifecycle management.

## Core Student Record

**Table:** `public.students`
- **Primary Key:** `id` (UUID)
- **Display ID:** `student_id_display` (unique text identifier)
- **Basic Info:** `first_name`, `last_name`, `email`, `date_of_birth`
- **Links:** `application_id` (FK to original application), `rto_id` (tenant isolation)

## Normalized Sub-Tables

### 1. Student Addresses

**Table:** `public.student_addresses`
- **Purpose:** Stores both street and postal addresses
- **Structure:**
  - `student_id` (FK to students)
  - `type` (enum: 'street' | 'postal')
  - `building_name`, `unit_details`, `number_name`, `po_box`
  - `suburb`, `state`, `postcode`, `country`
  - `is_primary` (boolean - street address is primary)

**Data Source:** Application fields `street_*` and `postal_*` arrays
**Logic:** If `postal_is_same_as_street` is true, only street address is stored

### 2. AVETMISS Compliance Data

**Table:** `public.student_avetmiss`
- **Purpose:** Stores all AVETMISS-compliant demographic data
- **Structure:**
  - `student_id` (FK to students)
  - `gender` (NAT00080: Client Gender)
  - `highest_school_level_id` (NAT00080: Highest School Level Completed)
  - `indigenous_status_id` (NAT00080: Indigenous Status)
  - `labour_force_status_id` (NAT00080: Labour Force Status)
  - `country_of_birth_id` (NAT00080: Country of Birth)
  - `language_code` (NAT00080: Language Identifier)
  - `citizenship_status_code` (NAT00080: Client Citizenship Status)
  - `at_school_flag` (NAT00080: At School Flag)

**Data Source:** Corresponding fields from application form

### 3. CRICOS Data (International Students)

**Table:** `public.student_cricos`
- **Purpose:** Stores international student compliance data
- **Structure:**
  - `student_id` (FK to students)
  - `is_international` (boolean flag)
  - `passport_number`, `visa_type`, `visa_number`
  - `country_of_citizenship`, `ielts_score`

**Data Source:** CRICOS-specific fields from application form

### 4. Emergency Contacts

**Table:** `public.student_contacts_emergency`
- **Purpose:** Stores emergency contact information
- **Structure:**
  - `student_id` (FK to students)
  - `name`, `relationship`, `phone_number`

**Data Source:** `ec_name`, `ec_relationship`, `ec_phone_number` from application

### 5. Guardian Contacts

**Table:** `public.student_contacts_guardians`
- **Purpose:** Stores guardian/parent contact information
- **Structure:**
  - `student_id` (FK to students)
  - `name`, `email`, `phone_number`

**Data Source:** `g_name`, `g_email`, `g_phone_number` from application

### 6. Student Documents

**Table:** `public.student_documents`
- **Purpose:** Metadata for files copied from application to student domain
- **Structure:**
  - `student_id` (FK to students)
  - `file_path` (path in Supabase Storage)
  - `category` (document type classification)
  - `sha256` (file integrity hash)
  - `size_bytes` (file size)
  - `source_application_id` (FK to original application)

**Storage:** Files copied from `applications/{applicationId}/` to `students/{studentId}/`

## Academic Data

### 1. Enrollment Record

**Table:** `public.enrollments`
- **Purpose:** Links student to program and tracks enrollment status
- **Structure:**
  - `student_id` (FK to students)
  - `program_id` (FK to programs)
  - `status` (enum: 'ACTIVE', 'COMPLETED', 'WITHDRAWN', etc.)
  - `commencement_date`, `expected_completion_date`
  - `payment_plan_template_id` (FK to payment templates)

### 2. Enrollment Subjects

**Table:** `public.enrollment_subjects`
- **Purpose:** Individual subject enrollments within the program
- **Structure:**
  - `enrollment_id` (FK to enrollments)
  - `program_plan_subject_id` (FK to program plan subjects)
  - `outcome_code` (completion status)
  - `start_date`, `end_date`
  - `is_catch_up` (boolean - for missed subjects)
  - `delivery_location_id`, `delivery_mode_id`
  - `scheduled_hours`

**Data Source:** Copied from `application_learning_subjects` during approval

### 3. Enrollment Classes

**Table:** `public.enrollment_classes`
- **Purpose:** Specific class sessions for enrolled subjects
- **Structure:**
  - `enrollment_id` (FK to enrollments)
  - `program_plan_class_id` (FK to program plan classes)
  - `class_date`, `start_time`, `end_time`
  - `trainer_id`, `location_id`, `classroom_id`
  - `class_type`, `notes`

**Data Source:** Copied from `application_learning_classes` during approval

## Financial Data

### 1. Invoices

**Table:** `public.invoices`
- **Purpose:** Generated payment requests for enrolled students
- **Structure:**
  - `enrollment_id` (FK to enrollments)
  - `status` (enum: 'SCHEDULED', 'SENT', 'PAID', 'OVERDUE')
  - `invoice_number` (unique identifier)
  - `issue_date`, `due_date`
  - `amount_due_cents`, `amount_paid_cents`

**Generation:** Created from `application_payment_schedule` snapshot or computed from payment plan template

### 2. Payments

**Table:** `public.payments`
- **Purpose:** Records of actual payments received
- **Structure:**
  - `invoice_id` (FK to invoices)
  - `payment_date`, `amount_cents`
  - `reconciliation_notes`

## Offer Letters

**Table:** `public.offer_letters`
- **Purpose:** Generated offer letter PDFs and metadata
- **Structure:**
  - `application_id` (FK to applications)
  - `student_id` (FK to students - set after approval)
  - `file_path` (path in Supabase Storage)
  - `version`, `template_key`
  - `generated_by`, `generated_at`
  - `sha256`, `size_bytes`

**Storage:** PDFs stored in `applications/{applicationId}/offer_letters/`
**Link:** After approval, `student_id` is populated to link letters to student record

## Data Flow Summary

1. **Application Phase:** Data collected in `applications` table and related application_* tables
2. **Approval Trigger:** Application status changes from `ACCEPTED` to `APPROVED`
3. **Data Copy:** All relevant data copied to normalized student domain tables
4. **File Migration:** Documents copied from application storage to student storage
5. **Invoice Generation:** Payment schedule materialized into invoices
6. **Link Creation:** Offer letters linked to student record

## Security & Access

- **Row-Level Security (RLS):** All tables use `rto_id` for tenant isolation
- **Policy Pattern:** `rto_id = public.get_my_rto_id()` for all operations
- **Foreign Keys:** Maintain referential integrity across all relationships
- **Audit Trail:** All changes logged in `events` table via database triggers

## Benefits of This Structure

1. **Separation of Concerns:** Application data separate from active student data
2. **Normalization:** Reduces redundancy and improves data integrity
3. **Compliance:** AVETMISS and CRICOS data properly structured for reporting
4. **Scalability:** Supports complex student lifecycle management
5. **Auditability:** Clear data lineage from application to student record
