-- Add performance indexes for students table queries
-- These indexes optimize common query patterns: filtering by status, ordering by created_at, and RLS filtering

BEGIN;

-- Index for ordering by created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students(created_at DESC);

-- Index for filtering by status (used in quick filters and stats)
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

-- Index for RLS filtering by rto_id (critical for tenant isolation)
CREATE INDEX IF NOT EXISTS idx_students_rto_id ON public.students(rto_id);

-- Composite index for common query: filter by rto_id and status (covers both RLS and filtering)
CREATE INDEX IF NOT EXISTS idx_students_rto_status ON public.students(rto_id, status);

-- Index for search queries on student_id_display
CREATE INDEX IF NOT EXISTS idx_students_id_display ON public.students(student_id_display);

-- Index for search queries on name fields (using text_pattern_ops for ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_students_first_name_search ON public.students(first_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_students_last_name_search ON public.students(last_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_students_email_search ON public.students(email text_pattern_ops);

COMMENT ON INDEX idx_students_created_at IS 'Optimizes ordering by created_at (DESC) - most common query pattern';
COMMENT ON INDEX idx_students_status IS 'Optimizes filtering by status for quick filters and stats';
COMMENT ON INDEX idx_students_rto_id IS 'Optimizes RLS filtering by rto_id for tenant isolation';
COMMENT ON INDEX idx_students_rto_status IS 'Composite index for filtering by both rto_id and status';
COMMENT ON INDEX idx_students_id_display IS 'Optimizes search queries on student_id_display';
COMMENT ON INDEX idx_students_first_name_search IS 'Optimizes ILIKE search queries on first_name';
COMMENT ON INDEX idx_students_last_name_search IS 'Optimizes ILIKE search queries on last_name';
COMMENT ON INDEX idx_students_email_search IS 'Optimizes ILIKE search queries on email';

COMMIT;

