-- WhatsApp logging schema: threads, messages, status events (per-RTO)

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'whatsapp_direction'
  ) THEN
    CREATE TYPE public.whatsapp_direction AS ENUM ('OUT','IN');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'whatsapp_status'
  ) THEN
    CREATE TYPE public.whatsapp_status AS ENUM (
      'queued','sending','sent','delivered','read','undelivered','failed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'whatsapp_event'
  ) THEN
    CREATE TYPE public.whatsapp_event AS ENUM (
      'queued','sending','sent','delivered','read','undelivered','failed'
    );
  END IF;
END$$;

-- 2) Tables
CREATE TABLE IF NOT EXISTS public.whatsapp_threads (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  sender_id UUID NOT NULL REFERENCES public.twilio_senders(id) ON DELETE CASCADE,
  counterparty_e164 TEXT NOT NULL,
  last_message_at TIMESTAMPTZ,
  last_dir public.whatsapp_direction,
  last_status public.whatsapp_status
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_threads_unique
  ON public.whatsapp_threads(rto_id, sender_id, counterparty_e164);
CREATE INDEX IF NOT EXISTS whatsapp_threads_rto_idx ON public.whatsapp_threads(rto_id);
CREATE INDEX IF NOT EXISTS whatsapp_threads_last_idx ON public.whatsapp_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  thread_id UUID NOT NULL REFERENCES public.whatsapp_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.twilio_senders(id) ON DELETE CASCADE,
  direction public.whatsapp_direction NOT NULL,
  body TEXT,
  media_urls TEXT[] DEFAULT '{}',
  status public.whatsapp_status NOT NULL DEFAULT 'queued',
  error TEXT,
  twilio_sid TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_thread_idx ON public.whatsapp_messages(thread_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS whatsapp_messages_occurred_idx ON public.whatsapp_messages(occurred_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_messages_rto_idx ON public.whatsapp_messages(rto_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_message_status_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  event public.whatsapp_event NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS whatsapp_status_events_msg_idx ON public.whatsapp_message_status_events(message_id);
CREATE INDEX IF NOT EXISTS whatsapp_status_events_rto_idx ON public.whatsapp_message_status_events(rto_id);

-- 3) updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_threads_set_updated_at ON public.whatsapp_threads;
CREATE TRIGGER whatsapp_threads_set_updated_at
BEFORE UPDATE ON public.whatsapp_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS whatsapp_messages_set_updated_at ON public.whatsapp_messages;
CREATE TRIGGER whatsapp_messages_set_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS
ALTER TABLE public.whatsapp_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_status_events ENABLE ROW LEVEL SECURITY;

-- threads
DROP POLICY IF EXISTS whatsapp_threads_select ON public.whatsapp_threads;
CREATE POLICY whatsapp_threads_select ON public.whatsapp_threads
  FOR SELECT TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS whatsapp_threads_insert ON public.whatsapp_threads;
CREATE POLICY whatsapp_threads_insert ON public.whatsapp_threads
  FOR INSERT TO authenticated
  WITH CHECK (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS whatsapp_threads_update ON public.whatsapp_threads;
CREATE POLICY whatsapp_threads_update ON public.whatsapp_threads
  FOR UPDATE TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin())
  WITH CHECK (rto_id = public.get_my_rto_id() OR public.is_admin());

-- messages
DROP POLICY IF EXISTS whatsapp_messages_select ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_select ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS whatsapp_messages_insert ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_insert ON public.whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS whatsapp_messages_update ON public.whatsapp_messages;
CREATE POLICY whatsapp_messages_update ON public.whatsapp_messages
  FOR UPDATE TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin())
  WITH CHECK (rto_id = public.get_my_rto_id() OR public.is_admin());

-- status events
DROP POLICY IF EXISTS whatsapp_status_events_select ON public.whatsapp_message_status_events;
CREATE POLICY whatsapp_status_events_select ON public.whatsapp_message_status_events
  FOR SELECT TO authenticated
  USING (rto_id = public.get_my_rto_id() OR public.is_admin());

DROP POLICY IF EXISTS whatsapp_status_events_insert ON public.whatsapp_message_status_events;
CREATE POLICY whatsapp_status_events_insert ON public.whatsapp_message_status_events
  FOR INSERT TO authenticated
  WITH CHECK (rto_id = public.get_my_rto_id() OR public.is_admin());

-- 5) Comments
COMMENT ON TABLE public.whatsapp_threads IS 'Per-RTO WhatsApp conversation threads (sender number + counterparty).';
COMMENT ON TABLE public.whatsapp_messages IS 'Per-RTO WhatsApp messages with direction, status, and optional media URLs.';
COMMENT ON TABLE public.whatsapp_message_status_events IS 'Per-RTO WhatsApp message status transitions and payloads from callbacks.';



