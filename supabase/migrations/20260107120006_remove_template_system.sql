-- Cleanup migration to remove template system
-- This migration removes template-related tables, columns, and functions
BEGIN;

-- ============================================================================
-- PART 1: Drop template-related functions
-- ============================================================================

-- Drop template expansion functions
DROP FUNCTION IF EXISTS public.expand_class_template(UUID, BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.preview_template_expansion(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.validate_template_dates(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.detect_template_conflicts(UUID) CASCADE;

-- Drop the blackout dates helper function (no longer needed)
DROP FUNCTION IF EXISTS public.get_blackout_dates(UUID, UUID, DATE, DATE) CASCADE;

-- ============================================================================
-- PART 2: Remove template tracking columns from program_plan_classes
-- ============================================================================

-- Remove template_id foreign key and column
ALTER TABLE public.program_plan_classes 
  DROP COLUMN IF EXISTS template_id CASCADE;

-- Remove is_manually_edited column
ALTER TABLE public.program_plan_classes 
  DROP COLUMN IF EXISTS is_manually_edited CASCADE;

-- Drop the trigger that marks classes as manually edited
DROP TRIGGER IF EXISTS mark_class_as_manually_edited_trigger ON public.program_plan_classes CASCADE;
DROP FUNCTION IF EXISTS public.mark_class_as_manually_edited() CASCADE;

-- ============================================================================
-- PART 3: Drop template-related tables
-- ============================================================================

-- Drop program_plan_blackout_dates table
DROP TABLE IF EXISTS public.program_plan_blackout_dates CASCADE;

-- Drop program_plan_class_templates table
DROP TABLE IF EXISTS public.program_plan_class_templates CASCADE;

COMMIT;

