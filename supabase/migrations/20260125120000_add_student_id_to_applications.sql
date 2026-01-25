BEGIN;

-- Add student_id_display column to applications table
-- This will store the Student ID generated at application submission
-- and will be copied to students.student_id_display on approval
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS student_id_display TEXT;

COMMENT ON COLUMN public.applications.student_id_display IS 
  'Student ID generated at application submission (DRAFT -> SUBMITTED). Format: STU-YYYY-XXXXX. Will be copied to students.student_id_display on approval.';

-- Update generate_student_display_id function to check both students and applications tables for uniqueness
-- This prevents collisions when generating IDs for applications that haven't been approved yet
CREATE OR REPLACE FUNCTION public.generate_student_display_id(
  p_created date,
  p_uuid uuid
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_created date := COALESCE(p_created, CURRENT_DATE);
  v_year text := to_char(v_created, 'YYYY');
  v_hash text;
  v_charset constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_result text := '';
  v_hex_pair text;
  v_hex_int int;
  v_char_index int;
  v_counter int := 0;
  v_final_id text;
  v_exists boolean;
BEGIN
  IF p_uuid IS NULL THEN
    RAISE EXCEPTION 'p_uuid is required to generate student display id';
  END IF;

  v_hash := md5(p_uuid::text);

  FOR i IN 1..5 LOOP
    v_hex_pair := substr(v_hash, (i - 1) * 2 + 1, 2);
    v_hex_int := (
      CASE
        WHEN substr(v_hex_pair, 1, 1) BETWEEN '0' AND '9'
          THEN (substr(v_hex_pair, 1, 1))::int
        ELSE (ascii(substr(v_hex_pair, 1, 1)) - ascii('a') + 10)
      END * 16
    ) + (
      CASE
        WHEN substr(v_hex_pair, 2, 1) BETWEEN '0' AND '9'
          THEN (substr(v_hex_pair, 2, 1))::int
        ELSE (ascii(substr(v_hex_pair, 2, 1)) - ascii('a') + 10)
      END
    );
    v_char_index := (v_hex_int % 36) + 1;
    v_result := v_result || substr(v_charset, v_char_index, 1);
  END LOOP;

  v_final_id := 'STU-' || v_year || '-' || v_result;

  LOOP
    -- Check both students and applications tables for uniqueness
    SELECT EXISTS (
      SELECT 1 FROM public.students WHERE student_id_display = v_final_id
    ) OR EXISTS (
      SELECT 1 FROM public.applications WHERE student_id_display = v_final_id
    )
    INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_final_id;
    END IF;

    v_counter := v_counter + 1;
    IF v_counter > 9 THEN
      RAISE EXCEPTION 'Failed to generate unique student display ID after % attempts', v_counter;
    END IF;

    v_final_id := 'STU-' || v_year || '-' || v_result || v_counter::text;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_student_display_id(date, uuid) IS
  'Generates STU-YYYY-XXXXX using a deterministic hash of the UUID. Checks both students and applications tables for uniqueness to prevent collisions.';

-- Create a helper function to generate student ID for applications
-- This can be called from edge functions
CREATE OR REPLACE FUNCTION public.generate_application_student_id(
  p_application_id uuid
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_application RECORD;
  v_student_id text;
BEGIN
  -- Fetch application details
  SELECT id, rto_id, created_at
  INTO v_application
  FROM public.applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application % not found', p_application_id;
  END IF;

  -- Generate student ID using application UUID and created date
  v_student_id := public.generate_student_display_id(
    COALESCE(v_application.created_at::date, CURRENT_DATE),
    v_application.id
  );

  RETURN v_student_id;
END;
$$;

COMMENT ON FUNCTION public.generate_application_student_id(uuid) IS
  'Generates a student display ID for an application. Can be called during submission to pre-generate the ID that will be used when the application is approved.';

-- Add index for performance when checking uniqueness
CREATE INDEX IF NOT EXISTS idx_applications_student_id_display 
  ON public.applications(student_id_display) 
  WHERE student_id_display IS NOT NULL;

COMMENT ON INDEX idx_applications_student_id_display IS
  'Index for checking uniqueness of student_id_display in applications table.';

COMMIT;
