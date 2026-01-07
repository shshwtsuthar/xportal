-- Create direct class creation functions without template system
-- Simplifies the workflow: Pattern → Classes (no template middleman)
BEGIN;

-- ============================================================================
-- FUNCTION 1: Enhanced generate_recurrence_dates with subject range filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_recurrence_dates(
  p_recurrence_type public.recurrence_type,
  p_recurrence_pattern JSONB,
  p_start_date DATE,
  p_end_date DATE,
  p_blackout_dates DATE[] DEFAULT '{}',
  p_filter_by_subject_range BOOLEAN DEFAULT true,
  p_subject_start_date DATE DEFAULT NULL,
  p_subject_end_date DATE DEFAULT NULL
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
  v_effective_start_date DATE;
  v_effective_end_date DATE;
BEGIN
  -- Determine effective date range
  IF p_filter_by_subject_range AND p_subject_start_date IS NOT NULL AND p_subject_end_date IS NOT NULL THEN
    -- Only generate dates within subject date range
    v_effective_start_date := GREATEST(p_start_date, p_subject_start_date);
    v_effective_end_date := LEAST(p_end_date, p_subject_end_date);
  ELSE
    v_effective_start_date := p_start_date;
    v_effective_end_date := p_end_date;
  END IF;

  -- Skip if the effective range is invalid
  IF v_effective_start_date > v_effective_end_date THEN
    RETURN;
  END IF;

  CASE p_recurrence_type
    
    -- ONCE: Single date
    WHEN 'once' THEN
      IF v_effective_start_date BETWEEN v_effective_start_date AND v_effective_end_date THEN
        IF NOT (v_effective_start_date = ANY(p_blackout_dates)) THEN
          RETURN QUERY SELECT v_effective_start_date;
        END IF;
      END IF;
    
    -- DAILY: Every N days
    WHEN 'daily' THEN
      v_interval := COALESCE((p_recurrence_pattern->>'interval')::INT, 1);
      v_current_date := v_effective_start_date;
      
      WHILE v_current_date <= v_effective_end_date LOOP
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
      
      v_current_date := v_effective_start_date;
      
      WHILE v_current_date <= v_effective_end_date LOOP
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
      v_current_date := v_effective_start_date;
      
      WHILE v_current_date <= v_effective_end_date LOOP
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
        
        IF v_current_date BETWEEN v_effective_start_date AND v_effective_end_date THEN
          IF NOT (v_current_date = ANY(p_blackout_dates)) THEN
            RETURN QUERY SELECT v_current_date;
          END IF;
        END IF;
      END LOOP;
    
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.generate_recurrence_dates(
  public.recurrence_type,
  JSONB,
  DATE,
  DATE,
  DATE[],
  BOOLEAN,
  DATE,
  DATE
) IS 'Generates array of dates based on recurrence pattern, with optional subject date range filtering and blackout date exclusion';

-- ============================================================================
-- FUNCTION 2: Create recurring classes for a single subject
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_recurring_classes(
  p_program_plan_subject_id UUID,
  p_recurrence_type public.recurrence_type,
  p_recurrence_pattern JSONB,
  p_start_date DATE,
  p_end_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_trainer_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_classroom_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL,
  p_class_type public.class_type DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_filter_by_subject_range BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
  v_subject RECORD;
  v_dates DATE[];
  v_date DATE;
  v_classes_created INT := 0;
  v_blackout_dates_skipped INT := 0;
BEGIN
  -- Fetch subject and validate
  SELECT * INTO v_subject
  FROM public.program_plan_subjects
  WHERE id = p_program_plan_subject_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subject not found: %', p_program_plan_subject_id;
  END IF;
  
  -- Generate dates using the enhanced function
  SELECT ARRAY_AGG(generated_date ORDER BY generated_date)
  INTO v_dates
  FROM public.generate_recurrence_dates(
    p_recurrence_type,
    p_recurrence_pattern,
    p_start_date,
    p_end_date,
    '{}', -- No blackout dates for now
    p_filter_by_subject_range,
    v_subject.start_date,
    v_subject.end_date
  );
  
  -- Insert classes for each generated date
  IF v_dates IS NOT NULL THEN
    FOREACH v_date IN ARRAY v_dates LOOP
      INSERT INTO public.program_plan_classes (
        program_plan_subject_id,
        class_date,
        start_time,
        end_time,
        trainer_id,
        location_id,
        classroom_id,
        group_id,
        class_type,
        notes
      ) VALUES (
        p_program_plan_subject_id,
        v_date,
        p_start_time,
        p_end_time,
        p_trainer_id,
        p_location_id,
        p_classroom_id,
        p_group_id,
        p_class_type,
        p_notes
      );
      
      v_classes_created := v_classes_created + 1;
    END LOOP;
  END IF;
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'classes_created', v_classes_created,
    'blackout_dates_skipped', v_blackout_dates_skipped,
    'date_range_filtered', p_filter_by_subject_range,
    'subject_id', p_program_plan_subject_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_recurring_classes(
  UUID,
  public.recurrence_type,
  JSONB,
  DATE,
  DATE,
  TIME,
  TIME,
  UUID,
  UUID,
  UUID,
  UUID,
  public.class_type,
  TEXT,
  BOOLEAN
) IS 'Creates recurring classes directly from a recurrence pattern without templates';

-- ============================================================================
-- FUNCTION 3: Batch create recurring classes for multiple subjects
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_recurring_classes_batch(
  p_program_plan_id UUID,
  p_subject_ids UUID[],
  p_recurrence_type public.recurrence_type,
  p_recurrence_pattern JSONB,
  p_start_date DATE,
  p_end_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_trainer_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_classroom_id UUID DEFAULT NULL,
  p_group_id UUID DEFAULT NULL,
  p_class_type public.class_type DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_filter_by_subject_range BOOLEAN DEFAULT true
) RETURNS JSONB AS $$
DECLARE
  v_subject_id UUID;
  v_result JSONB;
  v_results JSONB[] := '{}';
  v_total_classes INT := 0;
  v_subjects_processed INT := 0;
BEGIN
  -- Process each subject
  FOREACH v_subject_id IN ARRAY p_subject_ids LOOP
    -- Create recurring classes for this subject
    v_result := public.create_recurring_classes(
      v_subject_id,
      p_recurrence_type,
      p_recurrence_pattern,
      p_start_date,
      p_end_date,
      p_start_time,
      p_end_time,
      p_trainer_id,
      p_location_id,
      p_classroom_id,
      p_group_id,
      p_class_type,
      p_notes,
      p_filter_by_subject_range
    );
    
    -- Accumulate results
    v_results := array_append(v_results, v_result);
    v_total_classes := v_total_classes + (v_result->>'classes_created')::INT;
    v_subjects_processed := v_subjects_processed + 1;
  END LOOP;
  
  -- Return summary with per-subject results
  RETURN jsonb_build_object(
    'success', true,
    'subjects_processed', v_subjects_processed,
    'total_classes_created', v_total_classes,
    'date_range_filtered', p_filter_by_subject_range,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_recurring_classes_batch(
  UUID,
  UUID[],
  public.recurrence_type,
  JSONB,
  DATE,
  DATE,
  TIME,
  TIME,
  UUID,
  UUID,
  UUID,
  UUID,
  public.class_type,
  TEXT,
  BOOLEAN
) IS 'Batch creates recurring classes for multiple subjects in a single transaction';

COMMIT;

