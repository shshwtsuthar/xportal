-- Seed helper to allow initial tenant data with RLS enabled
-- Uses SECURITY DEFINER to bypass RLS safely for administrative seeding

CREATE OR REPLACE FUNCTION public.seed_initial_data()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_rto_id uuid;
BEGIN
  -- If an RTO already exists, do nothing (idempotent)
  SELECT id INTO v_rto_id FROM public.rtos LIMIT 1;
  IF v_rto_id IS NOT NULL THEN
    RAISE NOTICE 'RTO already exists, skipping seed_initial_data()';
    RETURN;
  END IF;

  -- Create initial RTO so that seed.sql can proceed
  INSERT INTO public.rtos (
    name,
    rto_code,
    address_line_1,
    suburb,
    state,
    postcode,
    type_identifier,
    phone_number,
    email_address,
    contact_name
  ) VALUES (
    'Ashford College',
    '46296',
    'Level 3/65 Brougham Street',
    'Geelong',
    'VIC',
    '3220',
    'RTO',
    '+61 2 1234 5678',
    'offers@ashford.edu.au',
    'Admin'
  ) RETURNING id INTO v_rto_id;

  RAISE NOTICE 'Created initial RTO: %', v_rto_id;
END;
$$;

COMMENT ON FUNCTION public.seed_initial_data IS 'Seeds initial RTO with SECURITY DEFINER to work with RLS enabled.';


