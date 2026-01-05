# Timetable-Group Integration Testing Guide

## Overview
This document outlines the testing procedures for the timetable-group integration feature that ensures classroom capacity constraints are enforced at the group level.

## Migration Testing

### 1. Run Migrations
```bash
# Apply the new migrations
supabase db reset  # or manually apply:
# - 20260105025816_add_timetable_group_validation.sql
# - 20260105025836_migrate_existing_timetables_to_groups.sql
```

### 2. Check Migration Log
After running the migrations, check the PostgreSQL logs for the migration summary:
- **SUCCESS**: Timetables where all program plans already belong to the same group
- **INFO**: Timetables with no program plans yet (safe to ignore)
- **WARNING**: Timetables where some plans had null groups (auto-fixed)
- **ERROR**: Timetables with conflicting groups (requires manual intervention)

### 3. Review Migration Issues
If any ERROR entries appear:
1. Check the temporary `timetable_migration_log` table (if still in memory)
2. Manually review affected timetables
3. Reassign program plans to appropriate groups
4. Ensure consistency before proceeding

## Feature Testing Checklist

### Timetable Creation Flow

#### Test Case 1: Normal Flow
1. Navigate to `/timetables/new`
2. Enter timetable name: "Test Batch 2026"
3. Select a program
4. **Verify**: Group dropdown appears and is populated
5. Select a group
6. **Verify**: Group capacity badge shows current/max enrollment
7. **Verify**: Program plans are filtered by selected group
8. Select multiple program plans
9. Click "Create Timetable"
10. **Expected**: Timetable created successfully, redirected to detail page

#### Test Case 2: Group Capacity Warning
1. Select a group that is near or at full capacity
2. **Verify**: Badge shows red/destructive color when full
3. **Verify**: Capacity info is clearly displayed

#### Test Case 3: No Program Plans Available
1. Select a group with no program plans
2. **Verify**: Alert message appears: "No program plans available for this group"
3. **Expected**: Cannot proceed without program plans

#### Test Case 4: Validation Errors
1. Try to submit without selecting a group
2. **Expected**: Error toast: "Please select a group"
3. Try to submit without selecting any program plans
4. **Expected**: Error toast: "Please select at least one program plan"

### Timetable Edit/Detail Flow

#### Test Case 5: View Timetable with Group
1. Navigate to `/timetables/[id]` for an existing timetable
2. **Verify**: Group badge appears in header with name and capacity
3. **Verify**: Capacity info shows current enrollment / max capacity
4. **Verify**: Badge color reflects capacity status (red if full)

#### Test Case 6: Add Program Plans
1. Click "Add Existing Plans" button
2. **Verify**: Only program plans from the same group are shown
3. **Verify**: Dialog mentions the group name
4. Select one or more plans
5. Click "Add Selected Plans"
6. **Expected**: Plans added successfully
7. **Expected**: Group capacity updates if students are enrolled

#### Test Case 7: Add Incompatible Plans (Should Fail)
1. Manually try to add a program plan from a different group via API or hook
2. **Expected**: Error message about group mismatch
3. **Expected**: Database trigger prevents insertion

### Application Enrollment Flow

#### Test Case 8: View Timetables with Capacity
1. Navigate to Applications → New Application or edit existing
2. Go to Enrollment step
3. Select a program
4. **Verify**: Timetable dropdown shows capacity badges for each timetable
5. **Verify**: Format shows: "Timetable Name (XX/YY)" where XX = current, YY = max

#### Test Case 9: Select Available Timetable
1. Select a timetable with available capacity
2. **Expected**: Selection works normally
3. **Expected**: Can proceed to next steps

#### Test Case 10: Attempt to Select Full Timetable
1. **Verify**: Timetables at full capacity are disabled (grayed out)
2. Hover over a disabled timetable
3. **Verify**: Tooltip appears: "This timetable's group is at full capacity (XX/YY)"
4. **Expected**: Cannot select a full timetable

#### Test Case 11: Near-Full Warning
1. Find a timetable that is 90%+ full but not at capacity
2. **Verify**: Badge shows outline/warning color (not destructive red)
3. **Expected**: Can still select, but visual indicator shows it's filling up

### Database Validation Testing

#### Test Case 12: Trigger Validation (Manual)
```sql
-- Attempt to add a program plan without a group
INSERT INTO timetable_program_plans (timetable_id, program_plan_id)
VALUES ('[timetable-id]', '[program-plan-id-without-group]');
-- Expected: Error raised by trigger

-- Attempt to add a program plan from a different group
INSERT INTO timetable_program_plans (timetable_id, program_plan_id)
VALUES ('[timetable-id]', '[program-plan-id-from-different-group]');
-- Expected: Error raised by trigger
```

### Hook Validation Testing

#### Test Case 13: useGetGroupsByProgram
```typescript
// In a component or test
const { data: groups } = useGetGroupsByProgram(programId);
// Expected: Returns only groups for the specified program
// Expected: Ordered by name ascending
```

#### Test Case 14: useGetTimetableGroup
```typescript
const { data: group } = useGetTimetableGroup(timetableId);
// Expected: Returns group object with id, name, capacity info
// Expected: Returns null if timetable has no program plans
```

#### Test Case 15: useGetTimetables with Group Info
```typescript
const { data: timetables } = useGetTimetables(programId);
// Expected: Each timetable includes a 'group' property with capacity
// Expected: Group can be null if timetable has no plans
```

## Edge Cases

### Edge Case 1: Timetable with No Program Plans
- **Scenario**: View a newly created timetable before adding any plans
- **Expected**: No group badge shows, or shows "No group assigned yet"
- **Expected**: Alert may appear prompting to add program plans

### Edge Case 2: Group Deleted
- **Scenario**: A group is deleted while being used by program plans
- **Expected**: Cascade deletion removes related data
- **Expected**: Foreign key constraints maintain data integrity

### Edge Case 3: Concurrent Enrollments
- **Scenario**: Multiple students enrolled simultaneously when group is nearly full
- **Expected**: Database triggers handle concurrency
- **Expected**: Only enrollments up to max_capacity succeed

### Edge Case 4: Program Plan Group Change
- **Scenario**: Try to change a program plan's group while it's part of a timetable
- **Expected**: Should be prevented or warned against
- **Expected**: Maintains timetable group consistency

### Edge Case 5: Mixed Legacy and New Data
- **Scenario**: System has old timetables pre-dating group system
- **Expected**: Migration script handles gracefully
- **Expected**: Manual intervention required for conflicts (logged)

## Rollback Plan

If issues are discovered:

1. **Disable Trigger Temporarily**
```sql
ALTER TABLE timetable_program_plans DISABLE TRIGGER trg_validate_timetable_group_consistency;
```

2. **Fix Data Issues**
```sql
-- Review and fix any data inconsistencies
SELECT t.name, pp.name, pp.group_id
FROM timetables t
JOIN timetable_program_plans tpp ON tpp.timetable_id = t.id
JOIN program_plans pp ON pp.id = tpp.program_plan_id
ORDER BY t.name, pp.group_id;
```

3. **Re-enable Trigger**
```sql
ALTER TABLE timetable_program_plans ENABLE TRIGGER trg_validate_timetable_group_consistency;
```

## Performance Considerations

### Query Optimization
- Group data is fetched via JOIN in `useGetTimetables`
- May need indexing on `program_plans.group_id` if not already present
- Consider caching group capacity data for frequently accessed timetables

### Monitoring
Monitor query performance for:
- Timetable list page (multiple timetables with group JOINs)
- Application enrollment dropdown (timetables + groups)
- Program plans filtered by group

## Success Criteria

✅ All program plans in a timetable belong to the same group (enforced at DB level)  
✅ Timetable creation requires group selection  
✅ Group capacity is visible throughout the application  
✅ Full groups cannot be selected during enrollment  
✅ Existing data migrated successfully without breaking changes  
✅ No linter errors in modified files  
✅ UI follows ShadCN design patterns consistently  
✅ Proper error messages guide users when validation fails  

## Known Limitations

1. **Group cannot be changed after timetable creation**: This is by design to maintain data integrity
2. **Program plans must have a group**: Cannot be added to timetables without a group assignment
3. **Capacity enforcement is hard-blocked**: No override mechanism for admin users (by user requirement)

## Next Steps After Testing

1. Test in development environment with real/seeded data
2. Verify migration logs for any ERROR entries
3. Test all user flows end-to-end
4. Monitor performance on timetable list and enrollment pages
5. Gather user feedback on UI/UX
6. Consider adding group capacity alerts/notifications when approaching limits

