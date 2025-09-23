-- =============================================================================
-- Migration: Add duration field to program course plan subjects
-- =============================================================================
-- 
-- This migration adds a duration_weeks field to the program_course_plan_subjects
-- table to support the Program Plan Templates feature where administrators can
-- assign specific durations (in weeks) to each unit within a program template.
--
-- This enables:
-- 1. Creating program templates with custom unit durations
-- 2. Using templates in the New Application Wizard
-- 3. Rolling intake scheduling based on unit durations
-- =============================================================================

-- Add duration_weeks field to program_course_plan_subjects table
ALTER TABLE core.program_course_plan_subjects 
ADD COLUMN IF NOT EXISTS duration_weeks INTEGER NOT NULL DEFAULT 1 CHECK (duration_weeks > 0);

-- Add comment for documentation
COMMENT ON COLUMN core.program_course_plan_subjects.duration_weeks IS 'Duration of the unit in weeks for this program plan template';

-- Update existing records to have a default duration of 1 week
UPDATE core.program_course_plan_subjects 
SET duration_weeks = 1 
WHERE duration_weeks IS NULL;

-- Create index for performance on duration queries
CREATE INDEX IF NOT EXISTS idx_program_course_plan_subjects_duration 
ON core.program_course_plan_subjects(plan_id, duration_weeks);
