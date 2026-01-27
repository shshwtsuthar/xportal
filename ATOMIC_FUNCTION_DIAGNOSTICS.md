# Atomic Approval Function - Diagnostic Checklist

## ✅ Issues Already Fixed

1. ✅ **Deno lockfile version mismatch** - Deleted incompatible `deno.lock`
2. ✅ **Multiple commands in prepared statement** - Split migration into 3 separate files
3. ✅ **Payment schedule immutability** - Updated trigger to allow `migrated_to_enrollment` flag updates
4. ✅ **Missing timestamp columns** - Added `created_at` and `updated_at` to `enrollment_invoices`
5. ✅ **Type casting issues** - Added proper casting for `invoice_status` and `internal_payment_status` enums
6. ✅ **Missing unique constraints** - Added 8 unique constraints for `ON CONFLICT` clauses

## Potential Issues to Watch For

### 1. Application Data Validation Issues

**Scenario**: Application is missing required data
- **Required fields**: `payment_plan_template_id`, `payment_anchor_date`, `program_id`
- **Status**: Function validates these and raises exceptions
- **Risk**: LOW (validation is in place)

**Scenario**: Application has invalid foreign key references
- **Examples**: Invalid `program_id`, invalid `payment_plan_template_id`, invalid `group_id`
- **Status**: Database foreign key constraints will catch these
- **Risk**: LOW (database constraints enforce)

### 2. Invoice Migration Issues

**Scenario**: `migrate_application_invoices_to_enrollment` function fails
- **Potential causes**:
  - No payment schedule exists for application
  - No template installments found
  - Invoice number generation fails
- **Impact**: Transaction rolls back entirely (atomic behavior)
- **Risk**: MEDIUM (depends on data quality)

**Scenario**: Duplicate invoice numbers
- **Status**: `generate_invoice_number` should handle this, but race conditions possible
- **Risk**: LOW (uses UUID in generation)

### 3. Learning Plan Edge Cases

**Scenario**: Application has no learning subjects
- **Status**: INSERT will simply not add any rows (loop doesn't execute)
- **Impact**: Enrollment created with no subjects
- **Risk**: LOW (may be valid business case)

**Scenario**: Application has no learning classes
- **Status**: INSERT will simply not add any rows
- **Impact**: Enrollment created with no classes
- **Risk**: LOW (may be valid business case)

**Scenario**: `preferred_location_id` is NULL
- **Status**: Classes won't be copied (IF condition prevents it)
- **Impact**: Enrollment created with no classes
- **Risk**: LOW (intentional behavior)

### 4. Contact Information Edge Cases

**Scenario**: Emergency contact name is NULL
- **Status**: IF condition prevents insert
- **Impact**: No emergency contact created
- **Risk**: LOW (handled)

**Scenario**: Guardian name is NULL
- **Status**: IF condition prevents insert
- **Impact**: No guardian contact created
- **Risk**: LOW (handled)

**Scenario**: Duplicate contact names on retry
- **Status**: ON CONFLICT DO NOTHING handles this
- **Risk**: LOW (idempotent)

### 5. Idempotency Edge Cases

**Scenario**: Function is called multiple times for same application
- **Status**: All inserts use ON CONFLICT DO NOTHING or check for existing records
- **Expected behavior**: Second call should succeed with no new data created
- **Risk**: LOW (designed for idempotency)

**Scenario**: Student exists but enrollment doesn't
- **Status**: Function checks for existing student and enrollment separately
- **Expected behavior**: Uses existing student, creates new enrollment
- **Risk**: LOW (handled correctly)

**Scenario**: Both student and enrollment exist
- **Status**: Function reuses both existing records
- **Expected behavior**: Updates application status, copies any missing related data
- **Risk**: LOW (handled correctly)

### 6. Race Condition Scenarios

**Scenario**: Two requests approve same application simultaneously
- **Status**: `FOR UPDATE` lock on application row prevents this
- **Expected behavior**: First request succeeds, second waits then fails status check
- **Risk**: LOW (locking in place)

**Scenario**: Application status changes during approval
- **Status**: Final UPDATE checks status is still 'ACCEPTED'
- **Expected behavior**: Raises exception if status changed
- **Risk**: LOW (atomic check in place)

**Scenario**: Group capacity changes during approval
- **Status**: Not validated in atomic function (should be checked before calling)
- **Risk**: MEDIUM (external validation required)

### 7. External Operations That Can Still Fail

These operations happen AFTER the atomic database transaction completes:

1. **File copying** (`copyApplicationFilesToStudent`)
   - Can fail due to storage issues
   - Non-critical: Will generate warning, won't roll back approval

2. **Auth user creation** (`createStudentAuthUser`)
   - Can fail due to Supabase Auth service issues
   - Non-critical: Will generate warning, student can be manually invited later

3. **Email sending** (`sendAcceptanceEmail`)
   - Can fail due to email service issues
   - Non-critical: Will generate warning, email can be resent manually

4. **Xero sync** (`syncStudentToXero`)
   - Runs in background (fire-and-forget)
   - Can fail due to Xero API issues
   - Non-critical: Will retry via scheduled job

## Testing Recommendations

### Test Case 1: Happy Path
```sql
-- Normal application with all data
SELECT approve_application_atomic(
  '1a1c0f23-d305-4c3c-83bb-b7312255e905'::uuid,
  NULL
);
```

### Test Case 2: Idempotency
```sql
-- Call twice with same application
SELECT approve_application_atomic('APP_ID'::uuid, NULL);
SELECT approve_application_atomic('APP_ID'::uuid, NULL);
-- Second call should succeed without errors
```

### Test Case 3: With New Group
```sql
-- Approve with group assignment
SELECT approve_application_atomic(
  'APP_ID'::uuid,
  'GROUP_ID'::uuid
);
```

### Test Case 4: Minimal Data
```sql
-- Application with no learning plan, no contacts, etc.
-- Should still succeed
```

### Test Case 5: Invalid Status
```sql
-- Application not in ACCEPTED status
-- Should raise exception: 'Application must be ACCEPTED to approve'
```

### Test Case 6: Missing Required Fields
```sql
-- Application missing payment_plan_template_id
-- Should raise exception: 'payment_plan_template_id is required'
```

## Monitoring Recommendations

1. **Log all approval attempts** with application_id and result
2. **Monitor approval duration** - should typically complete in < 5 seconds
3. **Track warning counts** - high warnings may indicate data quality issues
4. **Alert on failures** - any atomic transaction failure needs investigation
5. **Track idempotency** - log when existing students/enrollments are reused

## Known Limitations

1. **Group capacity not validated** - Must be checked before calling function
2. **No rollback of external operations** - Files, auth users, emails can't be rolled back if approval is later reversed
3. **No validation of business rules** - Assumes application passed all validation before reaching ACCEPTED status
4. **No duplicate enrollment detection across programs** - Student can have multiple enrollments in different programs
5. **Invoice number uniqueness relies on generate_invoice_number** - Must ensure this function is robust

## Next Steps for Production Deployment

1. ✅ Test all migrations in staging environment
2. ⏳ Run all test cases listed above
3. ⏳ Load test with concurrent approvals
4. ⏳ Verify rollback behavior (trigger an error mid-transaction)
5. ⏳ Monitor performance with real data volume
6. ⏳ Document recovery procedures for partial failures
7. ⏳ Set up alerts for approval failures
