-- Add observability columns for deferred invoice PDF generation
do $$
begin
  if not exists (
    select 1 from pg_type t where t.typname = 'invoice_pdf_generation_status'
  ) then
    create type invoice_pdf_generation_status as enum ('pending', 'succeeded', 'failed');
  end if;
end$$;

alter table public.invoices
  add column if not exists pdf_generation_status invoice_pdf_generation_status not null default 'pending',
  add column if not exists pdf_generation_attempts integer not null default 0,
  add column if not exists last_pdf_error text,
  add column if not exists pdf_generated_at timestamptz;

-- Backfill existing invoices: mark generated ones as succeeded
update public.invoices
set
  pdf_generation_status = case
    when pdf_path is not null then 'succeeded'::invoice_pdf_generation_status
    else 'pending'::invoice_pdf_generation_status
  end,
  pdf_generation_attempts = coalesce(pdf_generation_attempts, 0)
where pdf_generation_status is distinct from case
  when pdf_path is not null then 'succeeded'::invoice_pdf_generation_status
  else 'pending'::invoice_pdf_generation_status
end;
