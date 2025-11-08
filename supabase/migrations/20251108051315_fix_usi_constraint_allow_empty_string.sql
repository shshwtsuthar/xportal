-- Fix USI constraint to allow empty strings
-- This fixes the issue where empty strings from forms were being rejected

-- Drop the existing constraint if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_usi_format_check' 
    AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications DROP CONSTRAINT applications_usi_format_check;
  END IF;
END $$;

-- Recreate the constraint with empty string support
ALTER TABLE public.applications
  ADD CONSTRAINT applications_usi_format_check
  CHECK (
    usi IS NULL OR
    usi = '' OR
    usi = 'INTOFF' OR
    usi ~ '^[A-Z0-9]{10}$'
  );

