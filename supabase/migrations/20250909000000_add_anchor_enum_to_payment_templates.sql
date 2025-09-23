-- =============================================================================
-- Migration: Add anchor enum to payment plan templates for flexible date calculation
-- =============================================================================

-- Create enum for instalment anchor types
CREATE TYPE sms_op.instalment_anchor AS ENUM (
  'enrolment_date',     -- Days from when student enrolled
  'commencement_date',  -- Days from course start date
  'custom_date'         -- Days from a specific custom date
);

-- Add anchor column to payment plan templates
ALTER TABLE sms_op.payment_plan_templates 
ADD COLUMN anchor_type sms_op.instalment_anchor NOT NULL DEFAULT 'enrolment_date';

-- Add custom_date column for when anchor_type is 'custom_date'
ALTER TABLE sms_op.payment_plan_templates 
ADD COLUMN custom_anchor_date date;

-- Add comment explaining the anchor system
COMMENT ON COLUMN sms_op.payment_plan_templates.anchor_type IS 'Defines what date the offset_days in instalments are calculated from';
COMMENT ON COLUMN sms_op.payment_plan_templates.custom_anchor_date IS 'Custom date to use when anchor_type is custom_date';

-- Update existing templates to use enrolment_date as default
UPDATE sms_op.payment_plan_templates 
SET anchor_type = 'enrolment_date' 
WHERE anchor_type IS NULL;
