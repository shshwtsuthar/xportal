BEGIN;

-- Lookup tables
CREATE TABLE IF NOT EXISTS public.program_levels (
  id text PRIMARY KEY,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.program_fields (
  id text PRIMARY KEY,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.program_recognitions (
  id text PRIMARY KEY,
  label text NOT NULL
);

-- Seed minimal values (idempotent)
INSERT INTO public.program_levels (id, label) VALUES
  ('514','Certificate III'),
  ('421','Diploma'),
  ('420','Advanced Diploma')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.program_fields (id, label) VALUES
  ('0803','Business & Management'),
  ('0201','Computer Science')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.program_recognitions (id, label) VALUES
  ('11','Nationally Recognised'),
  ('12','Accredited Course')
ON CONFLICT (id) DO NOTHING;

-- Ensure required columns on programs
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS level_of_education_id text,
  ADD COLUMN IF NOT EXISTS field_of_education_id text,
  ADD COLUMN IF NOT EXISTS recognition_id text,
  ADD COLUMN IF NOT EXISTS nominal_hours integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vet_flag text DEFAULT 'Y',
  ADD COLUMN IF NOT EXISTS anzsco_id text,
  ADD COLUMN IF NOT EXISTS anzsic_id text;

-- Add foreign keys
DO $$ BEGIN
  ALTER TABLE public.programs
    ADD CONSTRAINT programs_level_fk FOREIGN KEY (level_of_education_id)
      REFERENCES public.program_levels(id) ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.programs
    ADD CONSTRAINT programs_field_fk FOREIGN KEY (field_of_education_id)
      REFERENCES public.program_fields(id) ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.programs
    ADD CONSTRAINT programs_recognition_fk FOREIGN KEY (recognition_id)
      REFERENCES public.program_recognitions(id) ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS (read-only for now; adapt to tenancy policies later)
ALTER TABLE public.program_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_recognitions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY levels_read ON public.program_levels FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY fields_read ON public.program_fields FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY recognitions_read ON public.program_recognitions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;


