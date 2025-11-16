BEGIN;

-- Create xero_webhook_events table for tracking webhook events and ensuring idempotency
CREATE TABLE IF NOT EXISTS public.xero_webhook_events (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  rto_id uuid NOT NULL REFERENCES public.rtos(id) ON DELETE CASCADE,
  resource_id text NOT NULL,
  event_type text NOT NULL,
  event_category text NOT NULL,
  event_date_utc timestamptz NOT NULL,
  processed_at timestamptz,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.xero_webhook_events IS 'Tracks Xero webhook events for idempotency and debugging. Prevents duplicate processing of the same event.';
COMMENT ON COLUMN public.xero_webhook_events.resource_id IS 'Xero resource ID (InvoiceID, PaymentID, or ContactID) from the webhook event.';
COMMENT ON COLUMN public.xero_webhook_events.event_type IS 'Event type from Xero (e.g., INVOICE.CREATED, PAYMENT.UPDATED, CONTACT.CREATED).';
COMMENT ON COLUMN public.xero_webhook_events.event_category IS 'Event category: INVOICE, PAYMENT, or CONTACT.';
COMMENT ON COLUMN public.xero_webhook_events.event_date_utc IS 'Event timestamp from Xero (UTC).';
COMMENT ON COLUMN public.xero_webhook_events.processed_at IS 'Timestamp when the event was successfully processed. NULL if processing failed or not yet processed.';
COMMENT ON COLUMN public.xero_webhook_events.payload IS 'Full webhook event payload stored as JSON for debugging and audit purposes.';

-- Unique constraint for idempotency: same event cannot be processed twice
CREATE UNIQUE INDEX IF NOT EXISTS uq_xero_webhook_events_idempotency
ON public.xero_webhook_events (rto_id, resource_id, event_type, event_date_utc);

-- Index for querying events by RTO and processing status
CREATE INDEX IF NOT EXISTS idx_xero_webhook_events_rto_processed
ON public.xero_webhook_events (rto_id, processed_at)
WHERE processed_at IS NOT NULL;

-- Index for querying unprocessed events
CREATE INDEX IF NOT EXISTS idx_xero_webhook_events_unprocessed
ON public.xero_webhook_events (rto_id, created_at)
WHERE processed_at IS NULL;

-- Enable RLS
ALTER TABLE public.xero_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see webhook events for their RTO
CREATE POLICY "rls_xero_webhook_events_all" ON public.xero_webhook_events
FOR ALL
USING (rto_id = public.get_my_rto_id())
WITH CHECK (rto_id = public.get_my_rto_id());

COMMIT;

