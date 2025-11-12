-- Simplify student display ID format: STU-YY-0001
-- Migrates all existing student IDs from STU-<RTO>-<YY>-<NNNNN>-<C> to STU-YY-0001
-- Per-RTO, per-year sequencing maintained with 4-digit sequence

BEGIN;

-- 1) Temporarily disable trigger to prevent auto-generation during migration
ALTER TABLE public.students DISABLE TRIGGER before_insert_students_set_display;

-- 2) Create temporary table to store migration mapping
CREATE TEMP TABLE temp_student_id_migration (
  student_id uuid PRIMARY KEY,
  rto_id uuid NOT NULL,
  created_year int NOT NULL,
  old_id text NOT NULL,
  new_id text NOT NULL,
  sequence_num bigint NOT NULL
);

-- 3) Migrate existing IDs
-- Parse old format: STU-<RTO>-<YY>-<NNNNN>-<C>
-- Extract year and sequence, convert to new format: STU-YY-0001
INSERT INTO temp_student_id_migration (student_id, rto_id, created_year, old_id, new_id, sequence_num)
SELECT 
  s.id,
  s.rto_id,
  CASE
    -- Extract year from old format ID if it matches, otherwise use created_at
    WHEN s.student_id_display ~ '^STU-[A-Z0-9]+-\d{2}-\d{5}-[A-Z0-9]$' THEN
      -- Convert YY to full year (assume 20YY for years 00-99)
      CASE 
        WHEN (regexp_match(s.student_id_display, '^STU-[A-Z0-9]+-(\d{2})-\d{5}-[A-Z0-9]$'))[1]::int >= 0 
        THEN 2000 + (regexp_match(s.student_id_display, '^STU-[A-Z0-9]+-(\d{2})-\d{5}-[A-Z0-9]$'))[1]::int
        ELSE extract(year from s.created_at)::int
      END
    ELSE
      extract(year from s.created_at)::int
  END,
  s.student_id_display,
  CASE
    -- Match old format: STU-<RTO>-<YY>-<NNNNN>-<C>
    -- Use regexp_match to extract YY and NNNNN
    WHEN s.student_id_display ~ '^STU-[A-Z0-9]+-\d{2}-\d{5}-[A-Z0-9]$' THEN
      'STU-' || 
      (regexp_match(s.student_id_display, '^STU-[A-Z0-9]+-(\d{2})-\d{5}-[A-Z0-9]$'))[1] || 
      '-' || 
      lpad(
        -- Convert 5-digit sequence to 4-digit, preserving relative order
        -- If sequence > 9999, cap at 9999
        LEAST(
          (regexp_match(s.student_id_display, '^STU-[A-Z0-9]+-\d{2}-(\d{5})-[A-Z0-9]$'))[1]::int,
          9999
        )::text,
        4,
        '0'
      )
    -- Handle non-standard IDs (e.g., seed data like STU-2025-XXXX)
    -- Use created_at year and assign sequential ID
    ELSE
      'STU-' || 
      to_char(s.created_at, 'YY') || 
      '-' || 
      lpad(
        row_number() OVER (
          PARTITION BY s.rto_id, extract(year from s.created_at)::int 
          ORDER BY s.created_at, s.id
        )::text,
        4,
        '0'
      )
  END,
  CASE
    WHEN s.student_id_display ~ '^STU-[A-Z0-9]+-\d{2}-\d{5}-[A-Z0-9]$' THEN
      LEAST(
        (regexp_match(s.student_id_display, '^STU-[A-Z0-9]+-\d{2}-(\d{5})-[A-Z0-9]$'))[1]::int,
        9999
      )
    ELSE
      row_number() OVER (
        PARTITION BY s.rto_id, extract(year from s.created_at)::int 
        ORDER BY s.created_at, s.id
      )
  END
FROM public.students s;

-- 4) Check for potential duplicates before migration
DO $$
DECLARE
  duplicate_count int;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT new_id, COUNT(*) as cnt
    FROM temp_student_id_migration
    GROUP BY new_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate IDs detected in migration. Found % duplicate new_id values. Migration aborted.', duplicate_count;
  END IF;
END $$;

-- 5) Update student IDs
UPDATE public.students s
SET student_id_display = m.new_id
FROM temp_student_id_migration m
WHERE s.id = m.student_id;

-- 6) Update sequence table to reflect highest sequence used per RTO/year
INSERT INTO public.student_id_sequences (rto_id, year, next_val)
SELECT 
  rto_id,
  created_year,
  COALESCE(MAX(sequence_num), 0) + 1
FROM temp_student_id_migration
GROUP BY rto_id, created_year
ON CONFLICT (rto_id, year) 
DO UPDATE SET 
  next_val = GREATEST(
    student_id_sequences.next_val,
    EXCLUDED.next_val
  );

-- 7) Update generate_student_display_id() function for new format
CREATE OR REPLACE FUNCTION public.generate_student_display_id(p_rto uuid, p_created date)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year_full int;
  v_year_yy text;
  v_seq bigint;
  v_seq_padded text;
BEGIN
  v_year_full := extract(year from p_created);
  v_year_yy := to_char(p_created, 'YY');
  v_seq := public.next_student_seq(p_rto, v_year_full);
  v_seq_padded := lpad(v_seq::text, 4, '0');
  
  RETURN 'STU-' || v_year_yy || '-' || v_seq_padded;
END;
$$;

COMMENT ON FUNCTION public.generate_student_display_id(uuid, date) IS 'Generates STU-YY-0001 using per-RTO/year sequence.';

-- 8) Re-enable trigger for future student creation
ALTER TABLE public.students ENABLE TRIGGER before_insert_students_set_display;

-- 9) Cleanup temporary table (will be dropped automatically at end of transaction)
DROP TABLE IF EXISTS temp_student_id_migration;

COMMIT;

