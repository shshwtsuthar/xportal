-- =============================================================================
-- MIGRATION:  Implement Two-Stage Enrolment Workflow
-- VERSION:    1.0
-- DESCRIPTION:
-- This script creates the necessary tables to support a robust, two-stage
-- application and enrolment process. It introduces the `applications` table
-- to manage draft and submitted applications, and the `enrolment_subjects`
-- table to act as a permanent, versioned "academic contract" for each student.
-- =============================================================================

-- Gap 7 & 2: A Two-Stage Enrolment Process (Applications)
-- The new entry point for the enrolment workflow, allowing for draft states.
CREATE TABLE IF NOT EXISTS sms_op.applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
    -- This JSONB blob will hold the incomplete FullEnrolmentPayload.
    application_payload jsonb,
    -- Once approved, we link it to the official records.
    created_client_id uuid UNIQUE REFERENCES core.clients(id) ON DELETE SET NULL,
    created_enrolment_id uuid UNIQUE REFERENCES sms_op.enrolments(id) ON DELETE SET NULL,
    created_by_staff_id uuid REFERENCES sms_op.staff(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Gap 4: Versioning the Academic Contract (The Enrolment Snapshot)
-- This is the immutable record of the course structure at the moment of enrolment.
CREATE TABLE IF NOT EXISTS sms_op.enrolment_subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    unit_type text NOT NULL CHECK (unit_type IN ('Core', 'Elective')),
    created_at timestamptz NOT NULL DEFAULT now(),

    -- CONSTRAINTS
    UNIQUE (enrolment_id, subject_id),
    CONSTRAINT fk_enrolment
        FOREIGN KEY(enrolment_id)
        REFERENCES sms_op.enrolments(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_subject
        FOREIGN KEY(subject_id)
        REFERENCES core.subjects(id)
        ON DELETE RESTRICT -- You cannot delete a subject if it's part of a historical enrolment contract.
);
CREATE INDEX IF NOT EXISTS idx_enrolment_subjects_enrolment_id ON sms_op.enrolment_subjects(enrolment_id);

-- Gap 4 (cont.): Add Snapshot Fields to the Enrolments Table
-- We use ALTER TABLE ... ADD COLUMN IF NOT EXISTS for idempotency.
ALTER TABLE sms_op.enrolments
ADD COLUMN IF NOT EXISTS agent_commission_rate_snapshot numeric(5, 2),
ADD COLUMN IF NOT EXISTS tuition_fee_snapshot numeric(10, 2);

COMMENT ON COLUMN sms_op.enrolments.agent_commission_rate_snapshot IS 'The agent''s commission rate at the exact moment of enrolment, frozen in time.';
COMMENT ON COLUMN sms_op.enrolments.tuition_fee_snapshot IS 'The total tuition fee for this enrolment at the moment it was created, frozen in time.';
