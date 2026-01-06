# Post-DB Reset Fixes for Program Plans

## Issue
After DB reset with the group-location architecture refactor, attempting to save a Program Plan resulted in error:
```
Could not find the 'group_id' column of 'program_plans' in the schema cache
```

## Root Cause
The migration `20260106040902_remove_group_id_from_program_plans.sql` removed the `group_id` column from the `program_plans` table as part of the architecture refactor, but several frontend hooks and components were still referencing it.

## Architecture Change
**Before**: Program plans were tied to specific groups via `program_plans.group_id`
**After**: Program plans are now generalized - group assignment happens at the **class level** via `program_plan_classes.group_id`

This allows:
- A single program plan to be reused across multiple groups
- Timetables to span multiple groups
- More flexible scheduling

## Files Fixed

### 1. `src/hooks/useUpsertProgramPlan.ts`
**Change**: Removed `group_id` from the planData object when creating/updating program plans

**Before**:
```typescript
const planData = {
  name: payload.name!,
  program_id: payload.program_id!,
  group_id: payload.group_id ?? null,  // ❌ Column doesn't exist
  rto_id: rtoId,
};
```

**After**:
```typescript
const planData = {
  name: payload.name!,
  program_id: payload.program_id!,
  rto_id: rtoId,
};
```

### 2. `src/hooks/useGetProgramPlans.ts`
**Change**: Removed `groupId` parameter and `groups` relation from query

**Before**:
```typescript
export const useGetProgramPlans = (programId?: string, groupId?: string) => {
  let query = supabase.from('program_plans').select('*, groups(*)');
  if (groupId) query = query.eq('group_id', groupId);
  // ...
}
```

**After**:
```typescript
export const useGetProgramPlans = (programId?: string) => {
  let query = supabase.from('program_plans').select('*');
  // No groups relation, no groupId filter
}
```

### 3. `src/hooks/useAddProgramPlansToTimetable.ts`
**Change**: Removed all group validation logic since timetables can now span multiple groups

**Before**:
- Validated that all program plans have groups
- Validated that all program plans belong to the same group
- Validated that timetable doesn't mix groups

**After**:
- Simple validation that program plans exist
- No group-related checks

### 4. `app/(app)/program-plans/page.tsx`
**Change**: Removed "Group" column from the program plans table

**Before**: Table had 4 columns: Name, Program, Group, Actions
**After**: Table has 3 columns: Name, Program, Actions

### 5. `app/(app)/program-plans/_components/ProgramPlanWizard.tsx`
**Changes**:
1. Removed `group_id` from form type and default values
2. Removed `groupId` state variable
3. Removed group selector UI (dropdown to select group)
4. Removed `group_id` from save handler
5. Removed `selectedGroupCapacity` computation
6. Removed `groupCapacity` prop passed to ClassesManager

**Impact**: Program plan wizard is now simpler - just Name and Program selection. Group assignment happens when creating classes.

### 6. `app/(app)/program-plans/_components/ClassesManager.tsx`
**No changes needed**: The `groupCapacity` prop is already optional, so it gracefully handles the absence of this prop when not provided.

## Testing Performed

✅ No linter errors in any modified files
✅ TypeScript compilation successful
✅ Program plans can now be saved without group_id reference

## User Impact

**Staff Workflow Change**:
- When creating a program plan, staff NO LONGER select a group
- Instead, when adding classes to subjects within the plan, they select the group for EACH CLASS
- This allows the same program plan to have classes for different groups

**Benefits**:
- Reduced duplication: One program plan can serve multiple groups
- More flexibility: Can schedule different groups at different locations
- Easier maintenance: Update schedule once, applies to structure for all groups (though classes need to be duplicated per group)

## Related Files

These files were part of the original architecture refactor and work correctly:
- `supabase/migrations/20260106040902_remove_group_id_from_program_plans.sql` - Removed the column
- `supabase/migrations/20260106040814_add_group_id_to_classes.sql` - Added group_id to classes
- `supabase/migrations/20260106040823_add_group_id_to_applications.sql` - Added group_id to applications
- `src/hooks/useUpsertProgramPlanClass.ts` - Already requires group_id when creating classes

## Verification

To verify the fix is working:
1. Navigate to Program Plans
2. Click "New Program Plan"
3. Enter name and select program
4. Click "Save Plan" - should succeed without error
5. Add subjects and classes - group selection happens at class level

## Summary

The issue was caused by incomplete migration of the codebase after the database schema change. All frontend code has now been updated to reflect the new architecture where:
- ✅ Program plans are generalized (no group_id)
- ✅ Groups are assigned at the class level
- ✅ Applications link directly to groups
- ✅ Timetables can span multiple groups

