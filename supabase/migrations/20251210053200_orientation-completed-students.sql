-- Track whether a student has completed orientation
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS orientation_completed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.students.orientation_completed IS 'Indicates if the student finished orientation';