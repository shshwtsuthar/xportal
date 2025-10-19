-- Assignments System: subject-level assignments and student submissions
-- Buckets: subject-assignments, student-submissions

BEGIN;

-- 1) Tables

-- subject_assignments: global per subject, shared across program plans
CREATE TABLE IF NOT EXISTS public.subject_assignments (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  visible_from timestamptz,
  visible_to timestamptz,
  file_path text NOT NULL, -- path within bucket subject-assignments
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_id, title, file_name)
);

COMMENT ON TABLE public.subject_assignments IS 'Assignments attached globally to subjects; files stored in subject-assignments bucket.';
COMMENT ON COLUMN public.subject_assignments.file_path IS 'subjects/{subjectId}/assignments/{assignmentId}/{fileName}';

-- Ensure visibility window makes sense when both present
ALTER TABLE public.subject_assignments
  ADD CONSTRAINT subject_assignments_visible_window_chk
  CHECK (
    visible_from IS NULL OR visible_to IS NULL OR visible_from <= visible_to
  );

-- student_assignment_submissions: per student per assignment
CREATE TABLE IF NOT EXISTS public.student_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.subject_assignments(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  file_path text NOT NULL, -- path within bucket student-submissions
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  grade text,
  feedback text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_assignment_submissions IS 'Student submissions for a given subject assignment; files in student-submissions bucket.';
COMMENT ON COLUMN public.student_assignment_submissions.file_path IS 'students/{studentId}/submissions/{assignmentId}/{submissionId}/{fileName}';

CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.student_assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_subject ON public.student_assignment_submissions(subject_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.student_assignment_submissions(assignment_id);

-- 2) Triggers to set rto_id and updated_at

CREATE OR REPLACE FUNCTION public.set_rto_id_default()
RETURNS trigger AS $$
BEGIN
  IF NEW.rto_id IS NULL THEN
    NEW.rto_id := public.get_my_rto_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subject_assignments_set_rto ON public.subject_assignments;
CREATE TRIGGER trg_subject_assignments_set_rto
BEFORE INSERT ON public.subject_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_rto_id_default();

DROP TRIGGER IF EXISTS trg_subject_assignments_touch ON public.subject_assignments;
CREATE TRIGGER trg_subject_assignments_touch
BEFORE UPDATE ON public.subject_assignments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_submissions_set_rto ON public.student_assignment_submissions;
CREATE TRIGGER trg_submissions_set_rto
BEFORE INSERT ON public.student_assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_rto_id_default();

-- 3) RLS Policies (tenant isolation)

ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignment_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY subject_assignments_tenant_rw ON public.subject_assignments
  USING (rto_id = public.get_my_rto_id())
  WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY submissions_tenant_rw ON public.student_assignment_submissions
  USING (rto_id = public.get_my_rto_id())
  WITH CHECK (rto_id = public.get_my_rto_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Storage buckets & policies

-- Create private buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-assignments', 'subject-assignments', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-submissions', 'student-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for subject-assignments bucket
-- Path convention: subjects/{subjectId}/assignments/{assignmentId}/{fileName}

DO $$ BEGIN
  CREATE POLICY "sa_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'subject-assignments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = (storage.foldername(name))[2]::uuid -- second folder segment = subjectId
      AND s.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sa_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'subject-assignments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = (storage.foldername(name))[2]::uuid
      AND s.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "sa_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'subject-assignments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = (storage.foldername(name))[2]::uuid
      AND s.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for student-submissions bucket
-- Path convention: students/{studentId}/submissions/{assignmentId}/{submissionId}/{fileName}

DO $$ BEGIN
  CREATE POLICY "ss_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-submissions'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.id = (storage.foldername(name))[2]::uuid -- second folder segment = studentId
      AND st.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ss_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-submissions'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.id = (storage.foldername(name))[2]::uuid
      AND st.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ss_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'student-submissions'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.id = (storage.foldername(name))[2]::uuid
      AND st.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;


