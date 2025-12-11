-- Add overdue tracking timestamps
alter table public.invoices
  add column if not exists first_overdue_at timestamptz,
  add column if not exists last_overdue_at timestamptz;

-- Batched overdue updater for SENT invoices past due with outstanding balance
create or replace function public.mark_overdue_invoices_batch(p_limit integer default 500)
returns integer
language plpgsql
as $$
declare
  updated_count integer := 0;
begin
  with candidates as (
    select id
    from public.invoices
    where status = 'SENT'
      and due_date < current_date
      and amount_due_cents > coalesce(amount_paid_cents, 0)
    order by due_date asc
    limit p_limit
    for update skip locked
  ),
  upd as (
    update public.invoices i
    set status = 'OVERDUE',
        first_overdue_at = coalesce(i.first_overdue_at, now()),
        last_overdue_at = now()
    from candidates c
    where i.id = c.id
    returning i.id
  )
  select count(*) into updated_count from upd;

  return coalesce(updated_count, 0);
end;
$$;
