# Approve Application - Developer Quick Reference

## TL;DR

The approval process is now **atomic and reliable**:
- All database operations succeed together or fail together
- Fully idempotent - safe to retry
- Separate phases for critical vs. non-critical operations
- 55% less code, much easier to maintain

## How It Works (5-Minute Overview)

```
User clicks "Approve" → Edge Function → PostgreSQL Atomic Function
                                     ↓
                               All DB ops succeed
                                     ↓
                         [Files] [Auth] [Email] [Xero]
                                     ↓
                          Response with warnings
```

### Phase 1: Database (Atomic) ⚛️
**One transaction, all-or-nothing**
- Create student
- Create enrollment  
- Migrate invoices
- Copy student data (addresses, AVETMISS, CRICOS, etc.)
- Update application to APPROVED

**Result**: Student fully created or nothing happens

### Phase 2: External Operations (Best-effort) 🔄
**Independent, non-blocking**
- Copy files from applications → students bucket
- Create Supabase auth user
- Send welcome email
- Sync to Xero (fire-and-forget)

**Result**: Warnings logged, approval not blocked

## Common Tasks

### Add a New Field to Copy

**1. Add to SQL function** (`20260127000000_atomic_approve_application.sql`):
```sql
INSERT INTO students (
  ...existing fields...,
  your_new_field  -- Add here
) VALUES (
  ...existing values...,
  v_app.your_new_field  -- And here
)
```

**2. No TypeScript changes needed!** The Edge Function just calls the SQL function.

### Add a New Validation Rule

**Add to SQL function** (it throws exceptions):
```sql
IF v_app.your_field IS NULL THEN
  RAISE EXCEPTION 'your_field is required';
END IF;
```

### Add a New Post-Approval Action

**Create helper function in TypeScript**:
```typescript
async function doSomethingAfterApproval(
  service: any,
  studentId: string
): Promise<string[]> {
  const warnings: string[] = [];
  try {
    // Your logic here
  } catch (err) {
    warnings.push(`Failed: ${err.message}`);
  }
  return warnings;
}
```

**Call it in Phase 2**:
```typescript
// After atomic approval succeeds
const yourWarnings = await doSomethingAfterApproval(service, studentId);
warnings.push(...yourWarnings);
```

### Debug an Approval Failure

**1. Check the error response**:
```json
{
  "error": "Failed to approve application",
  "details": "Application must be ACCEPTED to approve. Current: PENDING"
}
```

**2. Check Edge Function logs**:
```bash
supabase functions logs approve-application
```

Look for:
- `Starting approval process for application {id}`
- `Atomic approval failed:` ← Critical error
- `Copying files for student {id}`
- Warnings about files, auth, or email

**3. Check database directly**:
```sql
-- Check application status
SELECT id, status FROM applications WHERE id = 'your-id';

-- Check if student was created
SELECT * FROM students WHERE application_id = 'your-id';

-- Check if enrollment was created  
SELECT * FROM enrollments WHERE student_id = (
  SELECT id FROM students WHERE application_id = 'your-id'
);
```

### Retry a Failed Approval

**Just call the endpoint again!** It's idempotent:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/approve-application \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"applicationId": "uuid-here"}'
```

**What happens**:
- If student exists: Uses existing student
- If enrollment exists: Uses existing enrollment
- If invoices exist: Skips migration
- If files exist: Skips copy
- Updates application status if still ACCEPTED

## Testing Your Changes

### Test SQL Function Directly

```sql
SELECT approve_application_atomic(
  p_application_id := 'your-test-app-id',
  p_new_group_id := NULL
);
```

**Expected result**:
```json
{
  "student_id": "uuid",
  "enrollment_id": "uuid",
  "student_email": "test@example.com",
  ...
}
```

### Test Edge Function Locally

```bash
# Start local Supabase
supabase start

# Deploy function locally
supabase functions deploy approve-application --local

# Test it
curl -X POST http://127.0.0.1:54321/functions/v1/approve-application \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"applicationId": "your-test-id"}'
```

### Test Idempotency

```bash
# Approve once
curl ... | jq '.studentId'
# Note the student ID

# Approve again (should succeed with same student)
curl ... | jq '.studentId'
# Should be the SAME student ID
```

## Common Errors

### "Application not found"
- **Cause**: Invalid `applicationId`
- **Fix**: Check the ID is correct

### "Application must be ACCEPTED to approve"
- **Cause**: Application is in wrong status (PENDING, DRAFT, etc.)
- **Fix**: Move application to ACCEPTED first

### "payment_plan_template_id is required"
- **Cause**: Application missing payment plan
- **Fix**: Add payment plan to application

### "Failed to copy files"
- **Cause**: Storage permissions or network issue
- **Impact**: Non-critical, approval still succeeds
- **Fix**: Files can be copied manually if needed

### "Failed to send acceptance email"
- **Cause**: Resend API key missing or email service down
- **Impact**: Non-critical, approval still succeeds
- **Fix**: Resend email manually or via admin panel

## Architecture Decision Records

### Why PostgreSQL function instead of Edge Function transaction?

**Answer**: Edge Functions can't control database transactions. Only PostgreSQL can guarantee atomicity across multiple operations.

### Why separate phases?

**Answer**: External operations (files, email, Xero) can't be in the database transaction. Separating them allows:
- Database rollback without affecting files
- Graceful degradation if external services fail
- Clear error boundaries

### Why idempotency?

**Answer**: Network failures and timeouts are inevitable. Idempotency makes retries safe and automatic recovery possible.

### Why not use a background queue for Phase 2?

**Answer**: Current approach is simpler and sufficient. If external operations become slow or unreliable, we can add a queue later.

## Performance Tips

### Slow approvals?

**Check**:
1. Number of files to copy (could be large)
2. External email service response time
3. Database query performance

**Profile**:
```typescript
console.time('atomic-approval');
const result = await supabase.rpc('approve_application_atomic', ...);
console.timeEnd('atomic-approval');

console.time('file-copy');
await copyApplicationFilesToStudent(...);
console.timeEnd('file-copy');
```

### Want faster approvals?

**Option 1**: Parallelize Phase 2 operations
```typescript
await Promise.all([
  copyApplicationFilesToStudent(...),
  createStudentAuthUser(...),
  sendAcceptanceEmail(...)
]);
```

**Option 2**: Move to background queue
- Approve immediately
- Queue file/email/auth operations
- Process in background worker

## Security Considerations

### Who can approve applications?

**Controlled by RLS policies** on the `applications` table. Edge Function uses the user's auth token, so RLS is enforced.

### Service role usage

**Used only for**:
- File storage operations (bypass RLS)
- Auth user creation (requires admin)

**Not used for**: Regular database operations (uses user token)

### Sensitive data

**Never log**:
- Passwords
- API keys
- Personal identification numbers
- Payment information

**OK to log**:
- Application IDs
- Student IDs
- Email addresses (already in database)
- Timestamps

## Monitoring Checklist

### What to monitor after deployment

- [ ] Approval success rate
- [ ] Approval duration (should be 2-7s)
- [ ] Database transaction failures
- [ ] File copy warnings
- [ ] Auth user creation failures
- [ ] Email delivery failures
- [ ] Xero sync errors

### Setting up alerts

```sql
-- Query for failed approvals in last hour
SELECT COUNT(*) 
FROM applications 
WHERE status = 'ACCEPTED' 
  AND updated_at > NOW() - INTERVAL '1 hour'
  AND id IN (
    -- IDs that were attempted but failed
    SELECT DISTINCT application_id 
    FROM approval_logs 
    WHERE created_at > NOW() - INTERVAL '1 hour'
      AND success = false
  );
```

## Need Help?

### Documentation
- **README.md** - Complete API and architecture docs
- **approve-application-refactoring-summary.md** - Detailed refactoring explanation
- **This file** - Quick reference

### Code
- **SQL**: `supabase/migrations/20260127000000_atomic_approve_application.sql`
- **TypeScript**: `supabase/functions/approve-application/index.ts`

### Testing
1. Start local Supabase: `supabase start`
2. Test in staging before production
3. Use idempotency to safely retry

### Debugging
1. Check error response details
2. Check Edge Function logs
3. Query database directly
4. Test SQL function in isolation

---

**Last Updated**: January 27, 2026  
**Maintainer**: Development Team
