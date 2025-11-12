-- Enforce submission-time constraints while allowing permissive drafts.
-- Guards ensure constraints apply only when status = 'SUBMITTED'.
-- If your lifecycle uses additional post-draft statuses (e.g., 'APPROVED'),
-- consider broadening the guards accordingly.

-- Email required on submission
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_email_required_on_submit'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_email_required_on_submit
      CHECK (
        status <> 'SUBMITTED'
        OR (
          email IS NOT NULL
          AND length(trim(email)) > 0
        )
      );
  END IF;
END
$$;

-- Mobile phone required on submission (CRICOS/PRISMS reporting)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_mobile_required_on_submit'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_mobile_required_on_submit
      CHECK (
        status <> 'SUBMITTED'
        OR (
          mobile_phone IS NOT NULL
          AND length(trim(mobile_phone)) > 0
        )
      );
  END IF;
END
$$;

-- Disability flag must be present and one of 'Y','N','@' on submission
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_disability_flag_required_on_submit'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_disability_flag_required_on_submit
      CHECK (
        status <> 'SUBMITTED'
        OR (
          disability_flag IS NOT NULL
          AND disability_flag IN ('Y','N','@')
        )
      );
  END IF;
END
$$;

-- Prior education flag must be present and one of 'Y','N','@' on submission
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'applications_prior_education_flag_required_on_submit'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_prior_education_flag_required_on_submit
      CHECK (
        status <> 'SUBMITTED'
        OR (
          prior_education_flag IS NOT NULL
          AND prior_education_flag IN ('Y','N','@')
        )
      );
  END IF;
END
$$;


