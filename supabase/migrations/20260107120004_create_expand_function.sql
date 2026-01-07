-- Create expand_class_template function
-- Expands a template to concrete class instances with blackout date filtering
BEGIN;

-- ============================================================================
-- Main expansion function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expand_class_template(
  p_template_id UUID,
  p_preserve_edited BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
  v_subject RECORD;
  v_blackout_dates DATE[];
  v_generated_dates DATE[];
  v_classes_created INT := 0;
  v_classes_preserved INT := 0;
  v_blackout_count INT := 0;
  v_conflicts JSONB := '[]'::JSONB;
  v_date DATE;
  v_validation RECORD;
BEGIN
  -- ============================================================================
  -- STEP 1: Fetch and validate template
  -- ============================================================================
  
  SELECT * INTO v_template
  FROM public.program_plan_class_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Template not found'
    );
  END IF;
  
  -- Fetch parent subject
  SELECT * INTO v_subject
  FROM public.program_plan_subjects
  WHERE id = v_template.program_plan_subject_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Parent subject not found'
    );
  END IF;
  
  -- Validate dates
  SELECT * INTO v_validation
  FROM public.validate_template_dates(p_template_id)
  LIMIT 1;
  
  IF NOT v_validation.is_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_validation.error_message
    );
  END IF;
  
  -- ============================================================================
  -- STEP 2: Fetch blackout dates
  -- ============================================================================
  
  SELECT ARRAY_AGG(DISTINCT blackout_date) INTO v_blackout_dates
  FROM public.get_blackout_dates(
    v_template.rto_id,
    v_subject.program_plan_id,
    v_template.start_date,
    v_template.end_date
  );
  
  -- Handle NULL case (no blackout dates)
  v_blackout_dates := COALESCE(v_blackout_dates, ARRAY[]::DATE[]);
  
  -- ============================================================================
  -- STEP 3: Detect conflicts (manually edited classes)
  -- ============================================================================
  
  IF p_preserve_edited THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'class_id', class_id,
        'class_date', class_date,
        'start_time', start_time,
        'end_time', end_time,
        'conflict_reason', conflict_reason
      )
    ) INTO v_conflicts
    FROM public.detect_template_conflicts(p_template_id);
    
    v_conflicts := COALESCE(v_conflicts, '[]'::JSONB);
    
    -- Count preserved classes
    SELECT COUNT(*) INTO v_classes_preserved
    FROM public.program_plan_classes
    WHERE template_id = p_template_id
      AND is_manually_edited = true;
  END IF;
  
  -- ============================================================================
  -- STEP 4: Generate dates based on recurrence pattern
  -- ============================================================================
  
  SELECT ARRAY_AGG(generated_date) INTO v_generated_dates
  FROM public.generate_recurrence_dates(
    v_template.recurrence_type,
    v_template.recurrence_pattern,
    v_template.start_date,
    v_template.end_date,
    v_blackout_dates
  );
  
  -- Handle NULL case (no dates generated)
  v_generated_dates := COALESCE(v_generated_dates, ARRAY[]::DATE[]);
  
  -- Calculate blackout count
  v_blackout_count := (
    SELECT COUNT(*)
    FROM public.generate_recurrence_dates(
      v_template.recurrence_type,
      v_template.recurrence_pattern,
      v_template.start_date,
      v_template.end_date,
      ARRAY[]::DATE[] -- Without blackouts
    )
  ) - ARRAY_LENGTH(v_generated_dates, 1);
  
  -- ============================================================================
  -- STEP 5: Delete existing non-edited classes
  -- ============================================================================
  
  IF p_preserve_edited THEN
    -- Delete only non-edited classes
    DELETE FROM public.program_plan_classes
    WHERE template_id = p_template_id
      AND is_manually_edited = false;
  ELSE
    -- Delete all classes (including edited ones)
    DELETE FROM public.program_plan_classes
    WHERE template_id = p_template_id;
    
    v_classes_preserved := 0;
  END IF;
  
  -- ============================================================================
  -- STEP 6: Insert new class instances
  -- ============================================================================
  
  FOREACH v_date IN ARRAY v_generated_dates LOOP
    INSERT INTO public.program_plan_classes (
      program_plan_subject_id,
      template_id,
      class_date,
      start_time,
      end_time,
      trainer_id,
      location_id,
      classroom_id,
      group_id,
      class_type,
      notes,
      is_manually_edited
    ) VALUES (
      v_template.program_plan_subject_id,
      p_template_id,
      v_date,
      v_template.start_time,
      v_template.end_time,
      v_template.trainer_id,
      v_template.location_id,
      v_template.classroom_id,
      v_template.group_id,
      v_template.class_type,
      v_template.notes,
      false -- Not manually edited (just created)
    );
    
    v_classes_created := v_classes_created + 1;
  END LOOP;
  
  -- ============================================================================
  -- STEP 7: Update template metadata
  -- ============================================================================
  
  UPDATE public.program_plan_class_templates
  SET 
    is_expanded = true,
    expanded_at = NOW(),
    last_expanded_at = NOW(),
    generated_class_count = v_classes_created + v_classes_preserved,
    conflicts_detected = v_conflicts
  WHERE id = p_template_id;
  
  -- ============================================================================
  -- STEP 8: Return results
  -- ============================================================================
  
  RETURN jsonb_build_object(
    'success', true,
    'classes_created', v_classes_created,
    'classes_preserved', v_classes_preserved,
    'blackout_dates_skipped', v_blackout_count,
    'total_classes', v_classes_created + v_classes_preserved,
    'conflicts', v_conflicts
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.expand_class_template IS 'Expands a class template to concrete class instances, respecting blackout dates and optional manual edit preservation';

-- ============================================================================
-- Convenience function: Preview expansion without saving
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preview_template_expansion(
  p_template_id UUID
)
RETURNS TABLE(
  generated_date DATE,
  is_blackout_date BOOLEAN,
  blackout_reason TEXT
) AS $$
DECLARE
  v_template RECORD;
  v_subject RECORD;
  v_blackout_dates DATE[];
BEGIN
  -- Fetch template and subject
  SELECT * INTO v_template
  FROM public.program_plan_class_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  SELECT * INTO v_subject
  FROM public.program_plan_subjects
  WHERE id = v_template.program_plan_subject_id;
  
  -- Fetch blackout dates
  SELECT ARRAY_AGG(DISTINCT blackout_date) INTO v_blackout_dates
  FROM public.get_blackout_dates(
    v_template.rto_id,
    v_subject.program_plan_id,
    v_template.start_date,
    v_template.end_date
  );
  
  v_blackout_dates := COALESCE(v_blackout_dates, ARRAY[]::DATE[]);
  
  -- Generate dates WITH blackouts for comparison
  RETURN QUERY
  SELECT 
    grd.generated_date,
    (grd.generated_date = ANY(v_blackout_dates)) AS is_blackout_date,
    CASE 
      WHEN (grd.generated_date = ANY(v_blackout_dates)) THEN 'Blackout date - will be skipped'
      ELSE NULL
    END AS blackout_reason
  FROM public.generate_recurrence_dates(
    v_template.recurrence_type,
    v_template.recurrence_pattern,
    v_template.start_date,
    v_template.end_date,
    ARRAY[]::DATE[] -- Generate all dates for preview
  ) grd
  ORDER BY grd.generated_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.preview_template_expansion IS 'Preview dates that would be generated from template expansion (for UI preview)';

COMMIT;

