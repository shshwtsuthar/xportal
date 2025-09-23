-- =============================================================================
-- RLS Policies and Seed Data for Course Plans and Payment Plan Templates
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE core.program_course_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.program_course_plan_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_op.payment_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_op.payment_plan_template_instalments ENABLE ROW LEVEL SECURITY;

-- Helper: Policies assume JWT subject matches security.users.id
-- Select permissions: Admin, Trainer, Agent can read
DO $$ BEGIN
  -- core.program_course_plans
  CREATE POLICY cp_select ON core.program_course_plans
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name IN ('Admin','Trainer','Agent')
      )
    );
  CREATE POLICY cp_insert ON core.program_course_plans
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name = 'Admin'
      )
    );
  CREATE POLICY cp_update ON core.program_course_plans
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name = 'Admin'
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name = 'Admin'
      )
    );
  CREATE POLICY cp_delete ON core.program_course_plans
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name = 'Admin'
      )
    );

  -- core.program_course_plan_subjects
  CREATE POLICY cps_select ON core.program_course_plan_subjects
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name IN ('Admin','Trainer','Agent')
      )
    );
  CREATE POLICY cps_modify ON core.program_course_plan_subjects
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name = 'Admin'
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name = 'Admin'
      )
    );

  -- sms_op.payment_plan_templates
  CREATE POLICY ppt_select ON sms_op.payment_plan_templates
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name IN ('Admin','Finance','Trainer','Agent')
      )
    );
  CREATE POLICY ppt_modify ON sms_op.payment_plan_templates
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name IN ('Admin','Finance')
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name IN ('Admin','Finance')
      )
    );

  -- sms_op.payment_plan_template_instalments
  CREATE POLICY ppti_select ON sms_op.payment_plan_template_instalments
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name IN ('Admin','Finance','Trainer','Agent')
      )
    );
  CREATE POLICY ppti_modify ON sms_op.payment_plan_template_instalments
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name IN ('Admin','Finance')
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM security.users u
        JOIN security.user_roles ur ON ur.user_id = u.id
        JOIN security.roles r ON r.id = ur.role_id
        WHERE u.id = auth.uid() AND r.name IN ('Admin','Finance')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Seed: Create a default course plan per active program from core.program_subjects
-- =============================================================================
DO $$
DECLARE
  prog RECORD;
  plan_id uuid;
BEGIN
  FOR prog IN SELECT id FROM core.programs WHERE status = 'Current' LOOP
    INSERT INTO core.program_course_plans (program_id, name, version, is_active)
    VALUES (prog.id, 'Default', 1, true)
    RETURNING id INTO plan_id;

    INSERT INTO core.program_course_plan_subjects (plan_id, subject_id, unit_type, sort_order)
    SELECT plan_id, ps.subject_id, ps.unit_type, ROW_NUMBER() OVER (PARTITION BY ps.unit_type ORDER BY s.subject_name)
    FROM core.program_subjects ps
    JOIN core.subjects s ON s.id = ps.subject_id;
  END LOOP;
END $$;

-- =============================================================================
-- Seed: Payment plan templates per program (Full upfront default)
-- =============================================================================
INSERT INTO sms_op.payment_plan_templates (program_id, name, is_default)
SELECT p.id, 'Full upfront', true
FROM core.programs p
WHERE p.status = 'Current'
ON CONFLICT DO NOTHING;

-- Add a single zero-amount placeholder instalment (can be edited later)
INSERT INTO sms_op.payment_plan_template_instalments (template_id, description, amount, offset_days, sort_order)
SELECT t.id, 'Upfront payment', 0.00, 0, 1
FROM sms_op.payment_plan_templates t
LEFT JOIN sms_op.payment_plan_template_instalments i ON i.template_id = t.id
WHERE i.id IS NULL;


