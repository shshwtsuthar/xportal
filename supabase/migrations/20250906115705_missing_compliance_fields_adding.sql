-- ============================================================================
-- MIGRATION:  Add Missing Compliance Fields (v2 - Idempotent)
--
-- DESCRIPTION:
-- This script adds missing AVETMISS compliance fields to the operational and
-- compliance tables. It uses `ADD COLUMN IF NOT EXISTS` to ensure it can be

-- run safely multiple times without causing errors, even if some columns
-- already exist.
-- =============================================================================

-- Add missing enrolment compliance fields
ALTER TABLE sms_op.enrolments
  ADD COLUMN IF NOT EXISTS vet_in_schools_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS school_type_identifier CHARACTER VARYING,
  ADD COLUMN IF NOT EXISTS training_contract_identifier CHARACTER VARYING,
  ADD COLUMN IF NOT EXISTS client_identifier_apprenticeships CHARACTER VARYING,
  ADD COLUMN IF NOT EXISTS specific_funding_identifier CHARACTER VARYING;

-- Add missing client compliance field
ALTER TABLE avetmiss.client_avetmiss_details
  ADD COLUMN IF NOT EXISTS survey_contact_status CHARACTER VARYING;
