-- Add template tracking columns to program_plan_classes
-- Enables linking classes to templates and tracking manual edits
BEGIN;

-- ============================================================================
-- PART 1: Add template_id column
-- ============================================================================

ALTER TABLE public.program_plan_classes 
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.program_plan_class_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.program_plan_classes.template_id IS 'Reference to the template that generated this class (NULL for manually created classes)';

-- Create index for efficient template-based queries
CREATE INDEX IF NOT EXISTS idx_program_plan_classes_template ON public.program_plan_classes(template_id);

-- ============================================================================
-- PART 2: Add is_manually_edited column
-- ============================================================================

ALTER TABLE public.program_plan_classes 
  ADD COLUMN IF NOT EXISTS is_manually_edited BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.program_plan_classes.is_manually_edited IS 'True if this class was modified after template expansion (preserves manual changes during re-expansion)';

-- Create index for conflict detection queries
CREATE INDEX IF NOT EXISTS idx_program_plan_classes_manually_edited ON public.program_plan_classes(template_id, is_manually_edited) 
  WHERE template_id IS NOT NULL;

-- ============================================================================
-- PART 3: Create trigger to set is_manually_edited on update
-- ============================================================================

-- This trigger automatically marks classes as manually edited when staff modify them
CREATE OR REPLACE FUNCTION public.mark_class_as_manually_edited()
RETURNS TRIGGER AS $$
BEGIN
  -- Only mark as edited if the class was generated from a template
  -- and the modification is not from the template expansion itself
  IF NEW.template_id IS NOT NULL AND OLD.template_id IS NOT NULL THEN
    -- Check if any substantive fields changed (not just metadata)
    IF (NEW.class_date != OLD.class_date OR
        NEW.start_time != OLD.start_time OR
        NEW.end_time != OLD.end_time OR
        NEW.trainer_id IS DISTINCT FROM OLD.trainer_id OR
        NEW.location_id != OLD.location_id OR
        NEW.classroom_id IS DISTINCT FROM OLD.classroom_id OR
        NEW.group_id IS DISTINCT FROM OLD.group_id OR
        NEW.class_type IS DISTINCT FROM OLD.class_type OR
        NEW.notes IS DISTINCT FROM OLD.notes) THEN
      NEW.is_manually_edited = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_class_manually_edited ON public.program_plan_classes;
CREATE TRIGGER set_class_manually_edited
BEFORE UPDATE ON public.program_plan_classes
FOR EACH ROW
EXECUTE FUNCTION public.mark_class_as_manually_edited();

COMMIT;

