-- Add student_status enum and students.status column
-- This migration is idempotent for local resets.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'student_status'
  ) THEN
    CREATE TYPE public.student_status AS ENUM (
      'ACTIVE',
      'INACTIVE',
      'COMPLETED',
      'WITHDRAWN'
    );
  END IF;
END
$$;

-- Add column if missing
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS status public.student_status;

-- Backfill existing rows to ACTIVE when null
UPDATE public.students
SET status = 'ACTIVE'
WHERE status IS NULL;

-- Enforce default and not-null
ALTER TABLE public.students
  ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE public.students
  ALTER COLUMN status SET NOT NULL;

COMMENT ON COLUMN public.students.status IS 'Lifecycle status for the student record (UI filters)';


