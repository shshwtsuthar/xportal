-- 20260129000000_split_street_number_name.sql
-- Purpose: Split 'number_name' into separate 'number' and 'street' fields for applications and student_addresses.

-- 1. Modify applications table
ALTER TABLE public.applications
  -- Add new split columns for street address
  ADD COLUMN IF NOT EXISTS street_number TEXT,
  ADD COLUMN IF NOT EXISTS street_name TEXT,
  -- Add new split columns for postal address
  ADD COLUMN IF NOT EXISTS postal_street_number TEXT,
  ADD COLUMN IF NOT EXISTS postal_street_name TEXT;

-- Drop old columns (no data migration needed as per user instruction)
ALTER TABLE public.applications
  DROP COLUMN IF EXISTS street_number_name,
  DROP COLUMN IF EXISTS postal_number_name;

-- 2. Modify student_addresses table
ALTER TABLE public.student_addresses
  -- Add new split columns
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT;

-- Drop old columns
ALTER TABLE public.student_addresses
  DROP COLUMN IF EXISTS number_name;

-- 3. Update comments/metadata if necessary (optional)
COMMENT ON COLUMN public.applications.street_number IS 'Street number portion of the address';
COMMENT ON COLUMN public.applications.street_name IS 'Street name portion of the address';
