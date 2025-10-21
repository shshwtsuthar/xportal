-- Automatically create a profile row when a new auth user is created
-- This removes reliance on external webhooks and ensures profiles stay in sync

-- Function: public.handle_auth_user_created()
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert corresponding profile using metadata from auth.users
  INSERT INTO public.profiles (
    id,
    rto_id,
    role,
    first_name,
    last_name
  ) VALUES (
    NEW.id,
    (NEW.raw_app_meta_data->>'rto_id')::uuid,
    COALESCE(NEW.raw_app_meta_data->>'role', 'ADMISSIONS_OFFICER')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Do not block auth user creation if profile creation fails; log warning
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger: on_auth_user_created on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

COMMENT ON FUNCTION public.handle_auth_user_created IS
  'Automatically creates public.profiles row from auth.users on INSERT.';


