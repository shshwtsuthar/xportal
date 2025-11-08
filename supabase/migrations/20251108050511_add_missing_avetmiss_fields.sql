-- Add missing AVETMISS fields to applications and student_avetmiss tables
-- Fields: year_highest_school_level_completed, survey_contact_status, vsn
-- Also enhance usi constraint in applications table

-- 1. Add new columns to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS year_highest_school_level_completed VARCHAR(2) NULL,
  ADD COLUMN IF NOT EXISTS survey_contact_status CHAR(1) NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS vsn VARCHAR(9) NULL;

-- 2. Add CHECK constraints for applications table
-- Year field: must be NULL, empty string, '@@', or exactly 2 digits
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
    year_highest_school_level_completed ~ '^[0-9]{2}$'
  );

-- Survey contact status: must be one of the valid codes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_survey_contact_status_check' 
    AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_survey_contact_status_check
      CHECK (survey_contact_status IN ('A', 'C', 'D', 'E', 'I', 'M', 'O'));
  END IF;
END $$;

-- VSN: must be NULL, empty string, 9 digits, or '000000000'
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_vsn_check' 
    AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications DROP CONSTRAINT applications_vsn_check;
  END IF;
END $$;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_vsn_check
  CHECK (
    vsn IS NULL OR 
    vsn = '' OR
    vsn = '000000000' OR
    vsn ~ '^[0-9]{9}$'
  );

-- 3. Enhance USI constraint in applications table
-- Remove existing constraints if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_usi_check' 
    AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications DROP CONSTRAINT applications_usi_check;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_usi_format_check' 
    AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications DROP CONSTRAINT applications_usi_format_check;
  END IF;
END $$;

-- Add enhanced USI constraint
-- Allow NULL, empty string, 'INTOFF', or valid 10-character USI
ALTER TABLE public.applications
  ADD CONSTRAINT applications_usi_format_check
  CHECK (
    usi IS NULL OR
    usi = '' OR
    usi = 'INTOFF' OR
    usi ~ '^[A-Z0-9]{10}$'
  );

-- 4. Add columns to student_avetmiss table
ALTER TABLE public.student_avetmiss
  ADD COLUMN IF NOT EXISTS year_highest_school_level_completed VARCHAR(2) NULL,
  ADD COLUMN IF NOT EXISTS survey_contact_status CHAR(1) NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS vsn VARCHAR(9) NULL;

-- 5. Add CHECK constraints for student_avetmiss table
-- Year field
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
    year_highest_school_level_completed ~ '^[0-9]{2}$'
  );

-- Survey contact status
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_avetmiss_survey_contact_status_check' 
    AND conrelid = 'public.student_avetmiss'::regclass
  ) THEN
    ALTER TABLE public.student_avetmiss
      ADD CONSTRAINT student_avetmiss_survey_contact_status_check
      CHECK (survey_contact_status IN ('A', 'C', 'D', 'E', 'I', 'M', 'O'));
  END IF;
END $$;

-- VSN
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_avetmiss_vsn_check' 
    AND conrelid = 'public.student_avetmiss'::regclass
  ) THEN
    ALTER TABLE public.student_avetmiss DROP CONSTRAINT student_avetmiss_vsn_check;
  END IF;
END $$;

ALTER TABLE public.student_avetmiss
  ADD CONSTRAINT student_avetmiss_vsn_check
  CHECK (
    vsn IS NULL OR 
    vsn = '' OR
    vsn = '000000000' OR
    vsn ~ '^[0-9]{9}$'
  );

-- 6. Add comments for documentation
COMMENT ON COLUMN public.applications.year_highest_school_level_completed IS 'NAT00080: Year highest school level completed (2-digit year or @@).';
COMMENT ON COLUMN public.applications.survey_contact_status IS 'NAT00080: Survey contact status (A=Available, C=Correctional, D=Deceased, E=Excluded, I=Invalid address, M=Minor, O=Overseas).';
COMMENT ON COLUMN public.applications.vsn IS 'NAT00080: Victorian Student Number (9 digits or 000000000).';
COMMENT ON COLUMN public.student_avetmiss.year_highest_school_level_completed IS 'NAT00080: Year highest school level completed (2-digit year or @@).';
COMMENT ON COLUMN public.student_avetmiss.survey_contact_status IS 'NAT00080: Survey contact status (A=Available, C=Correctional, D=Deceased, E=Excluded, I=Invalid address, M=Minor, O=Overseas).';
COMMENT ON COLUMN public.student_avetmiss.vsn IS 'NAT00080: Victorian Student Number (9 digits or 000000000).';

