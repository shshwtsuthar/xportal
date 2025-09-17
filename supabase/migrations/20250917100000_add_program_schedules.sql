-- =============================================================================
-- Migration: Add Program Rolling Schedules
-- Date: 2025-09-17
-- Description: Introduces program-level rolling schedules decoupled from plans.
-- =============================================================================

CREATE TABLE IF NOT EXISTS core.program_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES core.programs(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Rolling Schedule',
  cycle_anchor_date date NOT NULL,
  timezone text NOT NULL DEFAULT 'Australia/Melbourne',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.program_schedule_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES core.program_schedules(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES core.subjects(id) ON DELETE RESTRICT,
  order_index integer NOT NULL CHECK (order_index >= 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_schedule_unit_order UNIQUE (schedule_id, order_index),
  CONSTRAINT uq_schedule_unit_subject UNIQUE (schedule_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_program_schedules_program_id ON core.program_schedules(program_id);
CREATE INDEX IF NOT EXISTS idx_program_schedule_units_schedule_id ON core.program_schedule_units(schedule_id);

-- Optional coupling to offerings (non-breaking, nullable)
ALTER TABLE sms_op.course_offerings
  ADD COLUMN IF NOT EXISTS schedule_id uuid NULL REFERENCES core.program_schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS term_index integer NULL;

COMMENT ON TABLE core.program_schedules IS 'Rolling schedule per program with anchor date and timezone.';
COMMENT ON TABLE core.program_schedule_units IS 'Ordered units with duration in days for rolling cycles.';

