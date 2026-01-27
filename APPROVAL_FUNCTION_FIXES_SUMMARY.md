# Approval Function Fixes Summary

**Date**: January 27, 2026  
**Status**: ✅ All known issues resolved - Ready for testing

---

## 🎯 Executive Summary

The `approve-application` Edge Function has been successfully refactored to implement atomic database operations. During deployment, we encountered and resolved 6 distinct issues. All database migrations have been applied successfully.

---

## 📋 Issues Encountered & Resolved

### Issue #1: Deno Lockfile Version Mismatch
**Error**: `Failed reading lockfile: Unsupported lockfile version '5'`

**Root Cause**: The `deno.lock` file was created with a newer Deno version than the Supabase local runtime supports.

**Fix**: Deleted `supabase/functions/approve-application/deno.lock`

**Migration**: None required

**Status**: ✅ Resolved

---

### Issue #2: Multiple Commands in Prepared Statement
**Error**: `cannot insert multiple commands into a prepared statement (SQLSTATE 42601)`

**Root Cause**: The Supabase migration tool's prepared statement executor cannot handle multiple top-level SQL commands in a single migration file.

**Fix**: Split the atomic function migration into 3 separate files:
1. `20260127000000_atomic_approve_application.sql` - CREATE FUNCTION only
2. `20260127000001_grant_approve_application_atomic.sql` - GRANT statement
3. `20260127000002_comment_approve_application_atomic.sql` - COMMENT statement

**Applied**: Using direct `psql` execution (bypassing `supabase migration up` limitation)

**Status**: ✅ Resolved

---

### Issue #3: Payment Schedule Immutability Constraint
**Error**: `Payment schedule snapshot is immutable unless application is DRAFT (current: ACCEPTED)`

**Root Cause**: The `ensure_app_draft_for_payment_schedule` trigger function prevents ANY modifications to payment schedules when application is not in DRAFT status, but the approval process needs to set the `migrated_to_enrollment` flag.

**Fix**: Modified the trigger function to specifically allow updates to ONLY the `migrated_to_enrollment` column while still enforcing immutability for all other fields.

**Migration**: `20260127000003_allow_migration_flag_updates.sql`

**Status**: ✅ Resolved

---

### Issue #4: Missing Timestamp Columns
**Error**: `column "created_at" of relation "enrollment_invoices" does not exist`

**Root Cause**: The `migrate_application_invoices_to_enrollment` function was trying to insert values into `created_at` and `updated_at` columns that didn't exist on the `enrollment_invoices` table.

**Fix**: Added `created_at` and `updated_at` columns to `enrollment_invoices` with automatic `updated_at` trigger.

**Migration**: `20260127000004_add_timestamps_to_enrollment_invoices.sql`

**Status**: ✅ Resolved

---

### Issue #5: Type Casting for Enum Columns
**Error**: `column "status" is of type invoice_status but expression is of type text`

**Root Cause**: The `migrate_application_invoices_to_enrollment` function was inserting text literals into enum columns without proper type casting.

**Fix**: Added explicit type casts for all enum values:
- `'SCHEDULED'` → `'SCHEDULED'::invoice_status`
- `'PAID'/'VOID'/'SENT'` → Cast to `::invoice_status`
- `'UNPAID'` → `'UNPAID'::internal_payment_status`

**Migration**: Updated `20260126000006_migration_function.sql` (reapplied)

**Status**: ✅ Resolved

---

### Issue #6: Missing Unique Constraints for ON CONFLICT
**Error**: `there is no unique or exclusion constraint matching the ON CONFLICT specification`

**Root Cause**: The atomic function uses `ON CONFLICT DO NOTHING` for idempotency, but 8 tables were missing the required unique constraints.

**Fix**: Created unique indexes on all affected tables:

| Table | Unique Constraint Columns |
|-------|---------------------------|
| `student_addresses` | `(student_id, type)` |
| `student_avetmiss` | `(student_id)` |
| `student_disabilities` | `(student_id, disability_type_id)` |
| `student_prior_education` | `(student_id, prior_achievement_id)` |
| `student_cricos` | `(student_id)` |
| `student_contacts_emergency` | `(student_id, name)` |
| `student_contacts_guardians` | `(student_id, name)` |
| `enrollment_classes` | `(enrollment_id, program_plan_class_id, class_date, start_time)` |

Also removed partial WHERE clauses from `ON CONFLICT` statements in the atomic function to match the full unique constraints.

**Migration**: `20260127000005_add_unique_constraints_for_idempotency.sql`

**Status**: ✅ Resolved

---

## 📦 Migration Files Applied

All migrations applied successfully using direct PostgreSQL execution:

```bash
# Migration 1: Core atomic function
20260127000000_atomic_approve_application.sql

# Migration 2: Grant permissions
20260127000001_grant_approve_application_atomic.sql

# Migration 3: Add documentation
20260127000002_comment_approve_application_atomic.sql

# Migration 4: Fix payment schedule trigger
20260127000003_allow_migration_flag_updates.sql

# Migration 5: Add timestamp columns
20260127000004_add_timestamps_to_enrollment_invoices.sql

# Migration 6: Add unique constraints
20260127000005_add_unique_constraints_for_idempotency.sql

# Migration 7: Fix invoice migration function (updated existing)
20260126000006_migration_function.sql (reapplied)

# Migration 8: Update atomic function (updated existing)
20260127000000_atomic_approve_application.sql (reapplied)
```

---

## 🔍 Verification Commands

### Verify all migrations applied:
```sql
SELECT version FROM schema_migrations 
WHERE version LIKE '202601270000%' 
ORDER BY version;
```

### Verify unique constraints:
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE '%_unique'
  AND tablename LIKE 'student_%' OR tablename LIKE 'enrollment_%'
ORDER BY tablename;
```

### Test atomic function:
```sql
-- Find an ACCEPTED application
SELECT id, status, first_name, last_name 
FROM applications 
WHERE status = 'ACCEPTED' 
LIMIT 1;

-- Call atomic function (replace APP_ID)
SELECT * FROM approve_application_atomic(
  'APP_ID'::uuid,
  NULL
);
```

---

## ✅ Current Status

**Database Migrations**: ✅ All applied successfully  
**Function Definition**: ✅ Updated and reapplied  
**Unique Constraints**: ✅ All 8 constraints created  
**Type Casting**: ✅ All enum casts added  
**Triggers**: ✅ Updated to allow migration flags  

**Ready for**: End-to-end testing with actual application approval

---

## 🚀 Next Steps

1. **Test the complete approval flow** with a real ACCEPTED application
2. **Verify all data migrates correctly** to student/enrollment tables
3. **Test idempotency** by calling the function twice with the same application
4. **Monitor external operations** (files, auth, email, Xero) for warnings
5. **Load test** with multiple concurrent approvals
6. **Document rollback procedures** if approval needs to be reversed

---

## 📚 Related Documentation

- `ATOMIC_FUNCTION_DIAGNOSTICS.md` - Comprehensive diagnostic checklist
- `supabase/functions/approve-application/README.md` - Function architecture
- `docs/approve-application-refactoring-summary.md` - Original refactoring details
- `DEPLOYMENT_CHECKLIST.md` - Production deployment guide

---

## 🆘 Troubleshooting

If you encounter new errors:

1. **Check the error code** and message in the Edge Function logs
2. **Verify the application status** is 'ACCEPTED' before calling
3. **Check required fields** (payment_plan_template_id, payment_anchor_date, program_id)
4. **Review the diagnostic checklist** in `ATOMIC_FUNCTION_DIAGNOSTICS.md`
5. **Check database logs** for detailed error messages: `docker logs supabase_db_xportal`
6. **Verify foreign key references** are valid (program_id, group_id, etc.)

---

**All known issues have been resolved. The function is ready for testing!** 🎉
