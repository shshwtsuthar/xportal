-- =============================================================================
-- Migration: Add program-level payment plan templates and instalments
-- =============================================================================

CREATE TABLE IF NOT EXISTS sms_op.payment_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES core.programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_op.payment_plan_template_instalments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES sms_op.payment_plan_templates(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  offset_days integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_payment_plan_templates_program_id ON sms_op.payment_plan_templates(program_id);
CREATE INDEX IF NOT EXISTS idx_template_instalments_template_id ON sms_op.payment_plan_template_instalments(template_id);


