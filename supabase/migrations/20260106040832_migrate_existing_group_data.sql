-- Migrate existing data to new group-location architecture
BEGIN;

-- Create temporary table for logging migration issues
CREATE TEMP TABLE IF NOT EXISTS migration_log (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  issue_type TEXT,
  details TEXT,
  resolution TEXT
);

-- ============================================================================
-- PART 1: Assign location_id to existing groups
-- ============================================================================
DO $$
DECLARE
  v_group RECORD;
  v_first_location_id UUID;
BEGIN
  RAISE NOTICE 'Starting group location assignment...';
  
  -- Loop through all groups without location_id
  FOR v_group IN 
    SELECT g.id, g.name, g.rto_id, g.program_id
    FROM public.groups g
    WHERE g.location_id IS NULL
  LOOP
    -- Get the first available location for this RTO
    SELECT dl.id INTO v_first_location_id
    FROM public.delivery_locations dl
    WHERE dl.rto_id = v_group.rto_id
    ORDER BY dl.name ASC
    LIMIT 1;
    
    IF v_first_location_id IS NOT NULL THEN
      -- Assign the first location to this group
      UPDATE public.groups
      SET location_id = v_first_location_id
      WHERE id = v_group.id;
      
      INSERT INTO migration_log (entity_type, entity_id, entity_name, issue_type, details, resolution)
      VALUES ('GROUP', v_group.id, v_group.name, 'INFO', 
              'Group had no location assigned', 
              format('Auto-assigned to first available location: %s', v_first_location_id));
    ELSE
      -- No locations exist for this RTO - log as error
      INSERT INTO migration_log (entity_type, entity_id, entity_name, issue_type, details, resolution)
      VALUES ('GROUP', v_group.id, v_group.name, 'ERROR', 
              'No locations exist for RTO', 
              'MANUAL ACTION REQUIRED: Create a location and assign this group');
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Group location assignment completed';
END $$;

-- ============================================================================
-- PART 2: Migrate group_id from program_plans to classes
-- ============================================================================
DO $$
DECLARE
  v_class RECORD;
  v_plan_group_id UUID;
  v_classes_updated INTEGER := 0;
  v_classes_no_group INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting class group_id migration...';
  
  -- Loop through all classes without group_id
  FOR v_class IN 
    SELECT ppc.id, ppc.program_plan_subject_id, pps.program_plan_id
    FROM public.program_plan_classes ppc
    JOIN public.program_plan_subjects pps ON ppc.program_plan_subject_id = pps.id
    WHERE ppc.group_id IS NULL
  LOOP
    -- Get the group_id from the parent program_plan
    SELECT pp.group_id INTO v_plan_group_id
    FROM public.program_plans pp
    WHERE pp.id = v_class.program_plan_id;
    
    IF v_plan_group_id IS NOT NULL THEN
      -- Assign the program plan's group_id to this class
      UPDATE public.program_plan_classes
      SET group_id = v_plan_group_id
      WHERE id = v_class.id;
      
      v_classes_updated := v_classes_updated + 1;
    ELSE
      -- Program plan has no group - log for manual review
      v_classes_no_group := v_classes_no_group + 1;
      
      INSERT INTO migration_log (entity_type, entity_id, entity_name, issue_type, details, resolution)
      VALUES ('CLASS', v_class.id, NULL, 'WARNING', 
              'Parent program plan has no group_id', 
              'Class remains without group assignment - will need manual assignment');
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Class group_id migration completed: % updated, % without group', 
    v_classes_updated, v_classes_no_group;
END $$;

-- ============================================================================
-- PART 3: Assign group_id to applications based on timetable and location
-- ============================================================================
DO $$
DECLARE
  v_app RECORD;
  v_group_id UUID;
  v_apps_updated INTEGER := 0;
  v_apps_no_match INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting application group_id assignment...';
  
  -- Loop through applications that need group assignment
  -- Only process non-DRAFT applications with timetable and location
  FOR v_app IN 
    SELECT a.id, a.timetable_id, a.preferred_location_id, a.status
    FROM public.applications a
    WHERE a.group_id IS NULL
      AND a.timetable_id IS NOT NULL
      AND a.preferred_location_id IS NOT NULL
      AND a.status != 'DRAFT'
  LOOP
    -- Find a group that matches:
    -- 1. Has classes in one of the timetable's program plans
    -- 2. At the preferred location
    SELECT DISTINCT ppc.group_id INTO v_group_id
    FROM public.program_plan_classes ppc
    JOIN public.program_plan_subjects pps ON ppc.program_plan_subject_id = pps.id
    JOIN public.timetable_program_plans tpp ON pps.program_plan_id = tpp.program_plan_id
    JOIN public.groups g ON ppc.group_id = g.id
    WHERE tpp.timetable_id = v_app.timetable_id
      AND ppc.location_id = v_app.preferred_location_id
      AND ppc.group_id IS NOT NULL
    LIMIT 1;
    
    IF v_group_id IS NOT NULL THEN
      -- Assign the matched group to this application
      UPDATE public.applications
      SET group_id = v_group_id
      WHERE id = v_app.id;
      
      v_apps_updated := v_apps_updated + 1;
    ELSE
      -- No matching group found
      v_apps_no_match := v_apps_no_match + 1;
      
      INSERT INTO migration_log (entity_type, entity_id, entity_name, issue_type, details, resolution)
      VALUES ('APPLICATION', v_app.id, NULL, 'WARNING', 
              format('No group found for timetable %s at location %s', 
                     v_app.timetable_id, v_app.preferred_location_id), 
              'Application remains without group assignment - may need manual review');
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Application group_id assignment completed: % updated, % without match', 
    v_apps_updated, v_apps_no_match;
END $$;

-- ============================================================================
-- PART 4: Make location_id NOT NULL on groups and update unique constraint
-- ============================================================================
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  -- Check if there are still groups without location_id
  SELECT COUNT(*) INTO v_null_count
  FROM public.groups
  WHERE location_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'There are still % groups without location_id. Skipping NOT NULL constraint.', v_null_count;
  ELSE
    -- Make location_id NOT NULL
    ALTER TABLE public.groups 
      ALTER COLUMN location_id SET NOT NULL;
    
    -- Drop old unique constraint
    ALTER TABLE public.groups 
      DROP CONSTRAINT IF EXISTS groups_program_id_name_key;
    
    -- Add new unique constraint including location
    ALTER TABLE public.groups 
      ADD CONSTRAINT groups_unique_per_program_location 
      UNIQUE(program_id, location_id, name);
    
    RAISE NOTICE 'Groups table constraints updated successfully';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Display migration log summary
-- ============================================================================
DO $$
DECLARE
  v_log RECORD;
  v_info_count INTEGER;
  v_warning_count INTEGER;
  v_error_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_info_count FROM migration_log WHERE issue_type = 'INFO';
  SELECT COUNT(*) INTO v_warning_count FROM migration_log WHERE issue_type = 'WARNING';
  SELECT COUNT(*) INTO v_error_count FROM migration_log WHERE issue_type = 'ERROR';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== GROUP-LOCATION MIGRATION SUMMARY ===';
  RAISE NOTICE 'INFO: %', v_info_count;
  RAISE NOTICE 'WARNING: %', v_warning_count;
  RAISE NOTICE 'ERROR: %', v_error_count;
  RAISE NOTICE '=========================================';
  
  IF v_warning_count > 0 OR v_error_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== DETAILED MIGRATION LOG ===';
    FOR v_log IN 
      SELECT * FROM migration_log 
      ORDER BY issue_type DESC, entity_type
    LOOP
      RAISE NOTICE '[%] % (ID: %)', v_log.issue_type, v_log.entity_type, v_log.entity_id;
      RAISE NOTICE '  Details: %', v_log.details;
      RAISE NOTICE '  Resolution: %', v_log.resolution;
      RAISE NOTICE '';
    END LOOP;
    RAISE NOTICE '================================';
  END IF;
END $$;

COMMIT;

