BEGIN;

-- Create per-user, per-table preferences for column visibility and widths
CREATE TABLE IF NOT EXISTS public.user_table_preferences (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  table_key text NOT NULL,
  visible_columns text[] NOT NULL DEFAULT '{}',
  column_widths jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Unique per tenant+user+table
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_table_prefs
ON public.user_table_preferences (rto_id, user_id, table_key);

-- RLS
ALTER TABLE public.user_table_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS rls_user_table_prefs_all ON public.user_table_preferences;
  CREATE POLICY rls_user_table_prefs_all ON public.user_table_preferences
    FOR ALL
    USING (
      rto_id = public.get_my_effective_rto_id() AND user_id = auth.uid()
    )
    WITH CHECK (
      rto_id = public.get_my_effective_rto_id() AND user_id = auth.uid()
    );
END $$;

-- Updated at trigger
DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_utp_update_set_timestamp ON public.user_table_preferences;
  CREATE TRIGGER on_utp_update_set_timestamp
  BEFORE UPDATE ON public.user_table_preferences
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
END $$;

COMMIT;



