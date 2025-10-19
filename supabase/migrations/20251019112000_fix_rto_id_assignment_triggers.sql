-- Ensure rto_id is populated even if app metadata lacks rto_id
-- Falls back to profiles.rto_id

BEGIN;

CREATE OR REPLACE FUNCTION public.set_rto_id_default()
RETURNS trigger AS $$
DECLARE
  v_rto_id uuid;
BEGIN
  IF NEW.rto_id IS NULL THEN
    SELECT public.get_my_rto_id() INTO v_rto_id;
    IF v_rto_id IS NULL THEN
      SELECT p.rto_id INTO v_rto_id FROM public.profiles p WHERE p.id = auth.uid();
    END IF;
    NEW.rto_id := v_rto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;


