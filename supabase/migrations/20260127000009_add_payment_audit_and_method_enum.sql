BEGIN;

-- 1) Create payment_method_enum for structured payment methods
DO $$
BEGIN
  CREATE TYPE public.payment_method_enum AS ENUM (
    'CASH',
    'CARD',
    'BANK_TRANSFER',
    'DIRECT_DEBIT',
    'CHEQUE',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 2) Add audit columns to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3) Migrate existing method values into a shape compatible with the enum
-- Normalize obvious text variants; anything else will be treated as OTHER during type cast
UPDATE public.payments
SET method = 'CASH'
WHERE method IS NOT NULL AND method ILIKE 'cash';

UPDATE public.payments
SET method = 'CARD'
WHERE method IS NOT NULL
  AND (
    method ILIKE 'card'
    OR method ILIKE 'credit card'
    OR method ILIKE 'debit card'
  );

UPDATE public.payments
SET method = 'BANK_TRANSFER'
WHERE method IS NOT NULL
  AND (
    method ILIKE 'bank_transfer'
    OR method ILIKE 'bank transfer'
    OR method ILIKE 'eft'
  );

UPDATE public.payments
SET method = 'DIRECT_DEBIT'
WHERE method IS NOT NULL
  AND (
    method ILIKE 'direct_debit'
    OR method ILIKE 'direct debit'
  );

UPDATE public.payments
SET method = 'CHEQUE'
WHERE method IS NOT NULL
  AND (
    method ILIKE 'cheque'
    OR method ILIKE 'check'
  );

-- Anything else (including NULL/blank) will become OTHER via the USING clause below

-- 4) Change method from free text to payment_method_enum with default OTHER and NOT NULL
ALTER TABLE public.payments
  ALTER COLUMN method TYPE public.payment_method_enum
  USING (
    CASE
      WHEN method ILIKE 'CASH' THEN 'CASH'::public.payment_method_enum
      WHEN method ILIKE 'CARD' THEN 'CARD'::public.payment_method_enum
      WHEN method ILIKE 'BANK_TRANSFER' THEN 'BANK_TRANSFER'::public.payment_method_enum
      WHEN method ILIKE 'DIRECT_DEBIT' THEN 'DIRECT_DEBIT'::public.payment_method_enum
      WHEN method ILIKE 'CHEQUE' THEN 'CHEQUE'::public.payment_method_enum
      ELSE 'OTHER'::public.payment_method_enum
    END
  );

ALTER TABLE public.payments
  ALTER COLUMN method SET DEFAULT 'OTHER'::public.payment_method_enum,
  ALTER COLUMN method SET NOT NULL;

-- 5) Payments-specific updated_at / updated_by trigger
CREATE OR REPLACE FUNCTION public.set_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Only set updated_by when a real authenticated user is present.
  -- Service-role / system updates (auth.uid() is null) should not clobber staff attribution.
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by = auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_payments_updated_at();

COMMIT;

