-- =============================================================================
-- MIGRATION: Ensure Single Organisation Record
-- PURPOSE:   Enforce NAT00010 requirement of exactly one organisation record
-- =============================================================================

-- Create a function to prevent multiple organisation records
CREATE OR REPLACE FUNCTION "core"."prevent_multiple_organisations"()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an INSERT (new record being created)
  IF TG_OP = 'INSERT' THEN
    -- Check if any organisation already exists
    IF EXISTS (SELECT 1 FROM "core"."organisations") THEN
      RAISE EXCEPTION 'Only one organisation record is allowed. NAT00010 requires exactly one organisation record for AVETMISS compliance.';
    END IF;
  END IF;
  
  -- If this is an UPDATE, allow it (updating existing record)
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single organisation rule
CREATE TRIGGER "organisations_single_record_trigger"
  BEFORE INSERT ON "core"."organisations"
  FOR EACH ROW
  EXECUTE FUNCTION "core"."prevent_multiple_organisations"();

-- Add a comment explaining the trigger
COMMENT ON TRIGGER "organisations_single_record_trigger" ON "core"."organisations" 
IS 'Ensures only one organisation record exists, as required by AVETMISS NAT00010 compliance';
