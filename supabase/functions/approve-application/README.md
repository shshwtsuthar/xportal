# Approve Application Edge Function

## Overview

This Edge Function handles the critical process of approving student applications. It has been architected following industry-standard software design practices to ensure **atomicity**, **reliability**, and **maintainability**.

## Architecture

### Two-Phase Approach

The function uses a **two-phase architecture** to separate atomic database operations from external operations:

#### Phase 1: Atomic Database Operations ⚛️
All database operations are wrapped in a single PostgreSQL transaction (`approve_application_atomic` function). This ensures:
- **All-or-nothing execution**: If any database operation fails, everything rolls back
- **Data consistency**: No partial approvals or orphaned records
- **Idempotency**: Can be safely retried without creating duplicates
- **Concurrency safety**: Row-level locking prevents race conditions

Operations in this phase:
- Create/fetch student record
- Create/fetch enrollment record
- Migrate application invoices to enrollment
- Copy all student data (addresses, AVETMISS, CRICOS, disabilities, etc.)
- Copy learning plan (subjects and classes)
- Link offer letters
- Update application status to APPROVED

#### Phase 2: Post-Transaction Operations 🔄
External operations run AFTER the atomic transaction succeeds. These are:
- **Idempotent**: Can be retried safely
- **Non-blocking**: Failures don't prevent approval
- **Gracefully degrading**: Warnings are logged but don't fail the process

Operations in this phase:
- Copy application files to student bucket
- Create Supabase auth user
- Send acceptance email via Resend
- Sync student to Xero (fire-and-forget)

### Design Patterns Implemented

#### 1. **Single Responsibility Principle (SRP)**
Each helper function has one clear responsibility:
- `copyApplicationFilesToStudent()` - File management
- `createStudentAuthUser()` - Auth operations
- `sendAcceptanceEmail()` - Email delivery
- `syncStudentToXero()` - External API sync

#### 2. **DRY (Don't Repeat Yourself)**
Eliminated code duplication:
- `errorResponse()` - Standardized error responses (used 30+ times)
- `successResponse()` - Standardized success responses
- `listFilesRecursively()` - Reusable file listing logic
- Extracted repeated patterns into focused functions

#### 3. **Separation of Concerns**
Clear boundaries between:
- **Database logic** (PostgreSQL function)
- **Business orchestration** (Edge Function)
- **External integrations** (Helper functions)

#### 4. **Error Handling Strategy**
- **Critical operations** (database) - Fail fast with rollback
- **Non-critical operations** (files, email) - Log warnings, continue
- **Fire-and-forget operations** (Xero) - Don't wait, don't block

#### 5. **Idempotency**
The entire approval process is idempotent:
- Database: Uses `ON CONFLICT` clauses and existence checks
- Files: Checks for existing files before copying
- Auth: Handles existing users gracefully
- Can safely retry after partial failures

## API

### Request

```typescript
POST /functions/v1/approve-application
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json

{
  "applicationId": "uuid",
  "newGroupId": "uuid" // Optional: handles group capacity race conditions
}
```

### Response

#### Success (200)
```json
{
  "message": "Application approved, invoices scheduled for issue",
  "studentId": "uuid",
  "enrollmentId": "uuid",
  "userId": "uuid",
  "warnings": ["Optional array of non-critical warnings"]
}
```

#### Error (400, 404, 409, 500)
```json
{
  "error": "Human-readable error message",
  "details": "Technical details (optional)"
}
```

## Database Function

### `approve_application_atomic(p_application_id, p_new_group_id)`

Located in: `supabase/migrations/20260127000000_atomic_approve_application.sql`

**Returns**: `jsonb` containing:
- `student_id` - Created/existing student ID
- `enrollment_id` - Created/existing enrollment ID
- `student_email` - Student email address
- `student_first_name`, `student_last_name`, `student_preferred_name`
- `student_id_display` - Student's display ID
- `rto_id` - RTO ID
- `was_new_student` - Boolean indicating if student was newly created
- `was_new_enrollment` - Boolean indicating if enrollment was newly created

**Exceptions**: Raises exceptions with clear messages on validation failures

## Error Handling

### Critical Errors (Block Approval)
- Application not found
- Application not in ACCEPTED status
- Missing required fields (payment plan, program, etc.)
- Database constraint violations
- Concurrent modification (status changed during approval)

### Non-Critical Errors (Log Warnings)
- File copy failures
- Auth user creation failures
- Email delivery failures
- Xero sync failures

Warnings are returned in the response but don't prevent approval completion.

## Idempotency Guarantees

The function can be safely called multiple times with the same `applicationId`:

1. **First call**: Creates student, enrollment, and all related records
2. **Subsequent calls**: 
   - Detects existing student/enrollment
   - Skips duplicate inserts (via `ON CONFLICT` clauses)
   - Re-attempts failed external operations
   - Returns success if application is already APPROVED

This makes the function **retry-safe** and **resilient to failures**.

## Concurrency Safety

### Race Condition Prevention

1. **Application-level locking**:
   ```sql
   SELECT * FROM applications WHERE id = ? FOR UPDATE
   ```
   Prevents concurrent approvals of the same application

2. **Status-based updates**:
   ```sql
   UPDATE applications SET status = 'APPROVED' 
   WHERE id = ? AND status = 'ACCEPTED'
   ```
   Only updates if status is still ACCEPTED

3. **Group capacity handling**:
   - Accepts `newGroupId` parameter to handle race conditions
   - Frontend detects full groups and provides alternative

## Performance Considerations

### Optimization Strategies

1. **Single round-trip for atomic operations**: All database operations in one RPC call
2. **Parallel-ready external operations**: File copy, auth, and email can be parallelized in future
3. **Fire-and-forget for non-critical operations**: Xero sync doesn't block response
4. **Efficient file operations**: Recursive listing with batching

### Typical Execution Time

- **Atomic phase**: 500-1000ms (depends on data volume)
- **File copy**: 1-5s (depends on file count and size)
- **Auth + Email**: 500-1000ms
- **Total**: 2-7 seconds

## Monitoring and Observability

### Logs

Structured console logs at key points:
```typescript
console.log(`Starting approval process for application ${applicationId}`);
console.log('Atomic approval completed:', approvalResult);
console.log(`Copying files for student ${studentId}`);
console.log(`Creating auth user for student ${studentId}`);
console.log(`Sending acceptance email to ${studentEmail}`);
console.log(`Approval process completed for application ${applicationId}`);
```

### Errors

All errors logged with context:
```typescript
console.error('Atomic approval failed:', approvalErr);
console.error('Unexpected error in approval process:', err);
```

### Warnings

Non-critical warnings tracked and returned in response:
- File copy failures
- Auth user creation issues
- Email delivery problems

## Testing Strategy

### Unit Tests (Recommended)

1. **Helper functions** - Test each function independently:
   - `errorResponse()` - Validates response format
   - `copyApplicationFilesToStudent()` - Mock storage API
   - `createStudentAuthUser()` - Mock auth API
   - `sendAcceptanceEmail()` - Mock Resend API

2. **Database function** - Test SQL logic:
   - Valid application approval
   - Validation errors
   - Idempotency (call twice)
   - Concurrent approvals

### Integration Tests (Recommended)

1. **Happy path** - Complete approval flow
2. **Idempotency** - Approve same application twice
3. **Partial failure recovery** - Kill process mid-approval, retry
4. **Concurrent approvals** - Two requests for same application

### Manual Testing

1. Approve new application
2. Check student record created
3. Check enrollment created
4. Check files copied
5. Check auth user created
6. Check email received
7. Retry approval (should succeed idempotently)

## Migration Guide

### From Old Version

The new version is **backward compatible**:

1. **Deploy the migration**:
   ```bash
   supabase db push
   ```

2. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy approve-application
   ```

3. **No frontend changes required** - API contract is identical

### Rollback Plan

If issues arise:

1. **Revert Edge Function**:
   ```bash
   git revert <commit>
   supabase functions deploy approve-application
   ```

2. **Keep the database function** - It's safe and provides idempotency benefits

## Future Improvements

### Potential Enhancements

1. **Parallel external operations** - Run file copy, auth, and email in parallel
2. **Retry logic** - Automatic retries for transient failures
3. **Event sourcing** - Emit events for each step for audit trail
4. **Background jobs** - Move file copy to background queue
5. **Metrics collection** - Track approval duration, failure rates
6. **Dead letter queue** - Queue failed operations for manual intervention

### Performance Optimizations

1. **Batch file operations** - Upload multiple files in single request
2. **Lazy email sending** - Queue email for background worker
3. **Cached RTO data** - Reduce database queries
4. **Streaming file copy** - Don't load entire file in memory

## Troubleshooting

### Common Issues

#### "Application status changed during approval process"
- **Cause**: Concurrent modification or user changed status
- **Solution**: Retry the approval request

#### "Failed to copy files"
- **Cause**: Storage permissions or network issues
- **Solution**: Check warnings in response, files can be copied manually if needed

#### "Failed to create auth user"
- **Cause**: Email already registered or Supabase auth issues
- **Solution**: Check warnings, user can be created manually via Supabase dashboard

#### "Email not sent"
- **Cause**: Resend API issues or missing configuration
- **Solution**: Check RESEND_API_KEY and RESEND_FROM environment variables

### Debug Mode

Enable detailed logging:
```typescript
// Add to Edge Function temporarily
console.log('Application data:', app);
console.log('Approval result:', approvalResult);
```

## Security Considerations

1. **RLS (Row Level Security)**: Edge Function uses user's auth token for database operations
2. **Service role only for privileged operations**: File storage and auth operations
3. **Input validation**: Application ID is validated before processing
4. **Status guards**: Only ACCEPTED applications can be approved
5. **Audit trail**: All operations logged with timestamps

## Dependencies

- **Deno**: Runtime environment
- **Supabase Client**: Database and auth operations
- **Resend**: Email delivery (optional)
- **Xero**: Contact sync (optional, fire-and-forget)

## License

Internal - Part of XPortal application
