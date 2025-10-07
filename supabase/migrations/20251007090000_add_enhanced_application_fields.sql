-- add_enhanced_application_fields.sql
-- Purpose: Introduce reusable agents table and expand applications with denormalized contact and address fields.

-- 2.1 New Table: agents
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    UNIQUE(rto_id, name)
);
COMMENT ON TABLE public.agents IS 'Stores information about recruitment agents associated with the RTO.';

-- Enable RLS and basic policies for agents (consistent with existing pattern)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agents' AND policyname = 'rls_agents_all'
  ) THEN
    CREATE POLICY "rls_agents_all" ON public.agents FOR ALL USING (rto_id = public.get_my_rto_id());
  END IF;
END $$;

-- 2.2 ALTER TABLE: applications - add enhanced fields
ALTER TABLE public.applications
  -- Personal Identity Enhancements
  ADD COLUMN IF NOT EXISTS salutation TEXT,
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,

  -- Agent Relationship
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id),

  -- Expanded Contact Details
  ADD COLUMN IF NOT EXISTS work_phone TEXT,
  ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
  ADD COLUMN IF NOT EXISTS alternative_email TEXT,

  -- Structured Street Address
  ADD COLUMN IF NOT EXISTS street_building_name TEXT,
  ADD COLUMN IF NOT EXISTS street_unit_details TEXT,
  ADD COLUMN IF NOT EXISTS street_number_name TEXT,
  ADD COLUMN IF NOT EXISTS street_po_box TEXT,
  ADD COLUMN IF NOT EXISTS street_country TEXT,

  -- Postal Address
  ADD COLUMN IF NOT EXISTS postal_is_same_as_street BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS postal_building_name TEXT,
  ADD COLUMN IF NOT EXISTS postal_unit_details TEXT,
  ADD COLUMN IF NOT EXISTS postal_number_name TEXT,
  ADD COLUMN IF NOT EXISTS postal_po_box TEXT,
  ADD COLUMN IF NOT EXISTS postal_suburb TEXT,
  ADD COLUMN IF NOT EXISTS postal_state TEXT,
  ADD COLUMN IF NOT EXISTS postal_postcode TEXT,
  ADD COLUMN IF NOT EXISTS postal_country TEXT,

  -- Expanded International Student Details (CRICOS)
  ADD COLUMN IF NOT EXISTS country_of_citizenship TEXT,
  ADD COLUMN IF NOT EXISTS visa_number TEXT,
  ADD COLUMN IF NOT EXISTS ielts_score TEXT,

  -- Embedded Emergency Contact Details
  ADD COLUMN IF NOT EXISTS ec_name TEXT,
  ADD COLUMN IF NOT EXISTS ec_relationship TEXT,
  ADD COLUMN IF NOT EXISTS ec_phone_number TEXT,

  -- Embedded Parent/Guardian Details
  ADD COLUMN IF NOT EXISTS g_name TEXT,
  ADD COLUMN IF NOT EXISTS g_email TEXT,
  ADD COLUMN IF NOT EXISTS g_phone_number TEXT;

-- Optional: maintain referential integrity from applications.agent_id to agents.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'applications_agent_id_fkey' AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_agent_id_fkey FOREIGN KEY (agent_id)
      REFERENCES public.agents(id) ON DELETE SET NULL;
  END IF;
END $$;


