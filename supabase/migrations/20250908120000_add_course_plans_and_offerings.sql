-- =============================================================================
-- Migration: Add program course plans and extend course offerings (rolling intake)
-- =============================================================================

-- 1) Program Course Plans (default study plans)
CREATE TABLE IF NOT EXISTS core.program_course_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES core.programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.program_course_plan_subjects (
  plan_id uuid NOT NULL REFERENCES core.program_course_plans(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES core.subjects(id) ON DELETE RESTRICT,
  unit_type text NOT NULL CHECK (unit_type IN ('Core','Elective')),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (plan_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_course_plans_program_id ON core.program_course_plans(program_id);
CREATE INDEX IF NOT EXISTS idx_course_plan_subjects_plan_id ON core.program_course_plan_subjects(plan_id);

-- 2) Extend course offerings with rolling intake and default plan linkage
ALTER TABLE sms_op.course_offerings
  ADD COLUMN IF NOT EXISTS is_rolling boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_plan_id uuid NULL REFERENCES core.program_course_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offerings_default_plan_id ON sms_op.course_offerings(default_plan_id);


