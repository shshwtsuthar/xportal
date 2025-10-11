-- Drop the old generic column
ALTER TABLE public.delivery_locations
DROP COLUMN IF EXISTS address_line_1;

-- Add the new, structured address columns as specified by AVETMISS NAT00020
ALTER TABLE public.delivery_locations
  ADD COLUMN IF NOT EXISTS building_property_name TEXT,
  ADD COLUMN IF NOT EXISTS flat_unit_details TEXT,
  ADD COLUMN IF NOT EXISTS street_number TEXT,
  ADD COLUMN IF NOT EXISTS street_name TEXT;

-- Add comments for AVETMISS compliance documentation
COMMENT ON COLUMN public.delivery_locations.building_property_name IS 'NAT00020: Building/Property Name (Max 50 chars)';
COMMENT ON COLUMN public.delivery_locations.flat_unit_details IS 'NAT00020: Flat/Unit Details (Max 30 chars)';
COMMENT ON COLUMN public.delivery_locations.street_number IS 'NAT00020: Street Number (Max 15 chars)';
COMMENT ON COLUMN public.delivery_locations.street_name IS 'NAT00020: Street Name (Max 70 chars, REQUIRED)';
