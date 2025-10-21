-- agent_public_intake.sql
-- Purpose: Support public agent intake links by adding agents.slug and applications.requested_start_date

BEGIN;

-- 1) agents.slug (human-friendly, unique per tenant)
DO $$ BEGIN
  -- Add column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.agents ADD COLUMN slug text;
  END IF;
END $$;

-- Backfill slug from name; normalize and de-duplicate within (rto_id, slug)
-- Base normalization: lowercase, non-alnum -> '-', trim leading/trailing '-'
UPDATE public.agents a SET slug = NULL WHERE slug IS NOT NULL; -- ensure deterministic backfill
UPDATE public.agents a
SET slug = regexp_replace(lower(coalesce(name, 'agent')),
                          '[^a-z0-9]+', '-', 'g');
UPDATE public.agents a
SET slug = regexp_replace(coalesce(slug, ''), '(^-+|-+$)', '', 'g')
WHERE slug IS NOT NULL;

-- Ensure uniqueness per (rto_id, slug) by appending short id for duplicates
WITH ranked AS (
  SELECT id, rto_id, slug,
         row_number() OVER (PARTITION BY rto_id, slug ORDER BY id) AS rn
  FROM public.agents
)
UPDATE public.agents a
SET slug = a.slug || '-' || substr(a.id::text, 1, 8)
FROM ranked r
WHERE a.id = r.id AND r.rn > 1;

-- Enforce NOT NULL and UNIQUE constraint (per tenant)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'agents_rto_id_slug_key'
  ) THEN
    CREATE UNIQUE INDEX agents_rto_id_slug_key ON public.agents (rto_id, slug);
  END IF;
END $$;

ALTER TABLE public.agents ALTER COLUMN slug SET NOT NULL;
COMMENT ON COLUMN public.agents.slug IS 'Human-friendly unique slug per RTO for public intake links';


-- 2) applications.requested_start_date
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'requested_start_date'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN requested_start_date date;
    COMMENT ON COLUMN public.applications.requested_start_date IS 'Requested start date provided by agent via public intake form';
  END IF;
END $$;

COMMIT;


