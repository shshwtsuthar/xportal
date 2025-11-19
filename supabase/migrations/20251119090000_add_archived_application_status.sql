-- Adds ARCHIVED status to applications and enforces read-only behavior once archived.
BEGIN;

ALTER TYPE public.application_status
  ADD VALUE IF NOT EXISTS 'ARCHIVED';

CREATE OR REPLACE FUNCTION public.prevent_archived_application_edits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_payload JSONB;
  new_payload JSONB;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'ARCHIVED' THEN
    RAISE EXCEPTION 'Archived applications cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'ARCHIVED' THEN
    -- Allow status transitions (e.g., un-archiving) as long as no other column changes.
    old_payload := to_jsonb(OLD) - ARRAY['status', 'updated_at'];
    new_payload := to_jsonb(NEW) - ARRAY['status', 'updated_at'];

    IF new_payload <> old_payload THEN
      RAISE EXCEPTION 'Archived applications are read-only. Update aborted.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_archived_application_edits ON public.applications;
CREATE TRIGGER prevent_archived_application_edits
  BEFORE UPDATE OR DELETE ON public.applications
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_archived_application_edits();

COMMENT ON FUNCTION public.prevent_archived_application_edits() IS
  'Prevents UPDATE/DELETE operations on archived applications, unless only the status changes.';

COMMIT;

