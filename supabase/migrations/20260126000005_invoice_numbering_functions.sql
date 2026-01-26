BEGIN;

-- Update existing generate_invoice_number to check enrollment_invoices (renamed table)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_created date,
  p_uuid uuid
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_created date := COALESCE(p_created, CURRENT_DATE);
  v_year text := to_char(v_created, 'YYYY');
  v_hash text;
  v_charset constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_result text := '';
  v_hex_pair text;
  v_hex_int int;
  v_char_index int;
  v_counter int := 0;
  v_final_id text;
  v_exists boolean;
BEGIN
  IF p_uuid IS NULL THEN
    RAISE EXCEPTION 'p_uuid is required to generate invoice number';
  END IF;

  v_hash := md5(p_uuid::text);

  FOR i IN 1..5 LOOP
    v_hex_pair := substr(v_hash, (i - 1) * 2 + 1, 2);
    v_hex_int := (
      CASE
        WHEN substr(v_hex_pair, 1, 1) BETWEEN '0' AND '9'
          THEN (substr(v_hex_pair, 1, 1))::int
        ELSE (ascii(substr(v_hex_pair, 1, 1)) - ascii('a') + 10)
      END * 16
    ) + (
      CASE
        WHEN substr(v_hex_pair, 2, 1) BETWEEN '0' AND '9'
          THEN (substr(v_hex_pair, 2, 1))::int
        ELSE (ascii(substr(v_hex_pair, 2, 1)) - ascii('a') + 10)
      END
    );
    v_char_index := (v_hex_int % 36) + 1;
    v_result := v_result || substr(v_charset, v_char_index, 1);
  END LOOP;

  v_final_id := 'INV-' || v_year || '-' || v_result;

  LOOP
    -- Check both enrollment_invoices and application_invoices for uniqueness
    SELECT EXISTS (
      SELECT 1 FROM public.enrollment_invoices WHERE invoice_number = v_final_id
      UNION ALL
      SELECT 1 FROM public.application_invoices WHERE invoice_number = v_final_id
    )
    INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_final_id;
    END IF;

    v_counter := v_counter + 1;
    IF v_counter > 9 THEN
      RAISE EXCEPTION 'Failed to generate unique invoice number after % attempts', v_counter;
    END IF;

    v_final_id := 'INV-' || v_year || '-' || v_result || v_counter::text;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_invoice_number(date, uuid) IS
  'Generates INV-YYYY-XXXXX invoice numbers for enrollment invoices using a deterministic hash of the invoice UUID.';

-- Create generate_application_invoice_number function for application invoices
CREATE OR REPLACE FUNCTION public.generate_application_invoice_number(
  p_created date,
  p_uuid uuid
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_created date := COALESCE(p_created, CURRENT_DATE);
  v_year text := to_char(v_created, 'YYYY');
  v_hash text;
  v_charset constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_result text := '';
  v_hex_pair text;
  v_hex_int int;
  v_char_index int;
  v_counter int := 0;
  v_final_id text;
  v_exists boolean;
BEGIN
  IF p_uuid IS NULL THEN
    RAISE EXCEPTION 'p_uuid is required to generate invoice number';
  END IF;

  v_hash := md5(p_uuid::text);

  FOR i IN 1..5 LOOP
    v_hex_pair := substr(v_hash, (i - 1) * 2 + 1, 2);
    v_hex_int := (
      CASE
        WHEN substr(v_hex_pair, 1, 1) BETWEEN '0' AND '9'
          THEN (substr(v_hex_pair, 1, 1))::int
        ELSE (ascii(substr(v_hex_pair, 1, 1)) - ascii('a') + 10)
      END * 16
    ) + (
      CASE
        WHEN substr(v_hex_pair, 2, 1) BETWEEN '0' AND '9'
          THEN (substr(v_hex_pair, 2, 1))::int
        ELSE (ascii(substr(v_hex_pair, 2, 1)) - ascii('a') + 10)
      END
    );
    v_char_index := (v_hex_int % 36) + 1;
    v_result := v_result || substr(v_charset, v_char_index, 1);
  END LOOP;

  v_final_id := 'APP-INV-' || v_year || '-' || v_result;

  LOOP
    -- Check both enrollment_invoices and application_invoices for uniqueness
    SELECT EXISTS (
      SELECT 1 FROM public.enrollment_invoices WHERE invoice_number = v_final_id
      UNION ALL
      SELECT 1 FROM public.application_invoices WHERE invoice_number = v_final_id
    )
    INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_final_id;
    END IF;

    v_counter := v_counter + 1;
    IF v_counter > 9 THEN
      RAISE EXCEPTION 'Failed to generate unique application invoice number after % attempts', v_counter;
    END IF;

    v_final_id := 'APP-INV-' || v_year || '-' || v_result || v_counter::text;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.generate_application_invoice_number(date, uuid) IS
  'Generates APP-INV-YYYY-XXXXX invoice numbers for application invoices using a deterministic hash of the invoice UUID.';

COMMIT;
