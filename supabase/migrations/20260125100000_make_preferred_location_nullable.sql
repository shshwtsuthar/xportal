-- Make preferred_location_id nullable to support DRAFT applications
-- This fixes the issue where a default location is forced upon draft creation/reload
-- allowing the UI to correctly show "Select a program first" and keep the location empty until selected.

BEGIN;

ALTER TABLE public.applications 
ALTER COLUMN preferred_location_id DROP NOT NULL;

COMMENT ON COLUMN public.applications.preferred_location_id IS 'The student''s preferred delivery location. Can be NULL for drafts.';

COMMIT;
