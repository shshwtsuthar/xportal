BEGIN;

-- Draft upsert RPC: compute and overwrite ALS/ALC while application is DRAFT
-- Reuses the same logic as freeze; immutability triggers already protect non-DRAFT

CREATE OR REPLACE FUNCTION public.upsert_application_learning_plan_draft(app_id uuid)
RETURNS TABLE(inserted_subjects int, inserted_classes int) AS $$
DECLARE
  v_app_status text;
BEGIN
  SELECT status::text INTO v_app_status FROM public.applications WHERE id = app_id;
  IF v_app_status IS NULL THEN
    RAISE EXCEPTION 'Application % not found', app_id;
  END IF;
  IF v_app_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Application % must be DRAFT to upsert learning plan', app_id;
  END IF;

  -- Delegate to freeze function (which enforces preconditions and writes ALS/ALC)
  RETURN QUERY SELECT * FROM public.freeze_application_learning_plan(app_id);
END;
$$ LANGUAGE plpgsql;

COMMIT;


