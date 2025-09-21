-- =============================================================================
-- Migration: Add NAT00030 Program Field Requirements
-- Date: 2025-09-21
-- Description: Extends core.programs table with all mandatory and optional NAT00030 fields
--              for AVETMISS compliance as per Australian RTO requirements.
-- =============================================================================

-- Add NAT00030 required and optional fields to core.programs table
ALTER TABLE core.programs 
ADD COLUMN IF NOT EXISTS program_level_of_education_identifier VARCHAR(3) NOT NULL DEFAULT '000',
ADD COLUMN IF NOT EXISTS program_field_of_education_identifier VARCHAR(4) NOT NULL DEFAULT '0000',
ADD COLUMN IF NOT EXISTS program_recognition_identifier VARCHAR(2) NOT NULL DEFAULT '01',
ADD COLUMN IF NOT EXISTS vet_flag CHAR(1) NOT NULL DEFAULT 'Y' CHECK (vet_flag IN ('Y', 'N')),
ADD COLUMN IF NOT EXISTS nominal_hours INTEGER NOT NULL DEFAULT 0 CHECK (nominal_hours >= 0),
ADD COLUMN IF NOT EXISTS anzsco_identifier VARCHAR(6) NULL,
ADD COLUMN IF NOT EXISTS anzsic_identifier VARCHAR(4) NULL;

-- Add comments for documentation
COMMENT ON COLUMN core.programs.program_level_of_education_identifier IS 'NAT00030: AQF level identifier (3 chars) - e.g., 405 for Certificate IV';
COMMENT ON COLUMN core.programs.program_field_of_education_identifier IS 'NAT00030: ASCED field of education identifier (4 chars) - e.g., 0809 for Business';
COMMENT ON COLUMN core.programs.program_recognition_identifier IS 'NAT00030: Program recognition status (2 chars) - 01=Nationally Recognised, 02=State Recognised, etc';
COMMENT ON COLUMN core.programs.vet_flag IS 'NAT00030: VET flag indicator (1 char) - Y=Yes, N=No';
COMMENT ON COLUMN core.programs.nominal_hours IS 'NAT00030: Program nominal hours (4 digits) - total program duration';
COMMENT ON COLUMN core.programs.anzsco_identifier IS 'NAT00030: ANZSCO occupation code (6 chars) - optional, not all programs have occupation link';
COMMENT ON COLUMN core.programs.anzsic_identifier IS 'NAT00030: ANZSIC industry code (4 chars) - optional, not all programs have industry link';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_programs_level ON core.programs(program_level_of_education_identifier);
CREATE INDEX IF NOT EXISTS idx_programs_field ON core.programs(program_field_of_education_identifier);
CREATE INDEX IF NOT EXISTS idx_programs_recognition ON core.programs(program_recognition_identifier);
CREATE INDEX IF NOT EXISTS idx_programs_vet_flag ON core.programs(vet_flag);

-- Add validation constraints
ALTER TABLE core.programs ADD CONSTRAINT chk_program_level_format 
  CHECK (program_level_of_education_identifier ~ '^[0-9]{3}$');

ALTER TABLE core.programs ADD CONSTRAINT chk_program_field_format 
  CHECK (program_field_of_education_identifier ~ '^[0-9]{4}$');

ALTER TABLE core.programs ADD CONSTRAINT chk_program_recognition_format 
  CHECK (program_recognition_identifier ~ '^[0-9]{2}$');

ALTER TABLE core.programs ADD CONSTRAINT chk_anzsco_format 
  CHECK (anzsco_identifier IS NULL OR anzsco_identifier ~ '^[0-9]{6}$');

ALTER TABLE core.programs ADD CONSTRAINT chk_anzsic_format 
  CHECK (anzsic_identifier IS NULL OR anzsic_identifier ~ '^[0-9]{4}$');

-- Update existing programs with default values if they don't have the new fields
-- This ensures backward compatibility
UPDATE core.programs SET 
  program_level_of_education_identifier = '000',
  program_field_of_education_identifier = '0000',
  program_recognition_identifier = '01',
  vet_flag = 'Y',
  nominal_hours = 0,
  anzsco_identifier = NULL,
  anzsic_identifier = NULL
WHERE program_level_of_education_identifier IS NULL;