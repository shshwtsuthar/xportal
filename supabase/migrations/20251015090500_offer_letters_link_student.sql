-- Add optional student linkage to offer_letters for post-approval association
ALTER TABLE public.offer_letters
ADD COLUMN IF NOT EXISTS student_id uuid NULL REFERENCES public.students(id);

-- No RLS change needed: table already covered by tenant RLS via rto_id policy


