-- =============================================================================
-- MIGRATION: Enhance Organisations Table for NAT00010 AVETMISS Compliance
-- PURPOSE: Add missing NAT00010 fields to core.organisations table
-- =============================================================================

-- Add missing NAT00010 fields to organisations table
ALTER TABLE "core"."organisations" 
ADD COLUMN IF NOT EXISTS "address_id" uuid REFERENCES "core"."addresses"("id"),
ADD COLUMN IF NOT EXISTS "phone_number" character varying(20),
ADD COLUMN IF NOT EXISTS "fax_number" character varying(20),
ADD COLUMN IF NOT EXISTS "email_address" character varying(80),
ADD COLUMN IF NOT EXISTS "contact_name" character varying(60);

-- Add comment for NAT00010 compliance
COMMENT ON COLUMN "core"."organisations"."address_id" IS 'Reference to core.addresses table for NAT00010 address information';
COMMENT ON COLUMN "core"."organisations"."phone_number" IS 'NAT00010: Telephone number (A, 20)';
COMMENT ON COLUMN "core"."organisations"."fax_number" IS 'NAT00010: Facsimile number (A, 20)';
COMMENT ON COLUMN "core"."organisations"."email_address" IS 'NAT00010: Email address (A, 80)';
COMMENT ON COLUMN "core"."organisations"."contact_name" IS 'NAT00010: Contact name (A, 60)';

-- Add is_active column to locations table for better management
ALTER TABLE "core"."locations" 
ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;

COMMENT ON COLUMN "core"."locations"."is_active" IS 'Indicates if the location is active for training delivery';
