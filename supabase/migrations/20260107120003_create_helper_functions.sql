-- Create helper functions for template expansion
-- Includes blackout date retrieval and conflict detection
BEGIN;

-- ============================================================================
-- FUNCTION 1: Get blackout dates for a date range
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_blackout_dates(
  p_rto_id UUID,
  p_program_plan_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(blackout_date DATE, reason TEXT, scope TEXT) AS $$
BEGIN
  -- Return union of RTO-wide and program-specific blackout dates
  RETURN QUERY
  
  -- RTO-wide blackout dates
  SELECT 
    rbd.date AS blackout_date,
    rbd.reason,
    'rto'::TEXT AS scope
  FROM public.rto_blackout_dates rbd
  WHERE rbd.rto_id = p_rto_id
    AND rbd.date BETWEEN p_start_date AND p_end_date
  
  UNION ALL
  
  -- Program plan-specific blackout dates
  SELECT 
    ppbd.date AS blackout_date,
    COALESCE(ppbd.reason, 'Program-specific blackout') AS reason,
    'program_plan'::TEXT AS scope
  FROM public.program_plan_blackout_dates ppbd
  WHERE ppbd.program_plan_id = p_program_plan_id
    AND ppbd.date BETWEEN p_start_date AND p_end_date
  
  ORDER BY blackout_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_blackout_dates IS 'Returns all blackout dates (RTO-wide + program-specific) for a given date range';

-- ============================================================================
-- FUNCTION 2: Validate template dates within subject range
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_template_dates(
  p_template_id UUID
)
RETURNS TABLE(is_valid BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_template RECORD;
  v_subject RECORD;
BEGIN
  -- Fetch template
  SELECT * INTO v_template
  FROM public.program_plan_class_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Template not found'::TEXT;
    RETURN;
  END IF;
  
  -- Fetch parent subject
  SELECT * INTO v_subject
  FROM public.program_plan_subjects
  WHERE id = v_template.program_plan_subject_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Parent subject not found'::TEXT;
    RETURN;
  END IF;
  
  -- Validate template dates are within subject date range
  IF v_template.start_date < v_subject.start_date THEN
    RETURN QUERY SELECT false, format('Template start date %s is before subject start date %s', 
      v_template.start_date, v_subject.start_date)::TEXT;
    RETURN;
  END IF;
  
  IF v_template.end_date > v_subject.end_date THEN
    RETURN QUERY SELECT false, format('Template end date %s is after subject end date %s', 
      v_template.end_date, v_subject.end_date)::TEXT;
    RETURN;
  END IF;
  
  -- All validations passed
  RETURN QUERY SELECT true, 'Valid'::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.validate_template_dates IS 'Validates that template dates fall within parent subject date range';

-- ============================================================================
-- FUNCTION 3: Detect template conflicts (manually edited classes)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.detect_template_conflicts(
  p_template_id UUID
)
RETURNS TABLE(
  class_id UUID,
  class_date DATE,
  start_time TIME,
  end_time TIME,
  conflict_reason TEXT,
  edited_fields TEXT[]
) AS $$
BEGIN
  -- Find all manually edited classes that belong to this template
  RETURN QUERY
  SELECT 
    ppc.id AS class_id,
    ppc.class_date,
    ppc.start_time,
    ppc.end_time,
    'Class has been manually edited and will be preserved'::TEXT AS conflict_reason,
    ARRAY['manually_edited']::TEXT[] AS edited_fields
  FROM public.program_plan_classes ppc
  WHERE ppc.template_id = p_template_id
    AND ppc.is_manually_edited = true
  ORDER BY ppc.class_date, ppc.start_time;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.detect_template_conflicts IS 'Returns list of manually edited classes that would be affected by template re-expansion';

-- ============================================================================
-- FUNCTION 4: Generate dates array based on recurrence pattern
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_recurrence_dates(
  p_recurrence_type public.recurrence_type,
  p_recurrence_pattern JSONB,
  p_start_date DATE,
  p_end_date DATE,
  p_blackout_dates DATE[]
)
RETURNS TABLE(generated_date DATE) AS $$
DECLARE
  v_current_date DATE;
  v_interval INT;
  v_days_of_week INT[];
  v_day_of_week INT;
  v_day_of_month INT;
  v_custom_dates TEXT[];
  v_custom_date TEXT;
BEGIN
  CASE p_recurrence_type
    
    -- ONCE: Single date
    WHEN 'once' THEN
      IF NOT (p_start_date = ANY(p_blackout_dates)) THEN
        RETURN QUERY SELECT p_start_date;
      END IF;
    
    -- DAILY: Every N days
    WHEN 'daily' THEN
      v_interval := COALESCE((p_recurrence_pattern->>'interval')::INT, 1);
      v_current_date := p_start_date;
      
      WHILE v_current_date <= p_end_date LOOP
        IF NOT (v_current_date = ANY(p_blackout_dates)) THEN
          RETURN QUERY SELECT v_current_date;
        END IF;
        v_current_date := v_current_date + v_interval;
      END LOOP;
    
    -- WEEKLY: Specific days of week
    WHEN 'weekly' THEN
      v_interval := COALESCE((p_recurrence_pattern->>'interval')::INT, 1);
      v_days_of_week := ARRAY(
        SELECT jsonb_array_elements_text(p_recurrence_pattern->'days_of_week')::INT
      );
      
      v_current_date := p_start_date;
      
      WHILE v_current_date <= p_end_date LOOP
        v_day_of_week := EXTRACT(DOW FROM v_current_date)::INT; -- 0=Sunday
        
        IF v_day_of_week = ANY(v_days_of_week) THEN
          IF NOT (v_current_date = ANY(p_blackout_dates)) THEN
            RETURN QUERY SELECT v_current_date;
          END IF;
        END IF;
        
        v_current_date := v_current_date + 1;
      END LOOP;
    
    -- MONTHLY: Specific day of month
    WHEN 'monthly' THEN
      v_day_of_month := COALESCE((p_recurrence_pattern->>'day_of_month')::INT, 1);
      v_current_date := p_start_date;
      
      WHILE v_current_date <= p_end_date LOOP
        -- Check if current date matches the target day of month
        IF EXTRACT(DAY FROM v_current_date)::INT = v_day_of_month THEN
          IF NOT (v_current_date = ANY(p_blackout_dates)) THEN
            RETURN QUERY SELECT v_current_date;
          END IF;
        END IF;
        
        -- Move to next day
        v_current_date := v_current_date + 1;
        
        -- Skip to next month if we've passed the target day
        IF EXTRACT(DAY FROM v_current_date)::INT > v_day_of_month THEN
          v_current_date := (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month')::DATE;
        END IF;
      END LOOP;
    
    -- CUSTOM: Explicit list of dates
    WHEN 'custom' THEN
      v_custom_dates := ARRAY(
        SELECT jsonb_array_elements_text(p_recurrence_pattern->'dates')
      );
      
      FOREACH v_custom_date IN ARRAY v_custom_dates LOOP
        v_current_date := v_custom_date::DATE;
        
        IF v_current_date BETWEEN p_start_date AND p_end_date THEN
          IF NOT (v_current_date = ANY(p_blackout_dates)) THEN
            RETURN QUERY SELECT v_current_date;
          END IF;
        END IF;
      END LOOP;
    
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.generate_recurrence_dates IS 'Generates array of dates based on recurrence pattern, excluding blackout dates';

COMMIT;

