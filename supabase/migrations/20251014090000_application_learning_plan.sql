BEGIN;

-- Application Learning Plan snapshot tables (subjects + classes)

CREATE TABLE public.application_learning_subjects (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  program_plan_subject_id uuid NOT NULL REFERENCES public.program_plan_subjects(id) ON DELETE RESTRICT,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  planned_start_date date NOT NULL,
  planned_end_date date NOT NULL,
  is_catch_up boolean NOT NULL DEFAULT false,
  is_prerequisite boolean NOT NULL DEFAULT false,
  sequence_order int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, program_plan_subject_id)
);

COMMENT ON TABLE public.application_learning_subjects IS 'Frozen learning plan subjects snapshot for an application at submit time.';

CREATE INDEX idx_als_app ON public.application_learning_subjects(application_id);
CREATE INDEX idx_als_pps ON public.application_learning_subjects(program_plan_subject_id);

ALTER TABLE public.application_learning_subjects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY als_tenant_rw ON public.application_learning_subjects
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.application_learning_classes (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  application_learning_subject_id uuid NOT NULL REFERENCES public.application_learning_subjects(id) ON DELETE CASCADE,
  program_plan_class_id uuid NOT NULL REFERENCES public.program_plan_classes(id) ON DELETE RESTRICT,
  class_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  trainer_id uuid REFERENCES public.profiles(id),
  location_id uuid REFERENCES public.delivery_locations(id),
  classroom_id uuid REFERENCES public.classrooms(id),
  class_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, program_plan_class_id)
);

COMMENT ON TABLE public.application_learning_classes IS 'Frozen learning plan classes snapshot per application subject.';

CREATE INDEX idx_alc_app ON public.application_learning_classes(application_id);
CREATE INDEX idx_alc_ppc ON public.application_learning_classes(program_plan_class_id);

ALTER TABLE public.application_learning_classes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY alc_tenant_rw ON public.application_learning_classes
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
        AND a.rto_id = public.get_my_rto_id()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Immutability triggers: block writes when application is not in DRAFT

CREATE OR REPLACE FUNCTION public.ensure_app_draft_for_learning_plan()
RETURNS trigger AS $$
DECLARE
  app_id uuid;
  app_status text;
BEGIN
  app_id := COALESCE(NEW.application_id, OLD.application_id);
  SELECT status::text INTO app_status FROM public.applications WHERE id = app_id;
  IF app_status IS NULL THEN
    RAISE EXCEPTION 'Application % not found for learning plan', app_id;
  END IF;
  IF app_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Learning plan snapshots are immutable once application is not DRAFT (current: %)', app_status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_als_immutable ON public.application_learning_subjects;
CREATE TRIGGER trg_als_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.application_learning_subjects
FOR EACH ROW EXECUTE FUNCTION public.ensure_app_draft_for_learning_plan();

DROP TRIGGER IF EXISTS trg_alc_immutable ON public.application_learning_classes;
CREATE TRIGGER trg_alc_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.application_learning_classes
FOR EACH ROW EXECUTE FUNCTION public.ensure_app_draft_for_learning_plan();

-- Freeze RPC: compute and store learning plan snapshot

CREATE OR REPLACE FUNCTION public.freeze_application_learning_plan(app_id uuid)
RETURNS TABLE(inserted_subjects int, inserted_classes int) AS $$
DECLARE
  v_app RECORD;
  v_commence date;
  v_timetable uuid;
  v_subjects int := 0;
  v_classes int := 0;
BEGIN
  -- Load application and preconditions
  SELECT * INTO v_app FROM public.applications WHERE id = app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application % not found', app_id; END IF;
  IF v_app.status::text <> 'DRAFT' THEN RAISE EXCEPTION 'Application % must be DRAFT to freeze', app_id; END IF;
  IF v_app.timetable_id IS NULL THEN RAISE EXCEPTION 'Application % missing timetable_id', app_id; END IF;
  IF v_app.proposed_commencement_date IS NULL THEN RAISE EXCEPTION 'Application % missing proposed_commencement_date', app_id; END IF;

  v_commence := v_app.proposed_commencement_date::date;
  v_timetable := v_app.timetable_id::uuid;

  -- Begin transactional writes (idempotent)
  DELETE FROM public.application_learning_classes WHERE application_id = app_id;
  DELETE FROM public.application_learning_subjects WHERE application_id = app_id;

  -- Insert prerequisites aligned to first scheduled subject (if any), else natural dates
  WITH plans AS (
    SELECT pp.*
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable
  ),
  pps AS (
    SELECT pps.*
    FROM public.program_plan_subjects pps
    JOIN plans p ON p.id = pps.program_plan_id
  ),
  plan_bounds AS (
    SELECT p.id AS plan_id,
           MIN(pps.start_date) AS plan_start,
           MAX(pps.end_date) AS plan_end
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
  ),
  sorted_plans AS (
    SELECT p.id AS plan_id
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
    ORDER BY MIN(pps.start_date)
  ),
  chosen_plan AS (
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence BETWEEN b.plan_start AND b.plan_end
    UNION ALL
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence < b.plan_start
    ORDER BY 1
    LIMIT 1
  ),
  current_plan AS (
    SELECT COALESCE((SELECT plan_id FROM chosen_plan LIMIT 1), (SELECT plan_id FROM sorted_plans LIMIT 1)) AS plan_id
  ),
  current_subjects AS (
    SELECT *
    FROM pps
    WHERE program_plan_id = (SELECT plan_id FROM current_plan)
    ORDER BY start_date, COALESCE(sequence_order, 0)
  ),
  first_eligible AS (
    SELECT cs.*
    FROM current_subjects cs
    WHERE cs.median_date > v_commence
    ORDER BY cs.start_date, COALESCE(cs.sequence_order, 0)
    LIMIT 1
  ),
  current_cycle AS (
    SELECT cs.*
    FROM current_subjects cs
    WHERE EXISTS (SELECT 1 FROM first_eligible fe WHERE true)
      AND cs.start_date >= (SELECT fe.start_date FROM first_eligible fe)
  ),
  prereq_ids AS (
    SELECT DISTINCT subject_id FROM pps WHERE is_prerequisite = true
  ),
  first_sched AS (
    SELECT * FROM current_cycle ORDER BY start_date, COALESCE(sequence_order, 0) LIMIT 1
  ),
  base AS (
    SELECT pps.*, (SELECT start_date FROM first_sched) AS align_start, (SELECT end_date FROM first_sched) AS align_end
    FROM pps
    WHERE subject_id IN (SELECT subject_id FROM prereq_ids)
  )
  INSERT INTO public.application_learning_subjects (
    application_id, program_plan_subject_id, subject_id,
    planned_start_date, planned_end_date, is_catch_up, is_prerequisite, sequence_order
  )
  SELECT app_id,
         b.id,
         b.subject_id,
         COALESCE(b.align_start, b.start_date),
         COALESCE(b.align_end, b.end_date),
         false,
         true,
         b.sequence_order
  FROM base b;

  -- Insert current cycle subjects excluding prerequisites
  WITH plans AS (
    SELECT pp.*
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable
  ),
  pps AS (
    SELECT pps.*
    FROM public.program_plan_subjects pps
    JOIN plans p ON p.id = pps.program_plan_id
  ),
  plan_bounds AS (
    SELECT p.id AS plan_id,
           MIN(pps.start_date) AS plan_start,
           MAX(pps.end_date) AS plan_end
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
  ),
  sorted_plans AS (
    SELECT p.id AS plan_id
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
    ORDER BY MIN(pps.start_date)
  ),
  chosen_plan AS (
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence BETWEEN b.plan_start AND b.plan_end
    UNION ALL
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence < b.plan_start
    ORDER BY 1
    LIMIT 1
  ),
  current_plan AS (
    SELECT COALESCE((SELECT plan_id FROM chosen_plan LIMIT 1), (SELECT plan_id FROM sorted_plans LIMIT 1)) AS plan_id
  ),
  current_subjects AS (
    SELECT *
    FROM pps
    WHERE program_plan_id = (SELECT plan_id FROM current_plan)
    ORDER BY start_date, COALESCE(sequence_order, 0)
  ),
  first_eligible AS (
    SELECT cs.*
    FROM current_subjects cs
    WHERE cs.median_date > v_commence
    ORDER BY cs.start_date, COALESCE(cs.sequence_order, 0)
    LIMIT 1
  ),
  current_cycle AS (
    SELECT cs.*
    FROM current_subjects cs
    WHERE EXISTS (SELECT 1 FROM first_eligible fe WHERE true)
      AND cs.start_date >= (SELECT fe.start_date FROM first_eligible fe)
  ),
  prereq_ids AS (
    SELECT DISTINCT subject_id FROM pps WHERE is_prerequisite = true
  ),
  cur AS (
    SELECT * FROM current_cycle WHERE subject_id NOT IN (SELECT subject_id FROM prereq_ids)
  )
  INSERT INTO public.application_learning_subjects (
    application_id, program_plan_subject_id, subject_id,
    planned_start_date, planned_end_date, is_catch_up, is_prerequisite, sequence_order
  )
  SELECT app_id, c.id, c.subject_id, c.start_date, c.end_date, false, false, c.sequence_order
  FROM cur c;

  -- Insert catch-up subjects excluding prerequisites
  WITH plans AS (
    SELECT pp.*
    FROM public.timetable_program_plans tpp
    JOIN public.program_plans pp ON pp.id = tpp.program_plan_id
    WHERE tpp.timetable_id = v_timetable
  ),
  pps AS (
    SELECT pps.*
    FROM public.program_plan_subjects pps
    JOIN plans p ON p.id = pps.program_plan_id
  ),
  plan_bounds AS (
    SELECT p.id AS plan_id,
           MIN(pps.start_date) AS plan_start,
           MAX(pps.end_date) AS plan_end
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
  ),
  sorted_plans AS (
    SELECT p.id AS plan_id
    FROM plans p
    JOIN pps ON pps.program_plan_id = p.id
    GROUP BY p.id
    ORDER BY MIN(pps.start_date)
  ),
  chosen_plan AS (
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence BETWEEN b.plan_start AND b.plan_end
    UNION ALL
    SELECT sp.plan_id
    FROM sorted_plans sp
    JOIN plan_bounds b ON b.plan_id = sp.plan_id
    WHERE v_commence < b.plan_start
    ORDER BY 1
    LIMIT 1
  ),
  current_plan AS (
    SELECT COALESCE((SELECT plan_id FROM chosen_plan LIMIT 1), (SELECT plan_id FROM sorted_plans LIMIT 1)) AS plan_id
  ),
  current_subjects AS (
    SELECT *
    FROM pps
    WHERE program_plan_id = (SELECT plan_id FROM current_plan)
  ),
  missed_seq AS (
    SELECT COALESCE(sequence_order, 0) AS sequence_order
    FROM current_subjects
    WHERE median_date <= v_commence
  ),
  next_plan AS (
    SELECT sp.plan_id
    FROM sorted_plans sp
    WHERE sp.plan_id > (SELECT plan_id FROM current_plan)
    ORDER BY sp.plan_id
    LIMIT 1
  ),
  next_plan_subjects AS (
    SELECT * FROM pps WHERE program_plan_id = (SELECT plan_id FROM next_plan)
  ),
  prereq_ids AS (
    SELECT DISTINCT subject_id FROM pps WHERE is_prerequisite = true
  ),
  cu AS (
    SELECT nps.*
    FROM next_plan_subjects nps
    WHERE COALESCE(nps.sequence_order, 0) IN (SELECT sequence_order FROM missed_seq)
      AND nps.subject_id NOT IN (SELECT subject_id FROM prereq_ids)
  )
  INSERT INTO public.application_learning_subjects (
    application_id, program_plan_subject_id, subject_id,
    planned_start_date, planned_end_date, is_catch_up, is_prerequisite, sequence_order
  )
  SELECT app_id, cu.id, cu.subject_id, cu.start_date, cu.end_date, true, false, cu.sequence_order
  FROM cu;

  -- Insert classes per ALS row within planned window
  WITH als AS (
    SELECT * FROM public.application_learning_subjects WHERE application_id = app_id
  ),
  joined AS (
    SELECT als.id AS als_id, als.application_id, ppc.*
    FROM als
    JOIN public.program_plan_classes ppc ON ppc.program_plan_subject_id = als.program_plan_subject_id
    WHERE ppc.class_date BETWEEN als.planned_start_date AND als.planned_end_date
  )
  INSERT INTO public.application_learning_classes (
    application_id, application_learning_subject_id, program_plan_class_id,
    class_date, start_time, end_time, trainer_id, location_id, classroom_id, class_type
  )
  SELECT j.application_id, j.als_id, j.id,
         j.class_date::date, j.start_time::time, j.end_time::time,
         j.trainer_id, j.location_id, j.classroom_id, j.class_type::text
  FROM joined j;

  -- Set output counts
  SELECT COUNT(*) INTO v_subjects FROM public.application_learning_subjects WHERE application_id = app_id;
  SELECT COUNT(*) INTO v_classes FROM public.application_learning_classes WHERE application_id = app_id;

  RETURN QUERY SELECT v_subjects, v_classes;
END;
$$ LANGUAGE plpgsql;

COMMIT;


