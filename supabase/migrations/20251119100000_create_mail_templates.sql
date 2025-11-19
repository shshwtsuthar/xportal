BEGIN;

-- 1) Mail templates table
CREATE TABLE IF NOT EXISTS public.mail_templates (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.mail_templates IS 'Reusable per-RTO mail templates captured from the simplified compose dialog.';
COMMENT ON COLUMN public.mail_templates.rto_id IS 'Links the template to the owning RTO for multi-tenancy.';
COMMENT ON COLUMN public.mail_templates.name IS 'Human-friendly template name shown in the UI.';
COMMENT ON COLUMN public.mail_templates.subject IS 'Default subject line for the saved template.';
COMMENT ON COLUMN public.mail_templates.html_body IS 'Rich text HTML body captured from the TipTap editor.';
COMMENT ON COLUMN public.mail_templates.created_by IS 'Profile ID of the user who created the template.';

-- 2) Indexes
CREATE INDEX IF NOT EXISTS mail_templates_rto_idx
  ON public.mail_templates (rto_id);

CREATE INDEX IF NOT EXISTS mail_templates_created_at_idx
  ON public.mail_templates (created_at DESC);

-- 3) Default RTO trigger to ensure inserts always pick up the user context
DROP TRIGGER IF EXISTS mail_templates_set_rto_id ON public.mail_templates;
CREATE TRIGGER mail_templates_set_rto_id
  BEFORE INSERT ON public.mail_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_rto_id_default();

-- 4) RLS policies
ALTER TABLE public.mail_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mail_templates_select ON public.mail_templates;
CREATE POLICY mail_templates_select ON public.mail_templates
  FOR SELECT TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS mail_templates_insert ON public.mail_templates;
CREATE POLICY mail_templates_insert ON public.mail_templates
  FOR INSERT TO authenticated
  WITH CHECK (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS mail_templates_update ON public.mail_templates;
CREATE POLICY mail_templates_update ON public.mail_templates
  FOR UPDATE TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin())
  WITH CHECK (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS mail_templates_delete ON public.mail_templates;
CREATE POLICY mail_templates_delete ON public.mail_templates
  FOR DELETE TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin());

COMMIT;

