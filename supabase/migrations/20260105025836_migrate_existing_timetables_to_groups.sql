BEGIN;

-- Create a temporary table to log migration issues
CREATE TEMP TABLE IF NOT EXISTS timetable_migration_log (
  timetable_id UUID,
  timetable_name TEXT,
  program_id UUID,
  issue_type TEXT,
  details TEXT,
  resolution TEXT
);

-- Analyze and log all timetables
DO $$
DECLARE
  v_timetable RECORD;
  v_group_count INTEGER;
  v_null_count INTEGER;
  v_total_plans INTEGER;
  v_most_common_group UUID;
  v_most_common_group_count INTEGER;
BEGIN
  -- Loop through all timetables
  FOR v_timetable IN 
    SELECT t.id, t.name, t.program_id
    FROM public.timetables t
    WHERE NOT t.is_archived
  LOOP
    -- Count total program plans for this timetable
    SELECT COUNT(*) INTO v_total_plans
    FROM public.timetable_program_plans tpp
    WHERE tpp.timetable_id = v_timetable.id;

    IF v_total_plans = 0 THEN
      -- No program plans assigned yet - this is OK, skip
      INSERT INTO timetable_migration_log (timetable_id, timetable_name, program_id, issue_type, details, resolution)
      VALUES (v_timetable.id, v_timetable.name, v_timetable.program_id, 'INFO', 'No program plans assigned', 'No action needed');
      CONTINUE;
    END IF;

    -- Count distinct non-null groups
    SELECT COUNT(DISTINCT pp.group_id) INTO v_group_count
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable.id
      AND pp.group_id IS NOT NULL;

    -- Count program plans with null group_id
    SELECT COUNT(*) INTO v_null_count
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable.id
      AND pp.group_id IS NULL;

    -- Find the most common group_id (if any)
    SELECT pp.group_id, COUNT(*) INTO v_most_common_group, v_most_common_group_count
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable.id
      AND pp.group_id IS NOT NULL
    GROUP BY pp.group_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Handle different scenarios
    IF v_null_count > 0 AND v_group_count = 0 THEN
      -- All program plans have null group_id
      INSERT INTO timetable_migration_log (timetable_id, timetable_name, program_id, issue_type, details, resolution)
      VALUES (v_timetable.id, v_timetable.name, v_timetable.program_id, 'ERROR', 
              format('All %s program plans lack group assignment', v_total_plans), 
              'MANUAL ACTION REQUIRED: Assign groups to program plans before using this timetable');

    ELSIF v_null_count > 0 AND v_group_count = 1 THEN
      -- Some plans have a group, some don't - assign the common group to null plans
      UPDATE public.program_plans pp
      SET group_id = v_most_common_group
      FROM public.timetable_program_plans tpp
      WHERE tpp.program_plan_id = pp.id
        AND tpp.timetable_id = v_timetable.id
        AND pp.group_id IS NULL;

      INSERT INTO timetable_migration_log (timetable_id, timetable_name, program_id, issue_type, details, resolution)
      VALUES (v_timetable.id, v_timetable.name, v_timetable.program_id, 'WARNING', 
              format('%s program plans had null group_id', v_null_count), 
              format('Auto-assigned to group %s (most common group)', v_most_common_group));

    ELSIF v_group_count > 1 THEN
      -- Multiple different groups - this is a conflict
      INSERT INTO timetable_migration_log (timetable_id, timetable_name, program_id, issue_type, details, resolution)
      VALUES (v_timetable.id, v_timetable.name, v_timetable.program_id, 'ERROR', 
              format('Program plans span %s different groups', v_group_count), 
              format('MANUAL ACTION REQUIRED: Most common group is %s with %s plans. Review and standardize.', 
                     v_most_common_group, v_most_common_group_count));

    ELSIF v_group_count = 1 AND v_null_count = 0 THEN
      -- Perfect: all plans have the same group
      INSERT INTO timetable_migration_log (timetable_id, timetable_name, program_id, issue_type, details, resolution)
      VALUES (v_timetable.id, v_timetable.name, v_timetable.program_id, 'SUCCESS', 
              format('All %s program plans belong to the same group', v_total_plans), 
              'No action needed - already compliant');
    END IF;

  END LOOP;

  -- Raise a notice with summary
  RAISE NOTICE '=== TIMETABLE-GROUP MIGRATION SUMMARY ===';
  RAISE NOTICE 'Check timetable_migration_log for details';
  RAISE NOTICE 'SUCCESS: %', (SELECT COUNT(*) FROM timetable_migration_log WHERE issue_type = 'SUCCESS');
  RAISE NOTICE 'INFO: %', (SELECT COUNT(*) FROM timetable_migration_log WHERE issue_type = 'INFO');
  RAISE NOTICE 'WARNING: %', (SELECT COUNT(*) FROM timetable_migration_log WHERE issue_type = 'WARNING');
  RAISE NOTICE 'ERROR: %', (SELECT COUNT(*) FROM timetable_migration_log WHERE issue_type = 'ERROR');
  RAISE NOTICE '=========================================';

END $$;

-- Display the log for review
DO $$
DECLARE
  v_log RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== DETAILED MIGRATION LOG ===';
  FOR v_log IN 
    SELECT * FROM timetable_migration_log ORDER BY issue_type DESC, timetable_name
  LOOP
    RAISE NOTICE '[%] % (ID: %)', v_log.issue_type, v_log.timetable_name, v_log.timetable_id;
    RAISE NOTICE '  Details: %', v_log.details;
    RAISE NOTICE '  Resolution: %', v_log.resolution;
    RAISE NOTICE '';
  END LOOP;
  RAISE NOTICE '================================';
END $$;

COMMIT;

