-- Normalize student data domain: sub-tables and enrollment_classes
-- Note: Ensure required extensions are available (uuid-ossp or pgcrypto) as used elsewhere.

-- Enums
DO $$ BEGIN
  CREATE TYPE public.student_address_type AS ENUM ('street', 'postal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- student_addresses
CREATE TABLE IF NOT EXISTS public.student_addresses (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id),
  rto_id uuid NOT NULL REFERENCES public.rtos(id),
  type public.student_address_type NOT NULL,
  building_name text,
  unit_details text,
  number_name text,
  po_box text,
  suburb text,
  state text,
  postcode text,
  country text,
  is_primary boolean NOT NULL DEFAULT false
);

-- student_contacts_emergency
CREATE TABLE IF NOT EXISTS public.student_contacts_emergency (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id),
  rto_id uuid NOT NULL REFERENCES public.rtos(id),
  name text NOT NULL,
  relationship text,
  phone_number text
);

-- student_contacts_guardians
CREATE TABLE IF NOT EXISTS public.student_contacts_guardians (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id),
  rto_id uuid NOT NULL REFERENCES public.rtos(id),
  name text NOT NULL,
  email text,
  phone_number text
);

-- student_avetmiss
CREATE TABLE IF NOT EXISTS public.student_avetmiss (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id),
  rto_id uuid NOT NULL REFERENCES public.rtos(id),
  -- NAT00080 / NAT00085 core attributes captured at application time
  gender text, -- NAT00080: Client Gender
  highest_school_level_id text, -- NAT00080: Highest School Level Completed Identifier
  indigenous_status_id text, -- NAT00080: Indigenous Status Identifier
  labour_force_status_id text, -- NAT00080: Labour Force Status Identifier
  country_of_birth_id text, -- NAT00080: Country of Birth Identifier
  language_code text, -- NAT00080: Language Identifier
  citizenship_status_code text, -- NAT00080: Client Citizenship Status
  at_school_flag text -- NAT00080: At School Flag
);

-- student_cricos
CREATE TABLE IF NOT EXISTS public.student_cricos (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id),
  rto_id uuid NOT NULL REFERENCES public.rtos(id),
  is_international boolean NOT NULL DEFAULT false,
  passport_number text,
  visa_type text,
  visa_number text,
  country_of_citizenship text,
  ielts_score text
);

-- student_documents (metadata of copied files)
CREATE TABLE IF NOT EXISTS public.student_documents (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL REFERENCES public.students(id),
  rto_id uuid NOT NULL REFERENCES public.rtos(id),
  file_path text NOT NULL,
  category text,
  sha256 text,
  size_bytes integer,
  source_application_id uuid REFERENCES public.applications(id)
);

-- enrollment_classes (snapshot of planned classes)
CREATE TABLE IF NOT EXISTS public.enrollment_classes (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id),
  program_plan_class_id uuid NOT NULL REFERENCES public.program_plan_classes(id),
  class_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  trainer_id uuid REFERENCES public.profiles(id),
  location_id uuid REFERENCES public.delivery_locations(id),
  classroom_id uuid REFERENCES public.classrooms(id),
  class_type text,
  notes text
);

-- Enable RLS
ALTER TABLE public.student_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_contacts_emergency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_contacts_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_avetmiss ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_cricos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_classes ENABLE ROW LEVEL SECURITY;

-- Policies: tenant isolation via rto_id
DO $$ BEGIN
  CREATE POLICY rls_student_addresses_all ON public.student_addresses FOR ALL USING (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_student_contacts_emergency_all ON public.student_contacts_emergency FOR ALL USING (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_student_contacts_guardians_all ON public.student_contacts_guardians FOR ALL USING (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_student_avetmiss_all ON public.student_avetmiss FOR ALL USING (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_student_cricos_all ON public.student_cricos FOR ALL USING (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_student_documents_all ON public.student_documents FOR ALL USING (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY rls_enrollment_classes_all ON public.enrollment_classes FOR ALL USING ((SELECT rto_id FROM public.enrollments WHERE id = enrollment_id) = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


