# Fix: Race Condition in Additional Info Checkbox Persistence

## Problem Description

When users checked disabilities or prior education checkboxes in the Additional Info tab, saved the application, and then reopened it, the checkboxes would appear unchecked even though the data was successfully saved to the database.

## Root Cause Analysis

### The Race Condition

The issue was a **data initialization race condition** in `NewApplicationWizard.tsx`:

1. **Component mounts** → Multiple parallel queries start:
   - Main application data (fast)
   - Disabilities data (slower)
   - Prior education data (slower)

2. **Application data loads first** → Triggers initialization effect
   - Effect runs because `lastInitializedAppId.current !== currentApplication.id`
   - Form is reset with application data
   - `disabilities` and `prior_education` arrays are **empty** (queries not complete yet)
   - `lastInitializedAppId.current` is set to the application ID

3. **Disabilities/Prior Education queries complete** → Triggers re-render
   - Effect triggers again (because `disabilitiesFormData` in dependency array changed)
   - BUT guard condition `lastInitializedAppId.current !== currentApplication.id` is now **FALSE**
   - Effect execution is **blocked**
   - Form is **never updated** with the actual data

4. **User sees checkboxes unchecked** because form state has empty arrays

### Code Evidence

**Before Fix** (`NewApplicationWizard.tsx` lines 297-316):

```typescript
useEffect(() => {
  if (
    currentApplication &&
    lastInitializedAppId.current !== currentApplication.id  // ❌ Blocks updates
  ) {
    const formValues = mapApplicationToFormValues(currentApplication);

    if (disabilitiesFormData.length > 0) {
      formValues.disabilities = disabilitiesFormData;
    }

    form.reset(formValues);
    lastInitializedAppId.current = currentApplication.id;
  }
}, [currentApplication, form, disabilitiesFormData, priorEducationFormData]);
// ❌ Dependencies trigger effect, but guard blocks execution
```

## Solution Implemented

### Separation of Concerns (Single Responsibility Principle)

Split the monolithic initialization effect into **three focused effects**:

#### Effect 1: Initialize Core Application Data
```typescript
// Effect 1: Initialize form when application changes (core data only)
useEffect(() => {
  if (
    currentApplication &&
    lastInitializedAppId.current !== currentApplication.id
  ) {
    const formValues = mapApplicationToFormValues(currentApplication);
    
    // Don't merge arrays here - they'll be handled by separate effects
    form.reset(formValues);
    lastInitializedAppId.current = currentApplication.id;
  }
}, [currentApplication, form]); // ✅ Only depends on application, not arrays
```

#### Effect 2: Handle Disabilities Array (Late Arrival)
```typescript
// Effect 2: Update disabilities array when it loads
useEffect(() => {
  if (
    currentApplication?.id &&
    lastInitializedAppId.current === currentApplication.id && // ✅ Opposite guard!
    disabilitiesFormData.length > 0
  ) {
    const currentFormDisabilities = form.getValues('disabilities') || [];
    const formMatches = /* comparison logic */;

    if (!formMatches) {
      form.setValue('disabilities', disabilitiesFormData, {
        shouldDirty: false,
      });
    }
  }
}, [currentApplication?.id, disabilitiesFormData, form]);
```

#### Effect 3: Handle Prior Education Array (Late Arrival)
```typescript
// Effect 3: Update prior education array when it loads
useEffect(() => {
  if (
    currentApplication?.id &&
    lastInitializedAppId.current === currentApplication.id && // ✅ Opposite guard!
    priorEducationFormData.length > 0
  ) {
    const currentFormPriorEd = form.getValues('prior_education') || [];
    const formMatches = /* comparison logic */;

    if (!formMatches) {
      form.setValue('prior_education', priorEducationFormData, {
        shouldDirty: false,
      });
    }
  }
}, [currentApplication?.id, priorEducationFormData, form]);
```

### Key Improvements

1. **Separated Initialization Logic**
   - Core application data initialized first
   - Arrays updated independently when they arrive
   - No more blocking guard preventing array updates

2. **Reversed Guard Logic for Arrays**
   - Effect 1: Runs when `lastInitializedAppId !== currentApplication.id` (new app)
   - Effects 2 & 3: Run when `lastInitializedAppId === currentApplication.id` (same app, arrays arriving late)

3. **Defensive Comparison Before Update**
   - Only updates if form data doesn't match database data
   - Prevents unnecessary re-renders and form resets
   - Uses `shouldDirty: false` to avoid marking form as modified

4. **Secondary Sync in Child Component**
   - `Step3_AdditionalInfo.tsx` effects kept as defensive fallback
   - Updated comments to clarify they're secondary sync mechanisms
   - Provides redundancy for edge cases

## Testing Verification

### Expected Behavior After Fix

1. **Create New Application**
   - Check disabilities/prior education → Save → Reopen
   - ✅ Checkboxes remain checked

2. **Edit Existing Application**
   - Modify selections → Save → Reopen
   - ✅ Shows latest saved state

3. **Fast Navigation**
   - Rapidly switch between applications
   - ✅ Each application shows correct data

4. **Network Latency**
   - Works correctly even with slow database queries
   - ✅ Arrays load and populate when ready

### Console Log Verification

After saving, you should see:
```
=== PERSISTING DISABILITIES & PRIOR EDUCATION ===
Successfully inserted X disabilities
Successfully inserted X prior education records
```

After reopening, arrays should populate correctly in the form state.

## Best Practices Applied

1. ✅ **Single Responsibility Principle**: Each effect has one clear purpose
2. ✅ **Defensive Programming**: Secondary sync as fallback
3. ✅ **Race Condition Handling**: Separate fast and slow data loading
4. ✅ **Performance Optimization**: Only update when data actually changes
5. ✅ **Clean Code**: Clear comments explaining intent and behavior

## Files Modified

1. `app/(app)/applications/_components/NewApplicationWizard.tsx`
   - Split monolithic initialization effect into three focused effects
   - Fixed race condition in array data loading

2. `app/(app)/applications/_components/steps/Step3_AdditionalInfo.tsx`
   - Updated comments to clarify secondary sync role
   - No functional changes (defensive programming retained)

## Related Issues

This fix resolves the initialization order dependency between:
- Main application query (`useGetApplication`)
- Disabilities query (`useGetApplicationDisabilities`)
- Prior education query (`useGetApplicationPriorEducation`)

All queries run in parallel, but data arrives at different times. The fix ensures form state is correctly updated regardless of query completion order.
