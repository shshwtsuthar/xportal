-- Add created_by to applications table
-- Profile ID of the user who created the application (null for existing rows and unauthenticated inserts e.g. public agent intake)

ALTER TABLE public.applications
  ADD COLUMN created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.applications.created_by IS 'Profile ID of the user who created the application.';

CREATE INDEX IF NOT EXISTS idx_applications_created_by ON public.applications(created_by);
