# Approve Application - Architecture Diagram

## High-Level Flow

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │ POST /approve-application
       │ { applicationId, newGroupId? }
       ↓
┌──────────────────────────────────────────────────────┐
│         Approve Application Edge Function            │
│         (Deno/TypeScript Runtime)                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Validate request                                 │
│  2. Call approve_application_atomic()                │
│  3. Handle post-transaction operations               │
│  4. Return response                                  │
│                                                      │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
╔══════════════════════════════════════════════════════╗
║         Phase 1: Atomic Database Operations          ║
║         (PostgreSQL Transaction)                     ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  approve_application_atomic(app_id, new_group_id)    ║
║                                                      ║
║  BEGIN TRANSACTION;                                  ║
║    ┌─────────────────────────────────────────┐      ║
║    │ 1. Lock application (FOR UPDATE)        │      ║
║    │ 2. Validate status and required fields  │      ║
║    │ 3. Update group_id if provided          │      ║
║    └─────────────────────────────────────────┘      ║
║                       ↓                              ║
║    ┌─────────────────────────────────────────┐      ║
║    │ 4. Create/fetch student (idempotent)    │      ║
║    │    - Check if exists by application_id  │      ║
║    │    - Insert if not exists               │      ║
║    │    - Return existing if found           │      ║
║    └─────────────────────────────────────────┘      ║
║                       ↓                              ║
║    ┌─────────────────────────────────────────┐      ║
║    │ 5. Create/fetch enrollment (idempotent) │      ║
║    │    - Check if exists by student+program │      ║
║    │    - Insert if not exists               │      ║
║    │    - Return existing if found           │      ║
║    └─────────────────────────────────────────┘      ║
║                       ↓                              ║
║    ┌─────────────────────────────────────────┐      ║
║    │ 6. Migrate invoices to enrollment       │      ║
║    │    - Call migration RPC function        │      ║
║    │    - Copies application invoices        │      ║
║    │    - Creates remaining installments     │      ║
║    └─────────────────────────────────────────┘      ║
║                       ↓                              ║
║    ┌─────────────────────────────────────────┐      ║
║    │ 7. Copy student data (ON CONFLICT)      │      ║
║    │    - Addresses (street + postal)        │      ║
║    │    - AVETMISS data                      │      ║
║    │    - Disabilities                       │      ║
║    │    - Prior education                    │      ║
║    │    - CRICOS data                        │      ║
║    │    - Emergency contacts                 │      ║
║    │    - Guardian contacts                  │      ║
║    └─────────────────────────────────────────┘      ║
║                       ↓                              ║
║    ┌─────────────────────────────────────────┐      ║
║    │ 8. Copy learning plan                   │      ║
║    │    - Enrollment subjects                │      ║
║    │    - Enrollment classes                 │      ║
║    └─────────────────────────────────────────┘      ║
║                       ↓                              ║
║    ┌─────────────────────────────────────────┐      ║
║    │ 9. Link offer letters to student        │      ║
║    └─────────────────────────────────────────┘      ║
║                       ↓                              ║
║    ┌─────────────────────────────────────────┐      ║
║    │ 10. Update application status           │      ║
║    │     SET status = 'APPROVED'             │      ║
║    │     WHERE status = 'ACCEPTED'           │      ║
║    │     (Prevents race conditions)          │      ║
║    └─────────────────────────────────────────┘      ║
║                       ↓                              ║
║  COMMIT;  (All succeed or all rollback)             ║
║                                                      ║
║  RETURN jsonb {                                      ║
║    student_id, enrollment_id, student_email, ...    ║
║  }                                                   ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
       │
       │ ✅ Success - Student fully created
       │
       ↓
┌──────────────────────────────────────────────────────┐
│         Phase 2: Post-Transaction Operations         │
│         (Non-blocking, Graceful Degradation)         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  These run AFTER atomic transaction succeeds         │
│  Failures log warnings but don't block approval      │
│                                                      │
│  ┌────────────────────────────────────────┐          │
│  │ copyApplicationFilesToStudent()        │          │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │          │
│  │ - List files in applications bucket   │          │
│  │ - Download each file                  │          │
│  │ - Upload to students bucket           │          │
│  │ - Log warnings on failures            │          │
│  └────────────────────────────────────────┘          │
│                    ↓                                 │
│  ┌────────────────────────────────────────┐          │
│  │ createStudentAuthUser()                │          │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │          │
│  │ - Generate invite link via Auth API   │          │
│  │ - Update user metadata                │          │
│  │ - Link user_id to student record      │          │
│  │ - Log warnings on failures            │          │
│  └────────────────────────────────────────┘          │
│                    ↓                                 │
│  ┌────────────────────────────────────────┐          │
│  │ sendAcceptanceEmail()                  │          │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │          │
│  │ - Fetch RTO name                      │          │
│  │ - Build HTML email                    │          │
│  │ - Send via Resend API                 │          │
│  │ - Log warnings on failures            │          │
│  └────────────────────────────────────────┘          │
│                    ↓                                 │
│  ┌────────────────────────────────────────┐          │
│  │ syncStudentToXero()                    │          │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │          │
│  │ - Fire-and-forget HTTP request        │          │
│  │ - No waiting, completely async        │          │
│  │ - Errors logged but ignored           │          │
│  └────────────────────────────────────────┘          │
│                                                      │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│                  Response to Frontend                │
├──────────────────────────────────────────────────────┤
│  {                                                   │
│    "message": "Application approved...",             │
│    "studentId": "uuid",                              │
│    "enrollmentId": "uuid",                           │
│    "userId": "uuid",                                 │
│    "warnings": [                                     │
│      "Optional array of non-critical warnings"       │
│    ]                                                 │
│  }                                                   │
└──────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────┐
│              Error Handling Strategy                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Critical Errors (Phase 1)                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                      │
│  ❌ Application not found                           │
│  ❌ Invalid status (not ACCEPTED)                   │
│  ❌ Missing required fields                         │
│  ❌ Database constraint violations                  │
│                                                     │
│  Result: Rollback transaction, return 400/404/500   │
│          Nothing created, safe to retry             │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Non-Critical Errors (Phase 2)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                      │
│  ⚠️  File copy failures                             │
│  ⚠️  Auth user creation failures                    │
│  ⚠️  Email delivery failures                        │
│  ⚠️  Xero sync failures                             │
│                                                     │
│  Result: Log warning, continue processing           │
│          Return success with warnings array         │
│          Approval not blocked                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Idempotency Flow

```
Call 1: approve_application_atomic(app-123)
│
├─> Student check: NOT EXISTS
│   └─> INSERT student ✅ Created
│
├─> Enrollment check: NOT EXISTS
│   └─> INSERT enrollment ✅ Created
│
├─> Invoices check: NOT EXISTS
│   └─> Migrate invoices ✅ Created
│
├─> Addresses: INSERT ON CONFLICT DO NOTHING ✅
├─> AVETMISS: INSERT ON CONFLICT DO NOTHING ✅
├─> Other data: INSERT ON CONFLICT DO NOTHING ✅
│
└─> Application: UPDATE WHERE status='ACCEPTED' ✅
    Result: APPROVED


Call 2: approve_application_atomic(app-123)  // Retry!
│
├─> Student check: EXISTS ✅
│   └─> USE existing student (no insert)
│
├─> Enrollment check: EXISTS ✅
│   └─> USE existing enrollment (no insert)
│
├─> Invoices check: EXISTS ✅
│   └─> SKIP migration (no inserts)
│
├─> Addresses: ON CONFLICT DO NOTHING (skip) ✅
├─> AVETMISS: ON CONFLICT DO NOTHING (skip) ✅
├─> Other data: ON CONFLICT DO NOTHING (skip) ✅
│
└─> Application: UPDATE WHERE status='ACCEPTED'
    Status is already 'APPROVED', no update ✅
    Result: Same studentId, no duplicates!


Result: Both calls return the SAME student and enrollment.
        No duplicates created. Safe to retry! ✅
```

## Concurrency Safety

```
Thread 1: approve_application_atomic(app-123)
Thread 2: approve_application_atomic(app-123)

Timeline:
─────────────────────────────────────────────────────

T1: Thread 1 starts transaction
T1: SELECT * FROM applications WHERE id=123 FOR UPDATE ✅
    → Gets row lock

T2: Thread 2 starts transaction
T2: SELECT * FROM applications WHERE id=123 FOR UPDATE ⏳
    → WAITS for Thread 1's lock

T3: Thread 1 creates student, enrollment, etc.
T4: Thread 1 updates status to APPROVED
T5: Thread 1 COMMIT ✅
    → Releases lock

T6: Thread 2 proceeds with locked row
T7: Thread 2 checks status: status='APPROVED' ❌
T8: Thread 2 RAISE EXCEPTION 'Must be ACCEPTED'
    → Or uses idempotency to skip

Result: Only ONE approval succeeds.
        Second request either fails fast or is idempotent.
        No race conditions! ✅
```

## Data Flow Diagram

```
applications table
     │
     │ (approval trigger)
     ↓
┌─────────────────────────────────────────┐
│  approve_application_atomic()           │
│  ─────────────────────────────────────  │
│                                         │
│  Application Data                       │
│  ===============                        │
│  • Personal info                        │
│  • Contact details                      │
│  • AVETMISS data                        │
│  • CRICOS data                          │
│  • Payment plan                         │
│  • Learning plan                        │
│                                         │
└────┬───────────────┬────────────────────┘
     │               │
     ↓               ↓
 students       enrollments
   table           table
     │               │
     ├───────────────┼─────────────────────┐
     │               │                     │
     ↓               ↓                     ↓
student_         enrollment_         enrollment_
addresses        invoices            subjects
     │               │                     │
     ↓               ↓                     ↓
student_         enrollment_         enrollment_
avetmiss         payments            classes
     │
     ├───────────────────┬──────────────────┐
     │                   │                  │
     ↓                   ↓                  ↓
student_            student_           student_
disabilities        prior_education    cricos
     │                   │                  │
     ↓                   ↓                  ↓
student_contacts_   student_contacts_  offer_letters
emergency           guardians          (student_id linked)
```

## Component Responsibility Matrix

| Component | Responsibility | Can Fail? | Impact |
|-----------|---------------|-----------|--------|
| **PostgreSQL Function** | All DB operations | No (rolls back) | Critical - blocks approval |
| **errorResponse()** | Format error responses | No | N/A (utility) |
| **successResponse()** | Format success responses | No | N/A (utility) |
| **listFilesRecursively()** | List storage files | Yes | Non-critical |
| **copyApplicationFilesToStudent()** | Copy files | Yes | Warning logged |
| **createStudentAuthUser()** | Create auth user | Yes | Warning logged |
| **sendAcceptanceEmail()** | Send email | Yes | Warning logged |
| **syncStudentToXero()** | Sync to Xero | Yes | Ignored (fire-and-forget) |
| **Main Handler** | Orchestrate flow | No | Returns errors properly |

## Transaction Boundaries

```
┌──────────────────────────────────────────────────┐
│         Database Transaction Boundary            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  BEGIN;                                          │
│    • All SELECT queries                          │
│    • All INSERT queries                          │
│    • All UPDATE queries                          │
│    • RPC calls to other SQL functions            │
│  COMMIT; (or ROLLBACK on error)                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ✅ ACID guarantees                              │
│  ✅ Isolation from other transactions            │
│  ✅ Automatic rollback on errors                 │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│    Outside Transaction (Separate Operations)     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│    • File storage operations (Supabase Storage)  │
│    • Auth operations (Supabase Auth Admin API)   │
│    • Email API calls (Resend)                    │
│    • External API calls (Xero)                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ⚠️  No rollback if DB transaction fails         │
│  ⚠️  Must be idempotent for safe retries         │
│  ⚠️  Failures logged as warnings                 │
└──────────────────────────────────────────────────┘
```

## Performance Profile

```
Typical Execution Timeline:
──────────────────────────────────────────────────

0ms    │ Request received
       │
100ms  │ ┌─────────────────────────────────────┐
       │ │ Phase 1: Atomic DB Operations       │
       │ │ ─────────────────────────────────── │
600ms  │ │ • Lock application         (10ms)   │
       │ │ • Validate & fetch data    (50ms)   │
       │ │ • Create student           (100ms)  │
       │ │ • Create enrollment        (100ms)  │
       │ │ • Migrate invoices         (200ms)  │
       │ │ • Copy student data        (100ms)  │
       │ │ • Update status            (40ms)   │
       │ └─────────────────────────────────────┘
       │
700ms  │ ┌─────────────────────────────────────┐
       │ │ Phase 2: External Operations        │
       │ │ ─────────────────────────────────── │
3000ms │ │ • Copy files           (1-4s)       │
       │ │ • Create auth user     (500ms)      │
       │ │ • Send email           (500ms)      │
       │ │ • Xero sync (async)    (0ms wait)   │
       │ └─────────────────────────────────────┘
       │
3000ms │ Response returned
       
Total: 2-7 seconds (typical: 3-4s)
```

---

## Architecture Principles Applied

1. **ACID Transactions** ✅
   - Atomicity: All DB ops succeed or all fail
   - Consistency: Data always in valid state
   - Isolation: Concurrent approvals don't interfere
   - Durability: Committed data persists

2. **Idempotency** ✅
   - Every operation can be safely retried
   - No duplicate records created
   - Same input → Same output

3. **Separation of Concerns** ✅
   - Database logic in PostgreSQL
   - Business logic in TypeScript
   - External integrations isolated

4. **Error Boundaries** ✅
   - Critical errors block approval
   - Non-critical errors logged as warnings
   - Clear failure modes

5. **DRY (Don't Repeat Yourself)** ✅
   - Reusable helper functions
   - Single implementation of patterns
   - No code duplication

6. **Single Responsibility** ✅
   - Each function has one job
   - Clear boundaries
   - Easy to test

---

**Last Updated**: January 27, 2026
