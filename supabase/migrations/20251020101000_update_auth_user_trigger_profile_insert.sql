-- Harden profile creation trigger to coalesce metadata sources
-- Falls back to user_metadata.rto_id and default role when missing

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_rto_id uuid;
  v_role public.user_role;
  v_first text;
  v_last text;
BEGIN
  v_rto_id := COALESCE(
    NULLIF(NEW.raw_app_meta_data->>'rto_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'rto_id', '')::uuid
  );

  v_role := COALESCE(
    NULLIF(NEW.raw_app_meta_data->>'role', '')::public.user_role,
    'ADMISSIONS_OFFICER'::public.user_role
  );

  v_first := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  IF v_rto_id IS NULL THEN
    RAISE WARNING 'Skipping profile creation for user %: missing rto_id in metadata', NEW.id;
    RETURN NEW;
  END IF;

  -- Ensure RTO exists; if not, avoid throwing to not block auth.users insert
  IF NOT EXISTS (SELECT 1 FROM public.rtos WHERE id = v_rto_id) THEN
    RAISE WARNING 'Skipping profile creation for user %: rto_id % not found', NEW.id, v_rto_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (
    id,
    rto_id,
    role,
    first_name,
    last_name
  ) VALUES (
    NEW.id,
    v_rto_id,
    v_role,
    v_first,
    v_last
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_auth_user_created IS 'Creates profiles from auth.users; resilient coalescing of metadata and safe warnings on missing data.';


