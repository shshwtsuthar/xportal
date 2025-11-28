BEGIN;

-- Add user_id column to students table to link to Supabase auth users
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.students.user_id IS 'Links student record to Supabase auth user. Set when application is approved and user account is created.';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);

COMMIT;

