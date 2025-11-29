BEGIN;

-- Add CRICOS code and bank information fields to rtos table
ALTER TABLE public.rtos
  ADD COLUMN IF NOT EXISTS cricos_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_bsb TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

COMMENT ON COLUMN public.rtos.cricos_code IS 'CRICOS provider code for international student providers';
COMMENT ON COLUMN public.rtos.bank_name IS 'Name of the bank for payment processing';
COMMENT ON COLUMN public.rtos.bank_account_name IS 'Account holder name for bank account';
COMMENT ON COLUMN public.rtos.bank_bsb IS 'Bank State Branch (BSB) code';
COMMENT ON COLUMN public.rtos.bank_account_number IS 'Bank account number';

COMMIT;



