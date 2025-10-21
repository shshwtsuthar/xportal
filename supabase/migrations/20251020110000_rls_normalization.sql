-- Normalize RLS policies across the schema
-- Goals:
-- 1) Standardize tenant checks to public.get_my_effective_rto_id()
-- 2) Ensure INSERT/UPDATE paths include proper WITH CHECK clauses
-- 3) Remove direct JWT parsing from policies
-- 4) Tighten rtos UPDATE to admin-only
-- 5) Consolidate duplicated/overlapping policy definitions

BEGIN;

-- Ensure helper is present (idempotent)
CREATE OR REPLACE FUNCTION public.get_my_effective_rto_id()
RETURNS uuid AS $$
DECLARE v_rto_id uuid; v_prof_rto uuid; BEGIN
  SELECT public.get_my_rto_id() INTO v_rto_id;
  IF v_rto_id IS NOT NULL THEN RETURN v_rto_id; END IF;
  SELECT p.rto_id INTO v_prof_rto FROM public.profiles p WHERE p.id = auth.uid();
  RETURN v_prof_rto;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- rtos: select remains tenant-scoped; update admin-only
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_rtos_select" ON public.rtos;
  CREATE POLICY "rls_rtos_select" ON public.rtos
    FOR SELECT
    USING (id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_rtos_update" ON public.rtos;
  CREATE POLICY "rls_rtos_update_admin_only" ON public.rtos
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Simple rto_id scoped tables: profiles, applications, students, enrollments,
-- payment_plan_templates, invoices, payments, events, delivery_locations,
-- application_disabilities, application_prior_education, agents, offer_letters
DO $$ BEGIN
  DROP POLICY IF EXISTS rls_profiles_all ON public.profiles;
  CREATE POLICY rls_profiles_all ON public.profiles
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_applications_all ON public.applications;
  CREATE POLICY rls_applications_all ON public.applications
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_students_all ON public.students;
  CREATE POLICY rls_students_all ON public.students
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_enrollments_all ON public.enrollments;
  CREATE POLICY rls_enrollments_all ON public.enrollments
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_payment_plan_templates_all ON public.payment_plan_templates;
  CREATE POLICY rls_payment_plan_templates_all ON public.payment_plan_templates
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_invoices_all ON public.invoices;
  CREATE POLICY rls_invoices_all ON public.invoices
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_payments_all ON public.payments;
  CREATE POLICY rls_payments_all ON public.payments
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_events_all ON public.events;
  CREATE POLICY rls_events_all ON public.events
    FOR ALL
    USING (COALESCE(rto_id, public.get_my_effective_rto_id()) = public.get_my_effective_rto_id())
    WITH CHECK (COALESCE(rto_id, public.get_my_effective_rto_id()) = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_delivery_locations_all ON public.delivery_locations;
  CREATE POLICY rls_delivery_locations_all ON public.delivery_locations
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_application_disabilities_all ON public.application_disabilities;
  CREATE POLICY rls_application_disabilities_all ON public.application_disabilities
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_application_prior_education_all ON public.application_prior_education;
  CREATE POLICY rls_application_prior_education_all ON public.application_prior_education
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_agents_all ON public.agents;
  CREATE POLICY rls_agents_all ON public.agents
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- offer_letters has rto_id
  DROP POLICY IF EXISTS rls_offer_letters_all ON public.offer_letters;
  CREATE POLICY rls_offer_letters_all ON public.offer_letters
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Student domain tables
DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_addresses_all ON public.student_addresses;
  CREATE POLICY rls_student_addresses_all ON public.student_addresses
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_contacts_emergency_all ON public.student_contacts_emergency;
  CREATE POLICY rls_student_contacts_emergency_all ON public.student_contacts_emergency
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_contacts_guardians_all ON public.student_contacts_guardians;
  CREATE POLICY rls_student_contacts_guardians_all ON public.student_contacts_guardians
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_avetmiss_all ON public.student_avetmiss;
  CREATE POLICY rls_student_avetmiss_all ON public.student_avetmiss
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_cricos_all ON public.student_cricos;
  CREATE POLICY rls_student_cricos_all ON public.student_cricos
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS rls_student_documents_all ON public.student_documents;
  CREATE POLICY rls_student_documents_all ON public.student_documents
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Program planning domain
DO $$ BEGIN
  -- Replace jwt-based program_plans policies
  DROP POLICY IF EXISTS program_plans_tenant_rw ON public.program_plans;
  CREATE POLICY program_plans_tenant_rw ON public.program_plans
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- program_plan_subjects scoped via program_plans
  DROP POLICY IF EXISTS program_plan_subjects_rw ON public.program_plan_subjects;
  CREATE POLICY program_plan_subjects_rw ON public.program_plan_subjects
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.program_plans p
        WHERE p.id = program_plan_subjects.program_plan_id
          AND p.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.program_plans p
        WHERE p.id = program_plan_subjects.program_plan_id
          AND p.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- enrollment_subjects scoped via enrollments
  DROP POLICY IF EXISTS enrollment_subjects_rw ON public.enrollment_subjects;
  CREATE POLICY enrollment_subjects_rw ON public.enrollment_subjects
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = enrollment_subjects.enrollment_id
          AND e.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = enrollment_subjects.enrollment_id
          AND e.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  -- program_plan_classes scoped via program_plan_subjects -> program_plans
  DROP POLICY IF EXISTS "Users can view classes for their RTO" ON public.program_plan_classes;
  DROP POLICY IF EXISTS "Users can manage classes for their RTO" ON public.program_plan_classes;
  DROP POLICY IF EXISTS program_plan_classes_rw ON public.program_plan_classes;
  CREATE POLICY program_plan_classes_rw ON public.program_plan_classes
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.program_plan_subjects pps
        JOIN public.program_plans pp ON pps.program_plan_id = pp.id
        WHERE pps.id = program_plan_classes.program_plan_subject_id
          AND pp.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.program_plan_subjects pps
        JOIN public.program_plans pp ON pps.program_plan_id = pp.id
        WHERE pps.id = program_plan_classes.program_plan_subject_id
          AND pp.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Timetables and junction
DO $$ BEGIN
  DROP POLICY IF EXISTS rls_timetables_all ON public.timetables;
  CREATE POLICY rls_timetables_all ON public.timetables
    FOR ALL
    USING (rto_id = public.get_my_effective_rto_id())
    WITH CHECK (rto_id = public.get_my_effective_rto_id());
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS timetable_program_plans_rw ON public.timetable_program_plans;
  CREATE POLICY timetable_program_plans_rw ON public.timetable_program_plans
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.timetables t
        WHERE t.id = timetable_program_plans.timetable_id
          AND t.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.timetables t
        WHERE t.id = timetable_program_plans.timetable_id
          AND t.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Application Learning and Payment Schedule (join via applications)
DO $$ BEGIN
  DROP POLICY IF EXISTS application_learning_subjects_rw ON public.application_learning_subjects;
  CREATE POLICY application_learning_subjects_rw ON public.application_learning_subjects
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_learning_subjects.application_id
          AND a.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_learning_subjects.application_id
          AND a.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS application_learning_classes_rw ON public.application_learning_classes;
  CREATE POLICY application_learning_classes_rw ON public.application_learning_classes
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_learning_classes.application_id
          AND a.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_learning_classes.application_id
          AND a.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS application_payment_schedule_rw ON public.application_payment_schedule;
  CREATE POLICY application_payment_schedule_rw ON public.application_payment_schedule
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_payment_schedule.application_id
          AND a.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = application_payment_schedule.application_id
          AND a.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Attendance (enrollment_class_attendances) join via enrollments->students
DO $$ BEGIN
  DROP POLICY IF EXISTS "rto-read-attendance" ON public.enrollment_class_attendances;
  DROP POLICY IF EXISTS "rto-insert-attendance" ON public.enrollment_class_attendances;
  DROP POLICY IF EXISTS "rto-update-attendance" ON public.enrollment_class_attendances;

  CREATE POLICY "rto-read-attendance" ON public.enrollment_class_attendances
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.enrollment_classes ec
        JOIN public.enrollments e ON e.id = ec.enrollment_id
        JOIN public.students s ON s.id = e.student_id
        WHERE ec.id = enrollment_class_attendances.enrollment_class_id
          AND s.rto_id = public.get_my_effective_rto_id()
      )
    );

  CREATE POLICY "rto-insert-attendance" ON public.enrollment_class_attendances
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.enrollment_classes ec
        JOIN public.enrollments e ON e.id = ec.enrollment_id
        JOIN public.students s ON s.id = e.student_id
        WHERE ec.id = enrollment_class_attendances.enrollment_class_id
          AND s.rto_id = public.get_my_effective_rto_id()
      )
    );

  CREATE POLICY "rto-update-attendance" ON public.enrollment_class_attendances
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.enrollment_classes ec
        JOIN public.enrollments e ON e.id = ec.enrollment_id
        JOIN public.students s ON s.id = e.student_id
        WHERE ec.id = enrollment_class_attendances.enrollment_class_id
          AND s.rto_id = public.get_my_effective_rto_id()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.enrollment_classes ec
        JOIN public.enrollments e ON e.id = ec.enrollment_id
        JOIN public.students s ON s.id = e.student_id
        WHERE ec.id = enrollment_class_attendances.enrollment_class_id
          AND s.rto_id = public.get_my_effective_rto_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Subject assignments and student submissions:
-- Drop older pure-tenant policies; keep admin-bypass versions intact
DO $$ BEGIN
  DROP POLICY IF EXISTS subject_assignments_tenant_rw ON public.subject_assignments;
  DROP POLICY IF EXISTS submissions_tenant_rw ON public.student_assignment_submissions;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

COMMIT;


