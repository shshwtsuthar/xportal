-- =============================================================================
-- Migration: Add Course Plan Prerequisites and Enhanced Subject Structure
-- VERSION: 20250913142411
-- AUTHOR: Lead Backend Engineer
--
-- DESCRIPTION:
-- This migration adds the prerequisite system and enhances course plan subjects
-- with duration and complexity information to support the dual intake models
-- (Fixed and Rolling) with proper progression rules.
-- =============================================================================

-- 1) Enhance existing course plan subjects table with duration and complexity
ALTER TABLE core.program_course_plan_subjects 
ADD COLUMN IF NOT EXISTS estimated_duration_weeks integer DEFAULT 4 CHECK (estimated_duration_weeks > 0),
ADD COLUMN IF NOT EXISTS complexity_level text DEFAULT 'Basic' CHECK (complexity_level IN ('Basic', 'Intermediate', 'Advanced'));

-- 2) Create Subject Prerequisites Table
-- This table defines the dependency relationships between subjects in a course plan
CREATE TABLE IF NOT EXISTS core.subject_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES core.subjects(id) ON DELETE CASCADE,
  prerequisite_subject_id uuid NOT NULL REFERENCES core.subjects(id) ON DELETE CASCADE,
  prerequisite_type text NOT NULL CHECK (prerequisite_type IN ('Required', 'Recommended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_id, prerequisite_subject_id)
);

-- 3) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subject_prerequisites_subject_id ON core.subject_prerequisites(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_prerequisites_prerequisite_subject_id ON core.subject_prerequisites(prerequisite_subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_prerequisites_type ON core.subject_prerequisites(prerequisite_type);

-- 4) Create function to detect circular dependencies
CREATE OR REPLACE FUNCTION core.detect_circular_prerequisites()
RETURNS TABLE (
  subject_id uuid,
  prerequisite_subject_id uuid,
  is_circular boolean
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dependency_path AS (
    -- Base case: direct prerequisites
    SELECT 
      sp.subject_id,
      sp.prerequisite_subject_id,
      ARRAY[sp.subject_id] as path,
      false as is_circular
    FROM core.subject_prerequisites sp
    
    UNION ALL
    
    -- Recursive case: follow the chain
    SELECT 
      dp.subject_id,
      sp.prerequisite_subject_id,
      dp.path || sp.prerequisite_subject_id,
      (sp.prerequisite_subject_id = ANY(dp.path)) as is_circular
    FROM dependency_path dp
    JOIN core.subject_prerequisites sp ON dp.prerequisite_subject_id = sp.subject_id
    WHERE NOT dp.is_circular
  )
  SELECT 
    dp.subject_id,
    dp.prerequisite_subject_id,
    dp.is_circular
  FROM dependency_path dp
  WHERE dp.is_circular = true;
END;
$$;

-- 5) Create function to get subject progression phases
CREATE OR REPLACE FUNCTION core.get_subject_progression_phases(plan_id_param uuid)
RETURNS TABLE (
  phase_number integer,
  subject_ids uuid[],
  estimated_start_week integer,
  estimated_end_week integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_week integer := 1;
  phase_num integer := 1;
  subjects_in_phase uuid[];
  max_duration integer;
BEGIN
  -- Get all subjects in the plan with their prerequisites
  WITH RECURSIVE subject_deps AS (
    -- Base case: subjects with no prerequisites
    SELECT 
      ps.subject_id,
      ps.estimated_duration_weeks,
      0 as dependency_depth
    FROM core.program_course_plan_subjects ps
    LEFT JOIN core.subject_prerequisites sp ON ps.subject_id = sp.subject_id 
      AND sp.prerequisite_type = 'Required'
    WHERE ps.plan_id = plan_id_param
      AND sp.subject_id IS NULL
    
    UNION ALL
    
    -- Recursive case: subjects with prerequisites
    SELECT 
      ps.subject_id,
      ps.estimated_duration_weeks,
      sd.dependency_depth + 1
    FROM core.program_course_plan_subjects ps
    JOIN core.subject_prerequisites sp ON ps.subject_id = sp.subject_id 
      AND sp.prerequisite_type = 'Required'
    JOIN subject_deps sd ON sp.prerequisite_subject_id = sd.subject_id
    WHERE ps.plan_id = plan_id_param
  ),
  phases AS (
    SELECT 
      dependency_depth,
      array_agg(subject_id ORDER BY estimated_duration_weeks DESC) as subjects,
      max(estimated_duration_weeks) as max_duration
    FROM subject_deps
    GROUP BY dependency_depth
    ORDER BY dependency_depth
  )
  SELECT 
    row_number() OVER () as phase_number,
    subjects,
    current_week as estimated_start_week,
    current_week + max_duration - 1 as estimated_end_week
  INTO subjects_in_phase, max_duration
  FROM phases;
  
  -- Return the phases
  RETURN QUERY
  WITH RECURSIVE subject_deps AS (
    SELECT 
      ps.subject_id,
      ps.estimated_duration_weeks,
      0 as dependency_depth
    FROM core.program_course_plan_subjects ps
    LEFT JOIN core.subject_prerequisites sp ON ps.subject_id = sp.subject_id 
      AND sp.prerequisite_type = 'Required'
    WHERE ps.plan_id = plan_id_param
      AND sp.subject_id IS NULL
    
    UNION ALL
    
    SELECT 
      ps.subject_id,
      ps.estimated_duration_weeks,
      sd.dependency_depth + 1
    FROM core.program_course_plan_subjects ps
    JOIN core.subject_prerequisites sp ON ps.subject_id = sp.subject_id 
      AND sp.prerequisite_type = 'Required'
    JOIN subject_deps sd ON sp.prerequisite_subject_id = sd.subject_id
    WHERE ps.plan_id = plan_id_param
  ),
  phases AS (
    SELECT 
      dependency_depth,
      array_agg(subject_id ORDER BY estimated_duration_weeks DESC) as subjects,
      max(estimated_duration_weeks) as max_duration
    FROM subject_deps
    GROUP BY dependency_depth
    ORDER BY dependency_depth
  )
  SELECT 
    row_number() OVER ()::integer,
    subjects,
    current_week::integer,
    (current_week + max_duration - 1)::integer
  FROM phases;
END;
$$;

-- 6) Add comments for documentation
COMMENT ON TABLE core.subject_prerequisites IS 'Defines prerequisite relationships between subjects to support progression rules in course plans';
COMMENT ON COLUMN core.subject_prerequisites.prerequisite_type IS 'Required: Must be completed before subject can start. Recommended: Suggested but not mandatory';
COMMENT ON COLUMN core.program_course_plan_subjects.estimated_duration_weeks IS 'Estimated time to complete this subject in weeks';
COMMENT ON COLUMN core.program_course_plan_subjects.complexity_level IS 'Difficulty level of the subject content';
