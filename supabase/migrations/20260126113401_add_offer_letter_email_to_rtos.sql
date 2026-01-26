BEGIN;

-- Add offer letter email address field to rtos table
ALTER TABLE public.rtos
  ADD COLUMN IF NOT EXISTS offer_letter_email_address TEXT;

COMMENT ON COLUMN public.rtos.offer_letter_email_address IS 'Email address used for sending offer letters to students';

COMMIT;
