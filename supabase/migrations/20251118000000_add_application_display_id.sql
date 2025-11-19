-- Add application display ID: APP-YY-XXXX
-- Format: APP-YY-XXXX where YY is 2-digit year and XXXX is a 4-character string
-- XXXX is deterministically generated from UUID using MD5 hash, mapped to charset a-z0-9

BEGIN;

-- 1) Add application_id_display column to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS application_id_display TEXT;

COMMENT ON COLUMN public.applications.application_id_display IS 'Display ID for applications in format APP-YY-XXXX where YY is 2-digit year and XXXX is a 4-character string (lowercase a-z and digits 0-9) generated deterministically from UUID.';

-- 2) Create function to generate application display ID from UUID seed
CREATE OR REPLACE FUNCTION public.generate_application_display_id(p_created date, p_uuid uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year_yy text;
  v_hash text;
  v_charset text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_result text := '';
  v_char_index int;
  v_hex_pair text;
  v_hex_int int;
  v_counter int := 0;
  v_final_id text;
  v_exists boolean;
BEGIN
  -- Extract 2-digit year
  v_year_yy := to_char(p_created, 'YY');
  
  -- Generate MD5 hash from UUID
  v_hash := md5(p_uuid::text);
  
  -- Extract 4 characters from hash deterministically
  -- Take first 4 hex character pairs, convert to integers, map to charset
  FOR i IN 1..4 LOOP
    -- Extract hex pair (each pair is 2 hex chars = 1 byte)
    v_hex_pair := substr(v_hash, (i - 1) * 2 + 1, 2);
    -- Convert hex to integer (0-255)
    -- Convert each hex digit to integer: 0-9 stays same, a-f becomes 10-15
    -- Then combine: first_digit * 16 + second_digit
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
    -- Map to charset index using modulo 36
    v_char_index := (v_hex_int % 36) + 1;
    -- Get character from charset
    v_result := v_result || substr(v_charset, v_char_index, 1);
  END LOOP;
  
  -- Format: APP-YY-XXXX
  v_final_id := 'APP-' || v_year_yy || '-' || v_result;
  
  -- Check for collisions and append counter if needed (max 10 attempts)
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.applications WHERE application_id_display = v_final_id) INTO v_exists;
    
    IF NOT v_exists THEN
      RETURN v_final_id;
    END IF;
    
    -- Collision detected, append counter
    v_counter := v_counter + 1;
    IF v_counter > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique application display ID after 10 attempts';
    END IF;
    
    -- Append counter (1-9) to ensure uniqueness
    v_final_id := 'APP-' || v_year_yy || '-' || v_result || v_counter::text;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_application_display_id(date, uuid) IS 'Generates APP-YY-XXXX display ID deterministically from UUID seed. Handles collisions by appending counter suffix.';

-- 3) Create BEFORE INSERT trigger function
CREATE OR REPLACE FUNCTION public.before_insert_applications_set_display()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.application_id_display IS NULL OR length(trim(NEW.application_id_display)) = 0 THEN
    NEW.application_id_display := public.generate_application_display_id(
      COALESCE(NEW.created_at::date, CURRENT_DATE),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.before_insert_applications_set_display() IS 'Trigger function to auto-generate application_id_display on INSERT if not provided.';

-- 4) Backfill existing applications
-- Use a loop to handle potential collisions during backfill
DO $$
DECLARE
  app_record RECORD;
  generated_id TEXT;
BEGIN
  FOR app_record IN 
    SELECT id, created_at 
    FROM public.applications 
    WHERE application_id_display IS NULL OR length(trim(application_id_display)) = 0
    ORDER BY created_at, id
  LOOP
    -- Generate ID and update one row at a time to handle collisions properly
    generated_id := public.generate_application_display_id(
      app_record.created_at::date,
      app_record.id
    );
    
    UPDATE public.applications
    SET application_id_display = generated_id
    WHERE id = app_record.id;
  END LOOP;
END $$;

-- 5) Add NOT NULL constraint after backfill
ALTER TABLE public.applications
  ALTER COLUMN application_id_display SET NOT NULL;

-- 6) Add UNIQUE constraint
ALTER TABLE public.applications
  ADD CONSTRAINT applications_application_id_display_unique UNIQUE (application_id_display);

-- 7) Create trigger for future inserts
DROP TRIGGER IF EXISTS before_insert_applications_set_display ON public.applications;
CREATE TRIGGER before_insert_applications_set_display
BEFORE INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.before_insert_applications_set_display();

COMMIT;

