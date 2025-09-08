-- =============================================================================
-- DISABLE RLS FOR DEVELOPMENT
-- Remove security policies to allow development without authentication
-- =============================================================================

-- Disable RLS on new tables for development
ALTER TABLE core.program_course_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE core.program_course_plan_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_op.payment_plan_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_op.payment_plan_template_instalments DISABLE ROW LEVEL SECURITY;

-- Drop the policies (they'll be recreated when we enable security later)
DROP POLICY IF EXISTS cp_select ON core.program_course_plans;
DROP POLICY IF EXISTS cp_insert ON core.program_course_plans;
DROP POLICY IF EXISTS cp_update ON core.program_course_plans;
DROP POLICY IF EXISTS cp_delete ON core.program_course_plans;

DROP POLICY IF EXISTS cps_select ON core.program_course_plan_subjects;
DROP POLICY IF EXISTS cps_modify ON core.program_course_plan_subjects;

DROP POLICY IF EXISTS ppt_select ON sms_op.payment_plan_templates;
DROP POLICY IF EXISTS ppt_modify ON sms_op.payment_plan_templates;

DROP POLICY IF EXISTS ppti_select ON sms_op.payment_plan_template_instalments;
DROP POLICY IF EXISTS ppti_modify ON sms_op.payment_plan_template_instalments;
