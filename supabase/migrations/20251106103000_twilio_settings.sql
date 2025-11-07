-- Twilio settings & senders (per-RTO)
-- Backend-first: schema, RLS, and helpers

-- 0) Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'twilio_channel'
  ) THEN
    CREATE TYPE public.twilio_channel AS ENUM ('whatsapp','sms');
  END IF;
END$$;

-- 2) Tables
CREATE TABLE IF NOT EXISTS public.twilio_settings (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  account_sid TEXT NOT NULL,
  auth_token_cipher TEXT NOT NULL, -- ciphertext (base64 of pgp_sym_encrypt)
  auth_token_masked TEXT NOT NULL, -- e.g., **** **** **** 1a2b
  messaging_service_sid TEXT NULL,
  validate_webhooks BOOLEAN NOT NULL DEFAULT TRUE
);

-- Only one config per RTO
CREATE UNIQUE INDEX IF NOT EXISTS twilio_settings_rto_unique
  ON public.twilio_settings(rto_id);

CREATE INDEX IF NOT EXISTS twilio_settings_rto_idx
  ON public.twilio_settings(rto_id);

COMMENT ON TABLE public.twilio_settings IS 'Per-RTO Twilio configuration with encrypted Auth Token. Do not expose cipher to clients.';

CREATE TABLE IF NOT EXISTS public.twilio_senders (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id UUID NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  channel public.twilio_channel NOT NULL,
  phone_e164 TEXT NOT NULL, -- +E.164
  friendly_name TEXT NOT NULL,
  description TEXT NULL,
  phone_number_sid TEXT NULL, -- optional Twilio Phone Number SID
  sender_sid TEXT NULL,       -- optional Twilio Sender SID (Senders API)
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Prevent duplicates within an RTO for the same phone+channel
CREATE UNIQUE INDEX IF NOT EXISTS twilio_senders_unique
  ON public.twilio_senders(rto_id, phone_e164, channel);

CREATE INDEX IF NOT EXISTS twilio_senders_rto_idx
  ON public.twilio_senders(rto_id);

CREATE INDEX IF NOT EXISTS twilio_senders_active_idx
  ON public.twilio_senders(is_active);

COMMENT ON TABLE public.twilio_senders IS 'Configured Twilio senders (phone + channel) per RTO.';

-- 3) Triggers for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS twilio_settings_set_updated_at ON public.twilio_settings;
CREATE TRIGGER twilio_settings_set_updated_at
BEFORE UPDATE ON public.twilio_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS twilio_senders_set_updated_at ON public.twilio_senders;
CREATE TRIGGER twilio_senders_set_updated_at
BEFORE UPDATE ON public.twilio_senders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Encryption note
-- We intentionally perform encryption/decryption in the application layer (Node AES-256-GCM)
-- and store only ciphertext and masked values in the database. No DB crypto functions needed.

-- 5) RLS
ALTER TABLE public.twilio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_senders ENABLE ROW LEVEL SECURITY;

-- Settings policies
DROP POLICY IF EXISTS twilio_settings_select ON public.twilio_settings;
CREATE POLICY twilio_settings_select ON public.twilio_settings
  FOR SELECT
  TO authenticated
  USING (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS twilio_settings_insert ON public.twilio_settings;
CREATE POLICY twilio_settings_insert ON public.twilio_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS twilio_settings_update ON public.twilio_settings;
CREATE POLICY twilio_settings_update ON public.twilio_settings
  FOR UPDATE
  TO authenticated
  USING (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  )
  WITH CHECK (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

-- Senders policies
DROP POLICY IF EXISTS twilio_senders_select ON public.twilio_senders;
CREATE POLICY twilio_senders_select ON public.twilio_senders
  FOR SELECT
  TO authenticated
  USING (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS twilio_senders_insert ON public.twilio_senders;
CREATE POLICY twilio_senders_insert ON public.twilio_senders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS twilio_senders_update ON public.twilio_senders;
CREATE POLICY twilio_senders_update ON public.twilio_senders
  FOR UPDATE
  TO authenticated
  USING (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  )
  WITH CHECK (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS twilio_senders_delete ON public.twilio_senders;
CREATE POLICY twilio_senders_delete ON public.twilio_senders
  FOR DELETE
  TO authenticated
  USING (
    rto_id = public.get_my_rto_id() OR public.is_admin()
  );

-- 6) Column-level hygiene (documentation-only, enforcement via API)
COMMENT ON COLUMN public.twilio_settings.auth_token_cipher IS 'Encrypted (base64) Twilio Auth Token. Never select/return to clients.';
COMMENT ON COLUMN public.twilio_settings.auth_token_masked IS 'Display-only masked token. Safe to return to clients.';


