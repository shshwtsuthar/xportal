-- Add relationship field to student_contacts_guardians table
ALTER TABLE public.student_contacts_guardians
  ADD COLUMN IF NOT EXISTS relationship TEXT;

COMMENT ON COLUMN public.student_contacts_guardians.relationship IS 'Relationship of guardian to student (e.g., Father, Mother)';

