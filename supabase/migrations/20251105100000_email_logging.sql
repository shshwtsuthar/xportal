-- Email logging foundation: enums, tables, indexes, and RLS
-- Backend-first: persist all sent emails and lifecycle events

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'email_status'
  ) THEN
    CREATE TYPE public.email_status AS ENUM (
      'QUEUED',
      'SENT',
      'DELIVERED',
      'FAILED',
      'BOUNCED',
      'COMPLAINED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'email_participant_type'
  ) THEN
    CREATE TYPE public.email_participant_type AS ENUM (
      'TO',
      'CC',
      'BCC'
    );
  END IF;
END$$;

-- 2) Tables
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  from_email TEXT NOT NULL,
  from_name TEXT,
  reply_to TEXT[] NULL,

  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NULL,
  metadata JSONB NULL,

  resend_message_id UUID UNIQUE,
  status public.email_status NOT NULL DEFAULT 'QUEUED',
  status_updated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS email_messages_rto_idx ON public.email_messages(rto_id);
CREATE INDEX IF NOT EXISTS email_messages_created_at_idx ON public.email_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS email_messages_status_idx ON public.email_messages(status);

CREATE TABLE IF NOT EXISTS public.email_message_participants (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  email_message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  type public.email_participant_type NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT
);

CREATE INDEX IF NOT EXISTS email_message_participants_msg_idx ON public.email_message_participants(email_message_id);

CREATE TABLE IF NOT EXISTS public.email_message_attachments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  email_message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  storage_path TEXT,
  resend_attachment_id TEXT
);

CREATE INDEX IF NOT EXISTS email_message_attachments_msg_idx ON public.email_message_attachments(email_message_id);

CREATE TABLE IF NOT EXISTS public.email_message_status_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  email_message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  event_type public.email_status NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS email_message_status_events_msg_idx ON public.email_message_status_events(email_message_id);
CREATE INDEX IF NOT EXISTS email_message_status_events_type_idx ON public.email_message_status_events(event_type);

-- 3) RLS
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_message_status_events ENABLE ROW LEVEL SECURITY;

-- Helper policies using existing helpers: get_my_rto_id() and is_admin()
-- email_messages policies
DROP POLICY IF EXISTS email_messages_select ON public.email_messages;
CREATE POLICY email_messages_select ON public.email_messages
  FOR SELECT
  TO authenticated
  USING (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS email_messages_insert ON public.email_messages;
CREATE POLICY email_messages_insert ON public.email_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS email_messages_update ON public.email_messages;
CREATE POLICY email_messages_update ON public.email_messages
  FOR UPDATE
  TO authenticated
  USING (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  )
  WITH CHECK (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

-- Child tables: scope by parent message.rto_id
DROP POLICY IF EXISTS email_message_participants_select ON public.email_message_participants;
CREATE POLICY email_message_participants_select ON public.email_message_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS email_message_participants_insert ON public.email_message_participants;
CREATE POLICY email_message_participants_insert ON public.email_message_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS email_message_participants_update ON public.email_message_participants;
CREATE POLICY email_message_participants_update ON public.email_message_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  );

-- Attachments policies
DROP POLICY IF EXISTS email_message_attachments_select ON public.email_message_attachments;
CREATE POLICY email_message_attachments_select ON public.email_message_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS email_message_attachments_insert ON public.email_message_attachments;
CREATE POLICY email_message_attachments_insert ON public.email_message_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS email_message_attachments_update ON public.email_message_attachments;
CREATE POLICY email_message_attachments_update ON public.email_message_attachments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  );

-- Status events policies
DROP POLICY IF EXISTS email_message_status_events_select ON public.email_message_status_events;
CREATE POLICY email_message_status_events_select ON public.email_message_status_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS email_message_status_events_insert ON public.email_message_status_events;
CREATE POLICY email_message_status_events_insert ON public.email_message_status_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.email_messages m
      WHERE m.id = email_message_id
        AND (m.rto_id = public.get_my_rto_id() OR public.is_admin())
    )
  );

-- 4) Comments
COMMENT ON TABLE public.email_messages IS 'Stores outbound email records and lifecycle, scoped by RTO.';
COMMENT ON TABLE public.email_message_participants IS 'Normalized list of recipients (TO/CC/BCC).';
COMMENT ON TABLE public.email_message_attachments IS 'File metadata for attachments, referencing storage path if used.';
COMMENT ON TABLE public.email_message_status_events IS 'Timeline of status events from Resend webhook.';


