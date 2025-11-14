BEGIN;

-- Add commission fields to agents table
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS commission_rate_percent numeric(5,2) NOT NULL DEFAULT 0.00
    CHECK (commission_rate_percent >= 0 AND commission_rate_percent <= 100),
  ADD COLUMN IF NOT EXISTS commission_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS commission_start_date date,
  ADD COLUMN IF NOT EXISTS commission_end_date date;

COMMENT ON COLUMN public.agents.commission_rate_percent IS 'Commission percentage rate (0-100). Example: 20.00 means 20% commission on commissionable payments.';
COMMENT ON COLUMN public.agents.commission_active IS 'Whether commissions are currently active for this agent. Can be toggled to temporarily disable commissions.';
COMMENT ON COLUMN public.agents.commission_start_date IS 'Optional start date for commission validity period. If NULL, commissions are valid from agent creation.';
COMMENT ON COLUMN public.agents.commission_end_date IS 'Optional end date for commission validity period. If NULL, commissions remain valid indefinitely.';

-- Add constraint to ensure end_date >= start_date if both are set
ALTER TABLE public.agents
  ADD CONSTRAINT agents_commission_date_range_check
  CHECK (
    commission_start_date IS NULL OR
    commission_end_date IS NULL OR
    commission_end_date >= commission_start_date
  );

COMMIT;

