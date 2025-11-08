-- Fix VSN constraint to allow empty strings
-- This fixes the issue where empty strings from forms were being rejected

-- Drop the existing constraint if it exists for applications table
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_vsn_check' 
    AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications DROP CONSTRAINT applications_vsn_check;
  END IF;
END $$;

-- Recreate the constraint with empty string support for applications
ALTER TABLE public.applications
  ADD CONSTRAINT applications_vsn_check
  CHECK (
    vsn IS NULL OR 
    vsn = '' OR
    vsn = '000000000' OR
    vsn ~ '^[0-9]{9}$'
  );

-- Drop the existing constraint if it exists for student_avetmiss table
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_avetmiss_vsn_check' 
    AND conrelid = 'public.student_avetmiss'::regclass
  ) THEN
    ALTER TABLE public.student_avetmiss DROP CONSTRAINT student_avetmiss_vsn_check;
  END IF;
END $$;

-- Recreate the constraint with empty string support for student_avetmiss
ALTER TABLE public.student_avetmiss
  ADD CONSTRAINT student_avetmiss_vsn_check
  CHECK (
    vsn IS NULL OR 
    vsn = '' OR
    vsn = '000000000' OR
    vsn ~ '^[0-9]{9}$'
  );

