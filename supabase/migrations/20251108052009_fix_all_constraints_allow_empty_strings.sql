-- Comprehensive fix for all AVETMISS field constraints to allow empty strings
-- This fixes issues where empty strings from forms were being rejected

-- Fix USI constraint for applications table
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_usi_format_check' 
    AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications DROP CONSTRAINT applications_usi_format_check;
  END IF;
END $$;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_usi_format_check
  CHECK (
    usi IS NULL OR
    usi = '' OR
    usi = 'INTOFF' OR
    usi ~ '^[A-Z0-9]{10}$'
  );

-- Fix VSN constraint for applications table
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

-- Fix year_highest_school_level_completed constraint for applications table
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

-- Fix VSN constraint for student_avetmiss table
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

-- Fix year_highest_school_level_completed constraint for student_avetmiss table
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


