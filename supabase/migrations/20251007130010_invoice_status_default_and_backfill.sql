BEGIN;

-- Set default after value exists in prior migration
ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'SCHEDULED';

-- Backfill old DRAFT to SCHEDULED for consistency
UPDATE public.invoices SET status = 'SCHEDULED' WHERE status = 'DRAFT';

COMMIT;


