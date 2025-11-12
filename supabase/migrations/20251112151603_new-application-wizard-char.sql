-- Fix year_highest_school_level_completed column length to support '@@@@' value
-- Frontend schema allows '@@@@' when highest_school_level_id = '02' (Did not go to school)
-- Database was VARCHAR(2) but needs to be VARCHAR(4) to accommodate '@@@@'

-- 1. Alter column type for applications table
ALTER TABLE public.applications
  ALTER COLUMN year_highest_school_level_completed TYPE VARCHAR(4);

-- 2. Update CHECK constraint for applications table to allow '@@@@'
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_year_highest_school_level_completed_check' 
    AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications DROP CONSTRAINT applications_year_highest_school_level_completed_check;
  END IF;
END $$;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_year_highest_school_level_completed_check
  CHECK (
    year_highest_school_level_completed IS NULL OR
    year_highest_school_level_completed = '' OR
    year_highest_school_level_completed = '@@' OR
    year_highest_school_level_completed = '@@@@' OR
    year_highest_school_level_completed ~ '^[0-9]{2}$'
  );

-- 3. Alter column type for student_avetmiss table
ALTER TABLE public.student_avetmiss
  ALTER COLUMN year_highest_school_level_completed TYPE VARCHAR(4);

-- 4. Update CHECK constraint for student_avetmiss table to allow '@@@@'
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_avetmiss_year_highest_school_level_completed_check' 
    AND conrelid = 'public.student_avetmiss'::regclass
  ) THEN
    ALTER TABLE public.student_avetmiss DROP CONSTRAINT student_avetmiss_year_highest_school_level_completed_check;
  END IF;
END $$;

ALTER TABLE public.student_avetmiss
  ADD CONSTRAINT student_avetmiss_year_highest_school_level_completed_check
  CHECK (
    year_highest_school_level_completed IS NULL OR
    year_highest_school_level_completed = '' OR
    year_highest_school_level_completed = '@@' OR
    year_highest_school_level_completed = '@@@@' OR
    year_highest_school_level_completed ~ '^[0-9]{2}$'
  );

-- 5. Update comments to reflect '@@@@' support
COMMENT ON COLUMN public.applications.year_highest_school_level_completed IS 'NAT00080: Year highest school level completed (2-digit year, @@ for not specified, or @@@@ when highest_school_level_id = 02).';
COMMENT ON COLUMN public.student_avetmiss.year_highest_school_level_completed IS 'NAT00080: Year highest school level completed (2-digit year, @@ for not specified, or @@@@ when highest_school_level_id = 02).';

