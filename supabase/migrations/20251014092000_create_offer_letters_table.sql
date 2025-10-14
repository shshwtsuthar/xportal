-- Create offer_letters table to store immutable records of generated offer letters
-- and their storage paths. RLS enforces tenant isolation by rto_id.

create table if not exists public.offer_letters (
  id uuid primary key default gen_random_uuid(),
  rto_id uuid not null references public.rtos(id),
  application_id uuid not null references public.applications(id) on delete cascade,
  file_path text not null,
  version text not null default 'v1',
  template_key text not null default 'default',
  generated_by uuid references public.profiles(id),
  generated_at timestamptz not null default now(),
  sha256 text,
  size_bytes integer
);

create index if not exists offer_letters_app_generated_at_idx
  on public.offer_letters (application_id, generated_at desc);

create index if not exists offer_letters_rto_app_generated_at_idx
  on public.offer_letters (rto_id, application_id, generated_at desc);

create unique index if not exists offer_letters_app_sha256_uniq
  on public.offer_letters (application_id, sha256)
  where sha256 is not null;

-- Enable Row Level Security
alter table public.offer_letters enable row level security;

-- RLS Policies
do $$ begin
  -- Select policy: users can read rows for their own RTO
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'offer_letters' and policyname = 'offer_letters_select_same_rto'
  ) then
    create policy offer_letters_select_same_rto
      on public.offer_letters
      for select
      using (
        rto_id = (
          (auth.jwt() -> 'app_metadata' ->> 'rto_id')::uuid
        )
      );
  end if;

  -- Insert policy: by default, disallow (service role bypasses RLS)
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'offer_letters' and policyname = 'offer_letters_insert_none'
  ) then
    create policy offer_letters_insert_none
      on public.offer_letters
      for insert
      with check (false);
  end if;

  -- Update/Delete policies: disallow
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'offer_letters' and policyname = 'offer_letters_update_none'
  ) then
    create policy offer_letters_update_none
      on public.offer_letters
      for update
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'offer_letters' and policyname = 'offer_letters_delete_none'
  ) then
    create policy offer_letters_delete_none
      on public.offer_letters
      for delete
      using (false);
  end if;
end $$;


