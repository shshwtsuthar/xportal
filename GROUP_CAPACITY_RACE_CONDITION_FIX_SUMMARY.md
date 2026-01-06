# Group Capacity Race Condition Fix - Implementation Summary

## Overview
This implementation fixes three critical issues in the group enrollment system:
1. **Broken capacity tracking triggers** that referenced removed columns
2. **Missing group filter** in learning plan freezing causing incorrect class assignments
3. **Race condition** during approval when groups become full between draft and approval stages

## Files Created

### Database Migrations

#### 1. `supabase/migrations/20260106045607_fix_capacity_triggers_use_application_group_id.sql`
**Purpose**: Fix broken capacity tracking triggers to use `applications.group_id` directly

**Changes**:
- Updated `update_group_enrollment_count()` function to use `NEW.group_id` and `OLD.group_id` directly instead of joining through timetable → program_plans (which no longer has group_id)
- Updated `prevent_enrollment_over_capacity()` function to use `NEW.group_id` directly
- Modified triggers to watch `group_id` changes in addition to `status`

**Impact**: Capacity tracking now works correctly with the new architecture where groups are assigned at the application level, not at the program plan level.

#### 2. `supabase/migrations/20260106045630_fix_learning_plan_group_filter.sql`
**Purpose**: Add group_id and location_id filters to learning plan freezing

**Changes**:
- Updated `upsert_enrollment_plan()` function to filter classes by:
  - `ppc.group_id = (SELECT group_id FROM applications WHERE id = app_id)`
  - `ppc.location_id = (SELECT preferred_location_id FROM applications WHERE id = app_id)`

**Impact**: Students now only receive classes for their assigned group at their preferred location, preventing cross-group class assignments.

### Edge Functions

#### 3. `supabase/functions/check-group-capacity/index.ts`
**Purpose**: Pre-flight capacity check before approval

**API**:
```typescript
POST /functions/v1/check-group-capacity
Body: { applicationId: string }
Response: {
  hasCapacity: boolean;
  groupId: string;
  groupName?: string;
  currentCount?: number;
  maxCapacity?: number;
  alternatives?: Array<{
    id: string;
    name: string;
    current_enrollment_count: number;
    max_capacity: number;
    availableSpots: number;
  }>;
}
```

**Logic**:
1. Fetches application with group_id, program_id, preferred_location_id
2. Checks if group has capacity (current_enrollment_count < max_capacity)
3. If full, fetches alternative groups at the same location with available capacity
4. Returns result with alternatives for UI to display

#### 4. `supabase/functions/check-group-capacity/deno.json`
Configuration file for the edge function.

### React Hooks

#### 5. `src/hooks/useCheckGroupCapacity.ts`
**Purpose**: React hook to invoke the capacity check edge function

**Usage**:
```typescript
const checkCapacity = useCheckGroupCapacity();
const result = await checkCapacity.mutateAsync({ applicationId });
```

### UI Components

#### 6. `app/(app)/applications/_components/GroupCapacityDialog.tsx`
**Purpose**: Dialog component for handling full group scenarios

**Features**:
- Displays current group capacity status (e.g., "20/20")
- Shows dropdown of alternative groups with capacity badges
- Allows staff to select a new group
- Handles confirmation and approval with new group

**Props**:
- `open`, `onOpenChange`: Dialog state management
- `currentGroupName`, `currentCount`, `maxCapacity`: Current group info
- `alternatives`: Array of available groups
- `onConfirm`: Callback with selected group ID
- `isConfirming`: Loading state during approval

## Files Modified

### 1. `supabase/functions/approve-application/index.ts`
**Changes**:
- Added `newGroupId` parameter to request body
- If `newGroupId` is provided, updates application's `group_id` before proceeding with approval
- Maintains existing capacity trigger as final safety net

**Lines modified**: ~36, ~97-130

### 2. `src/hooks/useApproveApplication.ts`
**Changes**:
- Updated `Payload` type to include optional `newGroupId: string`
- Passes `newGroupId` to edge function when provided

### 3. `app/(app)/applications/_components/ApplicationsDataTable.tsx`
**Changes**:
- Added imports for `useCheckGroupCapacity` and `GroupCapacityDialog`
- Added state management for capacity dialog:
  - `capacityDialogOpen`: Dialog visibility
  - `capacityCheckResult`: Result from capacity check
  - `capacityCheckApplicationId`: Application being processed
- Modified approve button handler to:
  1. Check capacity before approval
  2. If has capacity: proceed directly
  3. If full: show dialog with alternatives
- Added `GroupCapacityDialog` component at end of JSX with full event handling

## Flow Diagram

```
Staff clicks "Approve" on ACCEPTED application
           ↓
    Check group capacity
           ↓
    ┌──────┴──────┐
    ↓             ↓
Has capacity   Group full
    ↓             ↓
Approve       Show dialog
directly      with alternatives
    ↓             ↓
Success       Staff selects
              new group
                  ↓
              Update group_id
              & approve
                  ↓
              Success
```

## Testing Checklist

### Database Testing
```sql
-- Test 1: Verify capacity triggers work with applications.group_id
INSERT INTO applications (rto_id, program_id, group_id, status) 
VALUES (..., ..., 'group-id', 'APPROVED');
-- Check: groups.current_enrollment_count should increment

-- Test 2: Verify capacity prevention
-- Fill group to max_capacity, then try to approve another
-- Expected: Exception raised with message about full capacity

-- Test 3: Verify learning plan filtering
-- Create application with group_id and approve
SELECT * FROM application_learning_classes alc
JOIN program_plan_classes ppc ON alc.program_plan_class_id = ppc.id
WHERE alc.application_id = 'test-app-id';
-- Expected: All classes should have ppc.group_id matching application's group_id
```

### UI Testing Scenario
1. Create two applications for Group A (capacity 20)
2. Approve 19 students to bring Group A to 19/20
3. Start processing Application #20 (still at DRAFT)
4. In another session, approve Application #21 to fill Group A (20/20)
5. Return to Application #20, complete it to ACCEPTED status
6. Click "Approve" button
7. **Expected**: Dialog appears showing "Group A is full (20/20)"
8. **Expected**: Dropdown shows alternative groups (Group B, Group C, etc.) with capacity badges
9. Select Group B from dropdown
10. Click "Approve with Selected Group"
11. **Expected**: Application approved successfully, student assigned to Group B

### Edge Cases Handled
- No alternative groups available: Dialog shows message, no dropdown, only Cancel button
- Capacity check fails: Error toast displayed, approval cancelled
- User cancels dialog: Approving state cleared, can try again
- Concurrent approvals: Database trigger provides final safety net

## Migration Safety

- **Migration 1** (fix triggers): Safe - replaces broken functions with corrected logic
- **Migration 2** (learning plan filter): Safe - adds WHERE clauses to existing function
- Both use `CREATE OR REPLACE FUNCTION` for idempotency
- No data changes, only function logic updates
- Can be rolled back by reverting migrations in reverse order

## Performance Considerations

- Capacity check adds one round-trip before approval (acceptable for UX improvement)
- Database triggers remain efficient with direct `group_id` access
- Alternative groups query is filtered by program_id and location_id (indexed)
- Dialog only renders when needed (conditional rendering)

## Security

- All operations go through RLS-enabled Supabase client
- Edge functions use authenticated requests
- No direct database access from frontend
- Capacity trigger provides server-side validation as final safety net

## Rollback Plan

If issues arise:
1. Revert UI changes (remove dialog, restore direct approval)
2. Revert edge function changes (remove newGroupId parameter)
3. Revert migration 2 (learning plan filter)
4. Revert migration 1 (capacity triggers)
5. Edge function can be disabled by removing invoke calls

## Next Steps

1. **Deploy migrations**: Run migrations on development database first
2. **Deploy edge functions**: Deploy check-group-capacity function
3. **Test thoroughly**: Follow testing checklist above
4. **Monitor**: Watch for capacity-related errors in logs
5. **Document**: Update user documentation with new approval flow

## Known Limitations

- Dialog requires manual group selection (no auto-suggestion based on criteria)
- No notification to staff when groups are nearing capacity
- Historical applications may have incorrect class assignments (pre-fix)

## Future Enhancements

1. **Proactive warnings**: Show capacity badges in application list
2. **Auto-suggest**: Recommend groups based on student preferences
3. **Capacity forecasting**: Predict when groups will fill
4. **Bulk reassignment**: Move multiple students between groups
5. **Audit trail**: Log all group changes during approval

