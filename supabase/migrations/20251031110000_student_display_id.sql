-- Student display ID: STU-<RTO>-<YY>-<NNNNN>-<C>
-- Per-RTO, per-year sequencing with a deterministic check character

-- 1) Sequence table for per-RTO, per-year counters
CREATE TABLE IF NOT EXISTS public.student_id_sequences (
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  year int NOT NULL,
  next_val bigint NOT NULL DEFAULT 1,
  PRIMARY KEY (rto_id, year)
);

COMMENT ON TABLE public.student_id_sequences IS 'Maintains next sequence value per RTO and year for student display IDs.';

-- 2) Function to get next sequence value (upsert + increment)
CREATE OR REPLACE FUNCTION public.next_student_seq(p_rto uuid, p_year int)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_next bigint;
BEGIN
  LOOP
    UPDATE public.student_id_sequences s
    SET next_val = s.next_val + 1
    WHERE s.rto_id = p_rto AND s.year = p_year
    RETURNING s.next_val INTO v_next;

    IF FOUND THEN
      RETURN v_next; -- v_next is the value BEFORE increment, used as current seq
    END IF;

    BEGIN
      INSERT INTO public.student_id_sequences (rto_id, year, next_val)
      VALUES (p_rto, p_year, 2) -- initialize so first returned value is 1
      ON CONFLICT (rto_id, year) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      -- retry loop
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.next_student_seq(uuid, int) IS 'Returns next sequence number for given (rto_id, year). First call returns 1.';

-- 3) Check character computation (Crockford Base32; deterministic via sha1)
-- Alphabet: 0123456789ABCDEFGHJKMNPQRSTVWXYZ (32 chars)
CREATE OR REPLACE FUNCTION public.compute_student_check_char(p_stem text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_hash bytea;
  v_first_byte int;
  v_index int;
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_char text;
BEGIN
  -- Use sha1 for stable distribution; mod 32 maps to alphabet index (1..32)
  v_hash := digest(p_stem, 'sha1');
  v_first_byte := get_byte(v_hash, 0);
  v_index := (v_first_byte % 32) + 1;
  v_char := substr(v_alphabet, v_index, 1);
  RETURN v_char;
END;
$$;

COMMENT ON FUNCTION public.compute_student_check_char(text) IS 'Computes a single check character from a stem using Crockford Base32.';

-- 4) Generator: STU-<RTO>-<YY>-<NNNNN>-<C>
CREATE OR REPLACE FUNCTION public.generate_student_display_id(p_rto uuid, p_created date)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_code_clean text;
  v_year_full int;
  v_year_yy text;
  v_seq bigint;
  v_seq_padded text;
  v_stem text;
  v_chk text;
BEGIN
  -- Resolve RTO code; sanitize to letters/numbers and upper-case, keep 3-5 chars
  SELECT r.rto_code INTO v_code FROM public.rtos r WHERE r.id = p_rto;
  IF v_code IS NULL OR length(trim(v_code)) = 0 THEN
    RAISE EXCEPTION 'RTO % has no rto_code configured', p_rto;
  END IF;
  v_code_clean := upper(regexp_replace(v_code, '[^A-Z0-9]', '', 'g'));
  v_code_clean := substr(v_code_clean, 1, 5);
  IF length(v_code_clean) < 3 THEN
    RAISE EXCEPTION 'rto_code must be at least 3 alphanumeric characters after sanitization. Got: %', v_code;
  END IF;

  v_year_full := extract(year from p_created);
  v_year_yy := to_char(p_created, 'YY');
  v_seq := public.next_student_seq(p_rto, v_year_full);
  v_seq_padded := lpad(v_seq::text, 5, '0');

  v_stem := v_code_clean || '-' || v_year_yy || '-' || v_seq_padded;
  v_chk := public.compute_student_check_char(v_stem);
  RETURN 'STU-' || v_stem || '-' || v_chk;
END;
$$;

COMMENT ON FUNCTION public.generate_student_display_id(uuid, date) IS 'Generates STU-<RTO>-<YY>-<NNNNN>-<C> using per-RTO/year sequence and a check character.';

-- 5) BEFORE INSERT trigger on students to set display id when null
CREATE OR REPLACE FUNCTION public.before_insert_students_set_display()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.student_id_display IS NULL OR length(NEW.student_id_display) = 0 THEN
    NEW.student_id_display := public.generate_student_display_id(
      NEW.rto_id,
      COALESCE(NEW.created_at::date, CURRENT_DATE)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_students_set_display ON public.students;
CREATE TRIGGER before_insert_students_set_display
BEFORE INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.before_insert_students_set_display();


